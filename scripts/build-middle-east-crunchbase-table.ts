import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRAPE_DIRECTORY = resolve(PROJECT_ROOT, 'outputs/middle-east-jordan-funding-1000-plus')
const MANIFEST_FILE = resolve(SCRAPE_DIRECTORY, 'scrape-manifest.json')
const INVENTORY_FILE = resolve(PROJECT_ROOT, 'data/companies/crunchbase-middle-east-company-search-inventory.json')
const OUTPUT_FILE = resolve(PROJECT_ROOT, 'data/companies/crunchbase-middle-east-company-profiles.json')

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

type InventoryCompany = {
  country?: string
  crunchbaseUrl?: string
  foundedOn?: string
  foundedOnPrecision?: string
  imageUrl?: string | null
  name?: string
  primaryGroup?: string
  permalink?: string
  sourcePartition?: string
  uuid?: string
}

type Inventory = { companies?: InventoryCompany[] }

const asRecord = (value: unknown): DataRecord => value && typeof value === 'object' && !Array.isArray(value)
  ? value as DataRecord
  : {}
const asNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0
const asString = (value: unknown) => typeof value === 'string' ? value : ''
const asStringList = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  : []

const buildRow = async (entry: ManifestEntry, inventoryByUrl: Map<string, InventoryCompany>) => {
  const insightsFilename = basename(entry.insightsPath ?? '')
  if (!insightsFilename.endsWith('.insights.json')) {
    throw new Error(`Missing insights file for ${entry.requestedUrl ?? entry.requestedSlug ?? 'a manifest entry'}.`)
  }

  const parsed: unknown = JSON.parse(await readFile(resolve(SCRAPE_DIRECTORY, 'companies', insightsFilename), 'utf8'))
  const insight = asRecord(parsed)
  const source = asRecord(insight.source)
  const facts = asRecord(insight.facts)
  const company = asRecord(facts.company)
  const funding = asRecord(facts.funding)
  const totalRaised = asRecord(funding.totalRaised)
  const investors = asRecord(funding.investors)
  const visibleInvestors = Array.isArray(investors.visibleNames) ? investors.visibleNames : []
  const crunchbaseUrl = asString(source.url) || asString(entry.requestedUrl)
  const inventory = inventoryByUrl.get(crunchbaseUrl)

  if (!inventory) throw new Error(`No Middle East search-inventory row matches ${crunchbaseUrl}.`)

  return {
    country: asString(inventory.country),
    crunchbaseUrl,
    detailedRoundCount: String(asNumber(funding.detailedRoundCount)),
    employeeRange: asString(company.employeeRange),
    estimatedRevenueRange: asString(company.estimatedRevenueRange),
    foundedOn: asString(inventory.foundedOn),
    foundedOnPrecision: asString(inventory.foundedOnPrecision),
    foundedYear: company.foundedYear == null ? '' : String(asNumber(company.foundedYear)),
    founders: asStringList(company.founders).join(' · '),
    headquarters: asString(company.headquarters),
    industries: asStringList(company.industries).join(' · '),
    investorCount: investors.reportedCount == null ? '' : String(asNumber(investors.reportedCount)),
    investors: visibleInvestors
      .map((investor) => asString(asRecord(investor).name))
      .filter(Boolean)
      .join(' · '),
    imageUrl: inventory.imageUrl ?? null,
    lastFundingDate: asString(funding.lastFundingDate),
    lastFundingType: asString(funding.lastFundingType),
    name: asString(company.name) || asString(inventory.name) || asString(entry.canonicalSlug) || asString(entry.requestedSlug),
    operatingStatus: asString(company.operatingStatus),
    ownershipStatus: asString(company.ownershipStatus),
    permalink: asString(inventory.permalink),
    primaryGroup: asString(inventory.primaryGroup),
    reportedRoundCount: funding.reportedRoundCount == null ? '' : String(asNumber(funding.reportedRoundCount)),
    shortDescription: asString(company.shortDescription),
    source: 'Crunchbase',
    sourcePartition: asString(inventory.sourcePartition),
    totalRaisedUsd: totalRaised.currency === 'USD' && typeof totalRaised.amount === 'number'
      ? String(totalRaised.amount)
      : '',
    uuid: asString(inventory.uuid),
    website: asString(company.website),
  }
}

const main = async () => {
  const manifest = asRecord(JSON.parse(await readFile(MANIFEST_FILE, 'utf8'))) as Manifest
  const inventory = JSON.parse(await readFile(INVENTORY_FILE, 'utf8')) as Inventory
  if (!Array.isArray(manifest.entries)) throw new Error('The Middle East Crunchbase pull manifest has no entries array.')
  if (!Array.isArray(inventory.companies)) throw new Error('The Middle East Crunchbase search inventory has no companies array.')

  const inventoryByUrl = new Map(inventory.companies.map((company) => [company.crunchbaseUrl ?? '', company]))
  const entries = manifest.entries.filter((entry) => entry.status === 'success')
  const items: Awaited<ReturnType<typeof buildRow>>[] = []
  const batchSize = 64
  for (let index = 0; index < entries.length; index += batchSize) {
    items.push(...await Promise.all(entries.slice(index, index + batchSize).map((entry) => buildRow(entry, inventoryByUrl))))
  }

  const ids = new Set(items.map((item) => item.crunchbaseUrl))
  if (ids.size !== items.length || ids.has('')) throw new Error('Crunchbase URLs must be present and unique.')

  const snapshot = {
    createdAt: asString(manifest.createdAt),
    inputFile: 'crunchbase-middle-east-company-urls.json',
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
