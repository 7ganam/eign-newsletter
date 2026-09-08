export type LeadResearchEvidence = {
  id: string
  claim_key: string
  source_url: string
  source_title: string
  source_type: string
  /** Stable editorial publisher/author identity, not a page or post ID. Unknown stays null. */
  publisher_id?: string | null
  resource_id: string | null
  published_at: string | null
  publication_date_status?: 'verified' | 'derived' | 'recorded' | 'not-applicable' | 'unavailable'
  publication_date_basis?: string
  publication_date_checked_at?: string
  observed_at: string
  source_quality: 'primary' | 'credible-secondary' | 'discovery-only'
  confidence: 'high' | 'medium' | 'low'
  summary: string
}

export type LeadResearchDimension = {
  score: number
  level: 'confirmed' | 'probable' | 'possible' | 'unknown' | 'refuted'
  summary: string
  evidence_ids: string[]
}

export type LeadResearchPersona = {
  schema_version: 'saudi-lead-persona.v1'
  updated_at: string
  title: string
  target_definition: string
  geography_rule: string
  product_scope: string[]
  lanes: Array<{ id: LeadLane; label: string; definition: string; target_count: number }>
  required_gates: Array<{ id: string; label: string; rule: string }>
  dimensions: Array<{ id: LeadScoreDimension; label: string; maximum: number; levels: Array<{ score: number; rule: string }> }>
  penalties: Array<{ id: string; points: number; rule: string }>
  bands: Array<{ id: LeadBand; minimum: number; maximum: number; definition: string }>
  evidence_policy: string[]
  exclusions: string[]
  reference_customers: Array<{
    id: string
    display_name: string
    linkedin_url: string
    relationship: 'existing-customer'
    observed_at: string
    evidence_basis: string
    discovery_signals: string[]
  }>
}

export type LeadLane = 'new-founder' | 'stealth-or-precompany' | 'sme-digital-build'
export type LeadBand = 'A' | 'B' | 'C' | 'D'
export type LeadScoreDimension = 'product_intent' | 'outsourcing_likelihood' | 'budget_readiness' | 'timing'
export type LeadResearchStatus = 'new' | 'identity-pending' | 'researching' | 'review-required' | 'qualified' | 'watchlist' | 'rejected' | 'needs-refresh'
export type LeadEngagementStatus = 'not-contacted' | 'contacted-awaiting-reply' | 'replied' | 'follow-up-due' | 'meeting-scheduled' | 'not-interested' | 'closed'
export type LeadEngagementChannel = 'whatsapp' | 'linkedin' | 'email' | 'phone' | 'other'
export type LeadEngagementEventKind = 'contacted' | 'reply-received' | 'follow-up-sent' | 'meeting-scheduled' | 'note'

export type LeadEngagementEvent = {
  id: string
  occurred_on: string
  kind: LeadEngagementEventKind
  channel: LeadEngagementChannel
  summary: string
}

export type LeadEngagement = {
  lead_id: string
  status: LeadEngagementStatus
  primary_channel: LeadEngagementChannel | null
  last_contact_at: string | null
  next_follow_up_at: string | null
  notes: string | null
  events: LeadEngagementEvent[]
}

export type LeadEngagementsFile = {
  schema_version: 'saudi-lead-engagements.v1'
  generated_at: string
  rows: LeadEngagement[]
}

export type LeadResearchStrategy = {
  id: string
  label: string
  batch_id: string
  method: 'direct-request' | 'current-cohort' | 'official-program' | 'event-financing-signal' | 'community-signal'
  access: 'logged-in-linkedin' | 'public-linkedin' | 'public-web'
}

export type LeadResearchStrategyRun = {
  id: string
  batch_id: string
  created_at: string
  completed_at: string | null
  observed_on: string
  lead_ids: string[]
  metrics: {
    queries: number
    search_passes: number
    post_impressions: number
    new_candidates: number
    carried_candidates: number
    confirmed_fits: number
  }
  summary: string
}

export type LeadResearchStrategyRecord = {
  id: string
  label: string
  version: number
  created_at: string
  updated_at: string
  status: 'active' | 'testing' | 'paused' | 'retired'
  priority: 'high' | 'medium' | 'low'
  cadence: 'twice-weekly' | 'weekly' | 'monthly' | 'ad-hoc'
  next_review_at: string | null
  objective: string
  persona_summary: string
  access_and_boundaries: string[]
  time_allocation: Array<{ lane: string; percent: number }>
  workflow_steps: string[]
  proven_queries: string[]
  low_yield_queries: string[]
  next_queries_to_test: string[]
  insights: {
    what_worked: string[]
    what_did_not_work: string[]
    risks_and_limits: string[]
    improvements: string[]
  }
  source_artifacts: string[]
  runs: LeadResearchStrategyRun[]
  notes: string | null
}

export type LeadResearchStrategiesFile = {
  schema_version: 'saudi-lead-strategies.v1'
  generated_at: string
  rows: LeadResearchStrategyRecord[]
}

