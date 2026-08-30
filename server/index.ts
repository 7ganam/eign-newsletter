import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { csvParse } from 'd3'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { MongoClient, ObjectId, type Document, type Sort } from 'mongodb'

const API_PORT = Number(process.env.API_PORT ?? 18321)
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27127'
const DATABASE_NAME = 'eign_index'

const client = new MongoClient(MONGO_URI, {
  appName: 'eign-capital-index',
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5_000,
})

await client.connect()

const db = client.db(DATABASE_NAME)
const companies = db.collection('companies')
const rounds = db.collection('rounds')
const app = new Hono()

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const SOFTWARE_COMPANY_FILES = {
  linkedin: resolve(process.cwd(), 'assets/companies/linkedin-extracted-software-companies.csv'),
  kattch: resolve(process.cwd(), 'assets/companies/kattch-prod-providers-2026-08-30.csv'),
} as const

const SOFTWARE_COLUMN_PRIORITY = [
  'source',
  'company_name',
  'company_industry',
  'categories',
  'company_location',
  'address',
  'company_description',
  'shortAbout',
  'linkedin_followers',
  'domain',
  'linkedin_company_url',
]

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

const normaliseBsonType = (types: string[]): ResearchField['type'] => {
  const meaningfulTypes = types.filter((type) => type !== 'null' && type !== 'missing')
  if (meaningfulTypes.includes('objectId')) return 'objectId'
  if (meaningfulTypes.includes('date')) return 'date'
  if (meaningfulTypes.includes('bool')) return 'boolean'
  if (meaningfulTypes.some((type) => ['double', 'int', 'long', 'decimal'].includes(type))) return 'number'
  if (meaningfulTypes.includes('string')) return 'string'
  return 'unknown'
}

let companySchemaPromise: Promise<ResearchField[]> | null = null

const getCompanySchema = () => {
  companySchemaPromise ??= companies
    .aggregate([
      { $project: { fields: { $objectToArray: '$$ROOT' } } },
      { $unwind: '$fields' },
      {
        $group: {
          _id: '$fields.k',
          bsonTypes: { $addToSet: { $type: '$fields.v' } },
        },
      },
      { $project: { _id: 0, name: '$_id', bsonTypes: 1 } },
    ])
    .toArray()
    .then((rows) => rows
      .map((row) => ({
        name: String(row.name),
        bsonTypes: row.bsonTypes as string[],
        type: normaliseBsonType(row.bsonTypes as string[]),
      }))
      .sort((left, right) => {
        const leftPriority = FIELD_PRIORITY.indexOf(left.name)
        const rightPriority = FIELD_PRIORITY.indexOf(right.name)
        if (leftPriority !== -1 || rightPriority !== -1) {
          if (leftPriority === -1) return 1
          if (rightPriority === -1) return -1
          return leftPriority - rightPriority
        }
        return left.name.localeCompare(right.name)
      }))

  return companySchemaPromise
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
  if (type === 'objectId') return ObjectId.isValid(value) ? new ObjectId(value) : null
  return value
}

