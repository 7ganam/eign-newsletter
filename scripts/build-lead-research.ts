import { readFile, writeFile } from 'node:fs/promises'
import type {
  LeadBand,
  LeadLane,
  LeadResearchDimension,
  LeadResearchEvidence,
  LeadResearchResource,
  LeadResearchResourcesFile,
  LeadResearchStrategy,
  SaudiSoftwareLead,
  SaudiSoftwareLeadsFile,
} from '../src/leadResearchTypes'
import { bandForScore } from './lib/lead-research'
import {
  applyEvidencePublicationDates,
  buildEvidencePublicationDateAudit,
  type EvidencePublicationDateOverridesFile,
} from './lib/lead-evidence-publication-dates'
import { preserveLeadResearchRows } from './lib/preserve-lead-research'

type Worker = Record<string, any>
type SourceName = 'events-financing' | 'linkedin-community' | 'official-programs'
type CandidateEnvelope = { catalog: any[]; raw: any; source: SourceName; verified: any }

const HISTORICAL_STRATEGIES: Record<SourceName, LeadResearchStrategy> = {
  'official-programs': {
    id: 'official-program-cohort-first-v1',
    label: 'Official programs • Cohort-first',
    batch_id: 'official-programs-2026-09-03',
    method: 'official-program',
    access: 'public-web',
  },
  'events-financing': {
    id: 'events-financing-trigger-first-v1',
    label: 'Events & financing • Trigger-first',
    batch_id: 'events-financing-2026-09-03',
    method: 'event-financing-signal',
    access: 'public-web',
  },
  'linkedin-community': {
    id: 'linkedin-community-signal-first-v1',
    label: 'LinkedIn & community • Signal-first',
    batch_id: 'linkedin-community-2026-09-03',
    method: 'community-signal',
    access: 'public-linkedin',
  },
}

const ROOT = new URL('../', import.meta.url)
const WORKERS = new URL('../outputs/lead-research/workers/', import.meta.url)
const ASSETS = new URL('../assets/lead-research/', import.meta.url)
const TODAY = '2026-09-03'
const NEXT_REVIEW = '2026-12-02'

const readJson = async <Value>(url: URL) => JSON.parse(await readFile(url, 'utf8')) as Value
const optionalJson = async (name: string) => readJson<Worker>(new URL(name, WORKERS)).catch(() => null)
const slug = (value: string) => value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
const text = (...values: unknown[]) => values.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join(' ')
const unique = <Value>(values: Value[]) => [...new Set(values)]

const canonicalLinkedin = (value: string | null | undefined) => {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!url.hostname.endsWith('linkedin.com')) return url.toString()
    return `https://www.linkedin.com${url.pathname.replace(/\/$/, '')}`
  } catch { return null }
}

const cadenceFor = (value: unknown): LeadResearchResource['refresh_cadence'] => {
  const normalized = text(value).toLowerCase()
  if (normalized.includes('week') || normalized.includes('twice')) return 'weekly'
  if (normalized.includes('quarter')) return 'quarterly'
  if (normalized.includes('half')) return 'half-yearly'
  if (normalized.includes('annual') || normalized.includes('year')) return normalized.includes('event') || normalized.includes('cohort') || normalized.includes('demo') ? 'event-season' : 'yearly'
  if (normalized.includes('event') || normalized.includes('cohort') || normalized.includes('demo') || normalized.includes('application')) return 'event-season'
  return 'monthly'
}

const yieldFor = (value: unknown): LeadResearchResource['expected_yield'] => {
  if (value && typeof value === 'object') {
    const maximum = Number((value as Record<string, unknown>).maximum ?? 0)
    return maximum >= 8 ? 'high' : maximum >= 3 ? 'medium' : 'low'
  }
  const numbers = text(value).match(/\d+/g)?.map(Number) ?? []
  const maximum = Math.max(0, ...numbers)
  return maximum >= 8 ? 'high' : maximum >= 3 ? 'medium' : 'low'
}

const observedYield = (value: unknown) => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object') return Number((value as Record<string, unknown>).raw_candidates ?? (value as Record<string, unknown>).accepted_for_manual_verification ?? 0)
  return 0
}

const qualityFor = (value: unknown): LeadResearchEvidence['source_quality'] => {
  const normalized = text(value).toLowerCase()
  if (/first.party|official|founder|company|self.reported|person.controlled|professional.profile|program|government/.test(normalized)) return 'primary'
  if (/press|news|media|portfolio|trade|report/.test(normalized)) return 'credible-secondary'
  return 'discovery-only'
}

