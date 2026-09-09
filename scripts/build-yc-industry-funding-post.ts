import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { csvParse } from 'd3'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CRUNCHBASE_DIRECTORY = resolve(PROJECT_ROOT, 'outputs/crunchbase')
const MANIFEST_FILE = resolve(CRUNCHBASE_DIRECTORY, 'manifest.json')
const LOGO_FILE = resolve(PROJECT_ROOT, 'assets/crunchbase/yc-company-logo-urls.json')
const PRIMARY_GROUP_FILE = resolve(PROJECT_ROOT, 'assets/crunchbase/yc-company-primary-groups.json')
const RISK_DIRECTORY = resolve(
  PROJECT_ROOT,
  'outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z/risk-separation',
)
const LOWER_RISK_FILE = resolve(RISK_DIRECTORY, 'yc-crunchbase-non-risky.csv')
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'assets/posts/yc-industry-funding-by-year.json')
const START_YEAR = 2005

type DataRecord = Record<string, unknown>
type ScopeKey = 'all' | 'lowerRisk'

type ManifestEntry = {
  insightsPath?: string
  requestedUrl?: string
  status?: string
}

type IndustryAccumulator = {
  dailyUsd: Map<string, number>
  roundAppearancesByYear: Map<number, number>
  totalUsd: number
  usdByYear: Map<number, number>
}

type CompanyAccumulator = {
  crunchbaseUrl: string
  dailyUsd: Map<string, number>
  industries: string[]
  logoUrl: string | null
  primaryGroup: string | null
  primaryGroupId: string | null
  name: string
  totalUsd: number
  website: string
}

type CompanyDetails = Omit<CompanyAccumulator, 'dailyUsd' | 'totalUsd'>

type ScopeAccumulator = {
  companies: Map<string, CompanyAccumulator>
  industries: Map<string, IndustryAccumulator>
  profiles: number
  profilesWithFunding: Set<string>
  rounds: number
  totalUsd: number
}

const asRecord = (value: unknown): DataRecord => value && typeof value === 'object' && !Array.isArray(value)
  ? value as DataRecord
  : {}
const asArray = (value: unknown) => Array.isArray(value) ? value : []
const asString = (value: unknown) => typeof value === 'string' ? value : ''
const asNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0

const emptyScope = (): ScopeAccumulator => ({
  companies: new Map(),
  industries: new Map(),
  profiles: 0,
  profilesWithFunding: new Set(),
  rounds: 0,
  totalUsd: 0,
})

const addRound = (
  scope: ScopeAccumulator,
  company: CompanyDetails,
  industries: string[],
  year: number,
  announcedDate: string,
  amountUsd: number,
) => {
  scope.profilesWithFunding.add(company.crunchbaseUrl)
  scope.rounds += 1
  scope.totalUsd += amountUsd
  const companyAccumulator = scope.companies.get(company.crunchbaseUrl) ?? {
    ...company,
    dailyUsd: new Map(),
    totalUsd: 0,
  }
  companyAccumulator.totalUsd += amountUsd
  companyAccumulator.dailyUsd.set(
    announcedDate,
    (companyAccumulator.dailyUsd.get(announcedDate) ?? 0) + amountUsd,
  )
  scope.companies.set(company.crunchbaseUrl, companyAccumulator)
  const allocatedAmount = amountUsd / industries.length
  industries.forEach((industry) => {
    const accumulator = scope.industries.get(industry) ?? {
      dailyUsd: new Map(),
      roundAppearancesByYear: new Map(),
      totalUsd: 0,
      usdByYear: new Map(),
    }
    accumulator.totalUsd += allocatedAmount
    accumulator.dailyUsd.set(announcedDate, (accumulator.dailyUsd.get(announcedDate) ?? 0) + allocatedAmount)
    accumulator.usdByYear.set(year, (accumulator.usdByYear.get(year) ?? 0) + allocatedAmount)
    accumulator.roundAppearancesByYear.set(
      year,
      (accumulator.roundAppearancesByYear.get(year) ?? 0) + 1,
    )
    scope.industries.set(industry, accumulator)
  })
}

