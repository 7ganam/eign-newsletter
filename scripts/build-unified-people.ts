import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import leapData from '../assets/leap-2026-speakers.json'
import linkedInData from '../assets/riseup-summit-2026-speaker-linkedin.json'
import riseUpData from '../assets/riseup-summit-2026-speakers.json'
import { INFLUENCERS, INFLUENCERS_VERIFIED_AT } from '../src/influencerData'
import { LINKEDIN_FOLLOWERS, LINKEDIN_FOLLOWERS_UPDATED_AT } from '../src/linkedinFollowerData'
import type {
  UnifiedEventAppearance,
  UnifiedFollowerSnapshot,
  UnifiedPeopleFile,
  UnifiedPeopleSource,
  UnifiedPeopleSourceFile,
  UnifiedPerson,
  UnifiedProfile,
} from '../src/unifiedPeopleTypes'

type JsonRecord = Record<string, unknown>

type LeapSpeaker = {
  name: string
  title: string | null
  organization: string | null
  profile_url: string
  image_src: string
  image_alt: string
}

type NamedValue = {
  id?: number
  name?: string
  code?: string
  dialing_code?: string
}

type RiseUpActivity = JsonRecord & {
  id: number
  type: string | null
  activity_type: NamedValue | null
  title: string
  description: string | null
  start_time: string | null
  end_time: string | null
  requires_registration: boolean
  track: (NamedValue & { track_date?: string }) | null
  hall: NamedValue | null
}

type RiseUpSpeaker = JsonRecord & {
  id: number
  attendee_id: number
  title: string | null
  passport_name: string
  certificate_name: string
  gender: string | null
  country: NamedValue | string | null
  city: NamedValue | string | null
  nationality: NamedValue | string | null
  institute: string | null
  occupation: string | null
  profile_picture_url: string | null
  profile_picture: string | null
  specialty: NamedValue | string | null
  biography: string | null
  social_links: Array<{ title?: string; url?: string }>
  activities: RiseUpActivity[]
}

type SpeakerLinkedInProfile = {
  speaker_id: number
  name: string
  linkedin_url: string
  verification: string
}

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_DIRECTORY = resolve(PROJECT_ROOT, 'assets/people')
const GENERATED_AT = new Date().toISOString()
const LEAP_SOURCE_URL = 'https://onegiantleap.com/2026-speakers'

const sources: UnifiedPeopleSource[] = [
  {
    id: 'leap-2026',
    name: 'LEAP 2026',
    type: 'event',
    url: LEAP_SOURCE_URL,
    source_files: ['assets/leap-2026-speakers.json'],
    observed_at: null,
    record_count: (leapData as LeapSpeaker[]).length,
  },
  {
    id: 'riseup-2026',
    name: 'RiseUp Summit 2026',
    type: 'event',
    url: riseUpData.source,
    source_files: [
      'assets/riseup-summit-2026-speakers.json',
      'assets/riseup-summit-2026-speaker-linkedin.json',
    ],
    observed_at: riseUpData.extracted_at,
    record_count: riseUpData.speakers.length,
  },
  {
    id: 'web-search',
    name: 'Web-search influencers',
    type: 'research',
    url: null,
    source_files: ['src/influencerData.ts', 'src/linkedinFollowerData.ts'],
    observed_at: INFLUENCERS_VERIFIED_AT,
    record_count: INFLUENCERS.length,
  },
]

const emptyPerson = (id: string, name: string): UnifiedPerson => ({
  id,
  source_ids: [],
  name: {
    display: name,
    title: null,
    passport: null,
    certificate: null,
  },
  current_role: {
    title: null,
    organization: null,
  },
  location: {
    country: null,
    country_code: null,
    city: null,
    nationality: null,
  },
  biography: null,
  specialties: [],
  image: {
    url: null,
    source_path: null,
    alt: null,
  },
  profiles: [],
  influence: {
    lane: null,
    priority: null,
    arabic_or_bilingual: null,
    middle_eastern: {
      value: null,
      method: null,
      reason: null,
      manually_overridden: false,
    },
  },
  event_appearances: [],
  source_records: [],
})

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

const namedValue = (value: NamedValue | string | null) =>
  typeof value === 'string' ? value : value?.name ?? null

const COUNTRY_CODES: Record<string, string> = {
  Bahrain: 'BH',
  Egypt: 'EG',
  Kuwait: 'KW',
  Oman: 'OM',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
}

const REGION_KEYWORDS = [
  'middle east', 'middle-east', 'mena', 'gcc', 'ksa', 'u.a.e', 'uae', 'united arab emirates',
  'saudi', 'qatar', 'kuwait', 'oman', 'bahrain', 'lebanon', 'jordan', 'egypt', 'syria',
  'morocco', 'tunisia', 'algeria', 'iraq', 'iran', 'yemen', 'palestine', 'libya', 'sudan',
  'turkey', 'turkiye', 'middle east & africa', 'middleeast',
]
const MIDDLE_EAST_NAME_SUBSTRINGS = ['abdul', 'al', 'el', 'ahmed', 'ahmad', 'mahmoud', 'mohamed']

