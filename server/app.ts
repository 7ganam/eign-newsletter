import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { csvFormat, csvParse } from 'd3'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import middleEastFoundersData from '../assets/people/middle-east-founders.json'
import unifiedPeopleData from '../assets/people/unified-people.json'
import { newsletterTargetGroupOptions } from '../src/newsletterTargetGroups'
import { createIndustryGroup, loadIndustryTaxonomy, updateIndustryGroup } from './industryTaxonomy'
import { loadLeadResearch, saveLeadEngagementCell, saveLeadEngagementEvent, saveLeadResearchLeadCell, saveLeadResearchResourceCell, saveLeadResearchStrategyCell } from './leadResearch'
import {
  isVcPerson,
  primaryVcAffiliation,
  vcAffiliations,
  vcPeopleResearchRaw,
  vcPeopleView,
} from '../src/vcPeopleData'
import type { VcPeopleManualOverrides } from '../src/vcPeopleData'
import type {
  Influencer,
  LinkedInFollowerSnapshot,
  NewsletterTargetGroup,
  NewsletterTargetGroupOption,
  UnifiedFollowerSnapshot,
  UnifiedPeopleFile,
  UnifiedPerson,
} from '../src/unifiedPeopleTypes'

const PROJECT_ROOT = process.env.VERCEL
  ? process.cwd()
  : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILES = {
  companies: resolve(PROJECT_ROOT, 'data/companies/web-search-startups.json'),
  rounds: resolve(PROJECT_ROOT, 'data/funding/web-search-startup-funding-rounds.json'),
} as const
const TABLE_PREFERENCES_FILE = resolve(PROJECT_ROOT, 'assets/table-preferences.json')
const TABLE_ARCHIVES_FILE = resolve(PROJECT_ROOT, 'assets/table-archives.json')
const UNIFIED_PEOPLE_FILE = resolve(PROJECT_ROOT, 'assets/people/unified-people.json')
const MIDDLE_EAST_FOUNDERS_FILE = resolve(PROJECT_ROOT, 'assets/people/middle-east-founders.json')
const MIDDLE_EAST_FOUNDER_EDITS_FILE = resolve(PROJECT_ROOT, 'assets/people/middle-east-founder-edits.json')
const MIDDLE_EAST_CRUNCHBASE_FILE = resolve(
  PROJECT_ROOT,
  'data/companies/crunchbase-middle-east-company-profiles.json',
)
const YC_CRUNCHBASE_SNAPSHOT_FILE = resolve(PROJECT_ROOT, 'data/companies/crunchbase-yc-company-profiles.json')
const YC_INDUSTRY_FUNDING_POST_FILE = resolve(PROJECT_ROOT, 'data/industry-funding/crunchbase-yc-industry-funding-by-year.json')
const YC_INDUSTRY_CHART_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-flourish-all-time-smoothed.tsv')
const YC_INDUSTRY_GROUPS_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-groups.json')
const INDUSTRY_TAXONOMY_PATHS = {
  chartFile: YC_INDUSTRY_CHART_FILE,
  groupFile: YC_INDUSTRY_GROUPS_FILE,
  snapshotFile: YC_CRUNCHBASE_SNAPSHOT_FILE,
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
  'target',
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
  if (!seen.has('target')) {
    const speakerIndex = columnOrder.indexOf('speaker')
    columnOrder.splice(speakerIndex >= 0 ? speakerIndex + 1 : columnOrder.length, 0, 'target')
    seen.add('target')
  }
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

type TableArchiveStore = {
  schema_version: 'table-archives.v1'
  updated_at: string | null
  tables: Record<string, { archived_ids: string[]; updated_at: string | null }>
}

const emptyTableArchiveStore = (): TableArchiveStore => ({
  schema_version: 'table-archives.v1',
  updated_at: null,
  tables: {},
})

const validateArchiveTableId = (value: string) => {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) throw new Error('The archive table ID is invalid.')
  return value
}

const normaliseArchiveRowIds = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Choose at least one row to archive.')
  if (value.length > 10_000) throw new Error('Too many rows were selected at once.')
  const ids = value.map((entry) => {
    if (typeof entry !== 'string' || !entry || entry.length > 1_000) throw new Error('One or more row IDs are invalid.')
    return entry
  })
  return [...new Set(ids)]
}

const loadTableArchives = async (): Promise<TableArchiveStore> => {
  try {
    const parsed = JSON.parse(await readFile(TABLE_ARCHIVES_FILE, 'utf8')) as Partial<TableArchiveStore>
    const tables = parsed.tables && typeof parsed.tables === 'object' && !Array.isArray(parsed.tables)
      ? Object.fromEntries(Object.entries(parsed.tables).flatMap(([tableId, value]) => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) return []
          const record = value as { archived_ids?: unknown; updated_at?: unknown }
          const archivedIds = Array.isArray(record.archived_ids)
            ? [...new Set(record.archived_ids.filter((id): id is string => typeof id === 'string' && Boolean(id)))]
            : []
          return [[tableId, {
            archived_ids: archivedIds,
            updated_at: typeof record.updated_at === 'string' ? record.updated_at : null,
          }]]
        }))
      : {}
    return {
      schema_version: 'table-archives.v1',
      updated_at: typeof parsed.updated_at === 'string' ? parsed.updated_at : null,
      tables,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyTableArchiveStore()
    throw error
  }
}

