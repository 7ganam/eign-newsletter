import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { csvFormat, csvParse } from 'd3'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { INFLUENCERS, INFLUENCERS_VERIFIED_AT, type Influencer } from '../src/influencerData'
import {
  LINKEDIN_FOLLOWERS,
  LINKEDIN_FOLLOWERS_UPDATED_AT,
  type LinkedInFollowerSnapshot,
} from '../src/linkedinFollowerData'

const PROJECT_ROOT = process.env.VERCEL
  ? process.cwd()
  : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILES = {
  companies: resolve(PROJECT_ROOT, 'eign_index.companies.json'),
  rounds: resolve(PROJECT_ROOT, 'eign_index.rounds.json'),
} as const
const TABLE_PREFERENCES_FILE = resolve(PROJECT_ROOT, 'assets/table-preferences.json')
const INFLUENCER_FILES = {
  directory: resolve(PROJECT_ROOT, 'src/influencerData.ts'),
  followers: resolve(PROJECT_ROOT, 'src/linkedinFollowerData.ts'),
} as const

class FileObjectId {
  constructor(readonly value: string) {}

  toString() {
    return this.value
  }

  toJSON() {
    return this.value
  }
}

type DataRecord = Record<string, unknown>

const reviveExtendedJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reviveExtendedJson)
  if (!value || typeof value !== 'object') return value

  const record = value as DataRecord
  const keys = Object.keys(record)
  if (keys.length === 1 && typeof record.$oid === 'string') return new FileObjectId(record.$oid)
  if (keys.length === 1 && typeof record.$date === 'string') return new Date(record.$date)

  return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, reviveExtendedJson(entry)]))
}

const loadJsonRecords = async (path: string) => {
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`Expected a JSON array in ${path}`)
  return parsed.map((record) => reviveExtendedJson(record) as DataRecord)
}

const toExtendedJson = (value: unknown): unknown => {
  if (value instanceof FileObjectId) return { $oid: value.value }
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Array.isArray(value)) return value.map(toExtendedJson)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as DataRecord).map(([key, entry]) => [key, toExtendedJson(entry)]))
}

const saveJsonRecords = async (path: string, records: DataRecord[]) => {
  const tempPath = `${path}.${process.pid}.tmp`
  try {
    await writeFile(tempPath, `${JSON.stringify(toExtendedJson(records), null, 2)}\n`, 'utf8')
    await rename(tempPath, path)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}

const RISEUP_SPEAKER_COLUMNS = [
  'speaker',
  'linkedin',
  'role',
  'organisation',
  'profile',
  'specialty',
  'biography',
  'sessions',
  'source',
  'record',
] as const
type RiseUpSpeakerColumn = typeof RISEUP_SPEAKER_COLUMNS[number]
type SortDirection = 'asc' | 'desc'
type TablePreference = {
  columnOrder: RiseUpSpeakerColumn[]
  sort: { direction: SortDirection; field: RiseUpSpeakerColumn }
  updatedAt: string | null
}
type TablePreferenceStore = Record<string, TablePreference>

const DEFAULT_RISEUP_SPEAKER_PREFERENCE: TablePreference = {
  columnOrder: [...RISEUP_SPEAKER_COLUMNS],
  sort: { direction: 'asc', field: 'speaker' },
  updatedAt: null,
}

const isRiseUpSpeakerColumn = (value: unknown): value is RiseUpSpeakerColumn =>
  typeof value === 'string' && RISEUP_SPEAKER_COLUMNS.includes(value as RiseUpSpeakerColumn)

const normaliseRiseUpSpeakerPreference = (value: unknown): TablePreference => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_RISEUP_SPEAKER_PREFERENCE
  const record = value as Record<string, unknown>
  const requestedOrder = Array.isArray(record.columnOrder) ? record.columnOrder : []
  const seen = new Set<RiseUpSpeakerColumn>()
  const columnOrder = requestedOrder.flatMap((column) => {
    if (!isRiseUpSpeakerColumn(column) || seen.has(column)) return []
    seen.add(column)
    return [column]
  })
  columnOrder.push(...RISEUP_SPEAKER_COLUMNS.filter((column) => !seen.has(column)))

  const requestedSort = record.sort && typeof record.sort === 'object' && !Array.isArray(record.sort)
    ? record.sort as Record<string, unknown>
    : {}
  const field = isRiseUpSpeakerColumn(requestedSort.field)
    ? requestedSort.field
    : DEFAULT_RISEUP_SPEAKER_PREFERENCE.sort.field
  const direction = requestedSort.direction === 'asc' || requestedSort.direction === 'desc'
    ? requestedSort.direction
    : DEFAULT_RISEUP_SPEAKER_PREFERENCE.sort.direction

  return {
    columnOrder,
    sort: { direction, field },
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
  }
}

const loadTablePreferences = async (): Promise<TablePreferenceStore> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(TABLE_PREFERENCES_FILE, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .map(([key, value]) => [key, normaliseRiseUpSpeakerPreference(value)]),
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

let tablePreferenceWriteQueue = Promise.resolve()
const saveTablePreference = async (tableId: string, preference: TablePreference) => {
  const operation = tablePreferenceWriteQueue.then(async () => {
    const store = await loadTablePreferences()
    store[tableId] = preference
    const tempPath = `${TABLE_PREFERENCES_FILE}.${process.pid}.tmp`
    try {
      await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
      await rename(tempPath, TABLE_PREFERENCES_FILE)
    } catch (error) {
      await unlink(tempPath).catch(() => undefined)
      throw error
    }
  })
  tablePreferenceWriteQueue = operation.catch(() => undefined)
  await operation
}

let companyRecords: DataRecord[] = []
let roundRecords: DataRecord[] = []
const companyById = new Map<string, DataRecord>()
const roundsByCompanyId = new Map<string, DataRecord[]>()
let companySchema: Array<{ name: string; bsonTypes: string[]; type: 'objectId' | 'date' | 'boolean' | 'number' | 'string' | 'unknown' }> = []
let indexDataPromise: Promise<void> | null = null

const idString = (value: unknown) => value instanceof FileObjectId ? value.value : String(value ?? '')

const ensureIndexData = () => {
  if (!indexDataPromise) {
    indexDataPromise = (async () => {
      try {
        const [companies, rounds] = await Promise.all([
          loadJsonRecords(DATA_FILES.companies),
          loadJsonRecords(DATA_FILES.rounds),
        ])
        companyRecords = companies
        roundRecords = rounds
        companyById.clear()
        for (const company of companyRecords) {
          companyById.set(idString(company._id), company)
        }
        roundsByCompanyId.clear()
        for (const round of roundRecords) {
          const companyId = idString(round.companyId)
          const companyRounds = roundsByCompanyId.get(companyId) ?? []
          companyRounds.push(round)
          roundsByCompanyId.set(companyId, companyRounds)
        }
        companySchema = getCompanySchema()
      } catch (error) {
        console.error('Failed to load index data', {
          cwd: process.cwd(),
          vercel: Boolean(process.env.VERCEL),
          companies: DATA_FILES.companies,
          rounds: DATA_FILES.rounds,
          error,
        })
        throw error
      }
    })()
  }
  return indexDataPromise
}

type JsonCollection = keyof typeof DATA_FILES
const jsonWriteQueues: Record<JsonCollection, Promise<void>> = {
  companies: Promise.resolve(),
  rounds: Promise.resolve(),
}
const IMMUTABLE_JSON_FIELDS = new Set(['_id', 'companyId', 'slug'])

const coerceJsonCellValue = (records: DataRecord[], field: string, value: unknown) => {
  if (value === null) return null
  const sample = records.map((record) => record[field]).find((entry) => entry !== null && entry !== undefined)
  if (sample instanceof FileObjectId) throw new Error('ObjectId fields cannot be edited.')
  if (sample instanceof Date) {
    if (typeof value !== 'string') throw new Error('Expected an ISO date value.')
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) throw new Error('The date value is invalid.')
    return date
  }
  if (typeof sample === 'number') {
    const number = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(number)) throw new Error('Expected a finite number.')
    return number
  }
  if (typeof sample === 'boolean') {
    if (typeof value !== 'boolean') throw new Error('Expected true or false.')
    return value
  }
  if (typeof sample === 'string') {
    if (typeof value !== 'string') throw new Error('Expected text.')
    return value
  }
  if (Array.isArray(sample)) {
    if (!Array.isArray(value)) throw new Error('Expected a JSON array.')
    return value
  }
  if (sample && typeof sample === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object.')
    return value
  }
  if (['string', 'number', 'boolean'].includes(typeof value) || value === null || Array.isArray(value) || (value && typeof value === 'object')) return value
  throw new Error('That value cannot be stored in the file.')
}

