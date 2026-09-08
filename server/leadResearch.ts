import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isLeadResearchCandidate, leadPersonaBlockers, leadQualificationBlockers } from '../src/leadResearchStrategy'
import { addLeadEngagementEvent, emptyLeadEngagement, LEAD_ENGAGEMENT_CHANNELS, LEAD_ENGAGEMENT_EVENT_KINDS, LEAD_ENGAGEMENT_STATUSES } from '../src/leadEngagement'
import type {
  LeadBand,
  LeadLane,
  LeadResearchPersona,
  LeadResearchResource,
  LeadResearchResourcesFile,
  LeadResearchResponse,
  SaudiSoftwareLead,
  SaudiSoftwareLeadsFile,
  LeadResearchStrategiesFile,
  LeadResearchStrategyRecord,
  LeadEngagement,
  LeadEngagementEvent,
  LeadEngagementsFile,
} from '../src/leadResearchTypes'

const SERVER_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(SERVER_DIR, '..')
const PERSONA_FILE = resolve(PROJECT_ROOT, 'assets/lead-research/saudi-lead-persona.json')
const RESOURCES_FILE = resolve(PROJECT_ROOT, 'assets/lead-research/saudi-lead-resources.json')
const LEADS_FILE = resolve(PROJECT_ROOT, 'assets/lead-research/saudi-software-leads.json')
const STRATEGIES_FILE = resolve(PROJECT_ROOT, 'assets/lead-research/saudi-lead-strategies.json')
const ENGAGEMENTS_FILE = resolve(PROJECT_ROOT, 'assets/lead-research/saudi-lead-engagements.json')

const LEAD_STATUSES = new Set(['new', 'identity-pending', 'researching', 'review-required', 'qualified', 'watchlist', 'rejected', 'needs-refresh'])
const RESOURCE_PRIORITIES = new Set(['high', 'medium', 'low'])
const RESOURCE_CADENCES = new Set(['weekly', 'event-season', 'monthly', 'quarterly', 'half-yearly', 'yearly'])
const RESOURCE_STATUSES = new Set(['active', 'monitor', 'unavailable', 'retired'])
const STRATEGY_STATUSES = new Set(['active', 'testing', 'paused', 'retired'])
const STRATEGY_PRIORITIES = new Set(['high', 'medium', 'low'])
const STRATEGY_CADENCES = new Set(['twice-weekly', 'weekly', 'monthly', 'ad-hoc'])

const parseFile = async <Value>(path: string) => JSON.parse(await readFile(path, 'utf8')) as Value

const loadFiles = async () => {
  const [persona, leads, resources, strategies, engagements] = await Promise.all([
    parseFile<LeadResearchPersona>(PERSONA_FILE),
    parseFile<SaudiSoftwareLeadsFile>(LEADS_FILE),
    parseFile<LeadResearchResourcesFile>(RESOURCES_FILE),
    parseFile<LeadResearchStrategiesFile>(STRATEGIES_FILE),
    parseFile<LeadEngagementsFile>(ENGAGEMENTS_FILE),
  ])
  if (persona.schema_version !== 'saudi-lead-persona.v1') throw new Error('The Saudi lead persona schema is unsupported.')
  if (leads.schema_version !== 'saudi-software-leads.v1') throw new Error('The Saudi leads schema is unsupported.')
  if (resources.schema_version !== 'saudi-lead-resources.v1') throw new Error('The Saudi lead resources schema is unsupported.')
  if (strategies.schema_version !== 'saudi-lead-strategies.v1') throw new Error('The Saudi lead strategies schema is unsupported.')
  if (engagements.schema_version !== 'saudi-lead-engagements.v1') throw new Error('The Saudi lead engagements schema is unsupported.')
  return { engagements, leads, persona, resources, strategies }
}

const countBy = <Key extends string>(keys: readonly Key[], values: Key[]) => Object.fromEntries(
  keys.map((key) => [key, values.filter((value) => value === key).length]),
) as Record<Key, number>

