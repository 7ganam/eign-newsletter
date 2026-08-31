import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { csvFormat, csvParse } from 'd3'
import { Hono } from 'hono'
import { logger } from 'hono/logger'

const API_PORT = Number(process.env.API_PORT ?? 18321)
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILES = {
  companies: resolve(PROJECT_ROOT, 'eign_index.companies.json'),
  rounds: resolve(PROJECT_ROOT, 'eign_index.rounds.json'),
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

const [companyRecords, roundRecords] = await Promise.all([
  loadJsonRecords(DATA_FILES.companies),
  loadJsonRecords(DATA_FILES.rounds),
])

const idString = (value: unknown) => value instanceof FileObjectId ? value.value : String(value ?? '')
const companyById = new Map(companyRecords.map((company) => [idString(company._id), company]))
const roundsByCompanyId = new Map<string, DataRecord[]>()
for (const round of roundRecords) {
  const companyId = idString(round.companyId)
  const companyRounds = roundsByCompanyId.get(companyId) ?? []
  companyRounds.push(round)
  roundsByCompanyId.set(companyId, companyRounds)
}

const app = new Hono()
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

const SOFTWARE_COMPANY_FIT_COLUMN = 'fit'
const softwareCompanyRowKey = (row: Record<string, string | undefined>) => JSON.stringify([
  row.source ?? '',
  row.linkedin_company_url ?? '',
  row.id ?? '',
  row.company_name ?? '',
])

const softwareCompanyColumns = (columns: string[]) => {
  if (columns.includes(SOFTWARE_COMPANY_FIT_COLUMN)) return columns
  const next = [...columns]
  const sourceIndex = next.indexOf('source')
  next.splice(sourceIndex >= 0 ? sourceIndex + 1 : 0, 0, SOFTWARE_COMPANY_FIT_COLUMN)
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

const NEWSLETTER_RESEARCH_FILE = resolve(PROJECT_ROOT, 'assets/newsletter-research.csv')

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

const getCompanySchema = () => {
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

const companySchema = getCompanySchema()

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

app.get('/api/software-companies', async (context) => {
  const curated = await loadSoftwareCompanyCsv()
  const items = curated.rows.map((row) => ({
    ...row,
    __rowKey: softwareCompanyRowKey(row),
    fit: row.fit === 'false' ? '' : 'true',
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

  const operation = softwareCompanyWriteQueue.then(async () => {
    const curated = await loadSoftwareCompanyCsv()
    const row = curated.rows.find((candidate) => softwareCompanyRowKey(candidate) === body.rowKey)
    if (!row) return false
    row.fit = body.fit ? 'true' : 'false'
    await saveSoftwareCompanyCsv(curated)
    return true
  })
  softwareCompanyWriteQueue = operation.then(() => undefined, () => undefined)

  if (!await operation) return context.json({ error: 'The company row no longer exists in the curated CSV.' }, 404)
  return context.json({ fit: body.fit, rowKey: body.rowKey })
})

app.get('/api/newsletters', async (context) => {
  const csv = await readFile(NEWSLETTER_RESEARCH_FILE, 'utf8')
  const rows = csvParse(csv.replace(/^\uFEFF/, ''))
  const items = rows.flatMap((row) => {
    const newsletter = row.Newsletter?.trim()
    if (!newsletter) return []

    const similarity = Number(row['Similarity to Eign'])
    return [{
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
    .map((company) => pick(company, ['name', 'slug', 'logoUrl', 'industry', 'batch', 'totalFundingUsd']))
  const recentRounds = sortRecords(
    roundRecords.filter((round) => round.announcementDate instanceof Date),
    [['announcementDate', -1]],
  )
    .slice(0, 8)
    .map((round) => {
      const company = companyById.get(idString(round.companyId))
      return {
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
  ]).map((round) => omit(round, ['_id', 'companyId', 'notionId', 'createdAt', 'updatedAt']))

  return context.json({
    company: omit(company, ['_id', 'notionId']),
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

if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

const server = serve({
  fetch: app.fetch,
  hostname: '127.0.0.1',
  port: API_PORT,
})

console.log(`EIGN file data server listening at http://127.0.0.1:${API_PORT}`)
console.log(`Loaded ${companyRecords.length.toLocaleString()} companies and ${roundRecords.length.toLocaleString()} rounds from JSON files`)

const shutdown = () => {
  server.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
