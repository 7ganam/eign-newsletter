import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type {
  UnifiedFollowerSnapshot,
  UnifiedPeopleFile,
  UnifiedPeopleSource,
  UnifiedPerson,
  UnifiedProfile,
} from '../src/unifiedPeopleTypes'

type LegacyVcPerson = UnifiedPerson & { target?: boolean }
type MatchKind = 'existing-source-record' | 'exact-linkedin' | 'exact-name-company' | 'manual-identity' | 'new-person'
type MergeDecision = {
  absorbed_person_ids: string[]
  kind: MatchKind | 'held-ambiguous' | 'held-name-only'
  legacy_person_id: string
  name: string
  person_id: string | null
  record_id: string
  reason?: string
}

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const UNIFIED_PATH = resolve(PROJECT_ROOT, 'assets/people/unified-people.json')
const VC_SOURCE_PATH = resolve(PROJECT_ROOT, 'assets/people/middle-east-vc-people.json')
const SOURCE_ID = 'middle-east-vc-people' as const
const APPLY = process.argv.includes('--apply')

// Nama's official team page identifies this board member as the DCO Secretary-General.
// The spelling variant has no LinkedIn URL in the VC source, so keep the reviewed match explicit.
const MANUAL_PERSON_MATCHES: Record<string, string> = {
  'vc-person:nama-ventures:deema-alyahya': 'person_deemah-alyahya_1g46jzw',
}

// These two LEAP rows are the same DCO leader. Keep both source records and profile evidence
// under the profile-backed canonical identity.
const MANUAL_DUPLICATE_MERGES: Record<string, string[]> = {
  'person_deemah-alyahya_1g46jzw': ['person_deema-al-yahya_1bicru7'],
}

const normalizeIdentityText = (value: string | null | undefined) => (value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase()
  .replace(/\b(?:h\.?e\.?|h\.?h\.?|dr|prof|mr|mrs|ms|miss|phd|md|hrh)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

const compactIdentityText = (value: string | null | undefined) => normalizeIdentityText(value).replace(/\s+/g, '')

const canonicalLinkedInUrl = (value: string) => {
  try {
    const url = new URL(value)
    const path = url.pathname.split('/').filter(Boolean)
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname) || path[0]?.toLocaleLowerCase() !== 'in' || !path[1]) return null
    return `linkedin.com/in/${path[1].toLocaleLowerCase()}`
  } catch {
    return null
  }
}

const unique = <Value>(values: Value[]) => [...new Set(values)]
const jsonHash = (value: string) => createHash('sha256').update(value).digest('hex')
const jsonKey = (value: unknown) => JSON.stringify(value)

const writeJsonAtomically = async (path: string, value: unknown) => {
  const temporaryPath = `${path}.${process.pid}.tmp`
  await mkdir(dirname(path), { recursive: true })
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, path)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

const profileLinkedInKeys = (person: UnifiedPerson) => unique(person.profiles.flatMap((profile) => {
  const key = profile.platform === 'linkedin' ? canonicalLinkedInUrl(profile.url) : null
  return key ? [key] : []
}))

const profileCollisionSurplus = (people: UnifiedPerson[]) => {
  const owners = new Map<string, Set<string>>()
  for (const person of people) {
    for (const key of profileLinkedInKeys(person)) {
      const ids = owners.get(key) ?? new Set<string>()
      ids.add(person.id)
      owners.set(key, ids)
    }
  }
  return [...owners.values()].reduce((total, ids) => total + Math.max(0, ids.size - 1), 0)
}

const companyKeys = (person: UnifiedPerson) => unique([
  person.current_role.organization,
  person.founder?.companies?.[0],
  ...person.source_records.flatMap((record) => {
    if (!record.raw || typeof record.raw !== 'object' || Array.isArray(record.raw)) return []
    const raw = record.raw as Record<string, unknown>
    const directory = raw.directory && typeof raw.directory === 'object' && !Array.isArray(raw.directory)
      ? raw.directory as Record<string, unknown>
      : null
    return [
      typeof raw.firm_name === 'string' ? raw.firm_name : null,
      typeof directory?.organisation === 'string' ? directory.organisation : null,
    ]
  }),
].filter((value): value is string => Boolean(value)).map(compactIdentityText).filter(Boolean))

const companyOverlaps = (left: UnifiedPerson, right: UnifiedPerson) => companyKeys(left).some((leftCompany) =>
  companyKeys(right).some((rightCompany) => leftCompany === rightCompany
    || leftCompany.includes(rightCompany)
    || rightCompany.includes(leftCompany)))

