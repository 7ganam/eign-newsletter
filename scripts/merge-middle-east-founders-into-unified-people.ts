import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type {
  UnifiedFollowerSnapshot,
  UnifiedFounderProfile,
  UnifiedPeopleFile,
  UnifiedPeopleSource,
  UnifiedPerson,
  UnifiedProfile,
} from '../src/unifiedPeopleTypes'

type FounderTier = 1 | 2 | 3

type FounderRow = {
  companies: string[]
  editorial_order: number
  evidence: {
    label: string
    observed_at: string
    url: string
  }
  followers: number | null
  founder_role: string
  id: string
  influence_signal: string
  linkedin_review: {
    confidence: string | null
    evidence: string
    observed_at: string
    profile_name: string | null
    source: string
    status: 'unresolved' | 'verified'
  }
  linkedin_url: string | null
  name: string
  primary_market: string
  sector: string
  source: string
  target: boolean
  tier: FounderTier
  tier_label: string
  why_selected: string
}

type FounderFile = {
  observed_at: string
  rows: FounderRow[]
  schema_version: string
  title: string
}

type ArchiveFile = {
  tables?: Record<string, { archived_ids?: string[] }>
}

type LinkedInManifest = {
  entries?: Array<{
    result?: {
      canonicalProfileUrl: string
      followers: {
        count: number
        precision: 'exact' | 'rounded'
      }
      observedAt: string
    }
    status?: string
    url?: string
  }>
}

type MatchKind = 'existing-source-record' | 'exact-linkedin' | 'exact-name-company' | 'new-person'

type MergeDecision = {
  founder: string
  founder_id: string
  kind: MatchKind | 'held-name-only' | 'held-ambiguous'
  person_id: string | null
  reason?: string
}

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const UNIFIED_PATH = resolve(PROJECT_ROOT, 'assets/people/unified-people.json')
const FOUNDERS_PATH = resolve(PROJECT_ROOT, 'assets/people/middle-east-founders.json')
const ARCHIVES_PATH = resolve(PROJECT_ROOT, 'assets/table-archives.json')
const SOURCE_ID = 'middle-east-founders' as const
const MANIFEST_PATHS = [
  resolve(PROJECT_ROOT, 'outputs/linkedin/middle-east-founders-followers-manifest.json'),
  resolve(PROJECT_ROOT, 'outputs/linkedin/fit-followers-manifest.json'),
  resolve(PROJECT_ROOT, 'outputs/linkedin/fit-missing-followers-by-name-manifest.json'),
]
const APPLY = process.argv.includes('--apply')

const COUNTRY_CODES: Record<string, string> = {
  Bahrain: 'BH',
  Egypt: 'EG',
  Kuwait: 'KW',
  Lebanon: 'LB',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
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
  const url = new URL(value)
  const path = url.pathname.split('/').filter(Boolean)
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname) || path[0] !== 'in' || !path[1]) {
    throw new Error(`Invalid LinkedIn personal profile URL: ${value}`)
  }
  return `https://www.linkedin.com/in/${path[1]}`.toLocaleLowerCase()
}

const unique = <Value>(values: Value[]) => [...new Set(values)]

const jsonHash = (value: string) => createHash('sha256').update(value).digest('hex')

const readOptionalJson = async <Value>(path: string): Promise<Value | undefined> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Value
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

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

const followerEvidence = async () => {
  const manifests = (await Promise.all(MANIFEST_PATHS.map((path) => readOptionalJson<LinkedInManifest>(path))))
    .filter((manifest): manifest is LinkedInManifest => Boolean(manifest))
  type ManifestEntry = NonNullable<LinkedInManifest['entries']>[number]
  const byUrl = new Map<string, NonNullable<ManifestEntry['result']>>()
  for (const manifest of manifests) {
    for (const entry of manifest.entries ?? []) {
      if (!entry.result || entry.status !== 'success') continue
      const key = canonicalLinkedInUrl(entry.result.canonicalProfileUrl || entry.url || '')
      const previous = byUrl.get(key)
      if (!previous || entry.result.observedAt > previous.observedAt) byUrl.set(key, entry.result)
    }
  }
  return byUrl
}