const saveJsonCell = async (collection: JsonCollection, recordId: string, field: string, value: unknown) => {
  const records = collection === 'companies' ? companyRecords : roundRecords
  const operation = jsonWriteQueues[collection].then(async () => {
    if (!field || IMMUTABLE_JSON_FIELDS.has(field)) throw new Error('That identity field is read-only.')
    if (!records.some((record) => Object.prototype.hasOwnProperty.call(record, field))) throw new Error('That file field does not exist.')
    const record = records.find((candidate) => idString(candidate._id) === recordId)
    if (!record) return undefined
    const previousValue = record[field]
    const nextValue = coerceJsonCellValue(records, field, value)
    record[field] = nextValue
    try {
      await saveJsonRecords(DATA_FILES[collection], records)
    } catch (error) {
      record[field] = previousValue
      throw error
    }
    return nextValue
  })
  jsonWriteQueues[collection] = operation.then(() => undefined, () => undefined)
  return operation
}

export const app = new Hono()
app.use('/api/*', async (context, next) => {
  try {
    await ensureIndexData()
  } catch (error) {
    return context.json({
      error: 'Failed to load index data',
      detail: error instanceof Error ? error.message : String(error),
      cwd: process.cwd(),
    }, 500)
  }
  await next()
})
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasOwn = (record: DataRecord, field: string) => Object.prototype.hasOwnProperty.call(record, field)
const asNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0
const asString = (value: unknown) => typeof value === 'string' ? value : ''

const comparableValue = (value: unknown): string | number | boolean | null => {
  if (value instanceof Date) return value.getTime()
  if (value instanceof FileObjectId) return value.value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return null
}

const compareValues = (left: unknown, right: unknown) => {
  const leftValue = comparableValue(left)
  const rightValue = comparableValue(right)
  if (leftValue === rightValue) return 0
  if (leftValue === null) return -1
  if (rightValue === null) return 1
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue
  if (typeof leftValue === 'boolean' && typeof rightValue === 'boolean') return Number(leftValue) - Number(rightValue)
  return String(leftValue).localeCompare(String(rightValue))
}

type SortSpec = Array<readonly [string, 1 | -1]>

const sortRecords = (records: DataRecord[], spec: SortSpec) => [...records].sort((left, right) => {
  for (const [field, direction] of spec) {
    const comparison = compareValues(left[field], right[field])
    if (comparison !== 0) return comparison * direction
  }
  return 0
})

const pick = (record: DataRecord, fields: string[]) => Object.fromEntries(
  fields.filter((field) => hasOwn(record, field)).map((field) => [field, record[field]]),
)

const omit = (record: DataRecord, fields: string[]) => Object.fromEntries(
  Object.entries(record).filter(([field]) => !fields.includes(field)),
)

const SOFTWARE_COMPANY_FILES = {
  curated: resolve(PROJECT_ROOT, 'assets/companies/software-companies-middle-east.csv'),
  review: resolve(PROJECT_ROOT, 'assets/companies/software-companies-non-middle-east-review.csv'),
} as const

const SOFTWARE_COMPANY_FLAG_COLUMNS = ['fit', 'reviewed'] as const
type SoftwareCompanyFlag = typeof SOFTWARE_COMPANY_FLAG_COLUMNS[number]
const softwareCompanyRowKey = (row: Record<string, string | undefined>) => JSON.stringify([
  row.source ?? '',
  row.linkedin_company_url ?? '',
  row.id ?? '',
  row.company_name ?? '',
])

const softwareCompanyColumns = (columns: string[]) => {
  const next = [...columns]
  let insertIndex = Math.max(0, next.indexOf('source') + 1)
  SOFTWARE_COMPANY_FLAG_COLUMNS.forEach((column) => {
    const currentIndex = next.indexOf(column)
    if (currentIndex >= 0) {
      insertIndex = currentIndex + 1
      return
    }
    next.splice(insertIndex, 0, column)
    insertIndex += 1
  })
  return next
}

const loadSoftwareCompanyCsv = async () => {
  const input = await readFile(SOFTWARE_COMPANY_FILES.curated, 'utf8')
  const rows = csvParse(input.replace(/^\uFEFF/, ''))
  return {
    bom: input.startsWith('\uFEFF'),
    columns: softwareCompanyColumns(rows.columns),
    newline: input.includes('\r\n') ? '\r\n' : '\n',
    rows,
  }
}