let tableArchiveWriteQueue = Promise.resolve()
const updateTableArchives = async (tableId: string, rowIds: string[], archived: boolean) => {
  let updatedTable: TableArchiveStore['tables'][string] | undefined
  const operation = tableArchiveWriteQueue.then(async () => {
    const store = await loadTableArchives()
    const archivedIds = new Set(store.tables[tableId]?.archived_ids ?? [])
    rowIds.forEach((rowId) => archived ? archivedIds.add(rowId) : archivedIds.delete(rowId))
    const updatedAt = new Date().toISOString()
    updatedTable = { archived_ids: [...archivedIds].sort(), updated_at: updatedAt }
    store.tables[tableId] = updatedTable
    store.updated_at = updatedAt
    const tempPath = `${TABLE_ARCHIVES_FILE}.${process.pid}.tmp`
    try {
      await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
      await rename(tempPath, TABLE_ARCHIVES_FILE)
    } catch (error) {
      await unlink(tempPath).catch(() => undefined)
      throw error
    }
  })
  tableArchiveWriteQueue = operation.catch(() => undefined)
  await operation
  return updatedTable!
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

type MiddleEastCrunchbaseSnapshot = {
  items: DataRecord[]
  updatedAt: string
  version: number
}

const loadMiddleEastCrunchbaseSnapshot = async (): Promise<MiddleEastCrunchbaseSnapshot> => {
  const parsed: unknown = JSON.parse(await readFile(MIDDLE_EAST_CRUNCHBASE_FILE, 'utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The Middle East Crunchbase snapshot is not a JSON object.')
  }
  const snapshot = parsed as Partial<MiddleEastCrunchbaseSnapshot>
  if (!Array.isArray(snapshot.items)) {
    throw new Error('The Middle East Crunchbase profile snapshot has no items array.')
  }
  return {
    items: snapshot.items,
    updatedAt: typeof snapshot.updatedAt === 'string' ? snapshot.updatedAt : '',
    version: typeof snapshot.version === 'number' ? snapshot.version : 1,
  }
}

type PulledCrunchbaseCompany = {
  crunchbaseUrl: string
  detailedRoundCount: string
  employeeRange: string
  estimatedRevenueRange: string
  foundedYear: string
  founders: string
  headquarters: string
  industries: string
  investorCount: string
  investors: string
  lastFundingDate: string
  lastFundingType: string
  name: string
  operatingStatus: string
  ownershipStatus: string
  reportedRoundCount: string
  shortDescription: string
  source: string
  totalRaisedUsd: string
  website: string
}

type PulledCrunchbaseSnapshot = {
  createdAt: string
  inputFile: string
  items: PulledCrunchbaseCompany[]
  updatedAt: string
  version: number
}

let pulledCrunchbaseSnapshotPromise: Promise<PulledCrunchbaseSnapshot> | undefined

const loadPulledCrunchbaseSnapshot = () => {
  if (pulledCrunchbaseSnapshotPromise) return pulledCrunchbaseSnapshotPromise
  pulledCrunchbaseSnapshotPromise = (async () => {
    const parsed: unknown = JSON.parse(await readFile(YC_CRUNCHBASE_SNAPSHOT_FILE, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('The YC Crunchbase table snapshot is not a JSON object.')
    }
    const snapshot = parsed as Partial<PulledCrunchbaseSnapshot>
    if (!Array.isArray(snapshot.items)) throw new Error('The YC Crunchbase table snapshot has no items array.')
    return {
      createdAt: asString(snapshot.createdAt),
      inputFile: asString(snapshot.inputFile) || 'crunchbase-yc-company-urls.json',
      items: snapshot.items,
      updatedAt: asString(snapshot.updatedAt),
      version: asNumber(snapshot.version) || 1,
    }
  })().catch((error) => {
    pulledCrunchbaseSnapshotPromise = undefined
    throw error
  })
  return pulledCrunchbaseSnapshotPromise
}

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

const VALID_LINKS_FILE = resolve(PROJECT_ROOT, 'data/company-urls/crunchbase-yc-company-urls.json')

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
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array in crunchbase-yc-company-urls.json')

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
    source: 'data/company-urls/crunchbase-yc-company-urls.json',
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

type FounderTier = 1 | 2 | 3
type FounderEditableField =
  | 'companies'
  | 'editorial_order'
  | 'founder_role'
  | 'followers'
  | 'influence_signal'
  | 'linkedin_url'
  | 'name'
  | 'primary_market'
  | 'sector'
  | 'source_url'
  | 'target'
  | 'tier'
  | 'why_selected'

type MiddleEastFounderRow = {
  companies: string[]
  editorial_order: number
  evidence: { label: string; observed_at: string; url: string }
  founder_role: string
  followers: number | null
  id: string
  influence_signal: string
  linkedin_review: {
    confidence: string | null
    evidence: string
    observed_at: string
    profile_name: string | null
    source: string
    status: 'unresolved' | 'verified'
  }
  linkedin_url: string | null
  name: string
  primary_market: string
  sector: string
  source: 'founder-search'
  target: boolean
  tier: FounderTier
  tier_label: string
  why_selected: string
}

type MiddleEastFoundersFile = {
  generated_at: string
  rows: MiddleEastFounderRow[]
  stats: Record<string, number>
  [key: string]: unknown
}

type FounderRowOverride = Partial<{
  companies: string[]
  editorial_order: number
  founder_role: string
  followers: number | null
  influence_signal: string
  linkedin_url: string | null
  name: string
  primary_market: string
  sector: string
  source_url: string
  target: boolean
  tier: FounderTier
  why_selected: string
}>

type FounderEditsFile = {
  rows: Record<string, FounderRowOverride>
  schema_version: 'middle-east-founder-edits.v1'
  updated_at: string | null
}

const FOUNDER_TIER_LABELS: Record<FounderTier, string> = {
  1: 'Region shaper',
  2: 'Category leader',
  3: 'Breakout builder',
}

const FOUNDER_EDITABLE_FIELDS = new Set<FounderEditableField>([
  'companies',
  'editorial_order',
  'founder_role',
  'followers',
  'influence_signal',
  'linkedin_url',
  'name',
  'primary_market',
  'sector',
  'source_url',
  'target',
  'tier',
  'why_selected',
])

const isFounderEditableField = (value: unknown): value is FounderEditableField =>
  typeof value === 'string' && FOUNDER_EDITABLE_FIELDS.has(value as FounderEditableField)

const cleanFounderText = (value: unknown, label: string, allowEmpty = false) => {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`)
  const cleaned = value.trim()
  if (!allowEmpty && !cleaned) throw new Error(`${label} cannot be empty.`)
  return cleaned
}

const canonicalFounderLinkedInUrl = (value: string) => {
  const parsed = new URL(value)
  const host = parsed.hostname.toLowerCase()
  const pathParts = parsed.pathname.split('/').filter(Boolean)
  if (!(host === 'linkedin.com' || host.endsWith('.linkedin.com')) || pathParts[0] !== 'in' || !pathParts[1]) {
    throw new Error('LinkedIn must be a personal linkedin.com/in profile URL.')
  }
  return `https://www.linkedin.com/in/${pathParts[1]}`
}

const founderCompanies = (value: unknown) => {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\s*(?:·|,|;|\n)\s*/)
      : []
  const companies = values.flatMap((entry) => typeof entry === 'string' && entry.trim() ? [entry.trim()] : [])
  if (!companies.length) throw new Error('Companies must contain at least one name.')
  return [...new Set(companies)]
}

const founderHttpsUrl = (value: unknown) => {
  const cleaned = cleanFounderText(value, 'Evidence URL')
  const url = new URL(cleaned)
  if (url.protocol !== 'https:') throw new Error('Evidence URL must use HTTPS.')
  return url.toString()
}

const normaliseFounderEdit = (field: FounderEditableField, value: unknown): FounderRowOverride[FounderEditableField] => {
  if (field === 'editorial_order') {
    const order = Number(value)
    if (!Number.isInteger(order) || order < 1) throw new Error('Order must be a positive whole number.')
    return order
  }
  if (field === 'tier') {
    const tier = Number(value)
    if (tier !== 1 && tier !== 2 && tier !== 3) throw new Error('Tier must be 1, 2, or 3.')
    return tier
  }
  if (field === 'followers') {
    if (value === null || value === '') return null
    const followers = Number(value)
    if (!Number.isInteger(followers) || followers < 0) throw new Error('Followers must be a non-negative whole number.')
    return followers
  }
  if (field === 'target') {
    if (typeof value !== 'boolean') throw new Error('Target must be true or false.')
    return value
  }
  if (field === 'companies') return founderCompanies(value)
  if (field === 'linkedin_url') {
    if (value === null || value === '') return null
    return canonicalFounderLinkedInUrl(cleanFounderText(value, 'LinkedIn URL'))
  }
  if (field === 'source_url') return founderHttpsUrl(value)
  if (field === 'why_selected' || field === 'influence_signal') return cleanFounderText(value, field === 'why_selected' ? 'Why selected' : 'Influence signal', true)
  const labels: Record<Exclude<FounderEditableField, 'companies' | 'editorial_order' | 'followers' | 'influence_signal' | 'linkedin_url' | 'source_url' | 'target' | 'tier' | 'why_selected'>, string> = {
    founder_role: 'Founder role',
    name: 'Name',
    primary_market: 'Primary market',
    sector: 'Sector',
  }
  return cleanFounderText(value, labels[field])
}

const loadFounderEdits = async (): Promise<FounderEditsFile> => {
  try {
    const parsed = JSON.parse(await readFile(MIDDLE_EAST_FOUNDER_EDITS_FILE, 'utf8')) as FounderEditsFile
    if (parsed.schema_version !== 'middle-east-founder-edits.v1' || !parsed.rows || typeof parsed.rows !== 'object') {
      throw new Error('Founder edits file has an invalid schema.')
    }
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { schema_version: 'middle-east-founder-edits.v1', updated_at: null, rows: {} }
    }
    throw error
  }
}

