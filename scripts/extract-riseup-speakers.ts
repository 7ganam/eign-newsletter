import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { UnifiedPeopleSourceFile, UnifiedPerson } from '../src/unifiedPeopleTypes'

const SOURCE_URL = 'https://riseupsummit.com/egypt-summit-2026/speakers'
const OUTPUT_PATH = resolve(process.cwd(), 'assets/people/riseup-2026-people.json')
const REACT_QUERY_MARKER = 'window["__RQ_R_lb_"]'

type JsonRecord = Record<string, unknown>
type NamedValue = { name?: string; code?: string }

const COUNTRY_CODES: Record<string, string> = {
  Bahrain: 'BH',
  Egypt: 'EG',
  Kuwait: 'KW',
  Oman: 'OM',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
}

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const namedValue = (value: unknown) => {
  if (typeof value === 'string') return value
  return isRecord(value) && typeof value.name === 'string' ? value.name : null
}

const namedCode = (value: unknown, fallbackName: string | null) =>
  isRecord(value) && typeof value.code === 'string' ? value.code : COUNTRY_CODES[fallbackName ?? ''] ?? null

const findSpeakerQuery = (html: string) => {
  const markerIndex = html.indexOf(REACT_QUERY_MARKER)
  if (markerIndex < 0) throw new Error('RiseUp speaker data marker was not found.')

  const scriptEnd = html.indexOf('</script>', markerIndex)
  const payloadStart = html.indexOf('.push(', markerIndex) + '.push('.length
  const payloadEnd = html.lastIndexOf(');', scriptEnd)
  if (scriptEnd < 0 || payloadStart < '.push('.length || payloadEnd <= payloadStart) {
    throw new Error('RiseUp speaker data payload could not be isolated.')
  }

  const payload = JSON.parse(html.slice(payloadStart, payloadEnd)) as unknown
  if (!isRecord(payload) || !Array.isArray(payload.queries)) {
    throw new Error('RiseUp speaker data payload has an unexpected shape.')
  }

  const query = payload.queries.find((candidate) => {
    if (!isRecord(candidate) || !Array.isArray(candidate.queryKey)) return false
    return candidate.queryKey.includes('SPEAKERS')
  })
  if (!isRecord(query) || !isRecord(query.state) || !isRecord(query.state.data) || !Array.isArray(query.state.data.data)) {
    throw new Error('RiseUp speaker query was not found in the page payload.')
  }

  return {
    dehydratedAt: typeof query.dehydratedAt === 'number' ? query.dehydratedAt : null,
    sourceDataUpdatedAt: typeof query.state.dataUpdatedAt === 'number' ? query.state.dataUpdatedAt : null,
    speakers: query.state.data.data,
  }
}

const publicSpeakerRecord = (value: unknown) => {
  if (!isRecord(value)) throw new Error('RiseUp returned a non-object speaker record.')

  return {
    id: value.id ?? null,
    attendee_id: value.attendee_id ?? null,
    title: value.title ?? null,
    passport_name: value.passport_name ?? null,
    certificate_name: value.certificate_name ?? null,
    gender: value.gender ?? null,
    country: value.country ?? null,
    city: value.city ?? null,
    nationality: value.nationality ?? null,
    institute: value.institute ?? null,
    occupation: value.occupation ?? null,
    profile_picture_url: value.profile_picture_url ?? null,
    profile_picture: value.profile_picture ?? null,
    specialty: value.specialty ?? null,
    biography: value.biography ?? null,
    social_links: Array.isArray(value.social_links) ? value.social_links : [],
    activities: Array.isArray(value.activities) ? value.activities : [],
  }
}

const existing = JSON.parse(await readFile(OUTPUT_PATH, 'utf8')) as UnifiedPeopleSourceFile
const existingBySpeakerId = new Map(existing.people.flatMap((person) => {
  const appearance = person.event_appearances.find((item) => item.event_id === 'riseup-2026')
  return appearance?.speaker_id ? [[appearance.speaker_id, person] as const] : []
}))

const response = await fetch(SOURCE_URL, {
  headers: { 'user-agent': 'EIGN research workspace speaker indexer/2.0' },
})
if (!response.ok) throw new Error(`RiseUp returned HTTP ${response.status}.`)

const html = await response.text()
const query = findSpeakerQuery(html)
const speakers = query.speakers.map(publicSpeakerRecord)

if (speakers.length === 0) throw new Error('RiseUp returned no speaker records.')
if (speakers.some((speaker) => typeof speaker.id !== 'number' || typeof speaker.passport_name !== 'string')) {
  throw new Error('RiseUp returned a speaker without a numeric ID or name.')
}