const saveSoftwareCompanyCsv = async ({
  bom,
  columns,
  newline,
  rows,
}: Awaited<ReturnType<typeof loadSoftwareCompanyCsv>>) => {
  const tempPath = `${SOFTWARE_COMPANY_FILES.curated}.${process.pid}.tmp`
  const output = csvFormat(rows, columns).replace(/\n/g, newline)
  try {
    await writeFile(tempPath, `${bom ? '\uFEFF' : ''}${output}${newline}`, 'utf8')
    await rename(tempPath, SOFTWARE_COMPANY_FILES.curated)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}

let softwareCompanyWriteQueue = Promise.resolve()

const saveSoftwareCompanyFlag = async (rowKey: string, flag: SoftwareCompanyFlag, value: boolean) => {
  const operation = softwareCompanyWriteQueue.then(async () => {
    const curated = await loadSoftwareCompanyCsv()
    const row = curated.rows.find((candidate) => softwareCompanyRowKey(candidate) === rowKey)
    if (!row) return false
    row[flag] = value ? 'true' : 'false'
    await saveSoftwareCompanyCsv(curated)
    return true
  })
  softwareCompanyWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

const saveSoftwareCompanyCell = async (rowKey: string, field: string, value: string) => {
  const operation = softwareCompanyWriteQueue.then(async () => {
    const curated = await loadSoftwareCompanyCsv()
    if (!field || field === '__rowKey' || !curated.columns.includes(field)) throw new Error('That CSV column is read-only.')
    if (field === 'source' && !['linkedin', 'kattch'].includes(value)) throw new Error('Source must be linkedin or kattch.')
    const row = curated.rows.find((candidate) => softwareCompanyRowKey(candidate) === rowKey)
    if (!row) return null
    row[field] = value
    const nextRowKey = softwareCompanyRowKey(row)
    await saveSoftwareCompanyCsv(curated)
    return { rowKey: nextRowKey, value }
  })
  softwareCompanyWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

const VALID_LINKS_FILE = resolve(PROJECT_ROOT, 'valid links.json')

const crunchbasePermalinkFromUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('crunchbase.com')) return ''
    const match = parsed.pathname.match(/^\/organization\/([^/]+)\/?$/i)
    return match ? decodeURIComponent(match[1]) : ''
  } catch {
    return ''
  }
}