const richerFollowerSnapshot = (
  left: UnifiedFollowerSnapshot | null,
  right: UnifiedFollowerSnapshot | null,
) => {
  if (!left) return right
  if (!right) return left
  if (left.count == null && right.count != null) return right
  if (right.count == null) return left
  if ((right.observed_at ?? '') > (left.observed_at ?? '')) return right
  if (right.observed_at === left.observed_at && right.precision === 'exact' && left.precision !== 'exact') return right
  return left
}

const mergeProfile = (target: UnifiedProfile, incoming: UnifiedProfile) => {
  target.verification ||= incoming.verification
  target.followers = richerFollowerSnapshot(target.followers, incoming.followers)
}

const mergeProfiles = (target: UnifiedPerson, profiles: UnifiedProfile[]) => {
  for (const incoming of profiles) {
    const incomingKey = canonicalLinkedInUrl(incoming.url)
    const existing = incomingKey
      ? target.profiles.find((profile) => canonicalLinkedInUrl(profile.url) === incomingKey)
      : target.profiles.find((profile) => profile.platform === incoming.platform && profile.url === incoming.url)
    if (existing) mergeProfile(existing, incoming)
    else target.profiles.push(structuredClone(incoming))
  }
}

const mergeMiddleEasternSignal = (target: UnifiedPerson, incoming: UnifiedPerson) => {
  const current = target.influence.middle_eastern
  const candidate = incoming.influence.middle_eastern
  if (current.manually_overridden) return
  if (candidate.manually_overridden || (candidate.value === true && current.value !== true)) {
    target.influence.middle_eastern = structuredClone(candidate)
  }
}

const mergePersonData = (target: UnifiedPerson, incoming: UnifiedPerson) => {
  target.merged_person_ids = unique([
    ...(target.merged_person_ids ?? []),
    incoming.id,
    ...(incoming.merged_person_ids ?? []),
  ]).filter((id) => id !== target.id)
  target.source_ids = unique([...target.source_ids, ...incoming.source_ids]).sort()
  target.name.title ||= incoming.name.title
  target.name.passport ||= incoming.name.passport
  target.name.certificate ||= incoming.name.certificate
  target.current_role.title ||= incoming.current_role.title
  target.current_role.organization ||= incoming.current_role.organization
  target.location.country ||= incoming.location.country
  target.location.country_code ||= incoming.location.country_code
  target.location.city ||= incoming.location.city
  target.location.nationality ||= incoming.location.nationality
  target.biography ||= incoming.biography
  target.specialties = unique([...target.specialties, ...incoming.specialties])
  target.image.url ||= incoming.image.url
  target.image.source_path ||= incoming.image.source_path
  target.image.alt ||= incoming.image.alt
  mergeProfiles(target, incoming.profiles)
  target.influence.lane ||= incoming.influence.lane
  target.influence.fit ||= incoming.influence.fit
  if (incoming.influence.potential_target === true || incoming.influence.target === true) target.influence.potential_target = true
  if (target.influence.priority == null) target.influence.priority = incoming.influence.priority
  mergeMiddleEasternSignal(target, incoming)
  target.event_appearances = unique([...target.event_appearances, ...incoming.event_appearances].map(jsonKey)).map(
    (entry) => JSON.parse(entry) as UnifiedPerson['event_appearances'][number],
  )
  target.founder ||= incoming.founder ? structuredClone(incoming.founder) : undefined
  for (const sourceRecord of incoming.source_records) {
    const existing = target.source_records.find((record) =>
      record.source_id === sourceRecord.source_id && record.record_id === sourceRecord.record_id)
    if (!existing) target.source_records.push(structuredClone(sourceRecord))
  }
}

const removeAndMergePerson = (file: UnifiedPeopleFile, target: UnifiedPerson, duplicate: UnifiedPerson) => {
  mergePersonData(target, duplicate)
  file.people = file.people.filter((person) => person !== duplicate)
}

const legacyTarget = (row: LegacyVcPerson) => row.target ?? row.influence.potential_target ?? row.influence.target ?? false

const sourcePersonSnapshot = (row: LegacyVcPerson) => ({
  biography: structuredClone(row.biography),
  current_role: structuredClone(row.current_role),
  event_appearances: structuredClone(row.event_appearances),
  image: structuredClone(row.image),
  influence: structuredClone(row.influence),
  location: structuredClone(row.location),
  name: structuredClone(row.name),
  profiles: structuredClone(row.profiles),
  specialties: structuredClone(row.specialties),
  target: legacyTarget(row),
})