const normalizeEvidence = (ownerId: string, items: any[], ownResourceId: string | null = null) => {
  const seen = new Set<string>()
  return items.flatMap((item, index): LeadResearchEvidence[] => {
    const sourceUrl = item.source_url ?? item.url
    if (typeof sourceUrl !== 'string' || !sourceUrl.startsWith('https://') || seen.has(sourceUrl)) return []
    seen.add(sourceUrl)
    return [{
      id: `${ownerId}-e${index + 1}`,
      claim_key: item.claim_key ?? 'qualification',
      source_url: sourceUrl,
      source_title: item.source_title ?? item.title ?? new URL(sourceUrl).hostname,
      source_type: item.source_type ?? item.publisher_independence_group ?? item.source_quality ?? 'public-web',
      resource_id: ownResourceId,
      published_at: /^\d{4}-\d{2}-\d{2}$/.test(item.published_at ?? '') ? item.published_at : null,
      observed_at: /^\d{4}-\d{2}-\d{2}$/.test(item.observed_at ?? '') ? item.observed_at : TODAY,
      source_quality: item.source_quality === 'primary' || item.source_quality === 'credible-secondary' || item.source_quality === 'discovery-only'
        ? item.source_quality
        : qualityFor(item.source_quality),
      confidence: ['high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'medium',
      summary: item.summary ?? item.paraphrase ?? item.paraphrased_evidence ?? item.reason ?? 'Public source retained for qualification verification.',
    }]
  })
}

const resourceBase = (input: any, resourceType: LeadResearchResource['resource_type'], classification: LeadResearchResource['classification']): LeadResearchResource => {
  const id = input.id
  const sourceUrl = input.primary_url ?? input.url
  const evidence = normalizeEvidence(id, input.evidence ?? [], id)
  return {
    id,
    name: input.name,
    resource_type: resourceType,
    geography: Array.isArray(input.geography) ? input.geography.join(' · ') : input.geography ?? 'Saudi Arabia',
    url: sourceUrl,
    linkedin_url: sourceUrl.includes('linkedin.com/') ? canonicalLinkedin(sourceUrl) : null,
    access_level: text(input.access_level).includes('login') ? 'free-login' : text(input.access_level).includes('gated') ? 'partially-gated' : 'public',
    discovery_method: text(input.discovery_method, input.harvest_instructions, input.harvesting_instructions),
    refresh_cadence: cadenceFor(input.cadence ?? input.refresh_cadence),
    priority: ['high', 'medium', 'low'].includes(input.priority) ? input.priority : 'medium',
    expected_yield: yieldFor(input.expected_yield),
    candidates_found: observedYield(input.observed_yield),
    accepted_leads: 0,
    classification,
    status: ['active', 'monitor', 'unavailable', 'retired'].includes(input.status) ? input.status : 'active',
    last_checked_at: input.last_checked_at ?? input.last_checked_date ?? input.last_checked ?? TODAY,
    why_useful: input.future_usefulness ?? text(input.expected_yield, input.notes),
    notes: input.notes ?? null,
    evidence,
  }
}

const buildResources = (official: Worker, events: Worker, linkedin: Worker) => {
  const rows: LeadResearchResource[] = official.resources.map((resource: any) => resourceBase(resource, 'program-incubator', 'accepted'))
  for (const resource of events.resources) {
    if (resource.id === 'biban-ewc') {
      rows.push(resourceBase({ ...resource, name: 'Entrepreneurship World Cup Global Finals' }, 'event-cohort', 'accepted'))
      rows.push(resourceBase({
        id: 'biban-forum',
        name: 'Biban Forum startup and SME programme',
        url: 'https://my.gov.sa/en/events/1240833',
        access_level: 'public',
        geography: 'Riyadh, Saudi Arabia',
        discovery_method: 'Review the official programme, Startup Door, pitching stages, exhibitor announcements, and post-event reports for named Saudi founders and SMEs; verify each on a first-party source.',
        harvest_instructions: 'Check monthly from August through November, then once after the event for competition winners, launch announcements, and digital-solution exhibitors.',
        priority: 'high',
        cadence: 'event season',
        expected_yield: '5-15 named candidates per edition',
        observed_yield: 0,
        last_checked_at: TODAY,
        status: 'active',
        notes: 'Separate from the EWC finalist roster so future researchers can harvest Biban exhibitors and pitch stages independently.',
        evidence: [
          { url: 'https://my.gov.sa/en/events/1240833', source_title: 'Biban Forum 2025', source_quality: 'official_government_event', confidence: 'high', observed_at: TODAY, published_at: '2025-11-07', paraphrase: 'The Saudi National Portal identifies Monsha’at as organizer and confirms the Riyadh event dates and entrepreneurship focus.' },
          { url: 'https://www.spa.gov.sa/en/N2419767', source_title: 'Biban 2025 Forum to Feature Six Zones Highlighting the Future of E-commerce', source_quality: 'official_government_news', confidence: 'high', observed_at: TODAY, published_at: '2025-10-13', paraphrase: 'Saudi Press Agency describes named e-commerce zones for marketplaces, digital solutions, payments, emerging technology, and product development.' },
        ],
      }, 'event-cohort', 'accepted'))
      continue
    }
    const normalizedResource = resource.id === 'money20-middle-east-startups'
      ? { ...resource, primary_url: 'https://money2020middleeast.com/exhibitor/2025-exhibitors-list', url: 'https://money2020middleeast.com/exhibitor/2025-exhibitors-list' }
      : resource
    const eventIds = new Set(['leap-rocket-fuel', 'money20-middle-east-startups', 'launchx-riyadh', 'project-startup-sa'])
    const classification: LeadResearchResource['classification'] = resource.id === 'arab-news-startups' || resource.id === 'project-startup-sa' ? 'useful' : 'accepted'
    rows.push(resourceBase(normalizedResource, eventIds.has(resource.id) ? 'event-cohort' : 'funding-portfolio-news', classification))
  }
  rows.push(resourceBase({
    id: 'startsmart-saudi-2026',
    name: 'StartSmart Saudi Arabia finalist teams',
    url: 'https://www.startsmartsaudi.com/sites/default/files/2026-02/teams_1.pdf',
    access_level: 'public',
    geography: 'Saudi Arabia',
    discovery_method: 'Review the official finalist-team roster and current StartSmart Saudi announcements for named creators of pre-company digital products, then verify identity and authority on first-party professional profiles.',
    priority: 'high',
    cadence: 'annual event season',
    expected_yield: '3-8 named pre-company teams per edition',
    observed_yield: 3,
    last_checked_at: TODAY,
    status: 'active',
    notes: 'High-yield current roster for founder-equivalent project creators before formal incorporation.',
    evidence: [
      { url: 'https://www.startsmartsaudi.com/sites/default/files/2026-02/teams_1.pdf', source_title: 'StartSmart Saudi Arabia 2026 finalist teams', source_quality: 'official_program_roster', confidence: 'high', observed_at: TODAY, published_at: '2026-02-01', paraphrase: 'The official roster names current Saudi finalist teams and their project creators.' },
      { url: 'https://www.linkedin.com/posts/startsmartsaudi_through-community-jameel-saudis-support-activity-7409953622043557888-pAmo', source_title: 'StartSmart Saudi finalist selection announcement', source_quality: 'official_program_post', confidence: 'high', observed_at: TODAY, published_at: '2026-01-16', paraphrase: 'The official program account confirms selection activity for the current Saudi cohort.' },
    ],
  }, 'event-cohort', 'accepted'))
  rows.push(...linkedin.resources.map((resource: any) => resourceBase(resource, 'linkedin-community', 'accepted')))

  const seedRegistry = linkedin.seed_classification.map((seed: any) => ({
    id: seed.id,
    provided_url: seed.provided_url,
    canonical_url: seed.canonical_url,
    classification: seed.classification,
    ...(seed.duplicate_of ? { duplicate_of: seed.duplicate_of } : {}),
    observed_title: seed.observed_title,
    reason: seed.reason,
    observed_at: seed.observed_at,
  }))
  rows.push(...linkedin.seed_classification.map((seed: any): LeadResearchResource => ({
    id: `user-${seed.id}`,
    name: `User seed · ${seed.observed_title}`,
    resource_type: 'linkedin-community',
    geography: 'Unrestricted discovery seed; Saudi relevance must be verified per candidate',
    url: seed.canonical_url,
    linkedin_url: canonicalLinkedin(seed.canonical_url),
    access_level: 'free-login',
    discovery_method: 'Retain the supplied URL as a research seed. Use only its documented classification and verify any named candidate independently before qualification.',
    refresh_cadence: seed.classification === 'useful' ? 'quarterly' : 'half-yearly',
    priority: seed.classification === 'useful' ? 'medium' : 'low',
    expected_yield: 'low',
    candidates_found: 0,
    accepted_leads: 0,
    classification: seed.classification,
    status: seed.classification === 'duplicate' ? 'retired' : 'monitor',
    last_checked_at: seed.observed_at,
    why_useful: seed.reason,
    notes: seed.duplicate_of ? `Duplicate of ${seed.duplicate_of}.` : 'User-supplied seed retained verbatim in seed_registry; URL here is canonicalized.',
    evidence: normalizeEvidence(`user-${seed.id}`, [{
      url: seed.canonical_url,
      source_title: seed.observed_title,
      source_quality: seed.source_quality,
      confidence: seed.confidence,
      observed_at: seed.observed_at,
      published_at: seed.published_at,
      paraphrase: seed.reason,
    }], `user-${seed.id}`),
  })))
  return { rows, seedRegistry }
}

const candidateId = (envelope: CandidateEnvelope) => envelope.verified.candidate_id ?? envelope.verified.source_candidate_id ?? envelope.verified.id
const rawName = (raw: any) => raw?.person?.name ?? raw?.identity?.person_name ?? raw?.name ?? null
const rawCompany = (raw: any) => typeof raw?.company === 'string' ? raw.company : raw?.company?.name ?? null

const scorePart = (verified: any, key: string) => verified.score?.[key] ?? verified.qualification?.[key] ?? {}
const scoreValue = (part: any) => Number(part.value ?? part.score ?? 0)
const scoreRefs = (part: any) => Array.isArray(part.evidence_refs) ? part.evidence_refs : []

const collectRefs = (verified: any) => {
  const dimensions = ['product_intent', 'outsourcing_likelihood', 'budget_readiness', 'timing', 'penalties']
  const gateObjects = [verified.active_gates, verified.gate_review].filter(Boolean)
  return unique([
    ...(verified.evidence_refs ?? []),
    ...dimensions.flatMap((key) => scoreRefs(scorePart(verified, key))),
    ...gateObjects.flatMap((gates) => Object.values(gates).flatMap((gate: any) => gate?.evidence_refs ?? [])),
  ])
}

const evidenceForCandidate = (envelope: CandidateEnvelope) => {
  const ownerId = `lead-${slug(candidateId(envelope))}`
  const refs = collectRefs(envelope.verified)
  const catalog = envelope.catalog.filter((item) => refs.includes(item.id) || refs.includes(item.url))
  const rawEvidence = envelope.raw?.evidence ?? []
  const ownEvidence = envelope.verified.evidence ?? []
  const all = [...ownEvidence, ...catalog, ...rawEvidence]
  const known = new Set(all.map((item) => item.id ?? item.evidence_id ?? item.url))
  const primaryUrls = new Set(envelope.verified.verification_sources?.primary ?? [])
  for (const ref of refs) {
    if (known.has(ref) || typeof ref !== 'string' || !ref.startsWith('https://')) continue
    all.push({
      id: ref,
      url: ref,
      source_title: new URL(ref).hostname,
      source_quality: primaryUrls.has(ref) ? 'primary' : 'credible-secondary',
      confidence: 'medium',
      observed_at: TODAY,
      paraphrase: 'Verification source retained from the independent evidence review.',
    })
  }
  const evidence = normalizeEvidence(ownerId, all)
  const refToId = new Map<string, string>()
  for (let index = 0; index < all.length; index += 1) {
    const item = all[index]
    const sourceUrl = item.url ?? item.source_url
    const normalized = evidence.find((entry) => entry.source_url === sourceUrl)
    if (!normalized) continue
    for (const ref of [item.id, item.evidence_id, sourceUrl]) if (typeof ref === 'string') refToId.set(ref, normalized.id)
  }
  return { evidence, refToId }
}

const levelFor = (score: number, maximum: number, summary: string): LeadResearchDimension['level'] => {
  if (/unknown|not disclosed|not established/i.test(summary) || (score <= 1 && maximum > 1)) return 'unknown'
  if (score === 0) return 'refuted'
  if (score === maximum) return 'confirmed'
  return score >= Math.ceil(maximum / 2) ? 'probable' : 'possible'
}

const lifecycleFor = (value: string): SaudiSoftwareLead['company']['lifecycle_stage'] => {
  const normalized = value.toLowerCase()
  if (normalized.includes('pre-company') || normalized.includes('precompany')) return 'precompany'
  if (normalized.includes('idea') || normalized.includes('concept')) return 'idea'
  if (normalized.includes('build') || normalized.includes('application') || normalized.includes('pre_mvp') || normalized.includes('mvp_roadmap')) return 'building'
  if (normalized.includes('pilot') || normalized.includes('beta') || normalized.includes('validation')) return 'beta'
  if (normalized.includes('operating') || normalized.includes('scale')) return 'operating'
  if (normalized.includes('launch') || normalized.includes('live') || normalized.includes('funded') || normalized.includes('mvp')) return 'launched'
  return 'unknown'
}

const productTypesFor = (value: string): SaudiSoftwareLead['company']['product_types'] => {
  const normalized = value.toLowerCase()
  const types: SaudiSoftwareLead['company']['product_types'] = []
  if (/mobile|\bapp\b/.test(normalized)) types.push('mobile-app')
  if (/marketplace/.test(normalized)) types.push('marketplace')
  if (/platform|portal|dashboard|website|web /.test(normalized)) types.push('web-platform')
  if (/operations|workflow|compliance|inventory|erp|internal/.test(normalized)) types.push('internal-software')
  return types.length ? unique(types) : ['other']
}

const makeLead = (envelope: CandidateEnvelope): SaudiSoftwareLead => {
  const verified = envelope.verified
  const raw = envelope.raw ?? verified
  const name = verified.person?.name ?? verified.identity?.display_name ?? verified.name ?? rawName(raw)
  const companyName = verified.company?.name ?? verified.company ?? rawCompany(raw)
  const role = verified.person?.decision_role ?? verified.identity?.role ?? raw?.person?.decision_role ?? raw?.identity?.role ?? raw?.buying_authority ?? 'Founder / owner'
  const linkedinUrl = canonicalLinkedin(verified.person?.linkedin_url ?? verified.identity?.linkedin_url ?? verified.personal_linkedin_url ?? raw?.person?.linkedin_url ?? raw?.identity?.linkedin_url ?? raw?.personal_linkedin_url)
  const companyUrl = verified.company?.url ?? raw?.company?.url ?? (verified.company?.domain ? `https://${verified.company.domain}` : raw?.company_domain ? `https://${raw.company_domain}` : null)
  const companyLinkedin = canonicalLinkedin(verified.company_linkedin_url ?? raw?.company?.linkedin_url)
  const productStage = text(verified.product_stage, raw?.product_stage, raw?.initiative?.stage)
  const productSummary = text(raw?.software_use_case, raw?.product_building_signal, raw?.initiative?.description, verified.product_stage) || 'Evidence-backed custom software initiative.'
  const saudiSummary = text(raw?.saudi_basis, raw?.saudi_market_basis)
  const behaviorSummary = text(raw?.timing_signal, raw?.timing, raw?.product_building_signal, raw?.initiative?.description, raw?.funding_award_traction, raw?.budget_traction)
  const { evidence, refToId } = evidenceForCandidate(envelope)
  const fallbackEvidence = evidence.map((item) => item.id)
  const dimension = (key: string, maximum: number): LeadResearchDimension => {
    const part = scorePart(verified, key)
    let score = Math.max(0, Math.min(maximum, scoreValue(part)))
    const capacity = text(verified.technical_capacity?.state, verified.capacity_status, raw?.technical_capacity?.state, raw?.technical_team_signal)
    if (key === 'outsourcing_likelihood' && /unknown/i.test(capacity) && score > 1) score = 1
    const summary = part.reason ?? 'No stronger evidence was available in the verification pass.'
    const evidenceIds = unique(scoreRefs(part).map((ref: string) => refToId.get(ref)).filter(Boolean)) as string[]
    return { score, level: levelFor(score, maximum, summary), summary, evidence_ids: evidenceIds.length ? evidenceIds : fallbackEvidence.slice(0, 1) }
  }
  const productIntent = dimension('product_intent', 6)
  const outsourcingLikelihood = dimension('outsourcing_likelihood', 5)
  const budgetReadiness = dimension('budget_readiness', 5)
  const timing = dimension('timing', 4)
  const penaltyPart = scorePart(verified, 'penalties')
  const penalty = Math.max(0, Math.min(8, scoreValue(penaltyPart)))
  const negativeSignals = penalty ? [{
    id: /internal|team|capacity/i.test(penaltyPart.reason ?? '') ? 'sufficient-internal-team-risk' : 'evidence-backed-fit-penalty',
    points: penalty,
    summary: penaltyPart.reason ?? 'Evidence-backed fit penalty from the verification pass.',
    evidence_ids: unique(scoreRefs(penaltyPart).map((ref: string) => refToId.get(ref)).filter(Boolean)) as string[],
  }] : []
  const positiveScore = productIntent.score + outsourcingLikelihood.score + budgetReadiness.score + timing.score
  const totalScore = Math.max(0, Math.min(20, positiveScore - penalty))
  const band = bandForScore(totalScore)
  const lane: LeadLane = verified.canonical_lane ?? verified.lane ?? (envelope.source === 'official-programs' ? 'new-founder' : raw?.discovery_lane === 'sme_digital_product' ? 'sme-digital-build' : 'new-founder')
  const resourceIds = unique([
    ...(raw?.resource_ids ?? []).filter((id: unknown): id is string => typeof id === 'string'),
    ...(envelope.source === 'linkedin-community' ? ['lr-linkedin-intent-search'] : []),
  ]) as string[]
  const city = /jeddah/i.test(saudiSummary) ? 'Jeddah' : /riyadh/i.test(saudiSummary) ? 'Riyadh' : /khobar/i.test(saudiSummary) ? 'Al Khobar' : /madinah|medina/i.test(saudiSummary) ? 'Madinah' : null
  const id = `lead-${slug(companyName || name)}-${slug(name)}`
  return {
    id,
    identity: {
      display_name: name,
      linkedin_url: linkedinUrl,
      current_title: role,
      current_organization: companyName,
      identity_status: 'verified',
      identity_confidence: evidence.length >= 2 ? 'high' : 'medium',
      evidence_ids: fallbackEvidence,
    },
    company: {
      name: companyName,
      website_url: companyUrl,
      linkedin_url: companyLinkedin,
      city,
      saudi_basis: /headquarter|based in|riyadh|jeddah|khobar|madinah|medina|\.sa\b/i.test(text(saudiSummary, companyUrl)) ? 'hq-based' : 'operations-based',
      founder_role_started_at: null,
      founded_at: raw?.company?.founded_year ? String(raw.company.founded_year) : null,
      linkedin_employee_band: raw?.company?.employee_band ?? null,
      sector: null,
      lifecycle_stage: lifecycleFor(productStage),
      product_types: productTypesFor(productSummary),
      product_summary: productSummary,
      existing_product_urls: unique([companyUrl, ...(raw?.company?.existing_product_urls ?? [])].filter(Boolean)) as string[],
      evidence_ids: fallbackEvidence,
    },
    discovery: {
      strategy: structuredClone(HISTORICAL_STRATEGIES[envelope.source]),
      lane,
      resource_ids: resourceIds,
      public_behavior_tags: unique([...(raw?.observed_behavior ?? []), lifecycleFor(productStage), raw?.funding_award_traction ? 'accelerator-or-funding-activity' : '', raw?.timing || raw?.timing_signal ? 'dated-product-signal' : ''].filter(Boolean)),
      behavioral_summary: behaviorSummary || productSummary,
      discovery_note: `Qualified in the ${envelope.source} verification stream. Public professional evidence only.`,
    },
    qualification: {
      ksa_fit: 'confirmed',
      decision_authority: 'confirmed',
      software_fit: 'confirmed',
      product_intent: productIntent,
      outsourcing_likelihood: outsourcingLikelihood,
      budget_readiness: budgetReadiness,
      timing,
      negative_signals: negativeSignals,
      positive_score: positiveScore,
      penalty,
      total_score: totalScore,
      band,
      qualification_confidence: evidence.length >= 2 && evidence.some((item) => item.source_quality === 'primary') ? 'high' : 'medium',
      manually_reviewed_at: TODAY,
    },
    research: {
      status: band === 'A' || band === 'B' ? 'qualified' : 'watchlist',
      discovered_at: TODAY,
      last_researched_at: TODAY,
      next_review_at: NEXT_REVIEW,
      notes: null,
    },
    evidence,
  }
}

const envelopesFor = (source: SourceName, rawWorker: Worker, verifiedWorkers: Array<Worker | null>) => {
  const rawById = new Map((rawWorker.candidates ?? []).map((candidate: any) => [candidate.id, candidate]))
  return verifiedWorkers.flatMap((worker): CandidateEnvelope[] => {
    if (!worker) return []
    const catalog = [...(worker.evidence_catalog ?? []), ...(worker.additional_evidence ?? [])]
    return (worker.promoted ?? []).map((verified: any) => ({
      catalog: [...catalog, ...(verified.evidence ?? [])],
      raw: rawById.get(verified.candidate_id ?? verified.source_candidate_id ?? verified.id) ?? verified,
      source,
      verified,
    }))
  })
}

const dedupeAndSelect = (envelopes: CandidateEnvelope[]) => {
  const built = envelopes.map((envelope) => ({ envelope, lead: makeLead(envelope) }))
    .filter(({ lead }) => lead.qualification.band !== 'D')
    .sort((left, right) => right.lead.qualification.total_score - left.lead.qualification.total_score || left.lead.id.localeCompare(right.lead.id))
  const seenLinkedin = new Set<string>()
  const seenDomain = new Set<string>()
  const seenIdentity = new Set<string>()
  const deduped: typeof built = []
  const duplicates: typeof built = []
  for (const item of built) {
    const linkedin = item.lead.identity.linkedin_url?.toLowerCase() ?? null
    const domain = item.lead.company.website_url ? new URL(item.lead.company.website_url).hostname.replace(/^www\./, '').toLowerCase() : null
    const identity = `${item.lead.identity.display_name.toLowerCase()}|${item.lead.company.name?.toLowerCase() ?? ''}`
    if ((linkedin && seenLinkedin.has(linkedin)) || (domain && seenDomain.has(domain)) || seenIdentity.has(identity)) duplicates.push(item)
    else {
      if (linkedin) seenLinkedin.add(linkedin)
      if (domain) seenDomain.add(domain)
      seenIdentity.add(identity)
      deduped.push(item)
    }
  }
  const targets: Record<LeadLane, number> = { 'new-founder': 30, 'stealth-or-precompany': 10, 'sme-digital-build': 10 }
  const selected = (Object.keys(targets) as LeadLane[]).flatMap((lane) => deduped.filter(({ lead }) => lead.discovery.lane === lane).slice(0, targets[lane]))
  return { built, deduped, duplicates, selected }
}

const main = async () => {
  const [officialRaw, eventsRaw, linkedinRaw, officialVerified, eventsVerified, linkedinVerified, officialWave2, eventsWave2, linkedinWave2, officialWave3, eventsWave3, linkedinWave3, publicationDateOverrides] = await Promise.all([
    readJson<Worker>(new URL('official-programs.json', WORKERS)),
    readJson<Worker>(new URL('events-financing.json', WORKERS)),
    readJson<Worker>(new URL('linkedin-community.json', WORKERS)),
    readJson<Worker>(new URL('official-programs-verified.json', WORKERS)),
    readJson<Worker>(new URL('events-financing-verified.json', WORKERS)),
    readJson<Worker>(new URL('linkedin-community-verified.json', WORKERS)),
    optionalJson('official-programs-wave2.json'),
    optionalJson('events-financing-wave2.json'),
    optionalJson('linkedin-community-wave2.json'),
    optionalJson('official-programs-wave3.json'),
    optionalJson('events-financing-wave3.json'),
    optionalJson('linkedin-community-wave3.json'),
    readJson<EvidencePublicationDateOverridesFile>(new URL('evidence-publication-date-overrides.json', ASSETS)),
  ])
  const { rows: resources, seedRegistry } = buildResources(officialRaw, eventsRaw, linkedinRaw)
  const envelopes = [
    ...envelopesFor('official-programs', officialRaw, [officialVerified, officialWave2, officialWave3]),
    ...envelopesFor('events-financing', eventsRaw, [eventsVerified, eventsWave2, eventsWave3]),
    ...envelopesFor('linkedin-community', linkedinRaw, [linkedinVerified, linkedinWave2, linkedinWave3]),
  ]
  const { built, duplicates, selected } = dedupeAndSelect(envelopes)
  const rows = selected.map(({ lead }) => lead)
  const laneCounts = Object.fromEntries(['new-founder', 'stealth-or-precompany', 'sme-digital-build'].map((lane) => [lane, rows.filter((lead) => lead.discovery.lane === lane).length]))
  if (rows.length !== 50) throw new Error(`Qualified dataset is incomplete: ${JSON.stringify(laneCounts)} (${rows.length}/50). No canonical files were overwritten.`)
  const acceptedResourceIds = new Set(resources.filter((resource) => resource.classification === 'accepted').map((resource) => resource.id))
  const resourceByUrl = new Map(resources.filter((resource) => resource.classification === 'accepted').map((resource) => [resource.url, resource.id]))
  rows.forEach((lead) => {
    const inferred = lead.evidence.flatMap((item) => resourceByUrl.get(item.source_url) ?? [])
    lead.discovery.resource_ids = unique([...lead.discovery.resource_ids.filter((id) => acceptedResourceIds.has(id)), ...inferred])
    lead.evidence.forEach((item) => { item.resource_id = resourceByUrl.get(item.source_url) ?? null })
  })
  resources.forEach((resource) => { resource.accepted_leads = rows.filter((lead) => lead.discovery.resource_ids.includes(resource.id)).length })

  const selectedKeys = new Set(selected.map(({ envelope }) => `${envelope.source}:${candidateId(envelope)}`))
  type ArchiveInput = { dispositionHint?: 'held' | 'rejected'; raw: any; source: SourceName; sourceFile: string }
  const archiveInputs = new Map<string, ArchiveInput>()
  const addArchiveInput = (source: SourceName, sourceFile: string, raw: any, dispositionHint?: ArchiveInput['dispositionHint']) => {
    const id = raw?.candidate_id ?? raw?.source_candidate_id ?? raw?.id
    if (typeof id !== 'string' || !id) return
    archiveInputs.set(`${source}:${id}`, { dispositionHint, raw, source, sourceFile })
  }
  const collectWorkerArchive = (source: SourceName, sourceFile: string, worker: Worker | null) => {
    if (!worker) return
    for (const raw of worker.promoted ?? []) addArchiveInput(source, sourceFile, raw)
    for (const key of ['unresolved', 'holds', 'held'] as const) for (const raw of worker[key] ?? []) addArchiveInput(source, sourceFile, raw, 'held')
    for (const raw of worker.rejected ?? []) addArchiveInput(source, sourceFile, raw, 'rejected')
  }
  for (const raw of officialRaw.candidates) addArchiveInput('official-programs', 'official-programs.json', raw)
  for (const raw of eventsRaw.candidates) addArchiveInput('events-financing', 'events-financing.json', raw)
  for (const raw of linkedinRaw.candidates) addArchiveInput('linkedin-community', 'linkedin-community.json', raw)
  collectWorkerArchive('official-programs', 'official-programs-verified.json', officialVerified)
  collectWorkerArchive('official-programs', 'official-programs-wave2.json', officialWave2)
  collectWorkerArchive('official-programs', 'official-programs-wave3.json', officialWave3)
  collectWorkerArchive('events-financing', 'events-financing-verified.json', eventsVerified)
  collectWorkerArchive('events-financing', 'events-financing-wave2.json', eventsWave2)
  collectWorkerArchive('events-financing', 'events-financing-wave3.json', eventsWave3)
  collectWorkerArchive('linkedin-community', 'linkedin-community-verified.json', linkedinVerified)
  collectWorkerArchive('linkedin-community', 'linkedin-community-wave2.json', linkedinWave2)
  collectWorkerArchive('linkedin-community', 'linkedin-community-wave3.json', linkedinWave3)
  const duplicateKeys = new Set(duplicates.map(({ envelope }) => `${envelope.source}:${candidateId(envelope)}`))
  const builtKeys = new Set(built.map(({ envelope }) => `${envelope.source}:${candidateId(envelope)}`))
  const researchArchive: NonNullable<SaudiSoftwareLeadsFile['research_archive']> = [...archiveInputs.values()].flatMap(({ dispositionHint, raw, source, sourceFile }) => {
    const sourceCandidateId = raw.candidate_id ?? raw.source_candidate_id ?? raw.id
    const key = `${source}:${sourceCandidateId}`
    if (selectedKeys.has(key)) return []
    const disposition = duplicateKeys.has(key) ? 'duplicate' : dispositionHint ?? (/reject|low.fit|refuted/i.test(text(raw.research_state, raw.fit_assessment?.status)) ? 'rejected' : 'held')
    const exactGaps = [
      ...(Array.isArray(raw.exact_gaps) ? raw.exact_gaps : []),
      ...(Array.isArray(raw.missing_gates) ? raw.missing_gates : []),
      ...(Array.isArray(raw.missing_requirements) ? raw.missing_requirements : []),
      ...(Array.isArray(raw.limitations) ? raw.limitations : []),
    ].filter((value): value is string => typeof value === 'string')
    const reason = duplicateKeys.has(key)
      ? 'Duplicate company or verified founder identity; the stronger canonical record was retained.'
      : builtKeys.has(key)
        ? 'Passed evidence gates but fell outside the fixed lane quota after score ordering.'
        : text(raw.reason, raw.why_not_promoted, raw.fit_assessment?.reason, ...exactGaps, raw.research_state) || 'Did not clear the active-lead evidence gates in verification.'
    const rawLane = raw.canonical_lane ?? raw.lane ?? raw.discovery_lane
    const proposedLane: LeadLane | null = rawLane === 'new-founder' || rawLane === 'stealth-or-precompany' || rawLane === 'sme-digital-build'
      ? rawLane
      : rawLane === 'sme_digital_product'
        ? 'sme-digital-build'
        : rawLane === 'stealth_pre_company'
          ? 'stealth-or-precompany'
          : source === 'official-programs' ? 'new-founder' : null
    return [{
      id: `archive-${source}-${slug(sourceCandidateId)}`,
      display_name: rawName(raw),
      company_name: rawCompany(raw),
      proposed_lane: proposedLane,
      disposition,
      reason,
      missing_gates: exactGaps,
      source_file: `outputs/lead-research/workers/${sourceFile}`,
      source_candidate_id: sourceCandidateId,
    }]
  })
  // Read current edits late, after historical quota checks and accepted-resource yield calculations.
  // A malformed/unreadable existing file must abort, not be treated as an empty first build.
  const existingLeads = await readJson<SaudiSoftwareLeadsFile>(new URL('saudi-software-leads.json', ASSETS)).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  if (existingLeads !== undefined && (!existingLeads || existingLeads.schema_version !== 'saudi-software-leads.v1' || !Array.isArray(existingLeads.rows))) {
    throw new Error('Cannot preserve lead research: invalid existing leads file. No canonical files were overwritten.')
  }
  const preservedRows = preserveLeadResearchRows(rows, existingLeads?.rows ?? [])
  applyEvidencePublicationDates(preservedRows, publicationDateOverrides)
  applyEvidencePublicationDates(resources, publicationDateOverrides)
  const publicationDateAudit = buildEvidencePublicationDateAudit(preservedRows, resources, publicationDateOverrides)
  const resourcesFile: LeadResearchResourcesFile = { schema_version: 'saudi-lead-resources.v1', generated_at: new Date().toISOString(), rows: resources, seed_registry: seedRegistry }
  const leadsFile: SaudiSoftwareLeadsFile = { schema_version: 'saudi-software-leads.v1', generated_at: new Date().toISOString(), rows: preservedRows, research_archive: researchArchive }
  await Promise.all([
    writeFile(new URL('saudi-lead-resources.json', ASSETS), `${JSON.stringify(resourcesFile, null, 2)}\n`, 'utf8'),
    writeFile(new URL('saudi-software-leads.json', ASSETS), `${JSON.stringify(leadsFile, null, 2)}\n`, 'utf8'),
    writeFile(new URL('evidence-publication-date-audit.json', new URL('../outputs/lead-research/', import.meta.url)), `${JSON.stringify({
      schema_version: 'lead-evidence-publication-date-audit.v1',
      generated_at: new Date().toISOString(),
      checked_at: publicationDateOverrides.checked_at,
      stats: {
        unique_urls: publicationDateAudit.length,
        evidence_occurrences: publicationDateAudit.reduce((sum, row) => sum + row.occurrences, 0),
        dated_urls: publicationDateAudit.filter((row) => row.published_at).length,
        undated_living_urls: publicationDateAudit.filter((row) => row.status === 'not-applicable').length,
        unavailable_exact_date_urls: publicationDateAudit.filter((row) => row.status === 'unavailable').length,
      },
      rows: publicationDateAudit,
    }, null, 2)}\n`, 'utf8'),
  ])
  console.log(JSON.stringify({ acceptedResources: resources.filter((resource) => resource.classification === 'accepted').length, archive: researchArchive.length, lanes: laneCounts, historicalLeads: rows.length, preservedStrategyLeads: preservedRows.length - rows.length, leads: preservedRows.length, resources: resources.length }, null, 2))
}

void main()