const serialiseScope = (scope: ScopeAccumulator) => ({
  companies: [...scope.companies.values()]
    .map((company) => ({
      crunchbaseUrl: company.crunchbaseUrl,
      days: [...company.dailyUsd.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, amountUsd]) => ({ amountUsd: Math.round(amountUsd), date })),
      industries: company.industries,
      logoUrl: company.logoUrl,
      primaryGroup: company.primaryGroup,
      primaryGroupId: company.primaryGroupId,
      name: company.name,
      totalUsd: Math.round(company.totalUsd),
      website: company.website,
    }))
    .sort((left, right) => right.totalUsd - left.totalUsd || left.name.localeCompare(right.name)),
  industries: [...scope.industries.entries()]
    .map(([name, accumulator]) => ({
      days: [...accumulator.dailyUsd.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, amountUsd]) => ({
          amountUsd: Math.round(amountUsd),
          date,
        })),
      name,
      totalUsd: Math.round(accumulator.totalUsd),
      values: [...accumulator.usdByYear.entries()]
        .sort(([left], [right]) => left - right)
        .map(([year, amountUsd]) => ({
          amountUsd: Math.round(amountUsd),
          roundAppearances: accumulator.roundAppearancesByYear.get(year) ?? 0,
          year,
        })),
    }))
    .sort((left, right) => right.totalUsd - left.totalUsd || left.name.localeCompare(right.name)),
  summary: {
    companiesWithRecordedRounds: scope.profilesWithFunding.size,
    industries: scope.industries.size,
    profiles: scope.profiles,
    recordedRounds: scope.rounds,
    recordedUsd: Math.round(scope.totalUsd),
  },
})

