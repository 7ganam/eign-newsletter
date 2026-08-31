import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import leapData from '../assets/people/leap-2026-people.json'
import riseUpData from '../assets/people/riseup-2026-people.json'
import webSearchData from '../assets/people/web-search-people.json'
import type {
  UnifiedEventAppearance,
  UnifiedPeopleFile,
  UnifiedPeopleSource,
  UnifiedPeopleSourceFile,
  UnifiedPeopleSourceId,
  UnifiedPerson,
  UnifiedProfile,
} from '../src/unifiedPeopleTypes'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'assets/people/unified-people.json')
const GENERATED_AT = new Date().toISOString()

type SourceInput = {
  fileName: string
  sourceId: UnifiedPeopleSourceId
  data: UnifiedPeopleSourceFile
}

const sourceInputs: SourceInput[] = [
  {
    fileName: 'leap-2026-people.json',
    sourceId: 'leap-2026',
    data: leapData as UnifiedPeopleSourceFile,
  },
  {
    fileName: 'riseup-2026-people.json',
    sourceId: 'riseup-2026',
    data: riseUpData as UnifiedPeopleSourceFile,
  },
  {
    fileName: 'web-search-people.json',
    sourceId: 'web-search',
    data: webSearchData as UnifiedPeopleSourceFile,
  },
]

