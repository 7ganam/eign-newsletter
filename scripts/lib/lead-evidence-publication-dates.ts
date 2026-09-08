import type { LeadResearchEvidence, LeadResearchResource, SaudiSoftwareLead } from '../../src/leadResearchTypes'

export type EvidencePublicationDateOverride = {
  source_url: string
  published_at: string
  status: 'verified' | 'derived'
  basis: string
}

export type EvidencePublicationDateOverridesFile = {
  schema_version: 'lead-evidence-publication-date-overrides.v1'
  checked_at: string
  rows: EvidencePublicationDateOverride[]
}

export type EvidencePublicationDateAuditRow = {
  source_url: string
  source_titles: string[]
  source_types: string[]
  owners: string[]
  occurrences: number
  published_at: string | null
  status: 'verified' | 'derived' | 'recorded' | 'not-applicable' | 'unavailable'
  basis: string
  checked_at: string
}

type EvidenceOwner = { evidence?: LeadResearchEvidence[] }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const linkedinActivityDate = (sourceUrl: string) => {
  const match = sourceUrl.match(/(?:activity|ugcPost|share)[-:](\d{15,})/)
  if (!match) return null
  const milliseconds = Number(BigInt(match[1]) >> 22n)
  const value = new Date(milliseconds)
  return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null
}

const isUndatedLivingPage = (evidence: LeadResearchEvidence) => {
  const url = new URL(evidence.source_url)
  const path = url.pathname.replace(/\/$/, '')
  if (url.hostname.endsWith('linkedin.com') && /^\/(?:in|company|newsletters|help)\//.test(path)) return true
  if (/profile|homepage|company|portfolio|program|community|investor|directory|documentation|event/.test(evidence.source_type.toLowerCase())) return true
  if (/\/(?:country|category|tag)\//.test(path)) return true
  return path === '' || path === '/en' || path === '/about' || path.startsWith('/about-us')
}

const resolveDate = (evidence: LeadResearchEvidence, override: EvidencePublicationDateOverride | undefined, checkedAt: string) => {
  const linkedinDate = linkedinActivityDate(evidence.source_url)
  if (linkedinDate) return {
    published_at: linkedinDate,
    status: 'derived' as const,
    basis: 'Exact UTC creation day decoded from the canonical LinkedIn activity or UGC post identifier.',
    checked_at: checkedAt,
  }
  if (override) return { published_at: override.published_at, status: override.status, basis: override.basis, checked_at: checkedAt }
  if (evidence.published_at && ISO_DATE.test(evidence.published_at)) return {
    published_at: evidence.published_at,
    status: 'recorded' as const,
    basis: 'Publication date retained from the original source-backed research record.',
    checked_at: checkedAt,
  }
  return {
    published_at: null,
    status: isUndatedLivingPage(evidence) ? 'not-applicable' as const : 'unavailable' as const,
    basis: isUndatedLivingPage(evidence)
      ? 'This is a living profile, company, portfolio, program, directory, or homepage rather than a dated publication.'
      : 'The source did not expose an exact publication day during the audit; no date was invented from a relative label or access timestamp.',
    checked_at: checkedAt,
  }
}

export const applyEvidencePublicationDates = <Owner extends EvidenceOwner>(owners: Owner[], overridesFile: EvidencePublicationDateOverridesFile) => {
  const overrides = new Map(overridesFile.rows.map((row) => [row.source_url, row]))
  for (const owner of owners) {
    for (const evidence of owner.evidence ?? []) {
      const resolved = resolveDate(evidence, overrides.get(evidence.source_url), overridesFile.checked_at)
      evidence.published_at = resolved.published_at
      evidence.publication_date_status = resolved.status
      evidence.publication_date_basis = resolved.basis
      evidence.publication_date_checked_at = resolved.checked_at
    }
  }
}

export const buildEvidencePublicationDateAudit = (
  leads: SaudiSoftwareLead[],
  resources: LeadResearchResource[],
  overridesFile: EvidencePublicationDateOverridesFile,
) => {
  const overrides = new Map(overridesFile.rows.map((row) => [row.source_url, row]))
  const rows = new Map<string, EvidencePublicationDateAuditRow>()
  const collect = (owner: string, evidence: LeadResearchEvidence) => {
    const resolved = resolveDate(evidence, overrides.get(evidence.source_url), overridesFile.checked_at)
    const existing = rows.get(evidence.source_url) ?? {
      source_url: evidence.source_url,
      source_titles: [],
      source_types: [],
      owners: [],
      occurrences: 0,
      published_at: resolved.published_at,
      status: resolved.status,
      basis: resolved.basis,
      checked_at: resolved.checked_at,
    }
    existing.source_titles = [...new Set([...existing.source_titles, evidence.source_title])]
    existing.source_types = [...new Set([...existing.source_types, evidence.source_type])]
    existing.owners = [...new Set([...existing.owners, owner])]
    existing.occurrences += 1
    rows.set(evidence.source_url, existing)
  }
  leads.forEach((lead) => lead.evidence.forEach((evidence) => collect(`lead:${lead.id}`, evidence)))
  resources.forEach((resource) => resource.evidence.forEach((evidence) => collect(`resource:${resource.id}`, evidence)))
  return [...rows.values()].sort((left, right) => left.source_url.localeCompare(right.source_url))
}