const organizationLabelFromPermalink = (permalink: string) => {
  if (!permalink) return ''
  return permalink
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const loadValidLinks = async () => {
  const parsed: unknown = JSON.parse(await readFile(VALID_LINKS_FILE, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array in valid links.json')

  const items = parsed.flatMap((value, index) => {
    if (typeof value !== 'string') return []
    const url = value.trim()
    if (!url) return []
    const permalink = crunchbasePermalinkFromUrl(url)
    return [{
      __rowId: String(index),
      organization: organizationLabelFromPermalink(permalink) || permalink || url,
      permalink,
      url,
    }]
  })

  return {
    items,
    summary: {
      total: items.length,
      unique: new Set(items.map((item) => item.url)).size,
    },
    source: 'valid links.json',
  }
}

const NEWSLETTER_RESEARCH_FILE = resolve(PROJECT_ROOT, 'assets/newsletter-research.csv')
const NEWSLETTER_FIELD_COLUMNS = {
  newsletter: 'Newsletter',
  segment: 'Segment',
  geography: 'Geography',
  postFocus: 'Post Focus & Examples',
  similarity: 'Similarity to Eign',
  menaRelevance: 'MENA Relevance',
  howEignCanUseIt: 'How Eign Can Use It',
  whatEignCanLearn: 'What Eign Can Learn',
  website: 'Website',
  linkedin: 'LinkedIn',
  linkedinFollowers: 'LinkedIn Followers',
  linkedinEmployeeRange: 'LinkedIn Employee Range',
  linkedinMetricsStatus: 'LinkedIn Metrics Status',
  linkedinMetricsObservedAt: 'LinkedIn Metrics Observed At',
} as const
type NewsletterField = keyof typeof NEWSLETTER_FIELD_COLUMNS

const loadNewsletterCsv = async () => {
  const input = await readFile(NEWSLETTER_RESEARCH_FILE, 'utf8')
  const rows = csvParse(input.replace(/^\uFEFF/, ''))
  return {
    bom: input.startsWith('\uFEFF'),
    columns: rows.columns,
    newline: input.includes('\r\n') ? '\r\n' : '\n',
    rows,
  }
}

const saveNewsletterCsv = async ({
  bom,
  columns,
  newline,
  rows,
}: Awaited<ReturnType<typeof loadNewsletterCsv>>) => {
  const tempPath = `${NEWSLETTER_RESEARCH_FILE}.${process.pid}.tmp`
  const output = csvFormat(rows, columns).replace(/\n/g, newline)
  try {
    await writeFile(tempPath, `${bom ? '\uFEFF' : ''}${output}${newline}`, 'utf8')
    await rename(tempPath, NEWSLETTER_RESEARCH_FILE)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}

let newsletterWriteQueue = Promise.resolve()

const saveNewsletterCell = async (rowId: string, field: NewsletterField, value: string | number | null) => {
  const operation = newsletterWriteQueue.then(async () => {
    const newsletterCsv = await loadNewsletterCsv()
    const rowIndex = Number(rowId)
    const row = Number.isInteger(rowIndex) ? newsletterCsv.rows[rowIndex] : undefined
    if (!row) return false
    row[NEWSLETTER_FIELD_COLUMNS[field]] = value === null ? '' : String(value)
    await saveNewsletterCsv(newsletterCsv)
    return true
  })
  newsletterWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

type InfluencerRow = Influencer & {
  __rowId: string
  follower: LinkedInFollowerSnapshot
}

const influencerRecords = INFLUENCERS.map((influencer) => ({ ...influencer }))
const influencerFollowerSnapshots = INFLUENCERS.map((influencer) => ({
  ...(LINKEDIN_FOLLOWERS[influencer.linkedinUrl] ?? { count: null, observedAt: null, status: 'not-verified' as const }),
}))
let influencerWriteQueue = Promise.resolve()

const influencerRow = (index: number): InfluencerRow => ({
  ...influencerRecords[index],
  __rowId: String(index),
  follower: influencerFollowerSnapshots[index],
})

const findArrayObjectBounds = (source: string, marker: string, targetIndex: number) => {
  const markerIndex = source.indexOf(marker)
  const assignmentIndex = markerIndex >= 0 ? source.indexOf('= [', markerIndex + marker.length) : -1
  const arrayStart = assignmentIndex >= 0 ? source.indexOf('[', assignmentIndex) : -1
  if (arrayStart < 0) return null

  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false
  let depth = 0
  let objectStart = -1
  let objectIndex = -1

  for (let index = arrayStart + 1; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = ''
      continue
    }
    if (character === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (character === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character
      continue
    }
    if (character === '{') {
      if (depth === 0) {
        objectStart = index
        objectIndex += 1
      }
      depth += 1
      continue
    }
    if (character === '}') {
      depth -= 1
      if (depth === 0 && objectIndex === targetIndex) return { start: objectStart, end: index + 1 }
      continue
    }
    if (character === ']' && depth === 0) break
  }
  return null
}

const formatInfluencerRecord = (record: Influencer) => [
  '{',
  `    name: ${JSON.stringify(record.name)},`,
  `    country: ${JSON.stringify(record.country)},`,
  `    lane: ${JSON.stringify(record.lane)},`,
  `    organisation: ${JSON.stringify(record.organisation)},`,
  `    linkedinUrl: ${JSON.stringify(record.linkedinUrl)},`,
  `    priority: ${record.priority},`,
  `    arabicOrBilingual: ${record.arabicOrBilingual},`,
  '  }',
].join('\n')

const saveInfluencerRecord = async (index: number, record: Influencer) => {
  const source = await readFile(INFLUENCER_FILES.directory, 'utf8')
  const bounds = findArrayObjectBounds(source, 'export const INFLUENCERS', index)
  if (!bounds) throw new Error('The influencer row could not be located in src/influencerData.ts.')
  const tempPath = `${INFLUENCER_FILES.directory}.${process.pid}.tmp`
  const output = `${source.slice(0, bounds.start)}${formatInfluencerRecord(record)}${source.slice(bounds.end)}`
  try {
    await writeFile(tempPath, output, 'utf8')
    await rename(tempPath, INFLUENCER_FILES.directory)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}

const saveFollowerCount = async (index: number, count: number | null) => {
  const source = await readFile(INFLUENCER_FILES.followers, 'utf8')
  const markerIndex = source.indexOf('const FOLLOWER_COUNTS = [')
  const arrayStart = markerIndex >= 0 ? source.indexOf('[', markerIndex) : -1
  const arrayEnd = arrayStart >= 0 ? source.indexOf('] as const satisfies', arrayStart) : -1
  if (arrayStart < 0 || arrayEnd < 0) throw new Error('The follower array could not be located in src/linkedinFollowerData.ts.')
  const arraySource = source.slice(arrayStart + 1, arrayEnd)
  const matches = [...arraySource.matchAll(/\b(?:null|\d+)\b/g)]
  const match = matches[index]
  if (!match || match.index === undefined) throw new Error('The follower row could not be located in src/linkedinFollowerData.ts.')
  const valueStart = arrayStart + 1 + match.index
  const valueEnd = valueStart + match[0].length
  const today = new Date().toISOString().slice(0, 10)
  const nextSource = `${source.slice(0, valueStart)}${count ?? 'null'}${source.slice(valueEnd)}`
    .replace(/export const LINKEDIN_FOLLOWERS_UPDATED_AT = '[^']+' as const/, `export const LINKEDIN_FOLLOWERS_UPDATED_AT = '${today}' as const`)
  const tempPath = `${INFLUENCER_FILES.followers}.${process.pid}.tmp`
  try {
    await writeFile(tempPath, nextSource, 'utf8')
    await rename(tempPath, INFLUENCER_FILES.followers)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}

const INFLUENCER_COUNTRIES = new Set(INFLUENCERS.map((influencer) => influencer.country))
const INFLUENCER_LANES = new Set(INFLUENCERS.map((influencer) => influencer.lane))

const saveInfluencerCell = async (rowId: string, field: string, value: unknown) => {
  const operation = influencerWriteQueue.then(async () => {
    const index = Number(rowId)
    const current = Number.isInteger(index) ? influencerRecords[index] : undefined
    if (!current) return null

    if (field === 'followers') {
      const count = value === null || value === '' ? null : Number(value)
      if (count !== null && (!Number.isInteger(count) || count < 0)) throw new Error('Followers must be a non-negative whole number.')
      await saveFollowerCount(index, count)
      influencerFollowerSnapshots[index] = count === null
        ? { count: null, observedAt: null, status: 'not-verified' }
        : { count, observedAt: new Date().toISOString().slice(0, 10), status: 'observed', precision: 'exact', source: 'linkedin-profile' }
      return influencerRow(index)
    }

    const next = { ...current }
    if (field === 'country') {
      if (typeof value !== 'string' || !INFLUENCER_COUNTRIES.has(value as Influencer['country'])) throw new Error('Choose a supported market.')
      next.country = value as Influencer['country']
    } else if (field === 'lane') {
      if (typeof value !== 'string' || !INFLUENCER_LANES.has(value as Influencer['lane'])) throw new Error('Choose a supported influence lane.')
      next.lane = value as Influencer['lane']
    } else if (field === 'priority' || field === 'arabicOrBilingual') {
      if (typeof value !== 'boolean') throw new Error('Expected true or false.')
      next[field] = value
    } else if (['name', 'organisation', 'linkedinUrl'].includes(field)) {
      if (typeof value !== 'string' || !value.trim()) throw new Error('This value cannot be empty.')
      next[field as 'name' | 'organisation' | 'linkedinUrl'] = value.trim()
    } else {
      throw new Error('That influencer field is read-only.')
    }

    await saveInfluencerRecord(index, next)
    influencerRecords[index] = next
    return influencerRow(index)
  })
  influencerWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

const normaliseCompanyName = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')

type ResearchField = {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'objectId' | 'unknown'
  bsonTypes: string[]
}

type ResearchFilter = {
  field: string
  operator: string
  value?: string
  secondValue?: string
}

type ResearchQueryBody = {
  page?: number
  limit?: number
  search?: string
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  filters?: ResearchFilter[]
}

const FACET_FIELDS = [
  'acceleratorProgram',
  'businessType',
  'industry',
  'batch',
  'fundingTotalType',
  'fundingHistoryCompleteness',
  'fundingReconciliationStatus',
  'fundingReconciliationMethod',
]

const FIELD_PRIORITY = [
  'name',
  'slug',
  'acceleratorProgram',
  'businessType',
  'industry',
  'batch',
  'totalFundingUsd',
]

const valueType = (value: unknown) => {
  if (value === null) return 'null'
  if (value instanceof FileObjectId) return 'objectId'
  if (value instanceof Date) return 'date'
  if (typeof value === 'boolean') return 'bool'
  if (typeof value === 'number') return 'double'
  if (typeof value === 'string') return 'string'
  return 'unknown'
}

const normaliseBsonType = (types: string[]): ResearchField['type'] => {
  const meaningfulTypes = types.filter((type) => type !== 'null' && type !== 'missing')
  if (meaningfulTypes.includes('objectId')) return 'objectId'
  if (meaningfulTypes.includes('date')) return 'date'
  if (meaningfulTypes.includes('bool')) return 'boolean'
  if (meaningfulTypes.some((type) => ['double', 'int', 'long', 'decimal'].includes(type))) return 'number'
  if (meaningfulTypes.includes('string')) return 'string'
  return 'unknown'
}

function getCompanySchema() {
  const fieldNames = new Set(companyRecords.flatMap((company) => Object.keys(company)))
  return [...fieldNames]
    .map((name) => {
      const bsonTypes = [...new Set(companyRecords.map((company) => hasOwn(company, name) ? valueType(company[name]) : 'missing'))]
      return { name, bsonTypes, type: normaliseBsonType(bsonTypes) }
    })
    .sort((left, right) => {
      const leftPriority = FIELD_PRIORITY.indexOf(left.name)
      const rightPriority = FIELD_PRIORITY.indexOf(right.name)
      if (leftPriority !== -1 || rightPriority !== -1) {
        if (leftPriority === -1) return 1
        if (rightPriority === -1) return -1
        return leftPriority - rightPriority
      }
      return left.name.localeCompare(right.name)
    })
}

const parseFilterValue = (value: string, type: ResearchField['type']) => {
  if (type === 'number') {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  if (type === 'date') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (type === 'boolean') return value === 'true'
  if (type === 'objectId') return /^[a-f\d]{24}$/i.test(value) ? value.toLowerCase() : null
  return value
}

const equalsValue = (left: unknown, right: unknown) => comparableValue(left) === comparableValue(right)
type ResearchPredicate = (record: DataRecord) => boolean

const buildResearchPredicate = (filter: ResearchFilter, field: ResearchField): ResearchPredicate | null => {
  const operator = filter.operator
  const value = filter.value?.trim() ?? ''
  const secondValue = filter.secondValue?.trim() ?? ''
  const getValue = (record: DataRecord) => record[field.name]
  const compareFieldValue = (record: DataRecord, expected: unknown) => {
    const actual = getValue(record)
    if (field.type === 'date' && !(actual instanceof Date)) return null
    if (field.type === 'objectId' && !(actual instanceof FileObjectId)) return null
    if (field.type === 'number' && typeof actual !== 'number') return null
    if (field.type === 'boolean' && typeof actual !== 'boolean') return null
    if (field.type === 'string' && typeof actual !== 'string') return null
    return compareValues(actual, expected)
  }

  if (operator === 'exists') return (record) => hasOwn(record, field.name)
  if (operator === 'not_exists') return (record) => !hasOwn(record, field.name)
  if (operator === 'empty') return (record) => hasOwn(record, field.name) && [null, ''].includes(getValue(record) as null | string)
  if (operator === 'not_empty') return (record) => hasOwn(record, field.name) && ![null, ''].includes(getValue(record) as null | string)
  if (!value) return null

  if (['contains', 'not_contains', 'starts_with', 'ends_with'].includes(operator)) {
    const anchorStart = operator === 'starts_with' ? '^' : ''
    const anchorEnd = operator === 'ends_with' ? '$' : ''
    const regex = new RegExp(`${anchorStart}${escapeRegex(value)}${anchorEnd}`, 'i')
    return operator === 'not_contains'
      ? (record) => typeof getValue(record) !== 'string' || !regex.test(getValue(record) as string)
      : (record) => typeof getValue(record) === 'string' && regex.test(getValue(record) as string)
  }

  if (operator === 'in') {
    const values = value
      .split(',')
      .map((item) => parseFilterValue(item.trim(), field.type))
      .filter((item) => item !== null)
    return values.length ? (record) => values.some((entry) => equalsValue(getValue(record), entry)) : null
  }

  const parsedValue = parseFilterValue(value, field.type)
  if (parsedValue === null) return null
  if (operator === 'equals') {
    if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value) && parsedValue instanceof Date) {
      const nextDay = new Date(parsedValue)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      return (record) => {
        const startComparison = compareFieldValue(record, parsedValue)
        const endComparison = compareFieldValue(record, nextDay)
        return startComparison !== null && endComparison !== null && startComparison >= 0 && endComparison < 0
      }
    }
    return (record) => equalsValue(getValue(record), parsedValue)
  }
  if (operator === 'not_equals') return (record) => !equalsValue(getValue(record), parsedValue)
  if (operator === 'greater_than' || operator === 'after') return (record) => (compareFieldValue(record, parsedValue) ?? -1) > 0
  if (operator === 'greater_or_equal') return (record) => (compareFieldValue(record, parsedValue) ?? -1) >= 0
  if (operator === 'less_than' || operator === 'before') return (record) => {
    const comparison = compareFieldValue(record, parsedValue)
    return comparison !== null && comparison < 0
  }
  if (operator === 'less_or_equal') return (record) => {
    const comparison = compareFieldValue(record, parsedValue)
    return comparison !== null && comparison <= 0
  }

  if (operator === 'between' && secondValue) {
    const parsedSecondValue = parseFilterValue(secondValue, field.type)
    if (parsedSecondValue !== null) {
      if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(secondValue) && parsedSecondValue instanceof Date) {
        const nextDay = new Date(parsedSecondValue)
        nextDay.setUTCDate(nextDay.getUTCDate() + 1)
        return (record) => {
          const startComparison = compareFieldValue(record, parsedValue)
          const endComparison = compareFieldValue(record, nextDay)
          return startComparison !== null && endComparison !== null && startComparison >= 0 && endComparison < 0
        }
      }
      return (record) => {
        const lowerComparison = compareFieldValue(record, parsedValue)
        const upperComparison = compareFieldValue(record, parsedSecondValue)
        return lowerComparison !== null && upperComparison !== null && lowerComparison >= 0 && upperComparison <= 0
      }
    }
  }

  return null
}

app.use('/api/*', logger())

app.get('/api/health', (context) => context.json({
  status: 'ok',
  source: 'files',
  files: {
    companies: 'eign_index.companies.json',
    rounds: 'eign_index.rounds.json',
  },
  records: {
    companies: companyRecords.length,
    rounds: roundRecords.length,
  },
}))

app.patch('/api/records/:collection/:recordId', async (context) => {
  const collection = context.req.param('collection')
  if (collection !== 'companies' && collection !== 'rounds') return context.json({ error: 'Unknown file-backed collection.' }, 404)
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || typeof body.field !== 'string' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected a field and value.' }, 400)
  }

  try {
    const value = await saveJsonCell(collection, context.req.param('recordId'), body.field, body.value)
    if (value === undefined) return context.json({ error: 'The source record no longer exists.' }, 404)
    return context.json({ collection, field: body.field, recordId: context.req.param('recordId'), value })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The value could not be saved.' }, 400)
  }
})

app.get('/api/software-companies', async (context) => {
  const curated = await loadSoftwareCompanyCsv()
  const items = curated.rows.map((row) => ({
    ...row,
    __rowKey: softwareCompanyRowKey(row),
    fit: row.fit === 'false' ? '' : 'true',
    reviewed: row.reviewed === 'true' ? 'true' : '',
    source: row.source === 'kattch' ? 'kattch' : 'linkedin',
  })) as Array<Record<string, string | undefined> & { source: 'linkedin' | 'kattch' }>
  const linkedinRows = items.filter((row) => row.source === 'linkedin')
  const kattchRows = items.filter((row) => row.source === 'kattch')
  const linkedinNames = new Set(linkedinRows.map((row) => normaliseCompanyName(row.company_name ?? '')).filter(Boolean))
  const overlappingNames = new Set(
    kattchRows
      .map((row) => normaliseCompanyName(row.company_name ?? ''))
      .filter((name) => name && linkedinNames.has(name)),
  )

  return context.json({
    columns: curated.columns,
    items,
    summary: {
      total: items.length,
      linkedin: linkedinRows.length,
      kattch: kattchRows.length,
      columns: curated.columns.length,
      exactNameOverlaps: overlappingNames.size,
    },
    sources: {
      curated: 'assets/companies/software-companies-middle-east.csv',
      review: 'assets/companies/software-companies-non-middle-east-review.csv',
    },
  })
})

app.patch('/api/software-companies/fit', async (context) => {
  const body = await context.req.json<{ fit?: unknown; rowKey?: unknown }>().catch(() => null)
  if (!body || typeof body.fit !== 'boolean' || typeof body.rowKey !== 'string') {
    return context.json({ error: 'Expected a company row key and boolean fit value.' }, 400)
  }

  if (!await saveSoftwareCompanyFlag(body.rowKey, 'fit', body.fit)) return context.json({ error: 'The company row no longer exists in the curated CSV.' }, 404)
  return context.json({ fit: body.fit, rowKey: body.rowKey })
})

app.patch('/api/software-companies/reviewed', async (context) => {
  const body = await context.req.json<{ reviewed?: unknown; rowKey?: unknown }>().catch(() => null)
  if (!body || typeof body.reviewed !== 'boolean' || typeof body.rowKey !== 'string') {
    return context.json({ error: 'Expected a company row key and boolean reviewed value.' }, 400)
  }

  if (!await saveSoftwareCompanyFlag(body.rowKey, 'reviewed', body.reviewed)) return context.json({ error: 'The company row no longer exists in the curated CSV.' }, 404)
  return context.json({ reviewed: body.reviewed, rowKey: body.rowKey })
})

app.patch('/api/software-companies/cell', async (context) => {
  const body = await context.req.json<{ field?: unknown; rowKey?: unknown; value?: unknown }>().catch(() => null)
  if (!body || typeof body.field !== 'string' || typeof body.rowKey !== 'string' || typeof body.value !== 'string') {
    return context.json({ error: 'Expected a CSV row key, field, and text value.' }, 400)
  }

  try {
    const saved = await saveSoftwareCompanyCell(body.rowKey, body.field, body.value)
    if (!saved) return context.json({ error: 'The company row no longer exists in the curated CSV.' }, 404)
    return context.json({ field: body.field, ...saved })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The CSV cell could not be saved.' }, 400)
  }
})

app.get('/api/influencers', (context) => context.json({
  items: influencerRecords.map((_, index) => influencerRow(index)),
  meta: {
    source: 'src/influencerData.ts',
    followerSource: 'src/linkedinFollowerData.ts',
    verifiedAt: INFLUENCERS_VERIFIED_AT,
    followersUpdatedAt: LINKEDIN_FOLLOWERS_UPDATED_AT,
  },
}))

app.patch('/api/influencers/:rowId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || typeof body.field !== 'string' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected an influencer field and value.' }, 400)
  }
  try {
    const item = await saveInfluencerCell(context.req.param('rowId'), body.field, body.value)
    if (!item) return context.json({ error: 'The influencer row no longer exists.' }, 404)
    return context.json({ item })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The influencer cell could not be saved.' }, 400)
  }
})

app.get('/api/valid-links', async (context) => {
  try {
    return context.json(await loadValidLinks())
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to load valid links.json.' }, 500)
  }
})

app.get('/api/table-preferences/:tableId', async (context) => {
  const tableId = context.req.param('tableId')
  if (tableId !== 'riseup-speakers') return context.json({ error: 'Unknown table preference ID.' }, 404)
  try {
    const store = await loadTablePreferences()
    return context.json({ tableId, ...(store[tableId] ?? DEFAULT_RISEUP_SPEAKER_PREFERENCE) })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to load table preferences.' }, 500)
  }
})

app.put('/api/table-preferences/:tableId', async (context) => {
  const tableId = context.req.param('tableId')
  if (tableId !== 'riseup-speakers') return context.json({ error: 'Unknown table preference ID.' }, 404)
  const body = await context.req.json<{ columnOrder?: unknown; sort?: unknown }>().catch(() => null)
  if (!body || !Array.isArray(body.columnOrder) || body.columnOrder.length !== RISEUP_SPEAKER_COLUMNS.length) {
    return context.json({ error: 'Expected every RiseUp speaker column exactly once.' }, 400)
  }
  if (!body.columnOrder.every(isRiseUpSpeakerColumn) || new Set(body.columnOrder).size !== RISEUP_SPEAKER_COLUMNS.length) {
    return context.json({ error: 'The RiseUp speaker column order is invalid.' }, 400)
  }
  if (!body.sort || typeof body.sort !== 'object' || Array.isArray(body.sort)) {
    return context.json({ error: 'Expected a RiseUp speaker sort field and direction.' }, 400)
  }
  const sort = body.sort as Record<string, unknown>
  if (!isRiseUpSpeakerColumn(sort.field) || (sort.direction !== 'asc' && sort.direction !== 'desc')) {
    return context.json({ error: 'The RiseUp speaker sort field or direction is invalid.' }, 400)
  }

  const preference: TablePreference = {
    columnOrder: body.columnOrder as RiseUpSpeakerColumn[],
    sort: { field: sort.field, direction: sort.direction },
    updatedAt: new Date().toISOString(),
  }
  try {
    await saveTablePreference(tableId, preference)
    return context.json({ tableId, ...preference })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to save table preferences.' }, 500)
  }
})

app.get('/api/newsletters', async (context) => {
  const newsletterCsv = await loadNewsletterCsv()
  const items = newsletterCsv.rows.flatMap((row, rowIndex) => {
    const newsletter = row.Newsletter?.trim()
    if (!newsletter) return []

    const similarity = Number(row['Similarity to Eign'])
    return [{
      __rowId: String(rowIndex),
      newsletter,
      segment: row.Segment?.trim() ?? '',
      geography: row.Geography?.trim() ?? '',
      postFocus: row['Post Focus & Examples']?.trim() ?? '',
      similarity: Number.isFinite(similarity) ? similarity : null,
      menaRelevance: row['MENA Relevance']?.trim() ?? '',
      howEignCanUseIt: row['How Eign Can Use It']?.trim() ?? '',
      whatEignCanLearn: row['What Eign Can Learn']?.trim() ?? '',
      website: row.Website?.trim() ?? '',
      linkedin: row.LinkedIn?.trim() ?? '',
      linkedinFollowers: row['LinkedIn Followers']?.trim() ?? '',
      linkedinEmployeeRange: row['LinkedIn Employee Range']?.trim() ?? '',
      linkedinMetricsStatus: row['LinkedIn Metrics Status']?.trim() ?? '',
      linkedinMetricsObservedAt: row['LinkedIn Metrics Observed At']?.trim() ?? '',
    }]
  })

  return context.json({
    items,
    summary: {
      total: items.length,
      segments: new Set(items.map((item) => item.segment).filter(Boolean)).size,
      geographies: new Set(items.map((item) => item.geography).filter(Boolean)).size,
      highMenaRelevance: items.filter((item) => item.menaRelevance.toLocaleLowerCase() === 'high').length,
      closestMatches: items.filter((item) => item.similarity === 5).length,
      linkedin: items.filter((item) => item.linkedin).length,
      linkedinFollowers: items.filter((item) => item.linkedinFollowers).length,
      linkedinEmployeeRanges: items.filter((item) => item.linkedinEmployeeRange).length,
    },
    source: 'assets/newsletter-research.csv',
  })
})

app.patch('/api/newsletters/:rowId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || typeof body.field !== 'string' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected a newsletter field and value.' }, 400)
  }
  if (!(body.field in NEWSLETTER_FIELD_COLUMNS)) return context.json({ error: 'That newsletter field is read-only.' }, 400)
  if (body.field === 'similarity' && body.value !== null && (typeof body.value !== 'number' || !Number.isFinite(body.value))) {
    return context.json({ error: 'Similarity must be a number or blank.' }, 400)
  }
  if (body.field !== 'similarity' && typeof body.value !== 'string') return context.json({ error: 'Expected text.' }, 400)

  if (!await saveNewsletterCell(context.req.param('rowId'), body.field as NewsletterField, body.value as string | number | null)) {
    return context.json({ error: 'The newsletter row no longer exists.' }, 404)
  }
  return context.json({ field: body.field, rowId: context.req.param('rowId'), value: body.value })
})

