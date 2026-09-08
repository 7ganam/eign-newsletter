import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import type { LeadEngagementsFile, LeadResearchPersona, LeadResearchResourcesFile, LeadResearchStrategiesFile, SaudiSoftwareLead, SaudiSoftwareLeadsFile } from '../../src/leadResearchTypes'
import { isLeadResearchCandidate, leadCoreProductLabel, leadQualificationBlockers, leadResearchStatusLabel, LINKEDIN_INTENT_STRATEGY_ID, LINKEDIN_INTENT_STRATEGY_LABEL, matchesLeadStrategy, personaReviewLabel, readLeadStrategyFilter, setLeadStrategyFilter } from '../../src/leadResearchStrategy'
import { bandForScore, validateLeadResearch } from './lead-research'

const loadJson = async <Value>(path: string) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')) as Value

const loadValidationData = async () => {
  const [persona, leads, resources] = await Promise.all([
    loadJson<LeadResearchPersona>('../../assets/lead-research/saudi-lead-persona.json'),
    loadJson<SaudiSoftwareLeadsFile>('../../assets/lead-research/saudi-software-leads.json'),
    loadJson<LeadResearchResourcesFile>('../../assets/lead-research/saudi-lead-resources.json'),
  ])
  return { persona, leads: leads.rows.filter((lead) => !lead.qualification.persona_review), resources: resources.rows }
}

const candidateFrom = (original: SaudiSoftwareLead): SaudiSoftwareLead => {
  const lead = structuredClone(original)
  lead.id = 'test-intent-research-candidate'
  lead.identity.display_name = 'Research candidate'
  lead.identity.linkedin_url = 'https://www.linkedin.com/in/test-intent-research-candidate'
  lead.identity.identity_status = 'unresolved'
  lead.company.website_url = null
  lead.company.lifecycle_stage = 'unknown'
  lead.discovery.strategy = { id: LINKEDIN_INTENT_STRATEGY_ID, label: LINKEDIN_INTENT_STRATEGY_LABEL, batch_id: 'test-batch', method: 'direct-request', access: 'logged-in-linkedin' }
  lead.qualification.persona_review = { status: 'needs-verification', core_product: 'unknown', software_builders_min: null, software_builders_max: null, missing_checks: ['Confirm current product and team'], summary: 'A possible first-product request needs verification.' }
  lead.qualification.ksa_fit = 'unknown'
  lead.qualification.decision_authority = 'unknown'
  lead.qualification.software_fit = 'unknown'
  for (const key of ['product_intent', 'outsourcing_likelihood', 'budget_readiness', 'timing'] as const) {
    lead.qualification[key] = { score: 0, level: 'unknown', summary: 'Not yet verified.', evidence_ids: [] }
  }
  lead.qualification.negative_signals = []
  lead.qualification.positive_score = 0
  lead.qualification.penalty = 0
  lead.qualification.total_score = 0
  lead.qualification.band = 'D'
  lead.research.status = 'review-required'
  return lead
}

test('lead score bands cover the complete 0-20 range', () => {
  assert.equal(bandForScore(0), 'D')
  assert.equal(bandForScore(5), 'C')
  assert.equal(bandForScore(10), 'B')
  assert.equal(bandForScore(15), 'A')
  assert.equal(bandForScore(20), 'A')
})

test('Saudi lead research datasets satisfy the research contract', async () => {
  const [persona, leads, resources, strategies, engagements] = await Promise.all([
    loadJson<LeadResearchPersona>('../../assets/lead-research/saudi-lead-persona.json'),
    loadJson<SaudiSoftwareLeadsFile>('../../assets/lead-research/saudi-software-leads.json'),
    loadJson<LeadResearchResourcesFile>('../../assets/lead-research/saudi-lead-resources.json'),
    loadJson<LeadResearchStrategiesFile>('../../assets/lead-research/saudi-lead-strategies.json'),
    loadJson<LeadEngagementsFile>('../../assets/lead-research/saudi-lead-engagements.json'),
  ])
  assert.deepEqual(validateLeadResearch({ persona, leads: leads.rows, resources: resources.rows, strategies: strategies.rows, engagements: engagements.rows }), [])
  assert.equal(resources.seed_registry?.length, 21, 'every supplied URL occurrence must remain in the seed registry')
  assert.ok(resources.seed_registry?.every((seed) => ['useful', 'low-signal', 'duplicate', 'rejected'].includes(seed.classification)))
  assert.ok((leads.research_archive?.length ?? 0) > 0, 'held, rejected, and duplicate candidates must remain auditable')
  assert.ok(!leads.rows.some((lead) => lead.identity.linkedin_url?.includes('abdulrahman-aljohani-11b2881b4')), 'the known customer must remain persona-only')
})