const leadResearchStats = (leads: SaudiSoftwareLead[], resources: LeadResearchResource[], strategies: LeadResearchStrategyRecord[], engagements: LeadEngagement[]): LeadResearchResponse['stats'] => {
  const today = new Date().toISOString().slice(0, 10)
  const scoredLeads = leads.filter((lead) => !isLeadResearchCandidate(lead))
  const acceptedResources = resources.filter((resource) => resource.classification === 'accepted')
  const resourceTypes = Object.fromEntries([...new Set(acceptedResources.map((resource) => resource.resource_type))]
    .map((type) => [type, acceptedResources.filter((resource) => resource.resource_type === type).length]))
  const statuses = Object.fromEntries([...new Set(leads.map((lead) => lead.research.status))]
    .map((status) => [status, leads.filter((lead) => lead.research.status === status).length]))
  const verificationStates = Object.fromEntries([...new Set(leads.map((lead) => lead.identity.identity_status))]
    .map((status) => [status, leads.filter((lead) => lead.identity.identity_status === status).length]))
  return {
    acceptedResources: acceptedResources.length,
    acceptedLeadYieldBySource: Object.fromEntries(acceptedResources.map((resource) => [resource.id, resource.accepted_leads])),
    bands: countBy<LeadBand>(['A', 'B', 'C', 'D'], scoredLeads.map((lead) => lead.qualification.band)),
    lanes: countBy<LeadLane>(['new-founder', 'stealth-or-precompany', 'sme-digital-build'], leads.map((lead) => lead.discovery.lane)),
    leads: leads.length,
    resourceTypes,
    resources: resources.length,
    staleLeads: leads.filter((lead) => Boolean(lead.research.next_review_at && lead.research.next_review_at < today)).length,
    statuses,
    verificationStates,
    researchCandidates: leads.filter(isLeadResearchCandidate).length,
    confirmedStrategyFits: leads.filter((lead) => lead.qualification.persona_review?.status === 'confirmed-fit' && leadPersonaBlockers(lead).length === 0).length,
    strategies: strategies.length,
    strategyRuns: strategies.reduce((total, strategy) => total + strategy.runs.length, 0),
    strategyLinkedLeads: new Set(strategies.flatMap((strategy) => strategy.runs.flatMap((run) => run.lead_ids))).size,
    engagementStatuses: countBy(LEAD_ENGAGEMENT_STATUSES, engagements.map((engagement) => engagement.status)),
    followUpsDue: engagements.filter((engagement) => engagement.status === 'follow-up-due'
      || Boolean(engagement.next_follow_up_at && engagement.next_follow_up_at <= today && !['closed', 'not-interested'].includes(engagement.status))).length,
  }
}

const hydrateEngagements = (leads: SaudiSoftwareLead[], stored: LeadEngagement[]) => {
  const byLeadId = new Map(stored.map((engagement) => [engagement.lead_id, engagement]))
  return leads.map((lead) => byLeadId.get(lead.id) ?? emptyLeadEngagement(lead.id))
}

export const loadLeadResearch = async (): Promise<LeadResearchResponse> => {
  const { engagements, leads, persona, resources, strategies } = await loadFiles()
  const hydratedEngagements = hydrateEngagements(leads.rows, engagements.rows)
  return {
    generatedAt: [persona.updated_at, leads.generated_at, resources.generated_at, strategies.generated_at, engagements.generated_at].sort().at(-1) ?? persona.updated_at,
    engagements: hydratedEngagements,
    leads: leads.rows,
    persona,
    resources: resources.rows,
    strategies: strategies.rows,
    schemaVersion: 'lead-research.v1',
    stats: leadResearchStats(leads.rows, resources.rows, strategies.rows, hydratedEngagements),
  }
}

const cleanNullableText = (value: unknown, label: string) => {
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new Error(`${label} must be text or empty.`)
  const cleaned = value.trim()
  if (cleaned.length > 5_000) throw new Error(`${label} is too long.`)
  return cleaned || null
}

const cleanRequiredText = (value: unknown, label: string, maximum = 2_000) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  const cleaned = value.trim()
  if (cleaned.length > maximum) throw new Error(`${label} is too long.`)
  return cleaned
}

