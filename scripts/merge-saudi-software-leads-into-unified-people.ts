import assert from 'node:assert/strict'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { UnifiedPeopleFile, UnifiedPerson, UnifiedPeopleSource } from '../src/unifiedPeopleTypes'

const SOURCE_ID = 'saudi-software-leads' as const
const LEADS_PATH = new URL('../assets/lead-research/saudi-software-leads.json', import.meta.url)
const PEOPLE_PATH = new URL('../assets/people/unified-people.json', import.meta.url)
const NOTION_LEADS_URL = 'https://app.notion.com/p/c250c0fd564445ac9ffa5db49fa98188?pvs=204'

type LeadRow = {
  id: string
  identity: {
    display_name: string
    linkedin_url: string | null
    current_title: string | null
    current_organization: string | null
    identity_status: string
    identity_confidence: string
  }
  company: {
    name: string
    city: string | null
    sector: string | null
  }
  research: {
    last_researched_at: string | null
  }
  evidence: Array<{
    source_url: string
  }>
}

type LeadsFile = {
  schema_version: string
  generated_at: string
  rows: LeadRow[]
}

const normalizeIdentityText = (value: string | null | undefined) => (value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase()
  .replace(/\b(?:h\.?e\.?|h\.?h\.?|dr|prof|mr|mrs|ms|miss|phd|md)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const compactIdentityText = (value: string | null | undefined) => normalizeIdentityText(value).replace(/\s+/g, '')
const slug = (value: string) => normalizeIdentityText(value).replace(/\s+/g, '-').slice(0, 64) || 'unknown'

const shortHash = (value: string) => {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).padStart(7, '0').slice(0, 7)
}

const canonicalLinkedInUrl = (value: string) => {
  const clean = value.trim().replace(/[?#].*$/, '').replace(/\/+$/, '')
  const match = clean.match(/linkedin\.com\/in\/([^/]+)/i)
  if (!match) throw new Error(`Invalid LinkedIn personal profile URL: ${value}`)
  return `https://www.linkedin.com/in/${match[1]}`.toLocaleLowerCase()
}

const unique = <Value>(values: Value[]) => [...new Set(values)]

const profileLinkedInKeys = (person: UnifiedPerson) => person.profiles.flatMap((profile) => {
  try {
    return profile.platform === 'linkedin' ? [canonicalLinkedInUrl(profile.url)] : []
  } catch {
    return []
  }
})

const companyKeys = (person: UnifiedPerson) => unique([
  person.current_role.organization,
  ...(person.founder?.companies ?? []),
].filter((value): value is string => Boolean(value)).map(compactIdentityText).filter(Boolean))

const personIdForLead = (lead: LeadRow) => {
  const linkedin = lead.identity.linkedin_url ? canonicalLinkedInUrl(lead.identity.linkedin_url) : null
  return `person_${slug(lead.identity.display_name)}_${shortHash(linkedin ?? `${SOURCE_ID}:${lead.id}`)}`
}

const newPerson = (lead: LeadRow): UnifiedPerson => {
  const linkedin = lead.identity.linkedin_url ? canonicalLinkedInUrl(lead.identity.linkedin_url) : null
  return {
    id: personIdForLead(lead),
    source_ids: [SOURCE_ID],
    group: 'client-target',
    name: {
      display: lead.identity.display_name,
      title: null,
      passport: null,
      certificate: null,
    },
    current_role: {
      title: lead.identity.current_title,
      organization: lead.identity.current_organization || lead.company.name,
    },
    location: {
      country: 'Saudi Arabia',
      country_code: 'SA',
      city: lead.company.city,
      nationality: null,
    },
    biography: null,
    specialties: lead.company.sector ? [lead.company.sector] : [],
    image: {
      url: null,
      source_path: null,
      alt: lead.identity.display_name,
    },
    profiles: linkedin ? [{
      platform: 'linkedin',
      url: linkedin,
      verification: `${SOURCE_ID}:${lead.identity.identity_status}:${lead.identity.identity_confidence}`,
      followers: null,
    }] : [],
    influence: {
      lane: 'Founder',
      fit: false,
      potential_target: true,
      target: false,
      priority: null,
      middle_eastern: {
        value: null,
        method: null,
        reason: null,
        manually_overridden: false,
      },
    },
    event_appearances: [],
    source_records: [],
  }
}

const mergeLead = (person: UnifiedPerson, lead: LeadRow) => {
  person.source_ids = unique([...person.source_ids, SOURCE_ID]).sort()
  person.group = 'client-target'
  person.influence.potential_target = true
  person.influence.lane ||= 'Founder'
  person.current_role.title ||= lead.identity.current_title
  person.current_role.organization ||= lead.identity.current_organization || lead.company.name
  if (!person.location.country) {
    person.location.country = 'Saudi Arabia'
    person.location.country_code = 'SA'
  }
  person.location.city ||= lead.company.city
  if (lead.company.sector && !person.specialties.includes(lead.company.sector)) person.specialties.push(lead.company.sector)

  if (lead.identity.linkedin_url) {
    const linkedin = canonicalLinkedInUrl(lead.identity.linkedin_url)
    const existing = person.profiles.find((profile) => {
      try {
        return profile.platform === 'linkedin' && canonicalLinkedInUrl(profile.url) === linkedin
      } catch {
        return false
      }
    })
    if (!existing) {
      person.profiles.push({
        platform: 'linkedin',
        url: linkedin,
        verification: `${SOURCE_ID}:${lead.identity.identity_status}:${lead.identity.identity_confidence}`,
        followers: null,
      })
    }
  }

  const sourceRecord: UnifiedPerson['source_records'][number] = {
    source_id: SOURCE_ID,
    record_id: lead.id,
    source_url: lead.identity.linkedin_url || lead.evidence[0]?.source_url || NOTION_LEADS_URL,
    observed_at: lead.research.last_researched_at,
    verification: `${SOURCE_ID}:${lead.identity.identity_status}:${lead.identity.identity_confidence}`,
    raw: structuredClone(lead),
  }
  const index = person.source_records.findIndex((record) => record.source_id === SOURCE_ID && record.record_id === lead.id)
  if (index >= 0) person.source_records[index] = sourceRecord
  else person.source_records.push(sourceRecord)
}

const writeJsonAtomically = async (path: URL, value: unknown) => {
  const filePath = path.pathname
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filePath)
}

const unified = JSON.parse(await readFile(PEOPLE_PATH, 'utf8')) as UnifiedPeopleFile
const leads = JSON.parse(await readFile(LEADS_PATH, 'utf8')) as LeadsFile

assert.match(leads.schema_version, /^saudi-software-leads\.v\d+$/)
assert.equal(new Set(leads.rows.map((lead) => lead.id)).size, leads.rows.length, 'Lead IDs must be unique.')
assert.equal(new Set(unified.people.map((person) => person.id)).size, unified.people.length, 'Person IDs must be unique before the merge.')

let created = 0
let matchedByLinkedIn = 0
let matchedByNameAndCompany = 0

for (const lead of leads.rows) {
  const sourceMatches = unified.people.filter((person) => person.source_records.some((record) => record.source_id === SOURCE_ID && record.record_id === lead.id))
  const linkedinMatches = lead.identity.linkedin_url
    ? unified.people.filter((person) => profileLinkedInKeys(person).includes(canonicalLinkedInUrl(lead.identity.linkedin_url!)))
    : []
  const nameMatches = unified.people.filter((person) => compactIdentityText(person.name.display) === compactIdentityText(lead.identity.display_name))
  const organization = compactIdentityText(lead.identity.current_organization || lead.company.name)
  const nameAndCompanyMatches = nameMatches.filter((person) => companyKeys(person).includes(organization))

  assert.ok(sourceMatches.length <= 1, `Multiple source-record matches for ${lead.id}`)
  assert.ok(linkedinMatches.length <= 1, `Multiple LinkedIn matches for ${lead.id}`)
  assert.ok(nameAndCompanyMatches.length <= 1, `Multiple name and company matches for ${lead.id}`)

  let person = sourceMatches[0] || linkedinMatches[0] || nameAndCompanyMatches[0]
  if (!person) {
    person = newPerson(lead)
    assert.ok(!unified.people.some((candidate) => candidate.id === person!.id), `Generated Person ID collision for ${lead.id}`)
    unified.people.push(person)
    created += 1
  } else if (linkedinMatches[0] === person && sourceMatches.length === 0) matchedByLinkedIn += 1
  else if (nameAndCompanyMatches[0] === person && sourceMatches.length === 0) matchedByNameAndCompany += 1

  mergeLead(person, lead)
}

const observedAt = leads.rows.map((lead) => lead.research.last_researched_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? leads.generated_at
const source: UnifiedPeopleSource = {
  id: SOURCE_ID,
  name: 'Saudi software leads',
  type: 'research',
  url: NOTION_LEADS_URL,
  source_files: ['assets/lead-research/saudi-software-leads.json'],
  observed_at: observedAt,
  record_count: leads.rows.length,
}
const sourceIndex = unified.sources.findIndex((candidate) => candidate.id === SOURCE_ID)
if (sourceIndex >= 0) unified.sources[sourceIndex] = source
else unified.sources.push(source)

unified.people.sort((left, right) => left.name.display.localeCompare(right.name.display, undefined, { numeric: true, sensitivity: 'base' }))
const sourceRecords = unified.people.flatMap((person) => person.source_records)
unified.generated_at = new Date().toISOString()
unified.stats = {
  source_records: sourceRecords.length,
  unique_people: unified.people.length,
  multi_source_people: unified.people.filter((person) => person.source_ids.length > 1).length,
  duplicate_source_records_collapsed: sourceRecords.length - unified.people.length,
}

const mergedLeadRecords = sourceRecords.filter((record) => record.source_id === SOURCE_ID)
assert.equal(mergedLeadRecords.length, leads.rows.length, 'Every lead must have one unified source record.')
assert.equal(new Set(mergedLeadRecords.map((record) => record.record_id)).size, leads.rows.length, 'Lead source records must remain unique.')
assert.equal(new Set(unified.people.map((person) => person.id)).size, unified.people.length, 'Person IDs must remain unique after the merge.')
assert.equal(unified.people.filter((person) => person.source_ids.includes(SOURCE_ID) && person.group !== 'client-target').length, 0, 'Every lead person must be a Client target.')

await writeJsonAtomically(PEOPLE_PATH, unified)

console.log(JSON.stringify({
  created,
  matched_by_linkedin: matchedByLinkedIn,
  matched_by_name_and_company: matchedByNameAndCompany,
  lead_records: mergedLeadRecords.length,
  people: unified.people.length,
  stats: unified.stats,
}, null, 2))