test('engagement storage rejects unknown leads and contact-detail fields', async () => {
  const data = await loadValidationData()
  const engagement = {
    lead_id: 'missing-lead',
    status: 'not-contacted' as const,
    primary_channel: null,
    last_contact_at: null,
    next_follow_up_at: null,
    notes: null,
    events: [],
    phone_number: '+000000000',
  }
  const errors = validateLeadResearch({ ...data, engagements: [engagement] })
  assert.ok(errors.some((error) => error.includes('references missing lead')))
  assert.ok(errors.some((error) => error.includes('contact-detail field')))
})

test('strategy runs and tagged leads retain exact bidirectional provenance', async () => {
  const [persona, leads, resources, strategies] = await Promise.all([
    loadJson<LeadResearchPersona>('../../assets/lead-research/saudi-lead-persona.json'),
    loadJson<SaudiSoftwareLeadsFile>('../../assets/lead-research/saudi-software-leads.json'),
    loadJson<LeadResearchResourcesFile>('../../assets/lead-research/saudi-lead-resources.json'),
    loadJson<LeadResearchStrategiesFile>('../../assets/lead-research/saudi-lead-strategies.json'),
  ])
  const data = { persona, leads: leads.rows, resources: resources.rows, strategies: strategies.rows }
  const missingLead = structuredClone(data)
  missingLead.strategies[0].runs[0].lead_ids.pop()
  assert.ok(validateLeadResearch(missingLead).some((error) => error.includes('is not listed in strategy run')))
  const wrongBatch = structuredClone(data)
  wrongBatch.leads.find((lead) => lead.discovery.strategy)!.discovery.strategy!.batch_id = 'wrong-batch'
  assert.ok(validateLeadResearch(wrongBatch).some((error) => error.includes('does not point back to batch')))
  const missingStrategy = structuredClone(data)
  missingStrategy.strategies = []
  assert.ok(validateLeadResearch(missingStrategy).some((error) => error.includes('references missing strategy')))
})

test('tagged research holds can extend the legacy dataset without invented qualification or score requirements', async () => {
  const data = await loadValidationData()
  const candidate = candidateFrom(data.leads[0])
  assert.deepEqual(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }), [])
  assert.equal(isLeadResearchCandidate(candidate), true)
  assert.equal(personaReviewLabel(candidate), 'Needs verification')
  assert.equal(leadResearchStatusLabel(candidate), 'Needs verification')
  assert.ok(leadQualificationBlockers(candidate).length > 0)
  const legacyInvalid = structuredClone(data)
  legacyInvalid.leads[0].identity.identity_status = 'unresolved'
  assert.ok(validateLeadResearch(legacyInvalid).some((error) => error.includes('identity is not verified')))
  assert.ok(validateLeadResearch({ ...data, leads: data.leads.slice(1) }).some((error) => error.includes('Expected 50 historical baseline leads')))
})

test('strategy metadata and qualified status cannot bypass persona gates', async () => {
  const data = await loadValidationData()
  const candidate = candidateFrom(data.leads[0])
  candidate.research.status = 'qualified'
  assert.ok(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }).some((error) => error.includes('Persona fit must be confirmed')))
  candidate.research.status = 'review-required'
  candidate.qualification.persona_review!.software_builders_min = 3
  candidate.qualification.persona_review!.software_builders_max = 1
  assert.ok(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }).some((error) => error.includes('minimum exceeds maximum')))
  candidate.discovery.strategy!.batch_id = ''
  assert.ok(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }).some((error) => error.includes('batch ID is required')))
})