const cleanDate = (value: unknown, label: string) => {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${label} must be a YYYY-MM-DD date or empty.`)
  }
  return value
}

const writeJsonAtomic = async (path: string, value: unknown) => {
  const tempPath = `${path}.${process.pid}.tmp`
  try {
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(tempPath, path)
  } catch (error) {
    await unlink(tempPath).catch(() => undefined)
    throw error
  }
}

let leadWriteQueue = Promise.resolve()
export const saveLeadResearchLeadCell = async (leadId: string, field: string, value: unknown) => {
  let saved: SaudiSoftwareLead | undefined
  const operation = leadWriteQueue.then(async () => {
    const file = await parseFile<SaudiSoftwareLeadsFile>(LEADS_FILE)
    if (file.schema_version !== 'saudi-software-leads.v1') throw new Error('The Saudi leads schema is unsupported.')
    const rowIndex = file.rows.findIndex((row) => row.id === leadId)
    if (rowIndex < 0) return
    const row = structuredClone(file.rows[rowIndex])
    if (field === 'research.status') {
      if (typeof value !== 'string' || !LEAD_STATUSES.has(value)) throw new Error('Research status is invalid.')
      if (value === 'qualified') {
        const blockers = leadQualificationBlockers(row)
        if (blockers.length) throw new Error(`This candidate needs verification before qualification: ${blockers.join(' ')}`)
      }
      row.research.status = value as SaudiSoftwareLead['research']['status']
    } else if (field === 'research.notes') {
      row.research.notes = cleanNullableText(value, 'Research notes')
    } else if (field === 'research.next_review_at') {
      row.research.next_review_at = cleanDate(value, 'Next review')
    } else {
      throw new Error('That lead field is read-only.')
    }
    file.rows[rowIndex] = row
    file.generated_at = new Date().toISOString()
    await writeJsonAtomic(LEADS_FILE, file)
    saved = row
  })
  leadWriteQueue = operation.catch(() => undefined)
  await operation
  return saved
}

let resourceWriteQueue = Promise.resolve()
export const saveLeadResearchResourceCell = async (resourceId: string, field: string, value: unknown) => {
  let saved: LeadResearchResource | undefined
  const operation = resourceWriteQueue.then(async () => {
    const file = await parseFile<LeadResearchResourcesFile>(RESOURCES_FILE)
    if (file.schema_version !== 'saudi-lead-resources.v1') throw new Error('The Saudi lead resources schema is unsupported.')
    const rowIndex = file.rows.findIndex((row) => row.id === resourceId)
    if (rowIndex < 0) return
    const row = structuredClone(file.rows[rowIndex])
    if (field === 'priority') {
      if (typeof value !== 'string' || !RESOURCE_PRIORITIES.has(value)) throw new Error('Resource priority is invalid.')
      row.priority = value as LeadResearchResource['priority']
    } else if (field === 'refresh_cadence') {
      if (typeof value !== 'string' || !RESOURCE_CADENCES.has(value)) throw new Error('Refresh cadence is invalid.')
      row.refresh_cadence = value as LeadResearchResource['refresh_cadence']
    } else if (field === 'status') {
      if (typeof value !== 'string' || !RESOURCE_STATUSES.has(value)) throw new Error('Resource status is invalid.')
      row.status = value as LeadResearchResource['status']
    } else if (field === 'notes') {
      row.notes = cleanNullableText(value, 'Resource notes')
    } else if (field === 'last_checked_at') {
      const checkedAt = cleanDate(value, 'Last checked')
      if (!checkedAt) throw new Error('Last checked cannot be empty.')
      row.last_checked_at = checkedAt
    } else {
      throw new Error('That resource field is read-only.')
    }
    file.rows[rowIndex] = row
    file.generated_at = new Date().toISOString()
    await writeJsonAtomic(RESOURCES_FILE, file)
    saved = row
  })
  resourceWriteQueue = operation.catch(() => undefined)
  await operation
  return saved
}

let strategyWriteQueue = Promise.resolve()
export const saveLeadResearchStrategyCell = async (strategyId: string, field: string, value: unknown) => {
  let saved: LeadResearchStrategyRecord | undefined
  const operation = strategyWriteQueue.then(async () => {
    const file = await parseFile<LeadResearchStrategiesFile>(STRATEGIES_FILE)
    if (file.schema_version !== 'saudi-lead-strategies.v1') throw new Error('The Saudi lead strategies schema is unsupported.')
    const rowIndex = file.rows.findIndex((row) => row.id === strategyId)
    if (rowIndex < 0) return
    const row = structuredClone(file.rows[rowIndex])
    if (field === 'status') {
      if (typeof value !== 'string' || !STRATEGY_STATUSES.has(value)) throw new Error('Strategy status is invalid.')
      row.status = value as LeadResearchStrategyRecord['status']
    } else if (field === 'priority') {
      if (typeof value !== 'string' || !STRATEGY_PRIORITIES.has(value)) throw new Error('Strategy priority is invalid.')
      row.priority = value as LeadResearchStrategyRecord['priority']
    } else if (field === 'cadence') {
      if (typeof value !== 'string' || !STRATEGY_CADENCES.has(value)) throw new Error('Strategy cadence is invalid.')
      row.cadence = value as LeadResearchStrategyRecord['cadence']
    } else if (field === 'next_review_at') {
      row.next_review_at = cleanDate(value, 'Next review')
    } else if (field === 'notes') {
      row.notes = cleanNullableText(value, 'Strategy notes')
    } else {
      throw new Error('That strategy field is read-only.')
    }
    row.updated_at = new Date().toISOString()
    file.rows[rowIndex] = row
    file.generated_at = row.updated_at
    await writeJsonAtomic(STRATEGIES_FILE, file)
    saved = row
  })
  strategyWriteQueue = operation.catch(() => undefined)
  await operation
  return saved
}

const ensureLeadExists = async (leadId: string) => {
  const leads = await parseFile<SaudiSoftwareLeadsFile>(LEADS_FILE)
  return leads.schema_version === 'saudi-software-leads.v1' && leads.rows.some((lead) => lead.id === leadId)
}

let engagementWriteQueue = Promise.resolve()
const mutateLeadEngagement = async (leadId: string, mutate: (engagement: LeadEngagement) => LeadEngagement) => {
  let saved: LeadEngagement | undefined
  const operation = engagementWriteQueue.then(async () => {
    if (!await ensureLeadExists(leadId)) return
    const file = await parseFile<LeadEngagementsFile>(ENGAGEMENTS_FILE)
    if (file.schema_version !== 'saudi-lead-engagements.v1') throw new Error('The Saudi lead engagements schema is unsupported.')
    const rowIndex = file.rows.findIndex((row) => row.lead_id === leadId)
    const current = rowIndex < 0 ? emptyLeadEngagement(leadId) : structuredClone(file.rows[rowIndex])
    const updated = mutate(current)
    saved = updated
    if (rowIndex < 0) file.rows.push(updated)
    else file.rows[rowIndex] = updated
    file.generated_at = new Date().toISOString()
    await writeJsonAtomic(ENGAGEMENTS_FILE, file)
  })
  engagementWriteQueue = operation.catch(() => undefined)
  await operation
  return saved
}

export const saveLeadEngagementCell = async (leadId: string, field: string, value: unknown) => mutateLeadEngagement(leadId, (engagement) => {
  if (field === 'status') {
    if (typeof value !== 'string' || !LEAD_ENGAGEMENT_STATUSES.includes(value as LeadEngagement['status'])) throw new Error('Follow-up status is invalid.')
    return { ...engagement, status: value as LeadEngagement['status'] }
  }
  if (field === 'primary_channel') {
    if (value !== null && value !== '' && (typeof value !== 'string' || !LEAD_ENGAGEMENT_CHANNELS.includes(value as NonNullable<LeadEngagement['primary_channel']>))) throw new Error('Engagement channel is invalid.')
    return { ...engagement, primary_channel: value === '' ? null : value as LeadEngagement['primary_channel'] }
  }
  if (field === 'last_contact_at') return { ...engagement, last_contact_at: cleanDate(value, 'Last contact') }
  if (field === 'next_follow_up_at') return { ...engagement, next_follow_up_at: cleanDate(value, 'Next follow-up') }
  if (field === 'notes') return { ...engagement, notes: cleanNullableText(value, 'Engagement notes') }
  throw new Error('That engagement field is read-only.')
})

export const saveLeadEngagementEvent = async (leadId: string, input: { occurred_on?: unknown; kind?: unknown; channel?: unknown; summary?: unknown }) => {
  const occurredOn = cleanDate(input.occurred_on, 'Activity date')
  if (!occurredOn) throw new Error('Activity date is required.')
  if (typeof input.kind !== 'string' || !LEAD_ENGAGEMENT_EVENT_KINDS.includes(input.kind as LeadEngagementEvent['kind'])) throw new Error('Activity type is invalid.')
  if (typeof input.channel !== 'string' || !LEAD_ENGAGEMENT_CHANNELS.includes(input.channel as LeadEngagementEvent['channel'])) throw new Error('Activity channel is invalid.')
  const event: LeadEngagementEvent = {
    id: `engagement-event-${occurredOn}-${randomUUID()}`,
    occurred_on: occurredOn,
    kind: input.kind as LeadEngagementEvent['kind'],
    channel: input.channel as LeadEngagementEvent['channel'],
    summary: cleanRequiredText(input.summary, 'Activity summary'),
  }
  const engagement = await mutateLeadEngagement(leadId, (current) => addLeadEngagementEvent(current, event))
  return engagement ? { engagement, event } : undefined
}