const sourceRecordFor = (
  row: LegacyVcPerson,
  previous: UnifiedPerson['source_records'][number] | undefined,
) => {
  const legacy = row.source_records.find((record) => record.source_id === SOURCE_ID)
  assert.ok(legacy, `Missing VC source record for ${row.id}`)
  const legacyRaw = legacy.raw && typeof legacy.raw === 'object' && !Array.isArray(legacy.raw)
    ? structuredClone(legacy.raw) as Record<string, unknown>
    : {}
  const previousRaw = previous?.raw && typeof previous.raw === 'object' && !Array.isArray(previous.raw)
    ? previous.raw as Record<string, unknown>
    : {}
  return {
    ...structuredClone(legacy),
    raw: {
      ...legacyRaw,
      legacy_person_id: row.id,
      person_name: row.name.display,
      role: row.current_role.title,
      source_person: sourcePersonSnapshot(row),
      ...Object.fromEntries(['last_manual_edit_at', 'manual_edit_fields', 'manual_overrides'].flatMap((key) =>
        Object.prototype.hasOwnProperty.call(previousRaw, key) ? [[key, structuredClone(previousRaw[key])]] : [])),
    },
  } satisfies UnifiedPerson['source_records'][number]
}

const newPersonFromRow = (row: LegacyVcPerson) => {
  const person = structuredClone(row) as LegacyVcPerson
  delete person.target
  person.influence.potential_target = legacyTarget(row)
  person.influence.target = false
  person.merged_person_ids = []
  person.source_records = []
  return person
}

const mergeVcRow = (target: UnifiedPerson, row: LegacyVcPerson) => {
  target.source_ids = unique([...target.source_ids, SOURCE_ID]).sort()
  if (target.id !== row.id) {
    target.merged_person_ids = unique([...(target.merged_person_ids ?? []), row.id]).filter((id) => id !== target.id)
  }
  target.current_role.title ||= row.current_role.title
  target.current_role.organization ||= row.current_role.organization
  target.location.country ||= row.location.country
  target.location.country_code ||= row.location.country_code
  target.location.city ||= row.location.city
  target.location.nationality ||= row.location.nationality
  target.biography ||= row.biography
  target.specialties = unique([...target.specialties, ...row.specialties])
  target.image.url ||= row.image.url
  target.image.source_path ||= row.image.source_path
  target.image.alt ||= row.image.alt
  mergeProfiles(target, row.profiles)
  target.influence.lane ||= row.influence.lane
  target.influence.fit ||= row.influence.fit
  if (legacyTarget(row)) target.influence.potential_target = true
  if (target.influence.priority == null) target.influence.priority = row.influence.priority
  mergeMiddleEasternSignal(target, row)

  const rowRecord = row.source_records.find((record) => record.source_id === SOURCE_ID)
  assert.ok(rowRecord)
  const existingIndex = target.source_records.findIndex((record) =>
    record.source_id === SOURCE_ID && record.record_id === rowRecord.record_id)
  const previous = existingIndex >= 0 ? target.source_records[existingIndex] : undefined
  const sourceRecord = sourceRecordFor(row, previous)
  if (existingIndex >= 0) target.source_records[existingIndex] = sourceRecord
  else target.source_records.push(sourceRecord)
}

const originalUnifiedText = await readFile(UNIFIED_PATH, 'utf8')
const originalVcText = await readFile(VC_SOURCE_PATH, 'utf8')
const unified = JSON.parse(originalUnifiedText) as UnifiedPeopleFile
const vcSource = JSON.parse(originalVcText) as UnifiedPeopleFile
const vcRows = vcSource.people as LegacyVcPerson[]
const originalProfileCollisionSurplus = profileCollisionSurplus(unified.people)

assert.equal(new Set(unified.people.map((person) => person.id)).size, unified.people.length, 'Unified person IDs must be unique before the merge.')
assert.equal(new Set(vcRows.map((person) => person.id)).size, vcRows.length, 'Legacy VC person IDs must be unique.')
assert.equal(
  new Set(vcRows.flatMap((person) => person.source_records.filter((record) => record.source_id === SOURCE_ID).map((record) => record.record_id))).size,
  vcRows.length,
  'Every VC row must have one unique source record.',
)