test('qualification requires explicitly unbuilt product and primary product/team evidence', async () => {
  const data = await loadValidationData()
  const candidate = candidateFrom(data.leads[0])
  candidate.identity.identity_status = 'verified'
  candidate.qualification.ksa_fit = 'confirmed'
  candidate.qualification.decision_authority = 'confirmed'
  candidate.qualification.software_fit = 'confirmed'
  candidate.qualification.persona_review = { status: 'confirmed-fit', core_product: 'unbuilt', software_builders_min: 1, software_builders_max: 2, missing_checks: [], summary: 'Current direct evidence supports the unbuilt product and complete team range.' }
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('Primary core product evidence')))
  candidate.evidence.push(...(['core_product', 'software_builders'] as const).map((claim) => ({ ...candidate.evidence[0], id: `test-${claim}`, claim_key: claim, source_quality: 'primary' as const, summary: `Direct statement supporting ${claim}.` })))
  candidate.qualification.product_intent.score = 4
  candidate.qualification.budget_readiness.score = 1
  candidate.qualification.positive_score = 5
  candidate.qualification.total_score = 5
  candidate.qualification.band = 'C'
  assert.deepEqual(leadQualificationBlockers(candidate), [])
  assert.equal(personaReviewLabel(candidate), 'Confirmed fit')
  candidate.qualification.persona_review.core_product = 'prototype'
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('prototype alone is insufficient')))
  candidate.qualification.persona_review.core_product = 'unbuilt'
  candidate.qualification.persona_review.software_builders_max = 3
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('zero to two')))
})

test('qualified status cannot bypass recomputed score, D-band exclusion or A/B source policy', async () => {
  const data = await loadValidationData()
  const candidate = candidateFrom(data.leads[0])
  candidate.identity.identity_status = 'verified'
  candidate.qualification.ksa_fit = 'confirmed'
  candidate.qualification.decision_authority = 'confirmed'
  candidate.qualification.software_fit = 'confirmed'
  candidate.qualification.persona_review = { status: 'confirmed-fit', core_product: 'unbuilt', software_builders_min: 0, software_builders_max: 1, missing_checks: [], summary: 'Verified unbuilt product and complete small team.' }
  candidate.evidence.push(...(['core_product', 'software_builders'] as const).map((claim) => ({ ...candidate.evidence[0], id: `guard-${claim}`, claim_key: claim, source_quality: 'primary' as const, summary: `Direct statement supporting ${claim}.` })))
  assert.equal(personaReviewLabel(candidate), 'Confirmed fit')
  assert.deepEqual(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }), [], 'A D-band persona-fit hold remains valid research data')
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('D-band records')))
  candidate.research.status = 'qualified'
  assert.ok(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }).some((error) => error.includes('D-band records')))
  candidate.qualification.product_intent.score = 6
  candidate.qualification.timing.score = 4
  candidate.qualification.positive_score = 10
  candidate.qualification.total_score = 10
  candidate.qualification.band = 'B'
  candidate.evidence.forEach((item) => { item.source_url = 'https://example.com/single-source'; item.source_type = 'founder-profile' })
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('A/B qualification requires two')))
  assert.ok(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }).some((error) => error.includes('A/B qualification requires two')))
  candidate.qualification.total_score = 15
  candidate.qualification.band = 'A'
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('Recompute')))
})

test('strategy filtering round-trips while retaining other URL parameters and unattributed fallback behavior', async () => {
  const data = await loadValidationData()
  const historical = data.leads[0]
  const candidate = candidateFrom(historical)
  const unattributed = structuredClone(historical)
  delete unattributed.discovery.strategy
  const params = new URLSearchParams('view=leads&q=app&keep=user-value&lane=new-founder')
  setLeadStrategyFilter(params, LINKEDIN_INTENT_STRATEGY_ID)
  assert.equal(readLeadStrategyFilter(new URLSearchParams(params.toString())), LINKEDIN_INTENT_STRATEGY_ID)
  assert.equal(params.get('keep'), 'user-value')
  assert.equal(params.get('q'), 'app')
  assert.equal(matchesLeadStrategy(candidate, LINKEDIN_INTENT_STRATEGY_ID), true)
  assert.equal(matchesLeadStrategy(historical, LINKEDIN_INTENT_STRATEGY_ID), false)
  assert.equal(matchesLeadStrategy(unattributed, 'legacy'), true)
  assert.equal(isLeadResearchCandidate(historical), false)
  assert.equal(personaReviewLabel(historical), null)
  setLeadStrategyFilter(params, 'all')
  assert.equal(params.has('strategy'), false)
  assert.equal(params.get('keep'), 'user-value')
})