const writeFounderJson = async (path: string, value: unknown) => {
  const tempPath = `${path}.${process.pid}.tmp`
  try {
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(tempPath, path)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}

const founderStats = (rows: MiddleEastFounderRow[], previous: Record<string, number>) => ({
  ...previous,
  people: rows.length,
  tier_1: rows.filter((row) => row.tier === 1).length,
  tier_2: rows.filter((row) => row.tier === 2).length,
  tier_3: rows.filter((row) => row.tier === 3).length,
  primary_markets: new Set(rows.map((row) => row.primary_market)).size,
  sectors: new Set(rows.map((row) => row.sector)).size,
  linkedin_profiles_verified: rows.filter((row) => row.linkedin_url).length,
  linkedin_profiles_from_unified_people_exact: rows.filter((row) => row.linkedin_review.source === 'unified-people-exact-match').length,
  linkedin_profiles_from_unified_people_alias: rows.filter((row) => row.linkedin_review.source === 'unified-people-alias-match').length,
  linkedin_profiles_from_public_search: rows.filter((row) => row.linkedin_review.source === 'linkedin-public-search' && row.linkedin_review.status === 'verified').length,
  linkedin_profiles_unresolved: rows.filter((row) => !row.linkedin_url).length,
  linkedin_followers_filled: rows.filter((row) => row.followers !== null).length,
  targets_selected: rows.filter((row) => row.target).length,
  rows_with_sources: rows.filter((row) => row.source === 'founder-search').length,
  rows_with_evidence: rows.filter((row) => row.evidence.url).length,
})

let middleEastFoundersFile = structuredClone(middleEastFoundersData) as MiddleEastFoundersFile
let middleEastFoundersWriteQueue = Promise.resolve()

const saveMiddleEastFounderCell = async (founderId: string, field: FounderEditableField, value: unknown) => {
  const operation = middleEastFoundersWriteQueue.then(async () => {
    const rowIndex = middleEastFoundersFile.rows.findIndex((row) => row.id === founderId)
    if (rowIndex < 0) return null

    const normalizedValue = normaliseFounderEdit(field, value)
    const nextFile = structuredClone(middleEastFoundersFile)
    const current = nextFile.rows[rowIndex]
    const next = { ...current }

    if (field === 'source_url') {
      next.evidence = { ...next.evidence, url: normalizedValue as string }
    } else if (field === 'tier') {
      next.tier = normalizedValue as FounderTier
      next.tier_label = FOUNDER_TIER_LABELS[next.tier]
    } else if (field === 'linkedin_url') {
      const linkedinUrl = normalizedValue as string | null
      const today = new Date().toISOString().slice(0, 10)
      next.linkedin_url = linkedinUrl
      next.linkedin_review = linkedinUrl ? {
        status: 'verified',
        profile_name: next.name,
        confidence: 'high',
        source: 'manual-ui',
        evidence: 'Personal LinkedIn profile URL manually edited in the founders table.',
        observed_at: today,
      } : {
        status: 'unresolved',
        profile_name: null,
        confidence: null,
        source: 'manual-ui',
        evidence: 'Personal LinkedIn profile URL manually cleared in the founders table.',
        observed_at: today,
      }
    } else {
      Object.assign(next, { [field]: normalizedValue })
    }

    const nextRows = nextFile.rows.map((row, index) => index === rowIndex ? next : row)
    if (!nextRows.every((row) => row.source === 'founder-search')) throw new Error('Founder provenance must remain founder-search.')
    if (new Set(nextRows.map((row) => row.editorial_order)).size !== nextRows.length) throw new Error('Order values must remain unique.')
    if (new Set(nextRows.map((row) => row.name.trim().toLocaleLowerCase())).size !== nextRows.length) throw new Error('Founder names must remain unique.')
    const linkedInUrls = nextRows.flatMap((row) => row.linkedin_url ? [row.linkedin_url] : [])
    if (new Set(linkedInUrls).size !== linkedInUrls.length) throw new Error('LinkedIn profile URLs must remain unique.')

    const now = new Date().toISOString()
    nextFile.rows = nextRows
    nextFile.generated_at = now
    nextFile.stats = founderStats(nextRows, nextFile.stats)

    const edits = await loadFounderEdits()
    edits.rows[founderId] = { ...edits.rows[founderId], [field]: normalizedValue }
    edits.updated_at = now
    await writeFounderJson(MIDDLE_EAST_FOUNDER_EDITS_FILE, edits)
    await writeFounderJson(MIDDLE_EAST_FOUNDERS_FILE, nextFile)
    middleEastFoundersFile = nextFile
    return next
  })
  middleEastFoundersWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

type ActiveInfluencer = Pick<Influencer, 'name' | 'country' | 'lane' | 'organisation' | 'linkedinUrl' | 'priority'>

type InfluencerRow = ActiveInfluencer & {
  __rowId: string
  follower: LinkedInFollowerSnapshot
}

type WebSearchRawRecord = {
  directory: Influencer
  follower: UnifiedFollowerSnapshot
  followers_updated_at: string
}

let unifiedPeopleFile = structuredClone(unifiedPeopleData) as UnifiedPeopleFile
type PeopleSourceRecord = UnifiedPerson['source_records'][number]
type WebSearchEntry = {
  person: UnifiedPerson
  sourceRecord: PeopleSourceRecord
  raw: WebSearchRawRecord
}

const webSearchEntriesFrom = (file: UnifiedPeopleFile): WebSearchEntry[] => file.people.flatMap((person) =>
  person.source_records
    .filter((sourceRecord) => sourceRecord.source_id === 'web-search')
    .map((sourceRecord) => ({
      person,
      sourceRecord,
      raw: sourceRecord.raw as WebSearchRawRecord,
    })),
)

const influencerFromEntry = ({ person, raw }: WebSearchEntry): ActiveInfluencer => {
  const rawDirectory = raw.directory
  return {
    name: rawDirectory.name ?? person.name.display,
    country: rawDirectory.country ?? person.location.country as Influencer['country'] ?? 'Regional',
    lane: rawDirectory.lane ?? person.influence.lane as Influencer['lane'] ?? 'Ecosystem',
    organisation: rawDirectory.organisation ?? person.current_role.organization ?? 'Unknown',
    linkedinUrl: rawDirectory.linkedinUrl ?? '',
    priority: rawDirectory.priority ?? person.influence.priority ?? false,
  }
}

const followerFromEntry = ({ raw }: WebSearchEntry): LinkedInFollowerSnapshot => {
  const follower = raw.follower
  return follower ? {
    count: follower.count,
    observedAt: follower.observed_at,
    status: follower.status,
    precision: follower.precision ?? undefined,
    source: follower.source ?? undefined,
  } : {
    count: null,
    observedAt: null,
    status: 'not-verified',
  }
}

let webSearchEntries = webSearchEntriesFrom(unifiedPeopleFile)
let influencerRecords = webSearchEntries.map(influencerFromEntry)
let influencerFollowerSnapshots = webSearchEntries.map(followerFromEntry)
let unifiedPeopleWriteQueue = Promise.resolve()

const refreshUnifiedPeopleFile = async () => {
  unifiedPeopleFile = JSON.parse(await readFile(UNIFIED_PEOPLE_FILE, 'utf8')) as UnifiedPeopleFile
  webSearchEntries = webSearchEntriesFrom(unifiedPeopleFile)
  influencerRecords = webSearchEntries.map(influencerFromEntry)
  influencerFollowerSnapshots = webSearchEntries.map(followerFromEntry)
}

const influencerRow = (index: number): InfluencerRow => ({
  ...influencerRecords[index],
  __rowId: String(index),
  follower: influencerFollowerSnapshots[index],
})

const saveUnifiedPeopleFile = async () => {
  const tempPath = `${UNIFIED_PEOPLE_FILE}.${process.pid}.tmp`
  try {
    await writeFile(tempPath, `${JSON.stringify(unifiedPeopleFile, null, 2)}\n`, 'utf8')
    await rename(tempPath, UNIFIED_PEOPLE_FILE)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}

const canonicalLinkedInProfileUrl = (value: string) => {
  try {
    const url = new URL(value)
    return `linkedin.com${url.pathname.toLocaleLowerCase().replace(/\/$/, '')}`
  } catch {
    return value.toLocaleLowerCase().replace(/[?#].*$/, '').replace(/\/$/, '')
  }
}

const linkedInProfileForEntry = ({ person, raw }: WebSearchEntry) => {
  const profileKey = canonicalLinkedInProfileUrl(raw.directory.linkedinUrl)
  return person.profiles.find((profile) => canonicalLinkedInProfileUrl(profile.url) === profileKey)
    ?? person.profiles.find((profile) => profile.platform === 'linkedin')
}

const COUNTRY_CODES: Partial<Record<Influencer['country'], string>> = {
  Bahrain: 'BH',
  Egypt: 'EG',
  Kuwait: 'KW',
  Oman: 'OM',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
}

const saveInfluencerRecord = async (index: number, record: ActiveInfluencer) => {
  const entry = webSearchEntries[index]
  if (!entry) throw new Error('The influencer row could not be located in assets/people/unified-people.json.')
  const { person, raw, sourceRecord } = entry
  const linkedIn = linkedInProfileForEntry(entry)

  person.name.display = record.name
  person.current_role.organization = record.organisation
  person.location.country = record.country === 'Regional' ? null : record.country
  person.location.country_code = COUNTRY_CODES[record.country] ?? null
  person.influence.lane = record.lane
  person.influence.priority = record.priority
  if (linkedIn) linkedIn.url = record.linkedinUrl
  sourceRecord.source_url = record.linkedinUrl
  raw.directory = { ...raw.directory, ...structuredClone(record) }
  unifiedPeopleFile.generated_at = new Date().toISOString()
  await saveUnifiedPeopleFile()
}

const saveFollowerCount = async (index: number, count: number | null) => {
  const entry = webSearchEntries[index]
  if (!entry) throw new Error('The follower row could not be located in assets/people/unified-people.json.')
  const linkedIn = linkedInProfileForEntry(entry)
  if (!linkedIn) throw new Error('The combined influencer record has no LinkedIn profile.')
  const today = new Date().toISOString().slice(0, 10)
  const snapshot: UnifiedFollowerSnapshot = count === null ? {
    count: null,
    observed_at: null,
    status: 'not-verified',
    precision: null,
    source: null,
  } : {
    count,
    observed_at: today,
    status: 'observed',
    precision: 'exact',
    source: 'linkedin-profile',
  }
  linkedIn.followers = snapshot
  entry.raw.follower = structuredClone(snapshot)
  entry.raw.followers_updated_at = today
  unifiedPeopleFile.generated_at = new Date().toISOString()
  await saveUnifiedPeopleFile()
}

const INFLUENCER_COUNTRIES = new Set(influencerRecords.map((influencer) => influencer.country))
const INFLUENCER_LANES = new Set(influencerRecords.map((influencer) => influencer.lane))

const saveInfluencerCell = async (rowId: string, field: string, value: unknown) => {
  const operation = unifiedPeopleWriteQueue.then(async () => {
    await refreshUnifiedPeopleFile()
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
    } else if (field === 'priority') {
      if (typeof value !== 'boolean') throw new Error('Expected true or false.')
      next.priority = value
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
  unifiedPeopleWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

const PEOPLE_EDITABLE_FIELDS = [
  'name',
  'role',
  'organization',
  'country',
  'lane',
  'group',
  'linkedinUrl',
  'followers',
  'biography',
  'fit',
  'potentialTarget',
  'target',
  'priority',
  'middleEastern',
] as const
type PeopleEditableField = typeof PEOPLE_EDITABLE_FIELDS[number]

const isPeopleEditableField = (value: unknown): value is PeopleEditableField =>
  typeof value === 'string' && PEOPLE_EDITABLE_FIELDS.includes(value as PeopleEditableField)

const optionalText = (value: unknown) => {
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new Error('Expected text or an empty value.')
  return value.trim() || null
}

const isLinkedInUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com'))
  } catch {
    return false
  }
}

const editableLinkedInProfile = (person: UnifiedPerson) => person.profiles.find(
  (profile) => profile.platform === 'linkedin' && profile.followers?.count != null,
) ?? person.profiles.find((profile) => profile.platform === 'linkedin')

const createNewsletterTargetGroup = (rawLabel: unknown) => {
  const operation = unifiedPeopleWriteQueue.then(async () => {
    await refreshUnifiedPeopleFile()
    const label = optionalText(rawLabel)
    if (!label) throw new Error('Enter a group name.')
    if (label.length > 60) throw new Error('Group names must be 60 characters or fewer.')

    const options = newsletterTargetGroupOptions(unifiedPeopleFile)
    const existing = options.find((option) => option.label.localeCompare(label, undefined, { sensitivity: 'accent' }) === 0)
    if (existing) return { created: false, group: existing }

    const slug = label
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || 'group'
    const usedValues = new Set(options.map((option) => option.value))
    let value = `custom-${slug}` as NewsletterTargetGroup
    let suffix = 2
    while (usedValues.has(value)) {
      value = `custom-${slug}-${suffix}` as NewsletterTargetGroup
      suffix += 1
    }

    const group: NewsletterTargetGroupOption = {
      value,
      label,
      description: 'Custom newsletter group.',
    }
    unifiedPeopleFile.group_options = [...options, group]
    unifiedPeopleFile.generated_at = new Date().toISOString()
    await saveUnifiedPeopleFile()
    return { created: true, group }
  })
  unifiedPeopleWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

const VC_PEOPLE_EDITABLE_FIELDS = ['name', 'role', 'organization', 'linkedinUrl', 'followers', 'target'] as const
type VcPeopleEditableField = typeof VC_PEOPLE_EDITABLE_FIELDS[number]

const isVcPeopleEditableField = (value: unknown): value is VcPeopleEditableField =>
  typeof value === 'string' && VC_PEOPLE_EDITABLE_FIELDS.includes(value as VcPeopleEditableField)

const saveMiddleEastVcPersonCell = (personId: string, field: VcPeopleEditableField, value: unknown) => {
  const operation = unifiedPeopleWriteQueue.then(async () => {
    await refreshUnifiedPeopleFile()
    const person = unifiedPeopleFile.people.find((candidate) => candidate.id === personId)
    if (!person || !isVcPerson(person)) return null

    const now = new Date().toISOString()
    const today = now.slice(0, 10)
    const affiliations = vcAffiliations(person)
    const primaryAffiliation = primaryVcAffiliation(person)
    const sourceRecord = primaryAffiliation?.record
    if (!sourceRecord) return null
    const raw = structuredClone(vcPeopleResearchRaw(sourceRecord))
    const manualOverrides: VcPeopleManualOverrides = structuredClone(raw.manual_overrides ?? {})

    if (field === 'name') {
      const previousName = person.name.display
      const name = optionalText(value)
      if (!name) throw new Error('A person name cannot be empty.')
      person.name.display = name
      if (person.image.alt === previousName) person.image.alt = name
      manualOverrides.name = name
    } else if (field === 'role') {
      if (affiliations.length > 1) throw new Error('This person has multiple VC affiliations. Edit the canonical role in Unified People.')
      const role = optionalText(value)
      manualOverrides.role = role
      if (!person.current_role.title || person.current_role.title === primaryAffiliation.role) person.current_role.title = role
    } else if (field === 'organization') {
      if (affiliations.length > 1) throw new Error('This person has multiple VC affiliations. Edit the canonical organization in Unified People.')
      const organization = optionalText(value)
      manualOverrides.organization = organization
      if (!person.current_role.organization || person.current_role.organization === primaryAffiliation.firm) {
        person.current_role.organization = organization
      }
    } else if (field === 'target') {
      if (typeof value !== 'boolean') throw new Error('Target must be true or false.')
      person.influence.target = value
      manualOverrides.target = value
    } else if (field === 'linkedinUrl') {
      const url = optionalText(value)
      const linkedIn = editableLinkedInProfile(person)
      if (!url) {
        if (linkedIn) person.profiles = person.profiles.filter((profile) => profile !== linkedIn)
      } else {
        if (!isLinkedInUrl(url)) throw new Error('Enter a valid HTTPS LinkedIn profile URL.')
        if (linkedIn) {
          linkedIn.url = url
          linkedIn.verification = 'manual-ui'
        } else {
          person.profiles.push({ platform: 'linkedin', url, verification: 'manual-ui', followers: null })
        }
      }
      manualOverrides.linkedinUrl = url
    } else {
      const count = value === null || value === '' ? null : Number(value)
      if (count !== null && (!Number.isInteger(count) || count < 0)) {
        throw new Error('Followers must be a non-negative whole number.')
      }
      const linkedIn = editableLinkedInProfile(person)
      if (!linkedIn) throw new Error('Add a LinkedIn profile before entering followers.')
      linkedIn.followers = count === null ? {
        count: null,
        observed_at: today,
        status: 'not-verified',
        precision: null,
        source: null,
      } : {
        count,
        observed_at: today,
        status: 'observed',
        precision: 'exact',
        source: 'linkedin-profile',
      }
      raw.follower_count_status = count === null ? 'page_count_unavailable' : 'observed_exact'
      raw.follower_observation_note = count === null
        ? 'Follower count cleared in the VC people table.'
        : 'Exact follower count entered manually in the VC people table.'
      manualOverrides.followers = count
    }

    raw.last_manual_edit_at = now
    raw.manual_edit_fields = [...new Set([...(raw.manual_edit_fields ?? []), field])]
    raw.manual_overrides = manualOverrides
    sourceRecord.raw = raw
    sourceRecord.observed_at = today
    sourceRecord.verification = 'manual-ui'
    unifiedPeopleFile.generated_at = now
    await saveUnifiedPeopleFile()
    return structuredClone(person)
  })
  unifiedPeopleWriteQueue = operation.then(() => undefined, () => undefined)
  return operation
}

const saveUnifiedPersonCell = (personId: string, field: PeopleEditableField, value: unknown) => {
  const operation = unifiedPeopleWriteQueue.then(async () => {
    await refreshUnifiedPeopleFile()
    const person = unifiedPeopleFile.people.find((candidate) => candidate.id === personId)
    if (!person) return null

    if (field === 'name') {
      const name = optionalText(value)
      if (!name) throw new Error('A person name cannot be empty.')
      person.name.display = name
    } else if (field === 'role') {
      person.current_role.title = optionalText(value)
    } else if (field === 'organization') {
      person.current_role.organization = optionalText(value)
    } else if (field === 'country') {
      const country = optionalText(value)
      person.location.country = country
      person.location.country_code = country ? COUNTRY_CODES[country as Influencer['country']] ?? null : null
    } else if (field === 'lane') {
      person.influence.lane = optionalText(value)
    } else if (field === 'group') {
      const group = optionalText(value)
      const supportedGroups = new Set(newsletterTargetGroupOptions(unifiedPeopleFile).map((option) => option.value))
      if (group !== null && !supportedGroups.has(group as NewsletterTargetGroup)) throw new Error('Choose a supported newsletter group.')
      person.group = group as UnifiedPerson['group']
    } else if (field === 'biography') {
      person.biography = optionalText(value)
    } else if (field === 'fit' || field === 'potentialTarget' || field === 'target' || field === 'priority' || field === 'middleEastern') {
      if (typeof value !== 'boolean') throw new Error('Expected true or false.')
      if (field === 'fit') person.influence.fit = value
      else if (field === 'potentialTarget') person.influence.potential_target = value
      else if (field === 'target') person.influence.target = value
      else if (field === 'priority') person.influence.priority = value
      else {
        person.influence.middle_eastern = {
          value,
          method: 'manual-ui',
          reason: 'Edited in the unified people table',
          manually_overridden: true,
        }
      }
    } else if (field === 'linkedinUrl') {
      const url = optionalText(value)
      const linkedIn = editableLinkedInProfile(person)
      if (!url) {
        if (linkedIn) person.profiles = person.profiles.filter((profile) => profile !== linkedIn)
      } else {
        if (!isLinkedInUrl(url)) throw new Error('Enter a valid HTTPS LinkedIn profile URL.')
        if (linkedIn) linkedIn.url = url
        else person.profiles.push({
          platform: 'linkedin',
          url,
          verification: 'manual-ui',
          followers: null,
        })
      }
    } else {
      const count = value === null || value === '' ? null : Number(value)
      if (count !== null && (!Number.isInteger(count) || count < 0)) {
        throw new Error('Followers must be a non-negative whole number.')
      }
      const linkedIn = editableLinkedInProfile(person)
      if (!linkedIn) throw new Error('Add a LinkedIn profile before entering followers.')
      linkedIn.followers = count === null ? null : {
        count,
        observed_at: new Date().toISOString().slice(0, 10),
        status: 'observed',
        precision: 'exact',
        source: 'linkedin-profile',
      }
    }

    unifiedPeopleFile.generated_at = new Date().toISOString()
    await saveUnifiedPeopleFile()
    return person
  })
  unifiedPeopleWriteQueue = operation.then(() => undefined, () => undefined)
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
    companies: 'data/companies/web-search-startups.json',
    rounds: 'data/funding/web-search-startup-funding-rounds.json',
  },
  records: {
    companies: companyRecords.length,
    rounds: roundRecords.length,
  },
}))

app.get('/api/lead-research', async (context) => {
  try {
    return context.json(await loadLeadResearch())
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to load lead research.' }, 500)
  }
})

app.patch('/api/lead-research/leads/:leadId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || typeof body.field !== 'string' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected an editable lead field and value.' }, 400)
  }
  try {
    const lead = await saveLeadResearchLeadCell(context.req.param('leadId'), body.field, body.value)
    if (!lead) return context.json({ error: 'The lead no longer exists.' }, 404)
    return context.json({ lead, stats: (await loadLeadResearch()).stats })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The lead cell could not be saved.' }, 400)
  }
})

