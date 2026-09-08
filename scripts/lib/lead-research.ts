import type { LeadBand, LeadEngagement, LeadResearchEvidence, LeadResearchPersona, LeadResearchResource, LeadResearchStrategyRecord, SaudiSoftwareLead } from '../../src/leadResearchTypes'
import { LEAD_ENGAGEMENT_CHANNELS, LEAD_ENGAGEMENT_EVENT_KINDS, LEAD_ENGAGEMENT_STATUSES } from '../../src/leadEngagement'
import { isLeadResearchCandidate, leadPersonaBlockers, leadQualificationBlockers, leadStrategyMetadataErrors } from '../../src/leadResearchStrategy'

export type LeadResearchValidationInput = {
  persona: LeadResearchPersona
  leads: SaudiSoftwareLead[]
  resources: LeadResearchResource[]
  strategies?: LeadResearchStrategyRecord[]
  engagements?: LeadEngagement[]
}

const LANE_TARGETS = { 'new-founder': 30, 'stealth-or-precompany': 10, 'sme-digital-build': 10 } as const
const RESOURCE_TARGETS = { 'program-incubator': 10, 'event-cohort': 6, 'funding-portfolio-news': 5, 'linkedin-community': 4 } as const
const PROHIBITED_KEYS = new Set(['email', 'email_address', 'phone', 'phone_number', 'contact', 'contact_details', 'outreach', 'message', 'messaged_at', 'called_at'])
const RESOURCE_ACCESS_LEVELS = new Set(['public', 'free-login', 'partially-gated'])
const RESOURCE_CADENCES = new Set(['weekly', 'event-season', 'monthly', 'quarterly', 'half-yearly', 'yearly'])
const RESOURCE_PRIORITIES = new Set(['high', 'medium', 'low'])
const STRATEGY_STATUSES = new Set(['active', 'testing', 'paused', 'retired'])
const STRATEGY_CADENCES = new Set(['twice-weekly', 'weekly', 'monthly', 'ad-hoc'])
const ENGAGEMENT_CONTACT_DETAIL_KEYS = new Set(['email', 'email_address', 'phone', 'phone_number', 'handle', 'contact_details', 'recipient', 'recipient_id'])

const isIsoInstant = (value: string) => !Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T/.test(value)
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

export const bandForScore = (score: number): LeadBand => score >= 15 ? 'A' : score >= 10 ? 'B' : score >= 5 ? 'C' : 'D'

export const scoreLead = (lead: SaudiSoftwareLead) => {
  const positive = lead.qualification.product_intent.score
    + lead.qualification.outsourcing_likelihood.score
    + lead.qualification.budget_readiness.score
    + lead.qualification.timing.score
  const penalty = Math.min(8, lead.qualification.negative_signals.reduce((sum, signal) => sum + Math.abs(signal.points), 0))
  const total = Math.max(0, Math.min(20, positive - penalty))
  return { band: bandForScore(total), penalty, positive, total }
}

const domainFor = (value: string | null) => {
  if (!value) return null
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, '') } catch { return null }
}

const validateUrl = (value: string, label: string, errors: string[]) => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') errors.push(`${label} must use HTTPS.`)
  } catch {
    errors.push(`${label} is not a valid URL.`)
  }
}

const validateEvidence = (evidence: LeadResearchEvidence[], owner: string, errors: string[]) => {
  const ids = new Set<string>()
  evidence.forEach((item) => {
    if (!item.id || ids.has(item.id)) errors.push(`${owner} has a missing or duplicate evidence ID: ${item.id || '(empty)'}.`)
    ids.add(item.id)
    validateUrl(item.source_url, `${owner} evidence ${item.id}`, errors)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.observed_at)) errors.push(`${owner} evidence ${item.id} needs an observation date.`)
    if (item.published_at && !/^\d{4}-\d{2}-\d{2}$/.test(item.published_at)) errors.push(`${owner} evidence ${item.id} has an invalid publication date.`)
    if (!item.publication_date_status) errors.push(`${owner} evidence ${item.id} needs a publication-date audit status.`)
    if (!item.publication_date_basis?.trim()) errors.push(`${owner} evidence ${item.id} needs a publication-date audit basis.`)
    if (!item.publication_date_checked_at || !isIsoDate(item.publication_date_checked_at)) errors.push(`${owner} evidence ${item.id} needs a publication-date audit date.`)
    if (item.published_at && (item.publication_date_status === 'not-applicable' || item.publication_date_status === 'unavailable')) errors.push(`${owner} evidence ${item.id} has a date that conflicts with its audit status.`)
    if (!item.published_at && item.publication_date_status && !['not-applicable', 'unavailable'].includes(item.publication_date_status)) errors.push(`${owner} evidence ${item.id} is missing the date required by its audit status.`)
    if (!item.summary.trim()) errors.push(`${owner} evidence ${item.id} needs a paraphrased summary.`)
    if (item.publisher_id !== undefined && item.publisher_id !== null
      && (typeof item.publisher_id !== 'string' || !item.publisher_id.trim())) errors.push(`${owner} evidence ${item.id} publisher ID must be a non-empty string or null.`)
  })
  return ids
}