const main = async () => {
  const manifest = asRecord(JSON.parse(await readFile(MANIFEST_FILE, 'utf8')))
  const entries = asArray(manifest.entries) as ManifestEntry[]
  const successfulEntries = entries.filter((entry) => entry.status === 'success')
  const primarySnapshot = asRecord(JSON.parse(await readFile(PRIMARY_GROUP_FILE, 'utf8')))
  const primaryGroups = new Map<string, DataRecord>()
  for (const value of asArray(primarySnapshot.items)) {
    const item = asRecord(value)
    const url = asString(item.crunchbaseUrl)
    if (!url || primaryGroups.has(url)) throw new Error(`Invalid or duplicate primary group identity: ${url}`)
    primaryGroups.set(url, item)
  }
  for (const entry of successfulEntries) {
    if (!primaryGroups.has(asString(entry.requestedUrl))) throw new Error(`Missing primary group record: ${entry.requestedUrl}`)
  }
  const logoSnapshot = asRecord(JSON.parse(await readFile(LOGO_FILE, 'utf8')))
  const logoByCrunchbaseUrl = new Map<string, string | null>()
  asArray(logoSnapshot.items).forEach((value) => {
    const item = asRecord(value)
    const crunchbaseUrl = asString(item.crunchbaseUrl)
    const logoUrl = item.logoUrl
    if (!crunchbaseUrl || logoByCrunchbaseUrl.has(crunchbaseUrl)) {
      throw new Error(`Company logo records must have unique Crunchbase URLs: ${crunchbaseUrl || '(missing URL)'}`)
    }
    if (logoUrl !== null && typeof logoUrl !== 'string') {
      throw new Error(`Invalid logo URL for ${crunchbaseUrl}`)
    }
    logoByCrunchbaseUrl.set(crunchbaseUrl, logoUrl)
  })
  const missingLogoRecords = successfulEntries
    .map((entry) => asString(entry.requestedUrl))
    .filter((url) => !logoByCrunchbaseUrl.has(url))
  if (missingLogoRecords.length) {
    throw new Error(`Missing company logo records for ${missingLogoRecords.length.toLocaleString()} Crunchbase profiles.`)
  }
  const lowerRiskRows = csvParse(await readFile(LOWER_RISK_FILE, 'utf8'))
  const lowerRiskUrls = new Set(lowerRiskRows.map((row) => row.crunchbase_url).filter(Boolean))
  const sourceUpdatedAt = asString(manifest.updatedAt) || asString(manifest.createdAt)
  const parsedEndYear = Number(sourceUpdatedAt.slice(0, 4))
  const endYear = Number.isInteger(parsedEndYear) && parsedEndYear >= START_YEAR
    ? parsedEndYear
    : new Date().getUTCFullYear()
  const scopes: Record<ScopeKey, ScopeAccumulator> = {
    all: emptyScope(),
    lowerRisk: emptyScope(),
  }

  for (const entry of successfulEntries) {
    const requestedUrl = asString(entry.requestedUrl)
    const filename = basename(asString(entry.insightsPath))
    if (!filename.endsWith('.insights.json')) continue
    const insight = asRecord(JSON.parse(await readFile(resolve(CRUNCHBASE_DIRECTORY, filename), 'utf8')))
    const facts = asRecord(insight.facts)
    const company = asRecord(facts.company)
    const funding = asRecord(facts.funding)
    const industries = [...new Set(
      asArray(company.industries).map(asString).map((value) => value.trim()).filter(Boolean),
    )]
    const eligibleScopes: ScopeAccumulator[] = [scopes.all]
    if (lowerRiskUrls.has(requestedUrl)) eligibleScopes.push(scopes.lowerRisk)
    eligibleScopes.forEach((scope) => { scope.profiles += 1 })
    if (!industries.length) continue
    const profileId = requestedUrl || filename
    const companyDetails: CompanyDetails = {
      crunchbaseUrl: profileId,
      industries,
      logoUrl: logoByCrunchbaseUrl.get(requestedUrl) ?? null,
      primaryGroup: asString(primaryGroups.get(requestedUrl)?.primaryGroup) || null,
      primaryGroupId: asString(primaryGroups.get(requestedUrl)?.primaryGroupId) || null,
      name: asString(company.name) || filename.replace(/\.insights\.json$/, ''),
      website: asString(company.website),
    }

    asArray(funding.rounds).forEach((value) => {
      const round = asRecord(value)
      const amount = asRecord(round.amount)
      const announcedDate = asString(round.announcedDate)
      const year = Number(announcedDate.slice(0, 4))
      const month = Number(announcedDate.slice(5, 7))
      const day = Number(announcedDate.slice(8, 10))
      const amountUsd = asNumber(amount.amount)
      if (
        amount.currency !== 'USD'
        || amountUsd <= 0
        || !/^\d{4}-\d{2}-\d{2}$/.test(announcedDate)
        || !Number.isInteger(year)
        || !Number.isInteger(month)
        || month < 1
        || month > 12
        || !Number.isInteger(day)
        || day < 1
        || day > 31
        || year < START_YEAR
        || year > endYear
      ) return
      eligibleScopes.forEach((scope) => addRound(scope, companyDetails, industries, year, announcedDate, amountUsd))
    })
  }

  const snapshot = {
    methodology: {
      allocation: 'Each USD-denominated round is split equally across all Crunchbase industry labels attached to its company.',
      caveat: 'The lower-risk scope is evidence-filtered, not fully identity-verified. The all-pulls scope includes risky and unmatched YC-to-Crunchbase mappings.',
      currency: 'USD',
      dateField: 'funding round announced date',
      lowerRiskDefinition: 'Exact requested URLs present in the dated lower-risk YC-to-Crunchbase partition.',
      startYear: START_YEAR,
    },
    scopes: {
      all: serialiseScope(scopes.all),
      lowerRisk: serialiseScope(scopes.lowerRisk),
    },
    source: {
      lowerRiskFile: 'outputs/yc-crunchbase-links-public/run-2026-08-28T13-08-54-240Z/risk-separation/yc-crunchbase-non-risky.csv',
      logoFile: 'assets/crunchbase/yc-company-logo-urls.json',
      primaryGroupFile: 'assets/crunchbase/yc-company-primary-groups.json',
      manifest: 'outputs/crunchbase/manifest.json',
      provider: 'Crunchbase',
      updatedAt: sourceUpdatedAt,
    },
    version: 6,
    years: Array.from({ length: endYear - START_YEAR + 1 }, (_, index) => START_YEAR + index),
  }

  await mkdir(dirname(OUTPUT_FILE), { recursive: true })
  const temporaryFile = `${OUTPUT_FILE}.${process.pid}.tmp`
  try {
    await writeFile(temporaryFile, `${JSON.stringify(snapshot)}\n`, 'utf8')
    await rename(temporaryFile, OUTPUT_FILE)
  } catch (error) {
    await unlink(temporaryFile).catch(() => undefined)
    throw error
  }

  console.log(
    `Wrote ${snapshot.scopes.all.industries.length.toLocaleString()} industries across ${snapshot.years.length} years to ${OUTPUT_FILE}`,
  )
}

await main()