const followerSnapshot = (
  row: FounderRow,
  evidenceByUrl: Awaited<ReturnType<typeof followerEvidence>>,
): UnifiedFollowerSnapshot | null => {
  if (row.followers === null) return null
  const evidence = row.linkedin_url ? evidenceByUrl.get(canonicalLinkedInUrl(row.linkedin_url)) : undefined
  if (evidence?.followers.count === row.followers) {
    return {
      count: row.followers,
      observed_at: evidence.observedAt.slice(0, 10),
      status: 'observed',
      precision: evidence.followers.precision,
      source: 'linkedin-profile',
    }
  }
  return {
    count: row.followers,
    observed_at: null,
    status: 'not-verified',
    precision: null,
    source: null,
  }
}

const founderProfile = (row: FounderRow): UnifiedFounderProfile => ({
  companies: [...row.companies],
  editorial_order: row.editorial_order,
  influence_signal: row.influence_signal,
  primary_market: row.primary_market,
  role: row.founder_role,
  sector: row.sector,
  target: row.target,
  tier: row.tier,
  tier_label: row.tier_label,
  why_selected: row.why_selected,
})

const newPerson = (
  row: FounderRow,
  followers: UnifiedFollowerSnapshot | null,
): UnifiedPerson => {
  const linkedin = row.linkedin_url ? canonicalLinkedInUrl(row.linkedin_url) : null
  const identitySeed = linkedin ?? `${SOURCE_ID}:${row.id}`
  const exactCountry = COUNTRY_CODES[row.primary_market] ? row.primary_market : null
  const profiles: UnifiedProfile[] = linkedin ? [{
    platform: 'linkedin',
    url: linkedin,
    verification: row.linkedin_review.status === 'verified'
      ? `${SOURCE_ID}:${row.linkedin_review.source}:${row.linkedin_review.confidence ?? 'unspecified'}`
      : `${SOURCE_ID}:unresolved`,
    followers,
  }] : []
  return {
    id: `person_${slug(row.name)}_${shortHash(identitySeed)}`,
    source_ids: [SOURCE_ID],
    group: null,
    name: {
      display: row.name,
      title: null,
      passport: null,
      certificate: null,
    },
    current_role: {
      title: row.founder_role || null,
      organization: row.companies[0] ?? null,
    },
    location: {
      country: exactCountry,
      country_code: exactCountry ? COUNTRY_CODES[exactCountry] : null,
      city: null,
      nationality: null,
    },
    biography: null,
    specialties: row.sector ? [row.sector] : [],
    image: {
      url: null,
      source_path: null,
      alt: row.name,
    },
    profiles,
    influence: {
      lane: 'Founder',
      fit: false,
      potential_target: row.target,
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
    founder: founderProfile(row),
    source_records: [],
  }
}

const profileLinkedInKeys = (person: UnifiedPerson) => person.profiles.flatMap((profile) => {
  try {
    return profile.platform === 'linkedin' ? [canonicalLinkedInUrl(profile.url)] : []
  } catch {
    return []
  }
})

const profileCollisionSurplus = (people: UnifiedPerson[]) => {
  const profileKeys = people.flatMap((person) => person.profiles.map((profile) => {
    try {
      return `${profile.platform}:${canonicalLinkedInUrl(profile.url)}`
    } catch {
      return `${profile.platform}:${profile.url}`
    }
  }))
  return profileKeys.length - new Set(profileKeys).size
}

const personCompanyKeys = (person: UnifiedPerson) => unique([
  person.current_role.organization,
  ...(person.founder?.companies ?? []),
].filter((value): value is string => Boolean(value)).map(compactIdentityText).filter(Boolean))

const companyOverlaps = (person: UnifiedPerson, row: FounderRow) => {
  const personCompanies = personCompanyKeys(person)
  const founderCompanies = row.companies.map(compactIdentityText).filter(Boolean)
  return founderCompanies.some((founderCompany) => personCompanies.some((personCompany) =>
    founderCompany === personCompany
      || founderCompany.includes(personCompany)
      || personCompany.includes(founderCompany)))
}

const mergeRow = (
  person: UnifiedPerson,
  row: FounderRow,
  followers: UnifiedFollowerSnapshot | null,
) => {
  person.source_ids = unique([...person.source_ids, SOURCE_ID]).sort()
  person.current_role.title ||= row.founder_role || null
  person.current_role.organization ||= row.companies[0] ?? null
  if (!person.location.country && COUNTRY_CODES[row.primary_market]) {
    person.location.country = row.primary_market
    person.location.country_code = COUNTRY_CODES[row.primary_market]
  }
  if (row.sector && !person.specialties.includes(row.sector)) person.specialties.push(row.sector)
  person.influence.lane ||= 'Founder'
  if (row.target) person.influence.potential_target = true
  person.founder = founderProfile(row)

  if (row.linkedin_url) {
    const canonicalUrl = canonicalLinkedInUrl(row.linkedin_url)
    const existingProfile = person.profiles.find((profile) => {
      try {
        return profile.platform === 'linkedin' && canonicalLinkedInUrl(profile.url) === canonicalUrl
      } catch {
        return false
      }
    })
    if (existingProfile) {
      existingProfile.verification ||= `${SOURCE_ID}:${row.linkedin_review.source}:${row.linkedin_review.confidence ?? 'unspecified'}`
      if (!existingProfile.followers && followers) existingProfile.followers = followers
      else if (existingProfile.followers?.count == null && followers?.count != null) existingProfile.followers = followers
    } else {
      person.profiles.push({
        platform: 'linkedin',
        url: canonicalUrl,
        verification: `${SOURCE_ID}:${row.linkedin_review.source}:${row.linkedin_review.confidence ?? 'unspecified'}`,
        followers,
      })
    }
  }

  const sourceRecord = {
    source_id: SOURCE_ID,
    record_id: row.id,
    source_url: row.evidence.url,
    observed_at: row.evidence.observed_at,
    verification: row.linkedin_review.status === 'verified'
      ? `linkedin:${row.linkedin_review.source}:${row.linkedin_review.confidence ?? 'unspecified'}`
      : 'linkedin:unresolved',
    raw: structuredClone(row),
  } satisfies UnifiedPerson['source_records'][number]
  const sourceRecordIndex = person.source_records.findIndex((record) =>
    record.source_id === SOURCE_ID && record.record_id === row.id)
  if (sourceRecordIndex >= 0) person.source_records[sourceRecordIndex] = sourceRecord
  else person.source_records.push(sourceRecord)
}

const originalUnifiedText = await readFile(UNIFIED_PATH, 'utf8')
const unified = JSON.parse(originalUnifiedText) as UnifiedPeopleFile
const originalProfileCollisionSurplus = profileCollisionSurplus(unified.people)
const founders = JSON.parse(await readFile(FOUNDERS_PATH, 'utf8')) as FounderFile
const archives = JSON.parse(await readFile(ARCHIVES_PATH, 'utf8')) as ArchiveFile
const evidenceByUrl = await followerEvidence()
const archivedIds = new Set(archives.tables?.[SOURCE_ID]?.archived_ids ?? [])
const eligibleRows = founders.rows.filter((row) => !archivedIds.has(row.id))

assert.match(founders.schema_version, /^middle-east-founders\.v\d+$/)
assert.equal(new Set(founders.rows.map((row) => row.id)).size, founders.rows.length, 'Founder source IDs must be unique.')
assert.equal(new Set(unified.people.map((person) => person.id)).size, unified.people.length, 'Unified person IDs must be unique before the merge.')
assert.ok(eligibleRows.every((row) => row.evidence?.url && row.evidence?.observed_at), 'Every eligible founder must have evidence provenance.')

const decisions: MergeDecision[] = []
for (const row of eligibleRows.sort((left, right) => left.editorial_order - right.editorial_order)) {
  const sourceMatches = unified.people.filter((person) => person.source_records.some((record) =>
    record.source_id === SOURCE_ID && record.record_id === row.id))
  const linkedinMatches = row.linkedin_url
    ? unified.people.filter((person) => profileLinkedInKeys(person).includes(canonicalLinkedInUrl(row.linkedin_url!)))
    : []
  const nameMatches = unified.people.filter((person) =>
    compactIdentityText(person.name.display) === compactIdentityText(row.name))
  const nameCompanyMatches = nameMatches.filter((person) => companyOverlaps(person, row))

  let target: UnifiedPerson | undefined
  let kind: MatchKind | 'held-name-only' | 'held-ambiguous'
  if (sourceMatches.length > 1) {
    kind = 'held-ambiguous'
  } else if (sourceMatches.length === 1) {
    target = sourceMatches[0]
    kind = 'existing-source-record'
  } else if (linkedinMatches.length > 1) {
    kind = 'held-ambiguous'
  } else if (linkedinMatches.length === 1) {
    target = linkedinMatches[0]
    kind = 'exact-linkedin'
  } else if (nameCompanyMatches.length > 1) {
    kind = 'held-ambiguous'
  } else if (nameCompanyMatches.length === 1) {
    target = nameCompanyMatches[0]
    kind = 'exact-name-company'
  } else if (nameMatches.length > 0) {
    kind = nameMatches.length === 1 ? 'held-name-only' : 'held-ambiguous'
  } else {
    target = newPerson(row, followerSnapshot(row, evidenceByUrl))
    unified.people.push(target)
    kind = 'new-person'
  }

  if (!target) {
    decisions.push({
      founder: row.name,
      founder_id: row.id,
      kind,
      person_id: null,
      reason: kind === 'held-name-only'
        ? `Same normalized name exists without company or LinkedIn confirmation: ${nameMatches.map((person) => `${person.name.display} at ${person.current_role.organization ?? 'unknown organization'}`).join(' | ')}`
        : 'Multiple identity candidates require manual review.',
    })
    continue
  }

  mergeRow(target, row, followerSnapshot(row, evidenceByUrl))
  decisions.push({ founder: row.name, founder_id: row.id, kind, person_id: target.id })
}

unified.people.sort((left, right) => left.name.display.localeCompare(right.name.display, undefined, { numeric: true, sensitivity: 'base' }))
const importedDecisions = decisions.filter((decision) => decision.person_id)
const sourceRecordCount = unified.people.reduce((total, person) => total + person.source_records.length, 0)
const source: UnifiedPeopleSource = {
  id: SOURCE_ID,
  name: founders.title,
  type: 'research',
  url: null,
  source_files: [
    'assets/people/middle-east-founders.json',
    'assets/table-archives.json',
  ],
  observed_at: founders.observed_at,
  record_count: importedDecisions.length,
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

assert.equal(new Set(unified.people.map((person) => person.id)).size, unified.people.length, 'Unified person IDs must remain unique.')
assert.ok(
  profileCollisionSurplus(unified.people) <= originalProfileCollisionSurplus,
  'The merge must not introduce additional profile URL collisions.',
)
assert.equal(
  unified.people.reduce((total, person) => total + person.source_records.length, 0),
  unified.stats.source_records,
  'Source-record statistics must match the merged people data.',
)
assert.ok(
  unified.people.flatMap((person) => person.source_records).filter((record) => record.source_id === SOURCE_ID)
    .every((record) => !archivedIds.has(record.record_id)),
  'Archived founders must not be imported.',
)

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  source: SOURCE_ID,
  eligible_unarchived_rows: eligibleRows.length,
  archived_rows_excluded: archivedIds.size,
  imported_source_records: importedDecisions.length,
  existing_source_records_updated: decisions.filter((decision) => decision.kind === 'existing-source-record').length,
  exact_linkedin_matches: decisions.filter((decision) => decision.kind === 'exact-linkedin').length,
  exact_name_company_matches: decisions.filter((decision) => decision.kind === 'exact-name-company').length,
  new_people: decisions.filter((decision) => decision.kind === 'new-person').length,
  held_for_review: decisions.filter((decision) => !decision.person_id),
  resulting_people: unified.stats.unique_people,
  resulting_source_records: unified.stats.source_records,
  resulting_multi_source_people: unified.stats.multi_source_people,
}

if (APPLY) {
  const currentUnifiedText = await readFile(UNIFIED_PATH, 'utf8')
  if (jsonHash(currentUnifiedText) !== jsonHash(originalUnifiedText)) {
    throw new Error('Unified people changed during the merge. Re-run to avoid overwriting concurrent edits.')
  }
  await writeJsonAtomically(UNIFIED_PATH, unified)
}

console.log(JSON.stringify(summary, null, 2))