const groupCompanyData = (field: string, outputField: string) => {
  const groups = new Map<string, { companies: number; fundingUsd: number }>()
  for (const company of companyRecords) {
    const name = asString(company[field]) || 'Unclassified'
    const current = groups.get(name) ?? { companies: 0, fundingUsd: 0 }
    current.companies += 1
    current.fundingUsd += asNumber(company.totalFundingUsd)
    groups.set(name, current)
  }
  return [...groups.entries()]
    .sort(([leftName, left], [rightName, right]) => right.companies - left.companies || leftName.localeCompare(rightName))
    .map(([name, values]) => ({ [outputField]: name, ...values }))
}

app.get('/api/dashboard', (context) => {
  const totalFundingUsd = companyRecords.reduce((sum, company) => sum + asNumber(company.totalFundingUsd), 0)
  const fundedCompanies = companyRecords.filter((company) => asNumber(company.totalFundingUsd) > 0).length
  const reconciledCompanies = companyRecords.filter((company) => company.fundingReconciliationStatus === 'reconciled').length
  const industries = groupCompanyData('industry', 'industry')
  const batches = groupCompanyData('batch', 'batch')

  const timelineGroups = new Map<string, { fundingUsd: number; rounds: number }>()
  const stageGroups = new Map<string, { fundingUsd: number; rounds: number }>()
  for (const round of roundRecords) {
    if (round.recordType !== 'financing_event') continue
    const stage = asString(round.roundStage) || 'Unspecified'
    const stageGroup = stageGroups.get(stage) ?? { fundingUsd: 0, rounds: 0 }
    stageGroup.rounds += 1
    stageGroup.fundingUsd += asNumber(round.amountUsd)
    stageGroups.set(stage, stageGroup)

    if (round.announcementDate instanceof Date && typeof round.amountUsd === 'number') {
      const month = round.announcementDate.toISOString().slice(0, 7)
      const timelineGroup = timelineGroups.get(month) ?? { fundingUsd: 0, rounds: 0 }
      timelineGroup.rounds += 1
      timelineGroup.fundingUsd += round.amountUsd
      timelineGroups.set(month, timelineGroup)
    }
  }

  const timeline = [...timelineGroups.entries()]
    .map(([month, values]) => ({ month, ...values }))
    .sort((left, right) => left.month.localeCompare(right.month))
  const stages = [...stageGroups.entries()]
    .map(([stage, values]) => ({ stage, ...values }))
    .sort((left, right) => right.rounds - left.rounds || left.stage.localeCompare(right.stage))
  const topCompanies = sortRecords(companyRecords, [['totalFundingUsd', -1], ['name', 1]])
    .slice(0, 8)
    .map((company) => ({
      __recordId: idString(company._id),
      ...pick(company, ['name', 'slug', 'logoUrl', 'industry', 'batch', 'totalFundingUsd']),
    }))
  const recentRounds = sortRecords(
    roundRecords.filter((round) => round.announcementDate instanceof Date),
    [['announcementDate', -1]],
  )
    .slice(0, 8)
    .map((round) => {
      const company = companyById.get(idString(round.companyId))
      return {
        __recordId: idString(round._id),
        companyRecordId: company ? idString(company._id) : null,
        companySlug: round.companySlug,
        companyName: company?.name ?? round.companySlug,
        logoUrl: company?.logoUrl,
        round: round.round,
        roundStage: round.roundStage,
        amountUsd: round.amountUsd,
        announcementDate: round.announcementDate,
      }
    })
  const updatedAt = companyRecords.reduce<Date | null>((latest, company) => {
    const value = company.updatedAt
    return value instanceof Date && (!latest || value > latest) ? value : latest
  }, null)

  return context.json({
    summary: {
      companies: companyRecords.length,
      rounds: roundRecords.length,
      totalFundingUsd,
      fundedCompanies,
      reconciledCompanies,
      updatedAt,
    },
    industries,
    batches,
    timeline,
    stages,
    topCompanies,
    recentRounds,
  })
})