test('tagged A/B requires known independent publishers, not a same-author profile and post', async () => {
  const data = await loadValidationData()
  const candidate = candidateFrom(data.leads[0])
  candidate.identity.identity_status = 'verified'
  candidate.qualification.ksa_fit = 'confirmed'
  candidate.qualification.decision_authority = 'confirmed'
  candidate.qualification.software_fit = 'confirmed'
  candidate.qualification.persona_review = { status: 'confirmed-fit', core_product: 'unbuilt', software_builders_min: 0, software_builders_max: 1, missing_checks: [], summary: 'Verified first build and complete team.' }
  candidate.qualification.product_intent.score = 6
  candidate.qualification.timing.score = 4
  candidate.qualification.positive_score = 10
  candidate.qualification.total_score = 10
  candidate.qualification.band = 'B'
  candidate.evidence.forEach((item) => { delete item.publisher_id })
  candidate.evidence.push(...(['core_product', 'software_builders'] as const).map((claim, index) => ({ ...candidate.evidence[0], id: `publisher-${claim}`, claim_key: claim, source_quality: 'primary' as const, source_type: 'founder-post', source_url: `https://example.com/founder/${index}`, summary: `Direct statement supporting ${claim}.` })))
  assert.deepEqual(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }), [], 'Unknown publisher IDs do not invalidate a research hold')
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('known independent publisher IDs')))
  candidate.research.status = 'qualified'
  assert.ok(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }).some((error) => error.includes('known independent publisher IDs')))
  candidate.evidence.forEach((item, index) => { item.publisher_id = index % 2 ? 'founder:test' : ' FOUNDER:TEST '; item.source_type = index % 2 ? 'founder-post' : 'founder-profile' })
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('known independent publisher IDs')), 'Different URLs/types and casing do not create publisher independence')
  candidate.evidence.forEach((item) => { item.publisher_id = 'publisher:company'; item.source_type = 'official-announcement' })
  candidate.evidence[0].publisher_id = 'publisher:independent-program'
  assert.deepEqual(leadQualificationBlockers(candidate), [], 'Independent publishers may publish the same source type')
  assert.deepEqual(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }), [], 'The legacy source-type rule must not override the new publisher-level rule')
  candidate.evidence.forEach((item, index) => { item.publisher_id = item.source_quality === 'primary' ? null : `publisher:secondary-${index}` })
  assert.ok(leadQualificationBlockers(candidate).some((error) => error.includes('primary-source publisher')))
  candidate.research.status = 'review-required'
  candidate.evidence[0].publisher_id = ' '
  assert.ok(validateLeadResearch({ ...data, leads: [...data.leads, candidate] }).some((error) => error.includes('publisher ID must be a non-empty string or null')))
})

test('tagged product stage does not infer a built app from an operating business', async () => {
  const data = await loadValidationData()
  const candidate = candidateFrom(data.leads[0])
  candidate.company.lifecycle_stage = 'operating'
  assert.equal(leadCoreProductLabel(candidate), 'Core app unverified')
  candidate.qualification.persona_review!.core_product = 'unbuilt'
  assert.equal(leadCoreProductLabel(candidate), 'Core app unbuilt')
  candidate.qualification.persona_review!.core_product = 'prototype'
  assert.equal(leadCoreProductLabel(candidate), 'Prototype — verify functionality')
  assert.equal(leadCoreProductLabel(data.leads[0]), null, 'Legacy rendering stays unchanged')
})