const premergedIds: string[] = []
for (const [targetId, duplicateIds] of Object.entries(MANUAL_DUPLICATE_MERGES)) {
  const target = unified.people.find((person) => person.id === targetId)
  if (!target) continue
  for (const duplicateId of duplicateIds) {
    const duplicate = unified.people.find((person) => person.id === duplicateId)
    if (!duplicate) continue
    removeAndMergePerson(unified, target, duplicate)
    premergedIds.push(duplicateId)
  }
}

const decisions: MergeDecision[] = []
for (const row of vcRows) {
  const rowRecord = row.source_records.find((record) => record.source_id === SOURCE_ID)
  assert.ok(rowRecord)
  const sourceMatches = unified.people.filter((person) => person.source_records.some((record) =>
    record.source_id === SOURCE_ID && record.record_id === rowRecord.record_id))
  const rowLinkedInKeys = profileLinkedInKeys(row)
  const linkedinMatches = unique(rowLinkedInKeys.flatMap((key) => unified.people.filter((person) =>
    profileLinkedInKeys(person).includes(key))))
  const nameMatches = unified.people.filter((person) =>
    compactIdentityText(person.name.display) === compactIdentityText(row.name.display))
  const nameCompanyMatches = nameMatches.filter((person) => companyOverlaps(person, row))
  const reviewedPersonId = MANUAL_PERSON_MATCHES[rowRecord.record_id]
  const reviewedPerson = reviewedPersonId
    ? unified.people.find((person) => person.id === reviewedPersonId || person.merged_person_ids?.includes(reviewedPersonId))
    : undefined

  let target: UnifiedPerson | undefined
  let kind: MergeDecision['kind']
  if (sourceMatches.length > 1) kind = 'held-ambiguous'
  else if (sourceMatches.length === 1) {
    target = sourceMatches[0]
    kind = 'existing-source-record'
  } else if (reviewedPersonId && !reviewedPerson) kind = 'held-ambiguous'
  else if (reviewedPerson) {
    target = reviewedPerson
    kind = 'manual-identity'
  } else if (linkedinMatches.length > 1) kind = 'held-ambiguous'
  else if (linkedinMatches.length === 1) {
    target = linkedinMatches[0]
    kind = 'exact-linkedin'
  } else if (nameCompanyMatches.length > 1) kind = 'held-ambiguous'
  else if (nameCompanyMatches.length === 1) {
    target = nameCompanyMatches[0]
    kind = 'exact-name-company'
  } else if (nameMatches.length > 0) kind = nameMatches.length === 1 ? 'held-name-only' : 'held-ambiguous'
  else {
    target = newPersonFromRow(row)
    unified.people.push(target)
    kind = 'new-person'
  }

  if (!target) {
    decisions.push({
      absorbed_person_ids: [],
      kind,
      legacy_person_id: row.id,
      name: row.name.display,
      person_id: null,
      record_id: rowRecord.record_id,
      reason: kind === 'held-name-only'
        ? `Same normalized name exists without organization or LinkedIn confirmation: ${nameMatches.map((person) => `${person.id} (${person.current_role.organization ?? 'unknown'})`).join(', ')}`
        : 'Multiple identity candidates require manual review.',
    })
    continue
  }

  const absorbedIds: string[] = []
  const targetLinks = new Set(profileLinkedInKeys(target))
  for (const candidate of [...unified.people]) {
    if (candidate === target) continue
    if (compactIdentityText(candidate.name.display) !== compactIdentityText(row.name.display)) continue
    if (!companyOverlaps(candidate, row)) continue
    const candidateLinks = profileLinkedInKeys(candidate)
    if (candidateLinks.length > 0 && !candidateLinks.every((key) => targetLinks.has(key))) continue
    absorbedIds.push(candidate.id)
    removeAndMergePerson(unified, target, candidate)
  }

  mergeVcRow(target, row)
  decisions.push({
    absorbed_person_ids: absorbedIds,
    kind,
    legacy_person_id: row.id,
    name: row.name.display,
    person_id: target.id,
    record_id: rowRecord.record_id,
  })
}

const held = decisions.filter((decision) => !decision.person_id)
assert.deepEqual(held, [], `Every VC identity must be resolved before applying: ${JSON.stringify(held)}`)