const leapMiddleEastSignal = (speaker: LeapSpeaker) => {
  const name = normalizeIdentityText(speaker.name)
  const context = normalizeIdentityText([speaker.title, speaker.organization, speaker.profile_url].filter(Boolean).join(' '))
  if (MIDDLE_EAST_NAME_SUBSTRINGS.some((candidate) => name.includes(candidate))) {
    return { value: true, method: 'automatic-name-rule', reason: 'Configured Middle Eastern name rule matched.' }
  }
  if (REGION_KEYWORDS.some((candidate) => context.includes(candidate))) {
    return { value: true, method: 'explicit-region-rule', reason: 'Title, organization, or profile URL contains a regional signal.' }
  }
  return { value: false, method: 'automatic-rules', reason: 'No configured regional signal matched.' }
}

const leapImagePath = (source: string) => {
  const fileName = source.split('/').pop()
  return fileName ? `/leap-2026-speakers/${encodeURIComponent(fileName)}` : null
}

const leapPeople = (leapData as LeapSpeaker[]).map((speaker, index) => {
  const person = emptyPerson(`leap-2026:${slug(speaker.name)}:${shortHash(speaker.profile_url || String(index))}`, speaker.name)
  const region = leapMiddleEastSignal(speaker)
  person.source_ids = ['leap-2026']
  person.current_role = { title: speaker.title, organization: speaker.organization }
  person.image = { url: leapImagePath(speaker.image_src), source_path: speaker.image_src, alt: speaker.image_alt || speaker.name }
  person.influence.middle_eastern = { ...region, manually_overridden: false }
  person.event_appearances = [{
    event_id: 'leap-2026',
    speaker_id: null,
    attendee_id: null,
    profile_url: speaker.profile_url,
    sessions: [],
  }]
  person.source_records = [{
    source_id: 'leap-2026',
    record_id: speaker.profile_url || String(index),
    source_url: speaker.profile_url || LEAP_SOURCE_URL,
    observed_at: null,
    verification: null,
    raw: speaker,
  }]
  return person
})

const riseUpLinkedInBySpeakerId = new Map(
  (linkedInData.profiles as SpeakerLinkedInProfile[]).map((profile) => [profile.speaker_id, profile]),
)

const riseUpPeople = (riseUpData.speakers as RiseUpSpeaker[]).map((speaker) => {
  const displayName = speaker.passport_name || speaker.certificate_name
  const person = emptyPerson(`riseup-2026:${speaker.id}`, displayName)
  const linkedIn = riseUpLinkedInBySpeakerId.get(speaker.id)
  const country = namedValue(speaker.country)
  const countryCode = typeof speaker.country === 'object' && speaker.country
    ? speaker.country.code ?? COUNTRY_CODES[country ?? ''] ?? null
    : COUNTRY_CODES[country ?? ''] ?? null
  const specialty = namedValue(speaker.specialty)
  person.source_ids = ['riseup-2026']
  person.name = {
    display: displayName,
    title: speaker.title,
    passport: speaker.passport_name || null,
    certificate: speaker.certificate_name || null,
  }
  person.current_role = { title: speaker.occupation, organization: speaker.institute }
  person.location = {
    country,
    country_code: countryCode,
    city: namedValue(speaker.city),
    nationality: namedValue(speaker.nationality),
  }
  person.biography = speaker.biography
  person.specialties = specialty ? [specialty] : []
  person.image = {
    url: speaker.profile_picture_url,
    source_path: speaker.profile_picture,
    alt: displayName,
  }
  person.profiles = linkedIn ? [{
    platform: 'linkedin',
    url: linkedIn.linkedin_url,
    verification: linkedIn.verification,
    followers: null,
  }] : []
  person.event_appearances = [{
    event_id: 'riseup-2026',
    speaker_id: String(speaker.id),
    attendee_id: String(speaker.attendee_id),
    profile_url: null,
    sessions: speaker.activities.map((activity) => ({
      id: String(activity.id),
      title: activity.title,
      type: activity.type,
      activity_type: activity.activity_type?.name ?? null,
      description: activity.description,
      date: activity.track?.track_date ?? null,
      start_time: activity.start_time,
      end_time: activity.end_time,
      track: activity.track?.name ?? null,
      hall: activity.hall?.name ?? null,
      requires_registration: activity.requires_registration,
    })),
  }]
  person.source_records = [{
    source_id: 'riseup-2026',
    record_id: String(speaker.id),
    source_url: riseUpData.source,
    observed_at: riseUpData.extracted_at,
    verification: linkedIn?.verification ?? null,
    raw: {
      speaker,
      linkedin_profile: linkedIn ?? null,
    },
  }]
  return person
})

