import type { SaudiSoftwareLead } from '../../src/leadResearchTypes'

const PROTECTED_STRATEGY_ID = 'linkedin-intent-first-v1'

type PreservableLead = {
  id: string
  identity: Pick<SaudiSoftwareLead['identity'], 'linkedin_url'>
  company: Pick<SaudiSoftwareLead['company'], 'website_url'>
  discovery: { strategy?: { id: string } }
  research: Pick<SaudiSoftwareLead['research'], 'status' | 'notes' | 'next_review_at'>
}

const isProtected = (row: PreservableLead) => row.discovery.strategy?.id === PROTECTED_STRATEGY_ID

const parseUrl = (value: string, rowId: string, field: string) => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Not a web URL')
    return url
  } catch {
    throw new Error(`Cannot preserve lead research: invalid ${field} on ${rowId}. No canonical files were overwritten.`)
  }
}

const identityKeys = (row: PreservableLead) => {
  let profile: string | null = null
  if (row.identity.linkedin_url) {
    const url = parseUrl(row.identity.linkedin_url, row.id, 'LinkedIn profile URL')
    const parts = url.pathname.split('/').filter(Boolean)
    if (!(url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com')) || parts[0] !== 'in' || !parts[1]) {
      throw new Error(`Cannot preserve lead research: invalid LinkedIn profile URL on ${row.id}. No canonical files were overwritten.`)
    }
    try {
      profile = decodeURIComponent(parts[1]).normalize('NFKC').toLowerCase()
    } catch {
      throw new Error(`Cannot preserve lead research: invalid LinkedIn profile encoding on ${row.id}. No canonical files were overwritten.`)
    }
  }
  const domain = row.company.website_url
    ? parseUrl(row.company.website_url, row.id, 'company website URL').hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
    : null
  return { profile, domain }
}

const indexRows = <Row extends PreservableLead>(rows: readonly Row[], label: string) => {
  const ids = new Map<string, Row>()
  const profiles = new Map<string, string>()
  const domains = new Map<string, string>()
  for (const row of rows) {
    if (!row.id?.trim() || ids.has(row.id)) {
      throw new Error(`Cannot preserve lead research: ${label} has an empty or duplicate ID ${row.id}. No canonical files were overwritten.`)
    }
    ids.set(row.id, row)
    const keys = identityKeys(row)
    for (const [kind, key, index] of [['profile', keys.profile, profiles], ['domain', keys.domain, domains]] as const) {
      if (!key) continue
      const collision = index.get(key)
      if (collision) {
        throw new Error(`Cannot preserve lead research: ${label} ${kind} collision between ${collision} and ${row.id}. No canonical files were overwritten.`)
      }
      index.set(key, row.id)
    }
  }
  return { ids, profiles, domains }
}

/** Merge only after historical quota checks and resource-yield inference. Never silently resolve identity collisions. */
export const preserveLeadResearchRows = <Row extends PreservableLead>(generatedLegacyRows: readonly Row[], existingRows: readonly Row[]): Row[] => {
  indexRows(generatedLegacyRows, 'generated rows')
  const existing = indexRows(existingRows, 'existing rows')

  const merged = generatedLegacyRows.map((generated) => {
    if (isProtected(generated)) {
      throw new Error(`Cannot preserve lead research: strategy row ${generated.id} must not enter historical generation. No canonical files were overwritten.`)
    }
    const previous = existing.ids.get(generated.id)
    if (previous && isProtected(previous)) {
      throw new Error(`Cannot preserve lead research: protected ID collision on ${generated.id}. No canonical files were overwritten.`)
    }
    const keys = identityKeys(generated)
    const previousKeys = previous ? identityKeys(previous) : null
    for (const [kind, key, index] of [['profile', keys.profile, existing.profiles], ['domain', keys.domain, existing.domains]] as const) {
      const collision = key ? index.get(key) : undefined
      if (collision && collision !== generated.id) {
        throw new Error(`Cannot preserve lead research: ${kind} collision between ${collision} and ${generated.id}. No canonical files were overwritten.`)
      }
      if (key && previousKeys?.[kind] && key !== previousKeys[kind]) {
        throw new Error(`Cannot preserve lead research: ${kind} changed for matching ID ${generated.id}. No canonical files were overwritten.`)
      }
    }
    const row = structuredClone(generated)
    if (previous) {
      row.research.status = previous.research.status
      row.research.notes = previous.research.notes
      row.research.next_review_at = previous.research.next_review_at
    }
    return row
  })

  return [...merged, ...existingRows.filter(isProtected).map((row) => structuredClone(row))]
}
