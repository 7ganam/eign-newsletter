import type { LeadResearchStrategy, SaudiSoftwareLead } from './leadResearchTypes'

export const LINKEDIN_INTENT_STRATEGY_ID = 'linkedin-intent-first-v1'
export const LINKEDIN_INTENT_STRATEGY_LABEL = 'LinkedIn • Intent-first'
export type LeadStrategyFilter = 'all' | 'legacy' | LeadResearchStrategy['id']

export const readLeadStrategyFilter = (params: URLSearchParams): LeadStrategyFilter => {
  const value = params.get('strategy')
  return value && /^[a-z0-9][a-z0-9-]*$/i.test(value) ? value : 'all'
}

export const setLeadStrategyFilter = (params: URLSearchParams, value: LeadStrategyFilter) => {
  if (value === 'all') params.delete('strategy')
  else params.set('strategy', value)
}

export const matchesLeadStrategy = (lead: SaudiSoftwareLead, value: LeadStrategyFilter) => value === 'all'
  || (value === 'legacy' ? !lead.discovery.strategy : lead.discovery.strategy?.id === value)

const isCount = (value: unknown) => value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0)

/** Validate optional research metadata without turning missing evidence into a positive fact. */
export const leadStrategyMetadataErrors = (lead: SaudiSoftwareLead): string[] => {
  const errors: string[] = []
  const strategy = lead.discovery.strategy
  const review = lead.qualification.persona_review
  if (strategy !== undefined) {
    if (!strategy || typeof strategy !== 'object') errors.push('Strategy must be an object.')
    else {
      if (typeof strategy.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/i.test(strategy.id)) errors.push('Strategy ID must be a stable slug.')
      if (typeof strategy.label !== 'string' || !strategy.label.trim()) errors.push('Strategy label is required.')
      if (typeof strategy.batch_id !== 'string' || !strategy.batch_id.trim()) errors.push('Strategy batch ID is required.')
      if (!['direct-request', 'current-cohort', 'official-program', 'event-financing-signal', 'community-signal'].includes(strategy.method)) errors.push('Strategy method is invalid.')
      if (!['logged-in-linkedin', 'public-linkedin', 'public-web'].includes(strategy.access)) errors.push('Strategy access is invalid.')
    }
  }
  if (review !== undefined) {
    if (!review || typeof review !== 'object') errors.push('Persona review must be an object.')
    else {
      if (!['needs-verification', 'confirmed-fit', 'not-a-fit'].includes(review.status)) errors.push('Persona review status is invalid.')
      if (!['unbuilt', 'prototype', 'built', 'unknown'].includes(review.core_product)) errors.push('Core product state is invalid.')
      if (!isCount(review.software_builders_min) || !isCount(review.software_builders_max)) errors.push('Software builder bounds must be non-negative integers or null.')
      if (typeof review.software_builders_min === 'number' && typeof review.software_builders_max === 'number' && review.software_builders_min > review.software_builders_max) errors.push('Software builder minimum exceeds maximum.')
      if (!Array.isArray(review.missing_checks) || review.missing_checks.some((check) => typeof check !== 'string' || !check.trim())) errors.push('Missing checks must be a list of non-empty descriptions.')
      if (typeof review.summary !== 'string' || !review.summary.trim()) errors.push('Persona review needs a summary.')
    }
  }
  return errors
}

/** Persona fit is independent of commercial scores or the editable workflow status. */
export const leadPersonaBlockers = (lead: SaudiSoftwareLead): string[] => {
  if (!lead.qualification.persona_review) return []
  const errors = leadStrategyMetadataErrors(lead)
  const review = lead.qualification.persona_review
  if (!review) return errors
  if (review.status !== 'confirmed-fit') errors.push('Persona fit must be confirmed before qualification.')
  if (review.core_product !== 'unbuilt') errors.push('Confirm that the core product is unbuilt; prototype alone is insufficient.')
  if (!Number.isInteger(review.software_builders_min) || !Number.isInteger(review.software_builders_max)
    || review.software_builders_min === null || review.software_builders_max === null
    || review.software_builders_min < 0 || review.software_builders_min > review.software_builders_max || review.software_builders_max > 2) errors.push('A supported software-builder range of zero to two is required.')
  if (!Array.isArray(review.missing_checks) || review.missing_checks.length) errors.push('Resolve all missing persona checks before qualification.')
  if (lead.identity.identity_status !== 'verified') errors.push('Identity must be verified.')
  if (lead.qualification.ksa_fit !== 'confirmed') errors.push('Saudi-market relevance must be confirmed.')
  if (lead.qualification.decision_authority !== 'confirmed') errors.push('Decision authority must be confirmed.')
  if (lead.qualification.software_fit !== 'confirmed') errors.push('Software need must be confirmed.')
  for (const key of ['core_product', 'software_builders']) {
    if (!lead.evidence.some((item) => item.claim_key === key && item.source_quality === 'primary' && item.summary.trim() && item.observed_at && item.source_url.startsWith('https://'))) errors.push(`Primary ${key.replace('_', ' ')} evidence is required.`)
  }
  return errors
}