const uniqueIds = new Set(speakers.map((speaker) => speaker.id))
if (uniqueIds.size !== speakers.length) throw new Error('RiseUp returned duplicate speaker IDs.')

const extractedAt = new Date().toISOString()
const extractionMetadata = {
  source_data_updated_at: query.sourceDataUpdatedAt ? new Date(query.sourceDataUpdatedAt).toISOString() : null,
  dehydrated_at: query.dehydratedAt ? new Date(query.dehydratedAt).toISOString() : null,
}

const people = speakers.map((speaker): UnifiedPerson => {
  const speakerId = String(speaker.id)
  const current = existingBySpeakerId.get(speakerId)
  const displayName = String(speaker.passport_name || speaker.certificate_name)
  const country = namedValue(speaker.country)
  const sourceRecord = current?.source_records.find((record) => record.source_id === 'riseup-2026')
  const currentRaw = sourceRecord?.raw as { linkedin_profile?: unknown } | undefined

  return {
    id: current?.id ?? `riseup-2026:${speakerId}`,
    source_ids: ['riseup-2026'],
    name: {
      display: displayName,
      title: typeof speaker.title === 'string' ? speaker.title : null,
      passport: typeof speaker.passport_name === 'string' ? speaker.passport_name : null,
      certificate: typeof speaker.certificate_name === 'string' ? speaker.certificate_name : null,
    },
    current_role: {
      title: typeof speaker.occupation === 'string' ? speaker.occupation : null,
      organization: typeof speaker.institute === 'string' ? speaker.institute : null,
    },
    location: {
      country,
      country_code: namedCode(speaker.country as NamedValue | null, country),
      city: namedValue(speaker.city),
      nationality: namedValue(speaker.nationality),
    },
    biography: typeof speaker.biography === 'string' ? speaker.biography : null,
    specialties: namedValue(speaker.specialty) ? [namedValue(speaker.specialty)!] : [],
    image: {
      url: typeof speaker.profile_picture_url === 'string' ? speaker.profile_picture_url : null,
      source_path: typeof speaker.profile_picture === 'string' ? speaker.profile_picture : null,
      alt: displayName,
    },
    profiles: structuredClone(current?.profiles ?? []),
    influence: structuredClone(current?.influence ?? {
      lane: null,
      priority: null,
      middle_eastern: {
        value: null,
        method: null,
        reason: null,
        manually_overridden: false,
      },
    }),
    event_appearances: [{
      event_id: 'riseup-2026',
      speaker_id: speakerId,
      attendee_id: String(speaker.attendee_id),
      profile_url: null,
      sessions: speaker.activities.filter(isRecord).map((activity, index) => ({
        id: String(activity.id ?? index),
        title: typeof activity.title === 'string' ? activity.title : '',
        type: typeof activity.type === 'string' ? activity.type : null,
        activity_type: namedValue(activity.activity_type),
        description: typeof activity.description === 'string' ? activity.description : null,
        date: isRecord(activity.track) && typeof activity.track.track_date === 'string' ? activity.track.track_date : null,
        start_time: typeof activity.start_time === 'string' ? activity.start_time : null,
        end_time: typeof activity.end_time === 'string' ? activity.end_time : null,
        track: namedValue(activity.track),
        hall: namedValue(activity.hall),
        requires_registration: activity.requires_registration === true,
      })),
    }],
    source_records: [{
      source_id: 'riseup-2026',
      record_id: speakerId,
      source_url: SOURCE_URL,
      observed_at: extractedAt,
      verification: sourceRecord?.verification ?? null,
      raw: {
        speaker,
        linkedin_profile: currentRaw?.linkedin_profile ?? null,
        extraction_metadata: extractionMetadata,
      },
    }],
  }
})

const output: UnifiedPeopleSourceFile = {
  schema_version: 'people.v1',
  generated_at: extractedAt,
  source: {
    id: 'riseup-2026',
    name: 'RiseUp Summit 2026',
    type: 'event',
    url: SOURCE_URL,
    source_files: ['assets/people/riseup-2026-people.json'],
    observed_at: extractedAt,
    record_count: people.length,
  },
  people,
}

const temporaryPath = `${OUTPUT_PATH}.tmp-${process.pid}`
await writeFile(temporaryPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
await rename(temporaryPath, OUTPUT_PATH)
console.log(`Extracted ${people.length} RiseUp Summit speakers to ${OUTPUT_PATH}`)