const buildResearchCondition = (filter: ResearchFilter, field: ResearchField): Document | null => {
  const operator = filter.operator
  const value = filter.value?.trim() ?? ''
  const secondValue = filter.secondValue?.trim() ?? ''

  if (operator === 'exists') return { [field.name]: { $exists: true } }
  if (operator === 'not_exists') return { [field.name]: { $exists: false } }
  if (operator === 'empty') return { $and: [{ [field.name]: { $exists: true } }, { [field.name]: { $in: [null, ''] } }] }
  if (operator === 'not_empty') return { [field.name]: { $exists: true, $nin: [null, ''] } }
  if (!value) return null

  if (['contains', 'not_contains', 'starts_with', 'ends_with'].includes(operator)) {
    const anchorStart = operator === 'starts_with' ? '^' : ''
    const anchorEnd = operator === 'ends_with' ? '$' : ''
    const regex = new RegExp(`${anchorStart}${escapeRegex(value)}${anchorEnd}`, 'i')
    return operator === 'not_contains'
      ? { [field.name]: { $not: regex } }
      : { [field.name]: regex }
  }

  if (operator === 'in') {
    const values = value
      .split(',')
      .map((item) => parseFilterValue(item.trim(), field.type))
      .filter((item) => item !== null)
    return values.length ? { [field.name]: { $in: values } } : null
  }

  const parsedValue = parseFilterValue(value, field.type)
  if (parsedValue === null) return null
  if (operator === 'equals') {
    if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value) && parsedValue instanceof Date) {
      const nextDay = new Date(parsedValue)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      return { [field.name]: { $gte: parsedValue, $lt: nextDay } }
    }
    return { [field.name]: parsedValue }
  }
  if (operator === 'not_equals') return { [field.name]: { $ne: parsedValue } }
  if (operator === 'greater_than' || operator === 'after') return { [field.name]: { $gt: parsedValue } }
  if (operator === 'greater_or_equal') return { [field.name]: { $gte: parsedValue } }
  if (operator === 'less_than' || operator === 'before') return { [field.name]: { $lt: parsedValue } }
  if (operator === 'less_or_equal') return { [field.name]: { $lte: parsedValue } }

  if (operator === 'between' && secondValue) {
    const parsedSecondValue = parseFilterValue(secondValue, field.type)
    if (parsedSecondValue !== null) {
      if (field.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(secondValue) && parsedSecondValue instanceof Date) {
        const nextDay = new Date(parsedSecondValue)
        nextDay.setUTCDate(nextDay.getUTCDate() + 1)
        return { [field.name]: { $gte: parsedValue, $lt: nextDay } }
      }
      return { [field.name]: { $gte: parsedValue, $lte: parsedSecondValue } }
    }
  }

  return null
}

app.use('/api/*', logger())

app.get('/api/health', async (context) => {
  await db.command({ ping: 1 })
  return context.json({ status: 'ok', database: DATABASE_NAME })
})

app.get('/api/software-companies', async (context) => {
  const [linkedinCsv, kattchCsv] = await Promise.all([
    readFile(SOFTWARE_COMPANY_FILES.linkedin, 'utf8'),
    readFile(SOFTWARE_COMPANY_FILES.kattch, 'utf8'),
  ])
  const linkedinRows = csvParse(linkedinCsv.replace(/^\uFEFF/, ''))
  const kattchRows = csvParse(kattchCsv.replace(/^\uFEFF/, ''))
  const kattchColumns = kattchRows.columns.map((column) => column === 'label' ? 'company_name' : column)
  const allSourceColumns = [
    ...linkedinRows.columns,
    ...kattchColumns.filter((column) => !linkedinRows.columns.includes(column)),
  ]
  const columns = [
    ...SOFTWARE_COLUMN_PRIORITY.filter((column) => column === 'source' || allSourceColumns.includes(column)),
    ...allSourceColumns.filter((column) => !SOFTWARE_COLUMN_PRIORITY.includes(column)),
  ]
  const items = [
    ...linkedinRows.map((row) => ({ source: 'linkedin', ...row })),
    ...kattchRows.map((row) => {
      const { label, ...fields } = row
      return { source: 'kattch', company_name: label ?? '', ...fields }
    }),
  ]
  const linkedinNames = new Set(linkedinRows.map((row) => normaliseCompanyName(row.company_name ?? '')).filter(Boolean))
  const overlappingNames = new Set(
    kattchRows
      .map((row) => normaliseCompanyName(row.label ?? ''))
      .filter((name) => name && linkedinNames.has(name)),
  )

  return context.json({
    columns,
    items,
    summary: {
      total: items.length,
      linkedin: linkedinRows.length,
      kattch: kattchRows.length,
      columns: columns.length,
      exactNameOverlaps: overlappingNames.size,
    },
    sources: {
      linkedin: 'assets/companies/linkedin-extracted-software-companies.csv',
      kattch: 'assets/companies/kattch-prod-providers-2026-08-30.csv',
    },
  })
})

