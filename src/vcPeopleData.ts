import type { UnifiedPeopleFile, UnifiedPerson } from './unifiedPeopleTypes'

export const VC_PEOPLE_SOURCE_ID = 'middle-east-vc-people' as const

export type VcPeopleManualOverrides = {
  followers?: number | null
  linkedinUrl?: string | null
  name?: string
  organization?: string | null
  role?: string | null
  target?: boolean
}

export type VcPeopleResearchRaw = {
  firm_name?: string | null
  firm_rank?: number | null
  follower_count_status?: string
  follower_observation_note?: string
  last_manual_edit_at?: string
  legacy_person_id?: string
  linkedin_url?: string | null
  manual_edit_fields?: string[]
  manual_overrides?: VcPeopleManualOverrides
  person_name?: string
  role?: string | null
  source_person?: {
    current_role?: UnifiedPerson['current_role']
    location?: UnifiedPerson['location']
    name?: UnifiedPerson['name']
    profiles?: UnifiedPerson['profiles']
    target?: boolean | null
  }
  target?: boolean
  [key: string]: unknown
}

export type VcAffiliation = {
  firm: string | null
  rank: number | null
  record: UnifiedPerson['source_records'][number]
  role: string | null
  sourceUrl: string | null
}

export const vcPeopleResearchRaw = (
  record: UnifiedPerson['source_records'][number] | undefined,
): VcPeopleResearchRaw => {
  const raw = record?.raw
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as VcPeopleResearchRaw : {}
}

export const vcSourceRecords = (person: UnifiedPerson) => person.source_records.filter(
  (record) => record.source_id === VC_PEOPLE_SOURCE_ID,
)

export const isVcPerson = (person: UnifiedPerson) => vcSourceRecords(person).length > 0

export const vcAffiliations = (person: UnifiedPerson): VcAffiliation[] => {
  const records = vcSourceRecords(person)
  const canonicalRoleIsVcAffiliation = records.length === 1 && person.source_ids.length === 1
  return records.map((record) => {
    const raw = vcPeopleResearchRaw(record)
    const snapshotRole = raw.source_person?.current_role
    const hasOrganizationOverride = Object.prototype.hasOwnProperty.call(raw.manual_overrides ?? {}, 'organization')
    const hasRoleOverride = Object.prototype.hasOwnProperty.call(raw.manual_overrides ?? {}, 'role')
    return {
      firm: canonicalRoleIsVcAffiliation
        ? person.current_role.organization
        : hasOrganizationOverride ? raw.manual_overrides!.organization ?? null : raw.firm_name ?? snapshotRole?.organization ?? null,
      rank: typeof raw.firm_rank === 'number' ? raw.firm_rank : null,
      record,
      role: canonicalRoleIsVcAffiliation
        ? person.current_role.title
        : hasRoleOverride ? raw.manual_overrides!.role ?? null : raw.role ?? snapshotRole?.title ?? null,
      sourceUrl: record.source_url,
    }
  })
}

const uniqueText = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)))]

export const vcFirmLabel = (person: UnifiedPerson) => uniqueText(vcAffiliations(person).map((affiliation) => affiliation.firm)).join(' · ')

export const vcRoleLabel = (person: UnifiedPerson) => {
  const affiliations = vcAffiliations(person)
  const roles = uniqueText(affiliations.map((affiliation) => affiliation.role))
  if (roles.length <= 1) return roles[0] ?? ''
  return affiliations
    .filter((affiliation) => affiliation.role)
    .map((affiliation) => affiliation.firm ? `${affiliation.role} — ${affiliation.firm}` : affiliation.role)
    .join(' · ')
}

const normalizeOrganization = (value: string | null | undefined) => (value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, '')

export const primaryVcAffiliation = (person: UnifiedPerson) => {
  const affiliations = vcAffiliations(person)
  const currentOrganization = normalizeOrganization(person.current_role.organization)
  return affiliations.find((affiliation) => {
    const firm = normalizeOrganization(affiliation.firm)
    return firm && currentOrganization && (firm === currentOrganization || currentOrganization.includes(firm))
  }) ?? affiliations[0]
}

export const vcPeopleView = (file: UnifiedPeopleFile): UnifiedPeopleFile => {
  const people = file.people.filter(isVcPerson)
  const sourceRecords = people.reduce((total, person) => total + vcSourceRecords(person).length, 0)
  return {
    schema_version: file.schema_version,
    generated_at: file.generated_at,
    sources: file.sources.filter((source) => source.id === VC_PEOPLE_SOURCE_ID),
    stats: {
      source_records: sourceRecords,
      unique_people: people.length,
      multi_source_people: people.filter((person) => person.source_ids.length > 1).length,
      duplicate_source_records_collapsed: sourceRecords - people.length,
    },
    people,
  }
}