app.patch('/api/lead-research/resources/:resourceId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || typeof body.field !== 'string' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected an editable resource field and value.' }, 400)
  }
  try {
    const resource = await saveLeadResearchResourceCell(context.req.param('resourceId'), body.field, body.value)
    if (!resource) return context.json({ error: 'The resource no longer exists.' }, 404)
    return context.json({ resource, stats: (await loadLeadResearch()).stats })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The resource cell could not be saved.' }, 400)
  }
})

app.patch('/api/lead-research/strategies/:strategyId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || typeof body.field !== 'string' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected an editable strategy field and value.' }, 400)
  }
  try {
    const strategy = await saveLeadResearchStrategyCell(context.req.param('strategyId'), body.field, body.value)
    if (!strategy) return context.json({ error: 'The strategy no longer exists.' }, 404)
    return context.json({ strategy, stats: (await loadLeadResearch()).stats })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The strategy cell could not be saved.' }, 400)
  }
})

app.patch('/api/lead-research/engagements/:leadId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || typeof body.field !== 'string' || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected an editable engagement field and value.' }, 400)
  }
  try {
    const engagement = await saveLeadEngagementCell(context.req.param('leadId'), body.field, body.value)
    if (!engagement) return context.json({ error: 'The lead no longer exists.' }, 404)
    return context.json({ engagement, stats: (await loadLeadResearch()).stats })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The engagement cell could not be saved.' }, 400)
  }
})