app.get('/api/dashboard', async (context) => {
  const [
    companyCount,
    roundCount,
    fundingRows,
    reconciliationRows,
    industries,
    batches,
    timeline,
    stages,
    topCompanies,
    recentRounds,
    freshnessRows,
  ] = await Promise.all([
    companies.countDocuments(),
    rounds.countDocuments(),
    companies
      .aggregate([
        {
          $group: {
            _id: null,
            totalFundingUsd: { $sum: { $ifNull: ['$totalFundingUsd', 0] } },
            fundedCompanies: {
              $sum: {
                $cond: [{ $gt: [{ $ifNull: ['$totalFundingUsd', 0] }, 0] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray(),
    companies
      .aggregate([
        {
          $group: {
            _id: null,
            reconciledCompanies: {
              $sum: { $cond: [{ $eq: ['$fundingReconciliationStatus', 'reconciled'] }, 1, 0] },
            },
          },
        },
      ])
      .toArray(),
    companies
      .aggregate([
        {
          $group: {
            _id: { $ifNull: ['$industry', 'Unclassified'] },
            companies: { $sum: 1 },
            fundingUsd: { $sum: { $ifNull: ['$totalFundingUsd', 0] } },
          },
        },
        { $sort: { companies: -1, _id: 1 } },
        { $project: { _id: 0, industry: '$_id', companies: 1, fundingUsd: 1 } },
      ])
      .toArray(),
    companies
      .aggregate([
        {
          $group: {
            _id: { $ifNull: ['$batch', 'Unclassified'] },
            companies: { $sum: 1 },
            fundingUsd: { $sum: { $ifNull: ['$totalFundingUsd', 0] } },
          },
        },
        { $sort: { companies: -1, _id: 1 } },
        { $project: { _id: 0, batch: '$_id', companies: 1, fundingUsd: 1 } },
      ])
      .toArray(),
    rounds
      .aggregate([
        {
          $match: {
            recordType: 'financing_event',
            announcementDate: { $type: 'date' },
            amountUsd: { $type: 'number' },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$announcementDate' } },
            fundingUsd: { $sum: '$amountUsd' },
            rounds: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: '$_id', fundingUsd: 1, rounds: 1 } },
      ])
      .toArray(),
    rounds
      .aggregate([
        { $match: { recordType: 'financing_event' } },
        {
          $group: {
            _id: { $ifNull: ['$roundStage', 'Unspecified'] },
            rounds: { $sum: 1 },
            fundingUsd: { $sum: { $ifNull: ['$amountUsd', 0] } },
          },
        },
        { $sort: { rounds: -1, _id: 1 } },
        { $project: { _id: 0, stage: '$_id', rounds: 1, fundingUsd: 1 } },
      ])
      .toArray(),
    companies
      .find(
        {},
        {
          projection: {
            _id: 0,
            name: 1,
            slug: 1,
            logoUrl: 1,
            industry: 1,
            batch: 1,
            totalFundingUsd: 1,
          },
        },
      )
      .sort({ totalFundingUsd: -1, name: 1 })
      .limit(8)
      .toArray(),
    rounds
      .aggregate([
        { $match: { announcementDate: { $type: 'date' } } },
        { $sort: { announcementDate: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: 'companies',
            localField: 'companyId',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $set: { company: { $first: '$company' } } },
        {
          $project: {
            _id: 0,
            companySlug: 1,
            companyName: { $ifNull: ['$company.name', '$companySlug'] },
            logoUrl: '$company.logoUrl',
            round: 1,
            roundStage: 1,
            amountUsd: 1,
            announcementDate: 1,
          },
        },
      ])
      .toArray(),
    companies
      .aggregate([
        { $group: { _id: null, updatedAt: { $max: '$updatedAt' } } },
        { $project: { _id: 0, updatedAt: 1 } },
      ])
      .toArray(),
  ])

  return context.json({
    summary: {
      companies: companyCount,
      rounds: roundCount,
      totalFundingUsd: fundingRows[0]?.totalFundingUsd ?? 0,
      fundedCompanies: fundingRows[0]?.fundedCompanies ?? 0,
      reconciledCompanies: reconciliationRows[0]?.reconciledCompanies ?? 0,
      updatedAt: freshnessRows[0]?.updatedAt ?? null,
    },
    industries,
    batches,
    timeline,
    stages,
    topCompanies,
    recentRounds,
  })
})

app.get('/api/visualisations/funding-landscape', async (context) => {
  const rows = await companies
    .find(
      {},
      {
        projection: {
          name: 1,
          slug: 1,
          logoUrl: 1,
          website: 1,
          industry: 1,
          totalFundingUsd: 1,
          fundingTotalType: 1,
          primaryFundingBasis: 1,
        },
      },
    )
    .sort({ totalFundingUsd: -1, name: 1 })
    .toArray()

  const grouped = new Map<string, typeof rows>()
  for (const company of rows) {
    const industry = typeof company.industry === 'string' && company.industry.trim()
      ? company.industry
      : 'Unclassified'
    const group = grouped.get(industry) ?? []
    group.push(company)
    grouped.set(industry, group)
  }

  const individuallyNamedIds = new Set(
    rows
      .filter((company) => Number(company.totalFundingUsd) > 0)
      .slice(0, 80)
      .map((company) => String(company._id)),
  )

  for (const industryRows of grouped.values()) {
    industryRows
      .filter((company) => Number(company.totalFundingUsd) > 0)
      .sort((left, right) => Number(right.totalFundingUsd) - Number(left.totalFundingUsd))
      .slice(0, 2)
      .forEach((company) => individuallyNamedIds.add(String(company._id)))
  }

  const industries = [...grouped.entries()]
    .map(([name, industryRows]) => {
      const sorted = [...industryRows].sort((left, right) => Number(right.totalFundingUsd) - Number(left.totalFundingUsd))
      const named: Array<{
        name: string
        slug: string | null
        logoUrl: string | null
        website: string | null
        fundingUsd: number
        fundingTotalType: string
        primaryFundingBasis: string
        aggregatedCompanyCount?: number
      }> = sorted
        .filter((company) => individuallyNamedIds.has(String(company._id)) && Number(company.totalFundingUsd) > 0)
        .map((company) => ({
          name: String(company.name ?? company.slug ?? 'Unnamed company'),
          slug: typeof company.slug === 'string' ? company.slug : null,
          logoUrl: typeof company.logoUrl === 'string' ? company.logoUrl : null,
          website: typeof company.website === 'string' ? company.website : null,
          fundingUsd: Number(company.totalFundingUsd) || 0,
          fundingTotalType: typeof company.fundingTotalType === 'string' ? company.fundingTotalType : 'Recorded total',
          primaryFundingBasis: typeof company.primaryFundingBasis === 'string' ? company.primaryFundingBasis : 'Funding evidence on file',
        }))
      const remainder = sorted.filter((company) => !individuallyNamedIds.has(String(company._id)))
      const remainderFundingUsd = remainder.reduce((sum, company) => sum + (Number(company.totalFundingUsd) || 0), 0)

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
        fundingUsd: industryRows.reduce((sum, company) => sum + (Number(company.totalFundingUsd) || 0), 0),
        companies: named,
      }
    })
    .filter((industry) => industry.fundingUsd > 0)
    .sort((left, right) => right.fundingUsd - left.fundingUsd)

  const totalFundingUsd = rows.reduce((sum, company) => sum + (Number(company.totalFundingUsd) || 0), 0)
  const fundedCompanyCount = rows.filter((company) => Number(company.totalFundingUsd) > 0).length
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

const sortOptions: Record<string, Sort> = {
  funding_desc: { totalFundingUsd: -1, name: 1 },
  funding_asc: { totalFundingUsd: 1, name: 1 },
  name_asc: { name: 1 },
  name_desc: { name: -1 },
}

app.get('/api/companies', async (context) => {
  const query = context.req.query()
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1)
  const limit = Math.min(50, Math.max(5, Number.parseInt(query.limit ?? '15', 10) || 15))
  const search = query.q?.trim().slice(0, 80)
  const match: Document = {}

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    match.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { slug: { $regex: escaped, $options: 'i' } },
      { summary: { $regex: escaped, $options: 'i' } },
    ]
  }

  if (query.industry) match.industry = query.industry
  if (query.batch) match.batch = query.batch

  const [result] = await companies
    .aggregate([
      { $match: match },
      { $sort: sortOptions[query.sort ?? 'funding_desc'] ?? sortOptions.funding_desc },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: 'rounds',
                let: { companyId: '$_id' },
                pipeline: [
                  { $match: { $expr: { $eq: ['$companyId', '$$companyId'] } } },
                  { $sort: { announcementDate: -1, createdAt: -1 } },
                  {
                    $project: {
                      _id: 0,
                      amountUsd: 1,
                      announcementDate: 1,
                      roundStage: 1,
                    },
                  },
                ],
                as: 'roundsMeta',
              },
            },
            {
              $set: {
                roundCount: { $size: '$roundsMeta' },
                latestRound: { $first: '$roundsMeta' },
              },
            },
            {
              $project: {
                _id: 0,
                name: 1,
                slug: 1,
                logoUrl: 1,
                industry: 1,
                businessType: 1,
                batch: 1,
                totalFundingUsd: 1,
                fundingTotalType: 1,
                fundingReconciliationStatus: 1,
                summary: 1,
                website: 1,
                roundCount: 1,
                latestRound: 1,
              },
            },
          ],
        },
      },
    ])
    .toArray()

  const total = result?.metadata[0]?.total ?? 0
  return context.json({
    items: result?.items ?? [],
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  })
})

app.get('/api/companies/:slug', async (context) => {
  const company = await companies.findOne(
    { slug: context.req.param('slug') },
    { projection: { _id: 1, notionId: 0 } },
  )

  if (!company) return context.json({ error: 'Company not found' }, 404)

  const companyRounds = await rounds
    .find(
      { companyId: company._id },
      {
        projection: {
          _id: 0,
          companyId: 0,
          notionId: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    )
    .sort({ announcementDate: -1, amountUsd: -1 })
    .toArray()

  const { _id: _companyId, ...publicCompany } = company
  return context.json({ company: publicCompany, rounds: companyRounds })
})

app.get('/api/research/schema', async (context) => {
  const fields = await getCompanySchema()
  const facetEntries = await Promise.all(
    FACET_FIELDS.map(async (field) => {
      const values = await companies.distinct(field, { [field]: { $nin: [null, ''] } })
      return [field, values.map(String).sort((left, right) => left.localeCompare(right))] as const
    }),
  )

  return context.json({
    collection: 'companies',
    fields,
    facets: Object.fromEntries(facetEntries),
  })
})

app.post('/api/research/companies/query', async (context) => {
  const body: ResearchQueryBody = await context.req.json<ResearchQueryBody>().catch(() => ({}))
  const fields = await getCompanySchema()
  const fieldMap = new Map(fields.map((field) => [field.name, field]))
  const page = Math.max(1, Math.floor(Number(body.page) || 1))
  const limit = Math.min(100, Math.max(10, Math.floor(Number(body.limit) || 25)))
  const filters = Array.isArray(body.filters) ? body.filters.slice(0, 30) : []
  const conditions = filters
    .map((filter) => {
      const field = fieldMap.get(filter.field)
      return field ? buildResearchCondition(filter, field) : null
    })
    .filter((condition): condition is Document => condition !== null)
  const search = body.search?.trim().slice(0, 120)

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i')
    const textFields = fields.filter((field) => field.type === 'string').map((field) => field.name)
    conditions.push({ $or: textFields.map((field) => ({ [field]: regex })) })
  }

  const match = conditions.length ? { $and: conditions } : {}
  const sortField = body.sortField && fieldMap.has(body.sortField) ? body.sortField : 'name'
  const sortDirection = body.sortDirection === 'desc' ? -1 : 1
  const sort: Sort = { [sortField]: sortDirection, _id: 1 }
  const [items, total] = await Promise.all([
    companies
      .find(match)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(10_000)
      .toArray(),
    companies.countDocuments(match, { maxTimeMS: 10_000 }),
  ])

  return context.json({
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    fieldCount: fields.length,
    appliedFilterCount: conditions.length,
  })
})

app.onError((error, context) => {
  console.error(error)
  return context.json({ error: 'The local data service could not complete this request.' }, 500)
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

console.log(`EIGN data server listening at http://127.0.0.1:${API_PORT}`)

const shutdown = async () => {
  server.close()
  await client.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
