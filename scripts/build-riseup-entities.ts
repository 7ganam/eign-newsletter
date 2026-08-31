import { createHash } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const SPEAKERS_PATH = resolve(process.cwd(), 'assets/riseup-summit-2026-speakers.json')
const COMPANIES_PATH = resolve(process.cwd(), 'eign_index.companies.json')
const OUTPUT_PATH = resolve(process.cwd(), 'assets/riseup-summit-2026-entities.json')
const NON_ORGANIZATION_VALUES = new Set(['-', 'n/a', 'na'])

type SourceSpeaker = {
  id: number
  attendee_id: number
  passport_name: string
  institute: string | null
}

type SourceData = {
  event: string
  source: string
  source_data_updated_at: string | null
  speakers: SourceSpeaker[]
}

type Company = {
  _id?: { $oid?: string } | string
  name?: string
}

type ExistingEntityData = {
  organizations?: Array<{ id?: string; canonical_name?: string; name?: string }>
}

type OrganizationGroup = {
  canonicalName: string
  names: Map<string, { count: number; firstIndex: number }>
  speakers: SourceSpeaker[]
}

const canonicalName = (value: string) => value
  .normalize('NFKC')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('en')

const cleanName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ')

const stableOrganizationId = (canonical: string) =>
  `organization_${createHash('sha256').update(canonical).digest('hex').slice(0, 20)}`

const companyId = (company: Company) => {
  if (typeof company._id === 'string') return company._id
  return company._id?.$oid ?? null
}

const readExistingEntities = async (): Promise<ExistingEntityData> => {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, 'utf8')) as ExistingEntityData
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

const source = JSON.parse(await readFile(SPEAKERS_PATH, 'utf8')) as SourceData
const companies = JSON.parse(await readFile(COMPANIES_PATH, 'utf8')) as Company[]
const existing = await readExistingEntities()

if (!Array.isArray(source.speakers) || source.speakers.length === 0) {
  throw new Error('RiseUp source file has no speakers.')
}

const sourceSpeakerIds = new Set<number>()
for (const speaker of source.speakers) {
  if (!Number.isInteger(speaker.id) || !speaker.passport_name) {
    throw new Error('Every RiseUp speaker must have a numeric source ID and a name.')
  }
  if (sourceSpeakerIds.has(speaker.id)) throw new Error(`Duplicate RiseUp speaker ID: ${speaker.id}`)
  sourceSpeakerIds.add(speaker.id)
}

const existingOrganizationIds = new Map<string, string>()
for (const organization of existing.organizations ?? []) {
  const canonical = organization.canonical_name || (organization.name ? canonicalName(organization.name) : '')
  if (canonical && organization.id) existingOrganizationIds.set(canonical, organization.id)
}

const companiesByCanonicalName = new Map<string, Company[]>()
for (const company of companies) {
  if (!company.name) continue
  const canonical = canonicalName(company.name)
  if (!canonical) continue
  const matches = companiesByCanonicalName.get(canonical) ?? []
  matches.push(company)
  companiesByCanonicalName.set(canonical, matches)
}

const organizationGroups = new Map<string, OrganizationGroup>()
source.speakers.forEach((speaker, speakerIndex) => {
  if (!speaker.institute) return
  const name = cleanName(speaker.institute)
  if (!name || NON_ORGANIZATION_VALUES.has(name.toLocaleLowerCase('en'))) return
  const canonical = canonicalName(name)
  const group: OrganizationGroup = organizationGroups.get(canonical) ?? {
    canonicalName: canonical,
    names: new Map<string, { count: number; firstIndex: number }>(),
    speakers: [],
  }
  const variant = group.names.get(name) ?? { count: 0, firstIndex: speakerIndex }
  variant.count += 1
  group.names.set(name, variant)
  group.speakers.push(speaker)
  organizationGroups.set(canonical, group)
})

const organizations = [...organizationGroups.values()].map((group) => {
  const sourceNames = [...group.names.entries()]
    .sort(([, left], [, right]) => left.firstIndex - right.firstIndex)
    .map(([name]) => name)
  const displayName = [...group.names.entries()]
    .sort(([, left], [, right]) => right.count - left.count || left.firstIndex - right.firstIndex)[0][0]
  const exactCompanyMatches = companiesByCanonicalName.get(group.canonicalName) ?? []
  const matchedCompany = exactCompanyMatches.length === 1 ? exactCompanyMatches[0] : null

  return {
    id: existingOrganizationIds.get(group.canonicalName) ?? stableOrganizationId(group.canonicalName),
    name: displayName,
    canonical_name: group.canonicalName,
    source_names: sourceNames,
    company_id: matchedCompany ? companyId(matchedCompany) : null,
    company_match_method: matchedCompany ? 'exact-normalized-name' : null,
    person_ids: group.speakers.map((speaker) => `person_riseup_${speaker.id}`),
    source_speaker_ids: group.speakers.map((speaker) => speaker.id),
    source: 'riseup-summit-2026',
  }
}).sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }))

const organizationByCanonicalName = new Map(organizations.map((organization) => [organization.canonical_name, organization]))
const people = source.speakers.map((speaker) => {
  const institute = speaker.institute ? cleanName(speaker.institute) : ''
  const organization = institute && !NON_ORGANIZATION_VALUES.has(institute.toLocaleLowerCase('en'))
    ? organizationByCanonicalName.get(canonicalName(institute))
    : undefined
  return {
    id: `person_riseup_${speaker.id}`,
    name: speaker.passport_name,
    organization_ids: organization ? [organization.id] : [],
    source_speaker_id: speaker.id,
    source_attendee_id: speaker.attendee_id,
    source: 'riseup-summit-2026',
  }
})

const personOrganizations = people.flatMap((person) => person.organization_ids.map((organizationId) => ({
  person_id: person.id,
  organization_id: organizationId,
  relationship_type: 'speaker-affiliation',
  source_speaker_id: person.source_speaker_id,
  source: 'riseup-summit-2026',
})))

const organizationIds = new Set(organizations.map((organization) => organization.id))
if (organizationIds.size !== organizations.length) throw new Error('Organization ID collision detected.')
if (people.some((person) => person.organization_ids.some((id) => !organizationIds.has(id)))) {
  throw new Error('A person references an unknown organization.')
}

const output = {
  schema_version: 1,
  event: source.event,
  source: source.source,
  source_data_updated_at: source.source_data_updated_at,
  generated_at: new Date().toISOString(),
  company_file: 'eign_index.companies.json',
  counts: {
    people: people.length,
    organizations: organizations.length,
    person_organization_relationships: personOrganizations.length,
    people_without_organization: people.filter((person) => person.organization_ids.length === 0).length,
    organizations_linked_to_companies: organizations.filter((organization) => organization.company_id).length,
  },
  people,
  organizations,
  person_organizations: personOrganizations,
}

const temporaryPath = `${OUTPUT_PATH}.tmp-${process.pid}`
await writeFile(temporaryPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
await rename(temporaryPath, OUTPUT_PATH)

console.log(
  `Built ${people.length} people, ${organizations.length} organizations, and ${personOrganizations.length} relationships in ${OUTPUT_PATH}`,
)
