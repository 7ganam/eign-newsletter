import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CRUNCHBASE_DIRECTORY = resolve(PROJECT_ROOT, 'outputs/crunchbase')
const MANIFEST_FILE = resolve(CRUNCHBASE_DIRECTORY, 'manifest.json')
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'assets/crunchbase/yc-companies.json')

type DataRecord = Record<string, unknown>

type ManifestEntry = {
  canonicalSlug?: string
  insightsPath?: string
  requestedSlug?: string
  requestedUrl?: string
  status?: string
}

type Manifest = {
  createdAt?: string
  entries?: ManifestEntry[]
  inputPath?: string
  updatedAt?: string
  version?: number
}

const asRecord = (value: unknown): DataRecord => value && typeof value === 'object' && !Array.isArray(value)
  ? value as DataRecord
  : {}
const asNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0
const asString = (value: unknown) => typeof value === 'string' ? value : ''
const asStringList = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  : []

const buildRow = async (entry: ManifestEntry) => {
  const insightsFilename = basename(entry.insightsPath ?? '')
  if (!insightsFilename.endsWith('.insights.json')) {
    throw new Error(`Missing insights file for ${entry.requestedUrl ?? entry.requestedSlug ?? 'a manifest entry'}.`)
  }

  const parsed: unknown = JSON.parse(await readFile(resolve(CRUNCHBASE_DIRECTORY, insightsFilename), 'utf8'))
  const insight = asRecord(parsed)
  const source = asRecord(insight.source)
  const facts = asRecord(insight.facts)
  const company = asRecord(facts.company)
  const funding = asRecord(facts.funding)
  const totalRaised = asRecord(funding.totalRaised)
  const investors = asRecord(funding.investors)
  const visibleInvestors = Array.isArray(investors.visibleNames) ? investors.visibleNames : []

  return {
    crunchbaseUrl: asString(source.url) || asString(entry.requestedUrl),
    detailedRoundCount: String(asNumber(funding.detailedRoundCount)),
    employeeRange: asString(company.employeeRange),
    estimatedRevenueRange: asString(company.estimatedRevenueRange),
    foundedYear: company.foundedYear == null ? '' : String(asNumber(company.foundedYear)),
    founders: asStringList(company.founders).join(' · '),
    headquarters: asString(company.headquarters),
    industries: asStringList(company.industries).join(' · '),
    investorCount: investors.reportedCount == null ? '' : String(asNumber(investors.reportedCount)),
    investors: visibleInvestors
      .map((investor) => asString(asRecord(investor).name))
      .filter(Boolean)
      .join(' · '),
    lastFundingDate: asString(funding.lastFundingDate),
    lastFundingType: asString(funding.lastFundingType),
    name: asString(company.name) || asString(entry.canonicalSlug) || asString(entry.requestedSlug),
    operatingStatus: asString(company.operatingStatus),
    ownershipStatus: asString(company.ownershipStatus),
    reportedRoundCount: funding.reportedRoundCount == null ? '' : String(asNumber(funding.reportedRoundCount)),
    shortDescription: asString(company.shortDescription),
    source: 'Crunchbase',
    totalRaisedUsd: totalRaised.currency === 'USD' && typeof totalRaised.amount === 'number'
      ? String(totalRaised.amount)
      : '',
    website: asString(company.website),
  }
}

const main = async () => {
  const parsed: unknown = JSON.parse(await readFile(MANIFEST_FILE, 'utf8'))
  const manifest = asRecord(parsed) as Manifest
  if (!Array.isArray(manifest.entries)) throw new Error('The Crunchbase pull manifest has no entries array.')
  const entries = manifest.entries.filter((entry) => entry.status === 'success')
  const items: Awaited<ReturnType<typeof buildRow>>[] = []
  const batchSize = 64
  for (let index = 0; index < entries.length; index += batchSize) {
    items.push(...await Promise.all(entries.slice(index, index + batchSize).map(buildRow)))
  }

  const ids = new Set(items.map((item) => item.crunchbaseUrl))
  if (ids.size !== items.length || ids.has('')) throw new Error('Crunchbase URLs must be present and unique.')

  const snapshot = {
    createdAt: asString(manifest.createdAt),
    inputFile: basename(asString(manifest.inputPath)) || 'valid links.json',
    items,
    updatedAt: asString(manifest.updatedAt),
    version: asNumber(manifest.version) || 1,
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
  console.log(`Wrote ${items.length.toLocaleString()} completed Crunchbase profiles to ${OUTPUT_FILE}`)
}

await main()
