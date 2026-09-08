export type UnifiedPeopleSourceId = 'leap-2026' | 'riseup-2026' | 'web-search' | 'middle-east-vc-people' | 'middle-east-founders' | 'juhani-like-accounts' | 'saudi-software-leads'

export type NewsletterTargetGroup = 'repost-target' | 'client-target' | 'audience-gateway' | `custom-${string}`

export type NewsletterTargetGroupOption = {
  value: NewsletterTargetGroup
  label: string
  description: string
}

export type InfluencerCountry =
  | 'Egypt'
  | 'Saudi Arabia'
  | 'United Arab Emirates'
  | 'Qatar'
  | 'Bahrain'
  | 'Kuwait'
  | 'Oman'
  | 'Regional'

export type InfluencerLane =
  | 'Founder'
  | 'Investor'
  | 'Ecosystem'
  | 'Policy'
  | 'Media & Research'

export type Influencer = {
  name: string
  country: InfluencerCountry
  lane: InfluencerLane
  organisation: string
  linkedinUrl: string
  priority: boolean
  arabicOrBilingual: boolean
}

export type LinkedInFollowerSnapshot = {
  count: number | null
  observedAt: string | null
  status: 'observed' | 'not-verified'
  precision?: 'exact' | 'rounded'
  source?: 'linkedin-profile' | 'search-index'
}

export type UnifiedPeopleSource = {
  id: UnifiedPeopleSourceId
  name: string
  type: 'event' | 'research'
  url: string | null
  source_files: string[]
  observed_at: string | null
  record_count: number
}

export type UnifiedFollowerSnapshot = {
  count: number | null
  observed_at: string | null
  status: 'observed' | 'not-verified'
  precision: 'exact' | 'rounded' | null
  source: 'linkedin-profile' | 'search-index' | null
}

export type UnifiedProfile = {
  platform: 'linkedin'
  url: string
  verification: string | null
  followers: UnifiedFollowerSnapshot | null
}

export type UnifiedEventSession = {
  id: string
  title: string
  type: string | null
  activity_type: string | null
  description: string | null
  date: string | null
  start_time: string | null
  end_time: string | null
  track: string | null
  hall: string | null
  requires_registration: boolean
}

export type UnifiedEventAppearance = {
  event_id: 'leap-2026' | 'riseup-2026'
  speaker_id: string | null
  attendee_id: string | null
  profile_url: string | null
  sessions: UnifiedEventSession[]
}

export type UnifiedFounderProfile = {
  companies: string[]
  editorial_order: number
  influence_signal: string
  primary_market: string
  role: string
  sector: string
  target: boolean
  tier: 1 | 2 | 3
  tier_label: string
  why_selected: string
}

export type UnifiedPerson = {
  id: string
  merged_person_ids?: string[]
  source_ids: UnifiedPeopleSourceId[]
  group: NewsletterTargetGroup | null
  name: {
    display: string
    title: string | null
    passport: string | null
    certificate: string | null
  }
  current_role: {
    title: string | null
    organization: string | null
  }
  location: {
    country: string | null
    country_code: string | null
    city: string | null
    nationality: string | null
  }
  biography: string | null
  specialties: string[]
  image: {
    url: string | null
    source_path: string | null
    alt: string | null
  }
  profiles: UnifiedProfile[]
  influence: {
    lane: string | null
    fit: boolean
    potential_target: boolean
    target: boolean
    priority: boolean | null
    middle_eastern: {
      value: boolean | null
      method: string | null
      reason: string | null
      manually_overridden: boolean
    }
  }
  event_appearances: UnifiedEventAppearance[]
  founder?: UnifiedFounderProfile
  source_records: Array<{
    source_id: UnifiedPeopleSourceId
    record_id: string
    source_url: string | null
    observed_at: string | null
    verification: string | null
    raw: unknown
  }>
}

export type UnifiedPeopleFile = {
  schema_version: 'people.v1'
  generated_at: string
  group_options?: NewsletterTargetGroupOption[]
  sources: UnifiedPeopleSource[]
  stats: {
    source_records: number
    unique_people: number
    multi_source_people: number
    duplicate_source_records_collapsed: number
  }
  people: UnifiedPerson[]
}