app.post('/api/lead-research/engagements/:leadId/events', async (context) => {
  const body = await context.req.json<{ occurred_on?: unknown; kind?: unknown; channel?: unknown; summary?: unknown }>().catch(() => null)
  if (!body) return context.json({ error: 'Expected a dated engagement activity.' }, 400)
  try {
    const result = await saveLeadEngagementEvent(context.req.param('leadId'), body)
    if (!result) return context.json({ error: 'The lead no longer exists.' }, 404)
    return context.json({ ...result, stats: (await loadLeadResearch()).stats }, 201)
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The engagement activity could not be saved.' }, 400)
  }
})

app.get('/api/table-archives/:tableId', async (context) => {
  try {
    const tableId = validateArchiveTableId(context.req.param('tableId'))
    const store = await loadTableArchives()
    const table = store.tables[tableId]
    return context.json({
      archivedIds: table?.archived_ids ?? [],
      tableId,
      updatedAt: table?.updated_at ?? null,
    })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to load archived rows.' }, 400)
  }
})

app.patch('/api/table-archives/:tableId', async (context) => {
  try {
    const tableId = validateArchiveTableId(context.req.param('tableId'))
    const body = await context.req.json() as { archived?: unknown; rowIds?: unknown }
    if (typeof body.archived !== 'boolean') throw new Error('Archived must be true or false.')
    const rowIds = normaliseArchiveRowIds(body.rowIds)
    const table = await updateTableArchives(tableId, rowIds, body.archived)
    return context.json({ archivedIds: table.archived_ids, tableId, updatedAt: table.updated_at })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to update archived rows.' }, 400)
  }
})

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