const normalizeIdentityText = (value: string | null | undefined) => (value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase()
  .replace(/\b(?:h\.?e\.?|h\.?h\.?|dr|prof|mr|mrs|ms|miss|phd|md)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

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
  try {
    const url = new URL(value)
    if (!url.hostname.endsWith('linkedin.com')) return value.toLocaleLowerCase().replace(/\/$/, '')
    return `linkedin.com${url.pathname.toLocaleLowerCase().replace(/\/$/, '')}`
  } catch {
    return value.toLocaleLowerCase().replace(/[?#].*$/, '').replace(/\/$/, '')
  }
}

const profileKey = (profile: UnifiedProfile) => `${profile.platform}:${canonicalLinkedInUrl(profile.url)}`
const appearanceKey = (appearance: UnifiedEventAppearance) => [
  appearance.event_id,
  appearance.speaker_id,
  appearance.attendee_id,
  appearance.profile_url,
].join(':')

const preferText = (current: string | null, next: string | null) => current || next

const mergeProfiles = (current: UnifiedProfile[], incoming: UnifiedProfile[]) => {
  const merged = new Map(current.map((profile) => [profileKey(profile), structuredClone(profile)]))
  for (const profile of incoming) {
    const key = profileKey(profile)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, structuredClone(profile))
      continue
    }
    existing.verification ||= profile.verification
    if (!existing.followers && profile.followers) existing.followers = structuredClone(profile.followers)
    else if (existing.followers && profile.followers && existing.followers.count == null && profile.followers.count != null) {
      existing.followers = structuredClone(profile.followers)
    }
  }
  return [...merged.values()]
}

const mergePeople = (current: UnifiedPerson, incoming: UnifiedPerson) => {
  current.source_ids = [...new Set([...current.source_ids, ...incoming.source_ids])].sort()
  current.name.title = preferText(current.name.title, incoming.name.title)
  current.name.passport = preferText(current.name.passport, incoming.name.passport)
  current.name.certificate = preferText(current.name.certificate, incoming.name.certificate)
  current.current_role.title = preferText(current.current_role.title, incoming.current_role.title)
  current.current_role.organization = preferText(current.current_role.organization, incoming.current_role.organization)
  current.location.country = preferText(current.location.country, incoming.location.country)
  current.location.country_code = preferText(current.location.country_code, incoming.location.country_code)
  current.location.city = preferText(current.location.city, incoming.location.city)
  current.location.nationality = preferText(current.location.nationality, incoming.location.nationality)
  current.biography = !current.biography || (incoming.biography?.length ?? 0) > current.biography.length
    ? incoming.biography
    : current.biography
  current.specialties = [...new Set([...current.specialties, ...incoming.specialties])]
  current.image.url = preferText(current.image.url, incoming.image.url)
  current.image.source_path = preferText(current.image.source_path, incoming.image.source_path)
  current.image.alt = preferText(current.image.alt, incoming.image.alt)
  current.profiles = mergeProfiles(current.profiles, incoming.profiles)
  current.influence.lane = preferText(current.influence.lane, incoming.influence.lane)
  current.influence.priority ??= incoming.influence.priority
  if (current.influence.middle_eastern.value === null && incoming.influence.middle_eastern.value !== null) {
    current.influence.middle_eastern = structuredClone(incoming.influence.middle_eastern)
  }
  const appearances = new Map(current.event_appearances.map((appearance) => [appearanceKey(appearance), appearance]))
  for (const appearance of incoming.event_appearances) appearances.set(appearanceKey(appearance), structuredClone(appearance))
  current.event_appearances = [...appearances.values()]
  current.source_records.push(...structuredClone(incoming.source_records))
}

const linkedInKeys = (person: UnifiedPerson) => person.profiles.map((profile) => canonicalLinkedInUrl(profile.url))
const nameOrganizationKey = (person: UnifiedPerson) => {
  const name = normalizeIdentityText(person.name.display)
  const organization = normalizeIdentityText(person.current_role.organization)
  return name && organization ? `${name}::${organization}` : null
}

const mergeSourcePeople = (people: UnifiedPerson[]) => {
  const merged: UnifiedPerson[] = []
  const byLinkedIn = new Map<string, UnifiedPerson>()
  const byNameOrganization = new Map<string, UnifiedPerson>()

  for (const sourcePerson of people) {
    const linkedinMatch = linkedInKeys(sourcePerson).map((key) => byLinkedIn.get(key)).find(Boolean)
    const organizationKey = nameOrganizationKey(sourcePerson)
    const organizationMatch = organizationKey ? byNameOrganization.get(organizationKey) : undefined
    const target = linkedinMatch ?? organizationMatch

    if (target) mergePeople(target, sourcePerson)
    else merged.push(structuredClone(sourcePerson))

    const indexedPerson = target ?? merged.at(-1)!
    for (const key of linkedInKeys(indexedPerson)) byLinkedIn.set(key, indexedPerson)
    const indexedOrganizationKey = nameOrganizationKey(indexedPerson)
    if (indexedOrganizationKey) byNameOrganization.set(indexedOrganizationKey, indexedPerson)
  }

  for (const person of merged) {
    const linkedin = linkedInKeys(person)[0]
    const identitySeed = linkedin || person.source_records.map((record) => `${record.source_id}:${record.record_id}`).sort().join('|')
    person.id = `person_${slug(person.name.display)}_${shortHash(identitySeed)}`
  }

  return merged.sort((left, right) => left.name.display.localeCompare(right.name.display))
}

for (const input of sourceInputs) {
  assert.equal(input.data.schema_version, 'people.v1', `${input.fileName} must use the people.v1 schema.`)
  assert.equal(input.data.source.id, input.sourceId, `${input.fileName} has the wrong source ID.`)
  assert.equal(input.data.people.length, input.data.source.record_count, `${input.fileName} has a stale record count.`)
  assert.equal(
    new Set(input.data.people.flatMap((person) => person.source_records.map((record) => `${record.source_id}:${record.record_id}`))).size,
    input.data.people.reduce((total, person) => total + person.source_records.length, 0),
    `${input.fileName} contains duplicate source record IDs.`,
  )
  assert.ok(
    input.data.people.every((person) => person.source_ids.includes(input.sourceId)
      && person.source_records.some((record) => record.source_id === input.sourceId)),
    `${input.fileName} contains a person without its source provenance.`,
  )
}

const inputBySource = new Map(sourceInputs.map((input) => [input.sourceId, input]))
const leap = inputBySource.get('leap-2026')!
const riseUp = inputBySource.get('riseup-2026')!
const webSearch = inputBySource.get('web-search')!
const mergedPeople = mergeSourcePeople([...riseUp.data.people, ...webSearch.data.people, ...leap.data.people])
const sourceRecordCount = sourceInputs.reduce(
  (total, input) => total + input.data.people.reduce((subtotal, person) => subtotal + person.source_records.length, 0),
  0,
)
const sources: UnifiedPeopleSource[] = sourceInputs.map((input) => ({
  ...structuredClone(input.data.source),
  source_files: [`assets/people/${input.fileName}`],
  record_count: input.data.people.length,
}))

assert.equal(new Set(mergedPeople.map((person) => person.id)).size, mergedPeople.length, 'Merged person IDs must be unique.')
assert.equal(
  mergedPeople.reduce((total, person) => total + person.source_records.length, 0),
  sourceRecordCount,
  'The merged file must retain every converted source record.',
)

const mergedFile: UnifiedPeopleFile = {
  schema_version: 'people.v1',
  generated_at: GENERATED_AT,
  sources,
  stats: {
    source_records: sourceRecordCount,
    unique_people: mergedPeople.length,
    multi_source_people: mergedPeople.filter((person) => person.source_ids.length > 1).length,
    duplicate_source_records_collapsed: sourceRecordCount - mergedPeople.length,
  },
  people: mergedPeople,
}

await writeFile(OUTPUT_PATH, `${JSON.stringify(mergedFile, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  output: OUTPUT_PATH,
  inputs: sourceInputs.map((input) => `assets/people/${input.fileName}`),
  source_records: sourceRecordCount,
  unique_people: mergedPeople.length,
  multi_source_people: mergedFile.stats.multi_source_people,
  duplicate_source_records_collapsed: mergedFile.stats.duplicate_source_records_collapsed,
}, null, 2))