app.get('/api/visualisations/funding-landscape', (context) => {
  const rows = sortRecords(companyRecords, [['totalFundingUsd', -1], ['name', 1]])
  const grouped = new Map<string, DataRecord[]>()
  for (const company of rows) {
    const industry = asString(company.industry).trim() || 'Unclassified'
    const group = grouped.get(industry) ?? []
    group.push(company)
    grouped.set(industry, group)
  }

  const individuallyNamedIds = new Set(
    rows
      .filter((company) => asNumber(company.totalFundingUsd) > 0)
      .slice(0, 80)
      .map((company) => idString(company._id)),
  )

  for (const industryRows of grouped.values()) {
    industryRows
      .filter((company) => asNumber(company.totalFundingUsd) > 0)
      .sort((left, right) => asNumber(right.totalFundingUsd) - asNumber(left.totalFundingUsd))
      .slice(0, 2)
      .forEach((company) => individuallyNamedIds.add(idString(company._id)))
  }

  type LandscapeCompany = {
    name: string
    slug: string | null
    logoUrl: string | null
    website: string | null
    fundingUsd: number
    fundingTotalType: string
    primaryFundingBasis: string
    aggregatedCompanyCount?: number
  }

  const industries = [...grouped.entries()]
    .map(([name, industryRows]) => {
      const sorted = sortRecords(industryRows, [['totalFundingUsd', -1]])
      const named: LandscapeCompany[] = sorted
        .filter((company) => individuallyNamedIds.has(idString(company._id)) && asNumber(company.totalFundingUsd) > 0)
        .map((company) => ({
          name: asString(company.name) || asString(company.slug) || 'Unnamed company',
          slug: asString(company.slug) || null,
          logoUrl: asString(company.logoUrl) || null,
          website: asString(company.website) || null,
          fundingUsd: asNumber(company.totalFundingUsd),
          fundingTotalType: asString(company.fundingTotalType) || 'Recorded total',
          primaryFundingBasis: asString(company.primaryFundingBasis) || 'Funding evidence on file',
        }))
      const remainder = sorted.filter((company) => !individuallyNamedIds.has(idString(company._id)))
      const remainderFundingUsd = remainder.reduce((sum, company) => sum + asNumber(company.totalFundingUsd), 0)

      if (remainder.length && remainderFundingUsd > 0) {
        named.push({
          name: `Other ${remainder.length} companies`,
          slug: null,
          logoUrl: null,
          website: null,
          fundingUsd: remainderFundingUsd,
          fundingTotalType: 'Aggregated remainder',
          primaryFundingBasis: 'Sum of remaining company totals',
          aggregatedCompanyCount: remainder.length,
        })
      }

      return {
        name,
        companyCount: industryRows.length,
        fundingUsd: industryRows.reduce((sum, company) => sum + asNumber(company.totalFundingUsd), 0),
        companies: named,
      }
    })
    .filter((industry) => industry.fundingUsd > 0)
    .sort((left, right) => right.fundingUsd - left.fundingUsd)

  const totalFundingUsd = rows.reduce((sum, company) => sum + asNumber(company.totalFundingUsd), 0)
  const fundedCompanyCount = rows.filter((company) => asNumber(company.totalFundingUsd) > 0).length
  const namedCompanyCount = industries.reduce(
    (sum, industry) => sum + industry.companies.filter((company) => !company.aggregatedCompanyCount).length,
    0,
  )

  return context.json({
    summary: {
      companyCount: rows.length,
      fundedCompanyCount,
      totalFundingUsd,
      namedCompanyCount,
      aggregatedCompanyCount: rows.length - namedCompanyCount,
    },
    industries,
  })
})