app.get('/api/middle-east-crunchbase', async (context) => {
  try {
    const snapshot = await loadMiddleEastCrunchbaseSnapshot()
    const items = snapshot.items.map((company) => ({
      country: asString(company.country),
      crunchbaseUrl: asString(company.crunchbaseUrl),
      detailedRoundCount: asString(company.detailedRoundCount),
      employeeRange: asString(company.employeeRange),
      estimatedRevenueRange: asString(company.estimatedRevenueRange),
      foundedOn: asString(company.foundedOn),
      foundedOnPrecision: asString(company.foundedOnPrecision),
      foundedYear: asString(company.foundedYear),
      founders: asString(company.founders),
      headquarters: asString(company.headquarters),
      imageUrl: asString(company.imageUrl),
      industries: asString(company.industries),
      investorCount: asString(company.investorCount),
      investors: asString(company.investors),
      lastFundingDate: asString(company.lastFundingDate),
      lastFundingType: asString(company.lastFundingType),
      name: asString(company.name),
      operatingStatus: asString(company.operatingStatus),
      ownershipStatus: asString(company.ownershipStatus),
      permalink: asString(company.permalink),
      primaryGroup: asString(company.primaryGroup),
      reportedRoundCount: asString(company.reportedRoundCount),
      shortDescription: asString(company.shortDescription),
      source: 'Crunchbase',
      sourcePartition: asString(company.sourcePartition),
      totalRaisedUsd: asString(company.totalRaisedUsd),
      uuid: asString(company.uuid),
      website: asString(company.website),
    }))
    return context.json({
      columns: [
        'name',
        'source',
        'imageUrl',
        'primaryGroup',
        'country',
        'headquarters',
        'foundedYear',
        'foundedOn',
        'foundedOnPrecision',
        'operatingStatus',
        'ownershipStatus',
        'employeeRange',
        'estimatedRevenueRange',
        'industries',
        'totalRaisedUsd',
        'reportedRoundCount',
        'detailedRoundCount',
        'lastFundingDate',
        'lastFundingType',
        'investorCount',
        'investors',
        'founders',
        'website',
        'shortDescription',
        'sourcePartition',
        'permalink',
        'crunchbaseUrl',
        'uuid',
      ],
      items,
      summary: {
        countries: new Set(items.map((company) => company.country).filter(Boolean)).size,
        foundedDates: items.filter((company) => company.foundedOn).length,
        total: items.length,
      },
      source: {
        file: 'data/companies/crunchbase-middle-east-company-profiles.json',
        provider: 'Crunchbase',
        updatedAt: snapshot.updatedAt,
        version: snapshot.version,
      },
    })
  } catch (error) {
    return context.json({
      error: error instanceof Error ? error.message : 'Unable to load the Middle East Crunchbase snapshot.',
    }, 500)
  }
})

