import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const SOURCE_URL = 'https://riseupsummit.com/egypt-summit-2026/speakers'
const OUTPUT_PATH = resolve(process.cwd(), 'assets/riseup-summit-2026-speakers.json')
const REACT_QUERY_MARKER = 'window["__RQ_R_lb_"]'

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

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

const response = await fetch(SOURCE_URL, {
  headers: { 'user-agent': 'EIGN research workspace speaker indexer/1.0' },
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

const output = {
  event: 'RiseUp Summit 2026 — Egypt',
  source: SOURCE_URL,
  extracted_at: new Date().toISOString(),
  source_data_updated_at: query.sourceDataUpdatedAt ? new Date(query.sourceDataUpdatedAt).toISOString() : null,
  dehydrated_at: query.dehydratedAt ? new Date(query.dehydratedAt).toISOString() : null,
  count: speakers.length,
  speakers,
}

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`Extracted ${speakers.length} RiseUp Summit speakers to ${OUTPUT_PATH}`)