const sortOptions: Record<string, SortSpec> = {
  funding_desc: [['totalFundingUsd', -1], ['name', 1]],
  funding_asc: [['totalFundingUsd', 1], ['name', 1]],
  name_asc: [['name', 1]],
  name_desc: [['name', -1]],
}

app.get('/api/companies', (context) => {
  const query = context.req.query()
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1)
  const limit = Math.min(50, Math.max(5, Number.parseInt(query.limit ?? '15', 10) || 15))
  const search = query.q?.trim().slice(0, 80).toLocaleLowerCase()

  const matched = companyRecords.filter((company) => {
    if (search && !['name', 'slug', 'summary'].some((field) => asString(company[field]).toLocaleLowerCase().includes(search))) return false
    if (query.industry && company.industry !== query.industry) return false
    if (query.batch && company.batch !== query.batch) return false
    return true
  })
  const sorted = sortRecords(matched, sortOptions[query.sort ?? 'funding_desc'] ?? sortOptions.funding_desc)
  const items = sorted.slice((page - 1) * limit, page * limit).map((company) => {
    const companyRounds = sortRecords(roundsByCompanyId.get(idString(company._id)) ?? [], [
      ['announcementDate', -1],
      ['createdAt', -1],
    ])
    const latestRound = companyRounds[0]
    return {
      __recordId: idString(company._id),
      ...pick(company, [
        'name',
        'slug',
        'logoUrl',
        'industry',
        'businessType',
        'batch',
        'totalFundingUsd',
        'fundingTotalType',
        'fundingReconciliationStatus',
        'summary',
        'website',
      ]),
      roundCount: companyRounds.length,
      ...(latestRound ? { latestRound: pick(latestRound, ['amountUsd', 'announcementDate', 'roundStage']) } : {}),
    }
  })

  return context.json({
    items,
    pagination: {
      page,
      limit,
      total: matched.length,
      pages: Math.max(1, Math.ceil(matched.length / limit)),
    },
  })
})