app.get('/api/yc-crunchbase', async (context) => {
  try {
    const snapshot = await loadPulledCrunchbaseSnapshot()
    const detailedRounds = snapshot.items.reduce(
      (total, company) => total + (Number(company.detailedRoundCount) || 0),
      0,
    )
    const totalRaisedUsd = snapshot.items.reduce(
      (total, company) => total + (Number(company.totalRaisedUsd) || 0),
      0,
    )
    return context.json({
      columns: [
        'name',
        'source',
        'operatingStatus',
        'headquarters',
        'foundedYear',
        'employeeRange',
        'industries',
        'totalRaisedUsd',
        'reportedRoundCount',
        'detailedRoundCount',
        'lastFundingType',
        'lastFundingDate',
        'investorCount',
        'investors',
        'founders',
        'ownershipStatus',
        'estimatedRevenueRange',
        'website',
        'crunchbaseUrl',
        'shortDescription',
      ],
      items: snapshot.items,
      summary: {
        detailedRounds,
        fundedCompanies: snapshot.items.filter((company) => Number(company.reportedRoundCount) > 0).length,
        total: snapshot.items.length,
        totalRaisedUsd,
      },
      source: {
        directory: 'outputs/crunchbase',
        inputFile: snapshot.inputFile,
        provider: 'Crunchbase',
        updatedAt: snapshot.updatedAt || snapshot.createdAt,
        version: snapshot.version,
      },
    })
  } catch (error) {
    return context.json({
      error: error instanceof Error ? error.message : 'Unable to load the pulled Crunchbase dataset.',
    }, 500)
  }
})

