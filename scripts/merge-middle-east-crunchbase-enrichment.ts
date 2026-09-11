import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRAPE_DIRECTORY = resolve(PROJECT_ROOT, 'outputs/middle-east-jordan-funding-1000-plus')
const MANIFEST_FILE = resolve(SCRAPE_DIRECTORY, 'scrape-manifest.json')
const INVENTORY_FILE = resolve(PROJECT_ROOT, 'data/companies/crunchbase-middle-east-company-search-inventory.json')
const LOOKUP_FILE = resolve(PROJECT_ROOT, 'data/companies/crunchbase-middle-east-company-name-logo-primary-group.json')

type DataRecord = Record<string, unknown>
type ManifestEntry = { outputPath?: string; requestedUrl?: string; status?: string }
type InventoryCompany = Record<string, unknown> & { crunchbaseUrl?: string; name?: string }
type LookupRow = { companyName?: string; imageUrl?: string | null; primaryGroup?: string }

const asRecord = (value: unknown): DataRecord => value && typeof value === 'object' && !Array.isArray(value)
  ? value as DataRecord
  : {}
const asString = (value: unknown) => typeof value === 'string' ? value : ''
const normalizeName = (value: unknown) => asString(value).trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')

const findOrganizationIdentifier = (value: unknown, companyName: string): DataRecord | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findOrganizationIdentifier(item, companyName)
      if (found) return found
    }
    return null
  }
  if (!value || typeof value !== 'object') return null
  const record = value as DataRecord
  if (record.entity_def_id === 'organization' && normalizeName(record.value) === normalizeName(companyName)) return record
  for (const item of Object.values(record)) {
    const found = findOrganizationIdentifier(item, companyName)
    if (found) return found
  }
  return null
}

const imageUrlFor = (imageId: unknown) => typeof imageId === 'string' && imageId
  ? `https://images.crunchbase.com/image/upload/c_pad,h_170,w_170,f_auto,b_white,q_auto:eco,dpr_1/${imageId}`
  : null

const main = async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_FILE, 'utf8')) as { entries?: ManifestEntry[] }
  const inventory = JSON.parse(await readFile(INVENTORY_FILE, 'utf8')) as { companies?: InventoryCompany[] }
  const lookup = JSON.parse(await readFile(LOOKUP_FILE, 'utf8')) as LookupRow[]
  if (!Array.isArray(manifest.entries) || !Array.isArray(inventory.companies) || !Array.isArray(lookup)) {
    throw new Error('Middle East Crunchbase enrichment inputs have unexpected shapes.')
  }

  const entriesByUrl = new Map(manifest.entries.filter((entry) => entry.status === 'success').map((entry) => [entry.requestedUrl ?? '', entry]))
  const lookupByName = new Map<string, LookupRow[]>()
  for (const row of lookup) {
    const key = normalizeName(row.companyName)
    if (!key) throw new Error('The enrichment lookup contains a row without companyName.')
    const rows = lookupByName.get(key) ?? []
    rows.push(row)
    lookupByName.set(key, rows)
  }

  const usedLookupRows = new Set<LookupRow>()
  const companies = await Promise.all(inventory.companies.map(async (company) => {
    const url = asString(company.crunchbaseUrl)
    const name = asString(company.name)
    const entry = entriesByUrl.get(url)
    if (!entry?.outputPath) throw new Error(`No successful scrape output matches ${url}.`)
    const raw = JSON.parse(await readFile(resolve(SCRAPE_DIRECTORY, 'companies', basename(entry.outputPath)), 'utf8')) as DataRecord
    const identifier = findOrganizationIdentifier(raw, name)
    const imageUrl = imageUrlFor(identifier?.image_id)
    const candidates = lookupByName.get(normalizeName(name)) ?? []
    const matches = candidates.filter((candidate) => candidate.imageUrl === imageUrl)
    const selected = matches.length === 1
      ? matches[0]
      : imageUrl === null ? candidates.find((candidate) => candidate.imageUrl === null) : undefined
    if (!selected) throw new Error(`Could not uniquely match PR enrichment for ${name} (${url}).`)
    usedLookupRows.add(selected)
    return { ...company, imageUrl: selected.imageUrl ?? null, primaryGroup: asString(selected.primaryGroup) }
  }))

  if (usedLookupRows.size !== lookup.length) throw new Error(`Only matched ${usedLookupRows.size} of ${lookup.length} PR enrichment rows.`)
  const output = { ...JSON.parse(await readFile(INVENTORY_FILE, 'utf8')) as DataRecord, companies }
  const temporaryFile = `${INVENTORY_FILE}.${process.pid}.tmp`
  await mkdir(dirname(INVENTORY_FILE), { recursive: true })
  try {
    await writeFile(temporaryFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
    await rename(temporaryFile, INVENTORY_FILE)
  } catch (error) {
    await unlink(temporaryFile).catch(() => undefined)
    throw error
  }
  console.log(`Merged ${companies.length.toLocaleString()} PR enrichment rows into ${INVENTORY_FILE}`)
}

await main()