const findProhibitedKeys = (value: unknown, path = ''): string[] => {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap((item, index) => findProhibitedKeys(item, `${path}[${index}]`))
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => [
    ...(PROHIBITED_KEYS.has(key.toLowerCase()) ? [`${path ? `${path}.` : ''}${key}`] : []),
    ...findProhibitedKeys(item, `${path ? `${path}.` : ''}${key}`),
  ])
}

export const validateLeadResearch = ({ engagements, leads, persona, resources, strategies }: LeadResearchValidationInput) => {
  const errors: string[] = []
  if (persona.schema_version !== 'saudi-lead-persona.v1') errors.push('Persona schema version must be saudi-lead-persona.v1.')
  const expectedDimensions = { product_intent: 6, outsourcing_likelihood: 5, budget_readiness: 5, timing: 4 } as const
  for (const [id, maximum] of Object.entries(expectedDimensions)) {
    if (persona.dimensions.find((dimension) => dimension.id === id)?.maximum !== maximum) errors.push(`Persona dimension ${id} must have maximum ${maximum}.`)
  }
  for (const [id, minimum, maximum] of [['A', 15, 20], ['B', 10, 14], ['C', 5, 9], ['D', 0, 4]] as const) {
    const band = persona.bands.find((item) => item.id === id)
    if (!band || band.minimum !== minimum || band.maximum !== maximum) errors.push(`Persona band ${id} must span ${minimum}-${maximum}.`)
  }
  const historicalLeads = leads.filter((lead) => !lead.qualification.persona_review)
  if (historicalLeads.length !== 50) errors.push(`Expected 50 historical baseline leads, found ${historicalLeads.length}.`)
  const leadIds = new Set<string>()
  const linkedinUrls = new Set<string>()
  const companyDomains = new Map<string, string>()
  const resourceIds = new Set(resources.map((resource) => resource.id))

  for (const [lane, expected] of Object.entries(LANE_TARGETS)) {
    const actual = historicalLeads.filter((lead) => lead.discovery.lane === lane).length
    if (actual !== expected) errors.push(`Expected ${expected} ${lane} leads, found ${actual}.`)
  }

  leads.forEach((lead) => {
    const owner = `Lead ${lead.id || '(missing ID)'}`
    const researchCandidate = isLeadResearchCandidate(lead)
    leadStrategyMetadataErrors(lead).forEach((message) => errors.push(`${owner}: ${message}`))
    if (lead.qualification.persona_review?.status === 'confirmed-fit') {
      leadPersonaBlockers(lead).forEach((message) => errors.push(`${owner}: ${message}`))
    }
    if (lead.qualification.persona_review && lead.research.status === 'qualified') {
      leadQualificationBlockers(lead).forEach((message) => errors.push(`${owner}: ${message}`))
    }
    if (!lead.id || leadIds.has(lead.id)) errors.push(`${owner} has a missing or duplicate stable ID.`)
    leadIds.add(lead.id)
    if (lead.identity.linkedin_url) {
      const canonical = lead.identity.linkedin_url.toLowerCase().replace(/\/$/, '')
      validateUrl(lead.identity.linkedin_url, `${owner} LinkedIn URL`, errors)
      if (linkedinUrls.has(canonical)) errors.push(`${owner} duplicates personal LinkedIn URL ${canonical}.`)
      linkedinUrls.add(canonical)
    }
    const domain = domainFor(lead.company.website_url)
    if (domain) {
      const existing = companyDomains.get(domain)
      if (existing) errors.push(`${owner} duplicates canonical company domain ${domain} already used by ${existing}.`)
      companyDomains.set(domain, lead.company.name ?? owner)
    }
    if (!researchCandidate) {
      if (lead.identity.identity_status !== 'verified') errors.push(`${owner} identity is not verified.`)
      if (lead.qualification.ksa_fit !== 'confirmed') errors.push(`${owner} Saudi-market fit is not confirmed.`)
      if (lead.qualification.decision_authority !== 'confirmed') errors.push(`${owner} buying authority is not confirmed.`)
      if (lead.qualification.software_fit !== 'confirmed') errors.push(`${owner} custom-software fit is not confirmed.`)
      if (!lead.qualification.persona_review && lead.qualification.band === 'D') errors.push(`${owner} is D-band and cannot remain active.`)
      if (lead.research.status === 'rejected') errors.push(`${owner} is rejected and cannot remain in the active dataset.`)
    }
    if (!lead.research.last_researched_at || !/^\d{4}-\d{2}-\d{2}$/.test(lead.research.last_researched_at)) errors.push(`${owner} needs a last-researched date.`)
    const evidenceIds = validateEvidence(lead.evidence, owner, errors)
    if (!lead.evidence.some((item) => item.source_quality === 'primary')) errors.push(`${owner} needs at least one primary source.`)
    lead.evidence.forEach((item) => { if (item.resource_id && !resourceIds.has(item.resource_id)) errors.push(`${owner} evidence ${item.id} references missing resource ${item.resource_id}.`) })
    if (!lead.qualification.persona_review && !researchCandidate && (lead.qualification.band === 'A' || lead.qualification.band === 'B') && (
      new Set(lead.evidence.map((item) => item.source_url)).size < 2
      || new Set(lead.evidence.map((item) => item.source_type)).size < 2
      || !lead.evidence.some((item) => item.source_quality === 'primary')
    )) {
      errors.push(`${owner} needs two independent sources including a primary source for band ${lead.qualification.band}.`)
    }
    const claimedEvidence = [
      ...lead.identity.evidence_ids,
      ...lead.company.evidence_ids,
      ...lead.qualification.product_intent.evidence_ids,
      ...lead.qualification.outsourcing_likelihood.evidence_ids,
      ...lead.qualification.budget_readiness.evidence_ids,
      ...lead.qualification.timing.evidence_ids,
      ...lead.qualification.negative_signals.flatMap((signal) => signal.evidence_ids),
    ]
    claimedEvidence.forEach((id) => { if (!evidenceIds.has(id)) errors.push(`${owner} references missing evidence ${id}.`) })
    lead.discovery.resource_ids.forEach((id) => { if (!resourceIds.has(id)) errors.push(`${owner} references missing resource ${id}.`) })
    const score = scoreLead(lead)
    for (const [label, value, maximum] of [
      ['product intent', lead.qualification.product_intent.score, 6],
      ['outsourcing likelihood', lead.qualification.outsourcing_likelihood.score, 5],
      ['budget readiness', lead.qualification.budget_readiness.score, 5],
      ['timing', lead.qualification.timing.score, 4],
    ] as const) if (!Number.isInteger(value) || value < 0 || value > maximum) errors.push(`${owner} ${label} score must be an integer from 0 to ${maximum}.`)
    if (score.positive !== lead.qualification.positive_score || score.penalty !== lead.qualification.penalty || score.total !== lead.qualification.total_score || score.band !== lead.qualification.band) {
      errors.push(`${owner} has a score that does not match its evidence dimensions.`)
    }
  })

  const accepted = resources.filter((resource) => resource.classification === 'accepted')
  if (accepted.length !== 25) errors.push(`Expected 25 accepted resources, found ${accepted.length}.`)
  if (resourceIds.size !== resources.length) errors.push('Resource IDs must be unique.')
  for (const [type, expected] of Object.entries(RESOURCE_TARGETS)) {
    const actual = accepted.filter((resource) => resource.resource_type === type).length
    if (actual !== expected) errors.push(`Expected ${expected} accepted ${type} resources, found ${actual}.`)
  }
  resources.forEach((resource) => {
    const owner = `Resource ${resource.id || '(missing ID)'}`
    validateUrl(resource.url, `${owner} URL`, errors)
    if (!resource.discovery_method.trim()) errors.push(`${owner} needs harvesting instructions.`)
    if (!resource.why_useful.trim()) errors.push(`${owner} needs a future-use explanation.`)
    if (!RESOURCE_ACCESS_LEVELS.has(resource.access_level)) errors.push(`${owner} needs a valid access level.`)
    if (!RESOURCE_CADENCES.has(resource.refresh_cadence)) errors.push(`${owner} needs a valid refresh cadence.`)
    if (!RESOURCE_PRIORITIES.has(resource.priority)) errors.push(`${owner} needs a valid priority.`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(resource.last_checked_at)) errors.push(`${owner} needs a last-checked date.`)
    validateEvidence(resource.evidence, owner, errors)
    resource.evidence.forEach((item) => { if (item.resource_id !== resource.id) errors.push(`${owner} evidence ${item.id} must point back to its resource.`) })
  })

  if (strategies) {
    const strategyIds = new Set<string>()
    const runIds = new Set<string>()
    const linkedLeadIds = new Set<string>()
    strategies.forEach((strategy) => {
      const owner = `Strategy ${strategy.id || '(missing ID)'}`
      if (!strategy.id || strategyIds.has(strategy.id)) errors.push(`${owner} has a missing or duplicate stable ID.`)
      strategyIds.add(strategy.id)
      if (!strategy.label.trim() || !strategy.objective.trim() || !strategy.persona_summary.trim()) errors.push(`${owner} needs a label, objective, and persona summary.`)
      if (!Number.isInteger(strategy.version) || strategy.version < 1) errors.push(`${owner} version must be a positive integer.`)
      if (!isIsoInstant(strategy.created_at) || !isIsoInstant(strategy.updated_at)) errors.push(`${owner} needs valid created and updated timestamps.`)
      if (!STRATEGY_STATUSES.has(strategy.status)) errors.push(`${owner} has an invalid status.`)
      if (!RESOURCE_PRIORITIES.has(strategy.priority)) errors.push(`${owner} has an invalid priority.`)
      if (!STRATEGY_CADENCES.has(strategy.cadence)) errors.push(`${owner} has an invalid cadence.`)
      if (strategy.next_review_at && !isIsoDate(strategy.next_review_at)) errors.push(`${owner} has an invalid next-review date.`)
      if (!strategy.access_and_boundaries.length || !strategy.workflow_steps.length || !strategy.insights.what_worked.length || !strategy.insights.improvements.length) {
        errors.push(`${owner} needs boundaries, workflow steps, worked insights, and improvements.`)
      }
      if (strategy.time_allocation.reduce((sum, allocation) => sum + allocation.percent, 0) !== 100) errors.push(`${owner} time allocation must total 100 percent.`)
      strategy.source_artifacts.forEach((path) => {
        if (!path.trim() || path.startsWith('/') || path.split('/').includes('..')) errors.push(`${owner} source artifact ${path || '(empty)'} must be a safe repository-relative path.`)
      })
      if (!strategy.runs.length) errors.push(`${owner} needs at least one dated run.`)
      strategy.runs.forEach((run) => {
        const runOwner = `${owner} run ${run.id || '(missing ID)'}`
        if (!run.id || runIds.has(run.id)) errors.push(`${runOwner} has a missing or duplicate run ID.`)
        runIds.add(run.id)
        if (!run.batch_id.trim()) errors.push(`${runOwner} needs a batch ID.`)
        if (!isIsoInstant(run.created_at) || (run.completed_at && !isIsoInstant(run.completed_at)) || !isIsoDate(run.observed_on)) errors.push(`${runOwner} needs valid created, completed, and observed dates.`)
        if (!run.summary.trim()) errors.push(`${runOwner} needs a summary.`)
        if (new Set(run.lead_ids).size !== run.lead_ids.length) errors.push(`${runOwner} contains duplicate lead IDs.`)
        run.lead_ids.forEach((leadId) => {
          linkedLeadIds.add(leadId)
          const lead = leads.find((candidate) => candidate.id === leadId)
          if (!lead) return errors.push(`${runOwner} references missing lead ${leadId}.`)
          if (lead.discovery.strategy?.id !== strategy.id) errors.push(`${runOwner} lead ${leadId} does not point back to strategy ${strategy.id}.`)
          if (lead.discovery.strategy?.label !== strategy.label) errors.push(`${runOwner} lead ${leadId} does not use strategy label ${strategy.label}.`)
          if (lead.discovery.strategy?.batch_id !== run.batch_id) errors.push(`${runOwner} lead ${leadId} does not point back to batch ${run.batch_id}.`)
          if (lead.research.discovered_at !== run.observed_on) errors.push(`${runOwner} lead ${leadId} discovery date does not match ${run.observed_on}.`)
        })
      })
    })
    leads.filter((lead) => lead.discovery.strategy).forEach((lead) => {
      const strategy = strategies.find((candidate) => candidate.id === lead.discovery.strategy!.id)
      if (!strategy) return errors.push(`Lead ${lead.id} references missing strategy ${lead.discovery.strategy!.id}.`)
      const run = strategy.runs.find((candidate) => candidate.batch_id === lead.discovery.strategy!.batch_id)
      if (!run) errors.push(`Lead ${lead.id} references missing strategy run ${lead.discovery.strategy!.batch_id}.`)
      else if (!run.lead_ids.includes(lead.id)) errors.push(`Lead ${lead.id} is not listed in strategy run ${run.id}.`)
      if (!linkedLeadIds.has(lead.id)) errors.push(`Lead ${lead.id} is not connected from any strategy run.`)
    })
  }
  if (engagements) {
    const engagementLeadIds = new Set<string>()
    const eventIds = new Set<string>()
    engagements.forEach((engagement) => {
      const owner = `Engagement ${engagement.lead_id || '(missing lead ID)'}`
      if (!leadIds.has(engagement.lead_id)) errors.push(`${owner} references missing lead ${engagement.lead_id || '(empty)'}.`)
      if (engagementLeadIds.has(engagement.lead_id)) errors.push(`${owner} duplicates an engagement row for the same lead.`)
      engagementLeadIds.add(engagement.lead_id)
      if (!LEAD_ENGAGEMENT_STATUSES.includes(engagement.status)) errors.push(`${owner} has an invalid follow-up status.`)
      if (engagement.primary_channel !== null && !LEAD_ENGAGEMENT_CHANNELS.includes(engagement.primary_channel)) errors.push(`${owner} has an invalid channel.`)
      if (engagement.last_contact_at && !isIsoDate(engagement.last_contact_at)) errors.push(`${owner} has an invalid last-contact date.`)
      if (engagement.next_follow_up_at && !isIsoDate(engagement.next_follow_up_at)) errors.push(`${owner} has an invalid next-follow-up date.`)
      if (engagement.notes !== null && (typeof engagement.notes !== 'string' || !engagement.notes.trim())) errors.push(`${owner} notes must be non-empty text or null.`)
      engagement.events.forEach((event) => {
        if (!event.id || eventIds.has(event.id)) errors.push(`${owner} has a missing or duplicate activity ID ${event.id || '(empty)'}.`)
        eventIds.add(event.id)
        if (!isIsoDate(event.occurred_on)) errors.push(`${owner} activity ${event.id} has an invalid date.`)
        if (!LEAD_ENGAGEMENT_EVENT_KINDS.includes(event.kind)) errors.push(`${owner} activity ${event.id} has an invalid kind.`)
        if (!LEAD_ENGAGEMENT_CHANNELS.includes(event.channel)) errors.push(`${owner} activity ${event.id} has an invalid channel.`)
        if (!event.summary.trim()) errors.push(`${owner} activity ${event.id} needs a summary.`)
      })
      const findContactDetailKeys = (value: unknown, path = ''): string[] => {
        if (!value || typeof value !== 'object') return []
        if (Array.isArray(value)) return value.flatMap((item, index) => findContactDetailKeys(item, `${path}[${index}]`))
        return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => [
          ...(ENGAGEMENT_CONTACT_DETAIL_KEYS.has(key.toLowerCase()) ? [`${path ? `${path}.` : ''}${key}`] : []),
          ...findContactDetailKeys(item, `${path ? `${path}.` : ''}${key}`),
        ])
      }
      findContactDetailKeys(engagement).forEach((key) => errors.push(`${owner} contains prohibited contact-detail field ${key}.`))
    })
  }
  findProhibitedKeys({ leads, resources, strategies }).forEach((key) => errors.push(`Prohibited outreach/contact field found at ${key}.`))
  return errors
}