/** Shared by validation, the status editor and PATCH; metadata cannot bypass qualification. */
export const leadQualificationBlockers = (lead: SaudiSoftwareLead): string[] => {
  const errors = leadPersonaBlockers(lead)
  if (!lead.qualification.persona_review) return errors
  const qualification = lead.qualification
  const dimensions = [
    [qualification.product_intent.score, 6],
    [qualification.outsourcing_likelihood.score, 5],
    [qualification.budget_readiness.score, 5],
    [qualification.timing.score, 4],
  ] as const
  if (dimensions.some(([score, maximum]) => !Number.isInteger(score) || score < 0 || score > maximum)
    || qualification.negative_signals.some((signal) => !Number.isInteger(signal.points))) errors.push('Qualification scores and penalties must be valid integers within the scoring limits.')
  const positive = dimensions.reduce((sum, [score]) => sum + score, 0)
  const penalty = Math.min(8, qualification.negative_signals.reduce((sum, signal) => sum + Math.abs(signal.points), 0))
  const total = Math.max(0, Math.min(20, positive - penalty))
  const band = total >= 15 ? 'A' : total >= 10 ? 'B' : total >= 5 ? 'C' : 'D'
  if (qualification.positive_score !== positive || qualification.penalty !== penalty || qualification.total_score !== total || qualification.band !== band) errors.push('Recompute the qualification score and band before qualification.')
  if (band === 'D') errors.push('D-band records may remain research candidates but cannot be marked qualified.')
  if (band === 'A' || band === 'B') {
    if (lead.qualification.persona_review) {
      // Different URLs or formats from the same author are not independent publishers.
      const attributed = lead.evidence.filter((item) => typeof item.publisher_id === 'string' && item.publisher_id.trim())
      const publishers = new Set(attributed.map((item) => item.publisher_id!.trim().normalize('NFKC').toLowerCase()))
      if (publishers.size < 2 || new Set(attributed.map((item) => item.source_url)).size < 2
        || !attributed.some((item) => item.source_quality === 'primary')) errors.push('A/B qualification requires two known independent publisher IDs and source URLs, including a primary-source publisher. Unknown publishers do not count.')
    } else if (new Set(lead.evidence.map((item) => item.source_url)).size < 2
      || new Set(lead.evidence.map((item) => item.source_type)).size < 2
      || !lead.evidence.some((item) => item.source_quality === 'primary')) errors.push('A/B qualification requires two source URLs and source types, including a primary source.')
  }
  return errors
}

export const isLeadResearchCandidate = (lead: SaudiSoftwareLead) => Boolean(lead.qualification.persona_review)
  && (lead.research.status !== 'qualified' || leadQualificationBlockers(lead).length > 0)

export const personaReviewLabel = (lead: SaudiSoftwareLead) => {
  const review = lead.qualification.persona_review
  if (!review) return null
  if (review.status === 'not-a-fit') return 'Not a fit'
  return review.status === 'confirmed-fit' && leadPersonaBlockers(lead).length === 0 ? 'Confirmed fit' : 'Needs verification'
}

export const leadResearchStatusLabel = (lead: SaudiSoftwareLead) => lead.qualification.persona_review && lead.research.status === 'review-required'
  ? 'Needs verification'
  : lead.research.status.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

/** A trading business can still have an unbuilt core app; never substitute business lifecycle. */
export const leadCoreProductLabel = (lead: SaudiSoftwareLead): string | null => {
  if (!lead.qualification.persona_review) return null
  return {
    unbuilt: 'Core app unbuilt',
    prototype: 'Prototype — verify functionality',
    built: 'Core app built',
    unknown: 'Core app unverified',
  }[lead.qualification.persona_review?.core_product ?? 'unknown']
}