unified.people.sort((left, right) => left.name.display.localeCompare(right.name.display, undefined, { numeric: true, sensitivity: 'base' }))
const sourceRecords = unified.people.flatMap((person) => person.source_records)
const vcSourceRecords = sourceRecords.filter((record) => record.source_id === SOURCE_ID)
const sourceRecordCount = sourceRecords.length
const source: UnifiedPeopleSource = {
  id: SOURCE_ID,
  name: 'Middle East VC people research',
  type: 'research',
  url: null,
  source_files: ['assets/people/middle-east-vc-people.json'],
  observed_at: vcSource.sources.find((candidate) => candidate.id === SOURCE_ID)?.observed_at ?? null,
  record_count: vcSourceRecords.length,
}
const sourceIndex = unified.sources.findIndex((candidate) => candidate.id === SOURCE_ID)
if (sourceIndex >= 0) unified.sources[sourceIndex] = source
else unified.sources.push(source)
unified.generated_at = new Date().toISOString()
unified.stats = {
  source_records: sourceRecordCount,
  unique_people: unified.people.length,
  multi_source_people: unified.people.filter((person) => person.source_ids.length > 1).length,
  duplicate_source_records_collapsed: sourceRecordCount - unified.people.length,
}

const legacyRecordIds = vcRows.map((row) => row.source_records.find((record) => record.source_id === SOURCE_ID)!.record_id).sort()
assert.deepEqual(vcSourceRecords.map((record) => record.record_id).sort(), legacyRecordIds, 'Every legacy VC source record must be present exactly once.')
for (const row of vcRows) {
  const rowRecord = row.source_records.find((record) => record.source_id === SOURCE_ID)!
  const mergedRecord = vcSourceRecords.find((record) => record.record_id === rowRecord.record_id)!
  const raw = mergedRecord.raw as Record<string, unknown>
  const legacyRaw = rowRecord.raw as Record<string, unknown>
  for (const [key, value] of Object.entries(legacyRaw)) {
    if (['last_manual_edit_at', 'manual_edit_fields', 'manual_overrides'].includes(key)) continue
    assert.deepEqual(raw[key], value, `Legacy raw VC field ${key} changed for ${row.id}.`)
  }
  assert.equal(raw.legacy_person_id, row.id, `Legacy person ID was not preserved for ${row.id}.`)
  assert.deepEqual(raw.source_person, sourcePersonSnapshot(row), `Legacy VC person snapshot changed for ${row.id}.`)
}
assert.equal(new Set(unified.people.map((person) => person.id)).size, unified.people.length, 'Unified person IDs must remain unique.')
assert.ok(profileCollisionSurplus(unified.people) <= originalProfileCollisionSurplus, 'The merge must not add LinkedIn URL collisions across people.')
assert.equal(sourceRecordCount, unified.stats.source_records, 'Source-record statistics must match the merged data.')
assert.ok(unified.people.filter((person) => person.source_ids.includes(SOURCE_ID)).every((person) =>
  person.source_records.some((record) => record.source_id === SOURCE_ID)), 'Every VC source ID must have VC source evidence.')

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  source: SOURCE_ID,
  source_rows: vcRows.length,
  imported_source_records: vcSourceRecords.length,
  resulting_vc_people: unified.people.filter((person) => person.source_ids.includes(SOURCE_ID)).length,
  existing_source_records_updated: decisions.filter((decision) => decision.kind === 'existing-source-record').length,
  exact_linkedin_matches: decisions.filter((decision) => decision.kind === 'exact-linkedin').length,
  exact_name_company_matches: decisions.filter((decision) => decision.kind === 'exact-name-company').length,
  manual_identity_matches: decisions.filter((decision) => decision.kind === 'manual-identity').length,
  new_people: decisions.filter((decision) => decision.kind === 'new-person').length,
  absorbed_existing_duplicate_people: unique([...premergedIds, ...decisions.flatMap((decision) => decision.absorbed_person_ids)]),
  held_for_review: held,
  resulting_people: unified.stats.unique_people,
  resulting_source_records: unified.stats.source_records,
  resulting_multi_source_people: unified.stats.multi_source_people,
}

if (APPLY) {
  const currentUnifiedText = await readFile(UNIFIED_PATH, 'utf8')
  const currentVcText = await readFile(VC_SOURCE_PATH, 'utf8')
  if (jsonHash(currentUnifiedText) !== jsonHash(originalUnifiedText) || jsonHash(currentVcText) !== jsonHash(originalVcText)) {
    throw new Error('A people data file changed during the merge. Re-run to avoid overwriting concurrent edits.')
  }
  await writeJsonAtomically(UNIFIED_PATH, unified)
}

console.log(JSON.stringify(summary, null, 2))