export type LeadPersonaReview = {
  status: 'needs-verification' | 'confirmed-fit' | 'not-a-fit'
  core_product: 'unbuilt' | 'prototype' | 'built' | 'unknown'
  software_builders_min: number | null
  software_builders_max: number | null
  missing_checks: string[]
  summary: string
}

export type SaudiSoftwareLead = {
  id: string
  identity: {
    display_name: string
    linkedin_url: string | null
    current_title: string | null
    current_organization: string | null
    identity_status: 'verified' | 'probable' | 'ambiguous' | 'unresolved'
    identity_confidence: 'high' | 'medium' | 'low' | null
    evidence_ids: string[]
  }
  company: {
    name: string | null
    website_url: string | null
    linkedin_url: string | null
    city: string | null
    saudi_basis: 'person-based' | 'hq-based' | 'operations-based' | 'unknown'
    founder_role_started_at: string | null
    founded_at: string | null
    linkedin_employee_band: string | null
    sector: string | null
    lifecycle_stage: 'precompany' | 'idea' | 'building' | 'beta' | 'launched' | 'operating' | 'unknown'
    product_types: Array<'mobile-app' | 'web-platform' | 'marketplace' | 'internal-software' | 'other'>
    product_summary: string
    existing_product_urls: string[]
    evidence_ids: string[]
  }
  discovery: {
    strategy?: LeadResearchStrategy
    lane: LeadLane
    resource_ids: string[]
    public_behavior_tags: string[]
    behavioral_summary: string
    discovery_note: string | null
  }
  qualification: {
    persona_review?: LeadPersonaReview
    ksa_fit: 'confirmed' | 'possible' | 'refuted' | 'unknown'
    decision_authority: 'confirmed' | 'possible' | 'refuted' | 'unknown'
    software_fit: 'confirmed' | 'possible' | 'refuted' | 'unknown'
    product_intent: LeadResearchDimension
    outsourcing_likelihood: LeadResearchDimension
    budget_readiness: LeadResearchDimension
    timing: LeadResearchDimension
    negative_signals: Array<{ id: string; points: number; summary: string; evidence_ids: string[] }>
    positive_score: number
    penalty: number
    total_score: number
    band: LeadBand
    qualification_confidence: 'high' | 'medium' | 'low'
    manually_reviewed_at: string | null
  }
  research: {
    status: LeadResearchStatus
    discovered_at: string
    last_researched_at: string | null
    next_review_at: string | null
    notes: string | null
  }
  evidence: LeadResearchEvidence[]
}

export type SaudiSoftwareLeadsFile = {
  schema_version: 'saudi-software-leads.v1'
  generated_at: string
  rows: SaudiSoftwareLead[]
  research_archive?: Array<{
    id: string
    display_name: string | null
    company_name: string | null
    proposed_lane: LeadLane | null
    disposition: 'held' | 'rejected' | 'duplicate'
    reason: string
    missing_gates: string[]
    source_file: string
    source_candidate_id: string
  }>
}

export type LeadResearchResource = {
  id: string
  name: string
  resource_type: 'program-incubator' | 'event-cohort' | 'funding-portfolio-news' | 'linkedin-community'
  geography: string
  url: string
  linkedin_url: string | null
  access_level: 'public' | 'free-login' | 'partially-gated'
  discovery_method: string
  refresh_cadence: 'weekly' | 'event-season' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
  priority: 'high' | 'medium' | 'low'
  expected_yield: 'high' | 'medium' | 'low'
  candidates_found: number
  accepted_leads: number
  classification: 'accepted' | 'useful' | 'low-signal' | 'duplicate' | 'rejected'
  status: 'active' | 'monitor' | 'unavailable' | 'retired'
  last_checked_at: string
  why_useful: string
  notes: string | null
  evidence: LeadResearchEvidence[]
}

export type LeadResearchResourcesFile = {
  schema_version: 'saudi-lead-resources.v1'
  generated_at: string
  rows: LeadResearchResource[]
  seed_registry?: Array<{
    id: string
    provided_url: string
    canonical_url: string
    classification: 'useful' | 'low-signal' | 'duplicate' | 'rejected'
    duplicate_of?: string
    observed_title: string
    reason: string
    observed_at: string
  }>
}

export type LeadResearchResponse = {
  schemaVersion: 'lead-research.v1'
  generatedAt: string
  persona: LeadResearchPersona
  leads: SaudiSoftwareLead[]
  resources: LeadResearchResource[]
  strategies: LeadResearchStrategyRecord[]
  engagements: LeadEngagement[]
  stats: {
    leads: number
    resources: number
    acceptedResources: number
    lanes: Record<LeadLane, number>
    bands: Record<LeadBand, number>
    statuses: Record<string, number>
    verificationStates: Record<string, number>
    staleLeads: number
    resourceTypes: Record<string, number>
    acceptedLeadYieldBySource: Record<string, number>
    researchCandidates?: number
    confirmedStrategyFits?: number
    strategies: number
    strategyRuns: number
    strategyLinkedLeads: number
    engagementStatuses: Record<LeadEngagementStatus, number>
    followUpsDue: number
  }
}