const webSearchPeople = INFLUENCERS.map((influencer, index) => {
  const follower = LINKEDIN_FOLLOWERS[influencer.linkedinUrl]
  const followerSnapshot: UnifiedFollowerSnapshot = follower ? {
    count: follower.count,
    observed_at: follower.observedAt,
    status: follower.status,
    precision: follower.precision ?? null,
    source: follower.source ?? null,
  } : {
    count: null,
    observed_at: null,
    status: 'not-verified',
    precision: null,
    source: null,
  }
  const person = emptyPerson(`web-search:${slug(influencer.name)}:${shortHash(influencer.linkedinUrl || String(index))}`, influencer.name)
  person.source_ids = ['web-search']
  person.current_role = { title: null, organization: influencer.organisation }
  person.location = {
    country: influencer.country === 'Regional' ? null : influencer.country,
    country_code: COUNTRY_CODES[influencer.country] ?? null,
    city: null,
    nationality: null,
  }
  person.profiles = [{
    platform: 'linkedin',
    url: influencer.linkedinUrl,
    verification: 'web-search',
    followers: followerSnapshot,
  }]
  person.influence.lane = influencer.lane
  person.influence.priority = influencer.priority
  person.influence.arabic_or_bilingual = influencer.arabicOrBilingual
  person.source_records = [{
    source_id: 'web-search',
    record_id: influencer.linkedinUrl || String(index),
    source_url: influencer.linkedinUrl,
    observed_at: INFLUENCERS_VERIFIED_AT,
    verification: 'web-search',
    raw: {
      directory: influencer,
      follower: followerSnapshot,
      followers_updated_at: LINKEDIN_FOLLOWERS_UPDATED_AT,
    },
  }]
  return person
})

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
  current.influence.arabic_or_bilingual ??= incoming.influence.arabic_or_bilingual
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

const sourceFiles: Array<{ name: string; source: UnifiedPeopleSource; people: UnifiedPerson[] }> = [
  { name: 'leap-2026-people.json', source: sources[0], people: leapPeople },
  { name: 'riseup-2026-people.json', source: sources[1], people: riseUpPeople },
  { name: 'web-search-people.json', source: sources[2], people: webSearchPeople },
]

const mergedPeople = mergeSourcePeople([...riseUpPeople, ...webSearchPeople, ...leapPeople])
const sourceRecordCount = sourceFiles.reduce((total, file) => total + file.people.length, 0)
assert.equal(leapPeople.length, (leapData as LeapSpeaker[]).length, 'Every LEAP source record must be converted.')
assert.equal(riseUpPeople.length, riseUpData.speakers.length, 'Every RiseUp source record must be converted.')
assert.equal(webSearchPeople.length, INFLUENCERS.length, 'Every web-search source record must be converted.')
assert.deepEqual(
  leapPeople.map((person) => person.source_records[0].raw),
  leapData,
  'LEAP raw records must remain lossless.',
)
assert.deepEqual(
  riseUpPeople.map((person) => (person.source_records[0].raw as { speaker: unknown }).speaker),
  riseUpData.speakers,
  'RiseUp raw records must remain lossless.',
)
assert.deepEqual(
  webSearchPeople.map((person) => (person.source_records[0].raw as { directory: unknown }).directory),
  INFLUENCERS,
  'Web-search directory records must remain lossless.',
)
assert.equal(new Set(mergedPeople.map((person) => person.id)).size, mergedPeople.length, 'Merged person IDs must be unique.')
assert.equal(
  mergedPeople.reduce((total, person) => total + person.source_records.length, 0),
  sourceRecordCount,
  'The merged file must retain every source record.',
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

const writeJson = async (path: string, value: unknown) => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true })
for (const file of sourceFiles) {
  const output: UnifiedPeopleSourceFile = {
    schema_version: 'people.v1',
    generated_at: GENERATED_AT,
    source: file.source,
    people: file.people,
  }
  await writeJson(resolve(OUTPUT_DIRECTORY, file.name), output)
}
await writeJson(resolve(OUTPUT_DIRECTORY, 'unified-people.json'), mergedFile)

console.log(JSON.stringify({
  output_directory: OUTPUT_DIRECTORY,
  source_records: sourceRecordCount,
  unique_people: mergedPeople.length,
  multi_source_people: mergedFile.stats.multi_source_people,
  duplicate_source_records_collapsed: mergedFile.stats.duplicate_source_records_collapsed,
  files: [...sourceFiles.map((file) => file.name), 'unified-people.json'],
}, null, 2))