app.get('/api/companies/:slug', (context) => {
  const company = companyRecords.find((record) => record.slug === context.req.param('slug'))
  if (!company) return context.json({ error: 'Company not found' }, 404)

  const companyRounds = sortRecords(roundsByCompanyId.get(idString(company._id)) ?? [], [
    ['announcementDate', -1],
    ['amountUsd', -1],
  ]).map((round) => ({
    __recordId: idString(round._id),
    ...omit(round, ['_id', 'companyId', 'notionId', 'createdAt', 'updatedAt']),
  }))

  return context.json({
    company: { __recordId: idString(company._id), ...omit(company, ['_id', 'notionId']) },
    rounds: companyRounds,
  })
})

app.get('/api/research/schema', (context) => {
  const facetEntries = FACET_FIELDS.map((field) => {
    const values = new Set<string>()
    for (const company of companyRecords) {
      const value = company[field]
      if (Array.isArray(value)) value.forEach((entry) => values.add(String(entry)))
      else if (value !== null && value !== undefined && value !== '') values.add(String(value))
    }
    return [field, [...values].sort((left, right) => left.localeCompare(right))] as const
  })

  return context.json({
    collection: 'companies',
    fields: companySchema,
    facets: Object.fromEntries(facetEntries),
  })
})

app.post('/api/research/companies/query', async (context) => {
  const body: ResearchQueryBody = await context.req.json<ResearchQueryBody>().catch(() => ({}))
  const fieldMap = new Map(companySchema.map((field) => [field.name, field]))
  const page = Math.max(1, Math.floor(Number(body.page) || 1))
  const limit = Math.min(100, Math.max(10, Math.floor(Number(body.limit) || 25)))
  const filters = Array.isArray(body.filters) ? body.filters.slice(0, 30) : []
  const predicates = filters
    .map((filter) => {
      const field = fieldMap.get(filter.field)
      return field ? buildResearchPredicate(filter, field) : null
    })
    .filter((predicate): predicate is ResearchPredicate => predicate !== null)
  const search = body.search?.trim().slice(0, 120)

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i')
    const textFields = companySchema.filter((field) => field.type === 'string').map((field) => field.name)
    predicates.push((record) => textFields.some((field) => typeof record[field] === 'string' && regex.test(record[field] as string)))
  }

  const matched = companyRecords.filter((record) => predicates.every((predicate) => predicate(record)))
  const sortField = body.sortField && fieldMap.has(body.sortField) ? body.sortField : 'name'
  const sortDirection = body.sortDirection === 'desc' ? -1 : 1
  const items = sortRecords(matched, [[sortField, sortDirection], ['_id', 1]])
    .slice((page - 1) * limit, page * limit)
    .map((record) => ({ ...record, __recordId: idString(record._id) }))

  return context.json({
    items,
    pagination: {
      page,
      limit,
      total: matched.length,
      pages: Math.max(1, Math.ceil(matched.length / limit)),
    },
    fieldCount: companySchema.length,
    appliedFilterCount: predicates.length,
  })
})

app.onError((error, context) => {
  console.error(error)
  return context.json({ error: 'The local file data service could not complete this request.' }, 500)
})