app.get('/api/posts/yc-industry-funding-by-year', async (context) => {
  try {
    const parsed: unknown = JSON.parse(await readFile(YC_INDUSTRY_FUNDING_POST_FILE, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('The industry funding post snapshot is not a JSON object.')
    }
    return context.json(parsed)
  } catch (error) {
    return context.json({
      error: error instanceof Error ? error.message : 'Unable to load the industry funding post snapshot.',
    }, 500)
  }
})

app.get('/api/yc-industry-taxonomy', async (context) => {
  try {
    return context.json(await loadIndustryTaxonomy(INDUSTRY_TAXONOMY_PATHS))
  } catch (error) {
    return context.json({
      error: error instanceof Error ? error.message : 'Unable to load the YC industry taxonomy workspace.',
    }, 500)
  }
})

app.post('/api/yc-industry-taxonomy/groups', async (context) => {
  const body = await context.req.json<{ name?: unknown }>().catch(() => null)
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'name')) {
    return context.json({ error: 'Expected a group name.' }, 400)
  }
  try {
    return context.json(await createIndustryGroup(INDUSTRY_TAXONOMY_PATHS, body.name), 201)
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to create the industry group.' }, 400)
  }
})

app.patch('/api/yc-industry-taxonomy/groups/:groupId', async (context) => {
  const body = await context.req.json<{ labels?: unknown; name?: unknown }>().catch(() => null)
  if (!body || (!Object.prototype.hasOwnProperty.call(body, 'labels') && !Object.prototype.hasOwnProperty.call(body, 'name'))) {
    return context.json({ error: 'Expected a group name or industry labels.' }, 400)
  }
  try {
    const result = await updateIndustryGroup(INDUSTRY_TAXONOMY_PATHS, context.req.param('groupId'), body)
    if (!result) return context.json({ error: 'The industry group no longer exists.' }, 404)
    return context.json(result)
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to update the industry group.' }, 400)
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
    source: 'assets/people/unified-people.json · source_records[web-search]',
    followerSource: 'assets/people/unified-people.json · profiles[].followers',
    verifiedAt: unifiedPeopleFile.sources.find((source) => source.id === 'web-search')?.observed_at ?? unifiedPeopleFile.generated_at.slice(0, 10),
    followersUpdatedAt: webSearchEntries.map((entry) => entry.raw.followers_updated_at).find(Boolean) ?? unifiedPeopleFile.generated_at.slice(0, 10),
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

app.patch('/api/people/:personId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || !isPeopleEditableField(body.field) || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected an editable people field and value.' }, 400)
  }
  try {
    const person = await saveUnifiedPersonCell(context.req.param('personId'), body.field, body.value)
    if (!person) return context.json({ error: 'The combined person record no longer exists.' }, 404)
    return context.json({ generatedAt: unifiedPeopleFile.generated_at, person })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The person cell could not be saved.' }, 400)
  }
})

app.post('/api/people/groups', async (context) => {
  const body = await context.req.json<{ label?: unknown }>().catch(() => null)
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'label')) {
    return context.json({ error: 'Expected a group name.' }, 400)
  }
  try {
    const result = await createNewsletterTargetGroup(body.label)
    return context.json({ ...result, generatedAt: unifiedPeopleFile.generated_at }, result.created ? 201 : 200)
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The group could not be created.' }, 400)
  }
})

app.get('/api/middle-east-vc-people', (context) => context.json(vcPeopleView(unifiedPeopleFile)))

app.patch('/api/middle-east-vc-people/:personId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || !isVcPeopleEditableField(body.field) || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected an editable VC people field and value.' }, 400)
  }
  try {
    const person = await saveMiddleEastVcPersonCell(context.req.param('personId'), body.field, body.value)
    if (!person) return context.json({ error: 'The VC person record no longer exists.' }, 404)
    return context.json({ generatedAt: unifiedPeopleFile.generated_at, person })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The VC person cell could not be saved.' }, 400)
  }
})

app.get('/api/middle-east-founders', (context) => context.json(middleEastFoundersFile))

app.patch('/api/middle-east-founders/:founderId', async (context) => {
  const body = await context.req.json<{ field?: unknown; value?: unknown }>().catch(() => null)
  if (!body || !isFounderEditableField(body.field) || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return context.json({ error: 'Expected an editable founder field and value.' }, 400)
  }
  try {
    const founder = await saveMiddleEastFounderCell(context.req.param('founderId'), body.field, body.value)
    if (!founder) return context.json({ error: 'The founder row no longer exists.' }, 404)
    return context.json({ founder, generatedAt: middleEastFoundersFile.generated_at, stats: middleEastFoundersFile.stats })
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'The founder cell could not be saved.' }, 400)
  }
})

app.get('/api/valid-links', async (context) => {
  try {
    return context.json(await loadValidLinks())
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : 'Unable to load YC-filtered Crunchbase URLs.' }, 500)
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
