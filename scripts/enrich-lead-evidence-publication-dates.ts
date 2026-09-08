import { readFile, writeFile } from 'node:fs/promises'
import type { LeadResearchResourcesFile, SaudiSoftwareLeadsFile } from '../src/leadResearchTypes'
import {
  applyEvidencePublicationDates,
  buildEvidencePublicationDateAudit,
  type EvidencePublicationDateOverridesFile,
} from './lib/lead-evidence-publication-dates'

const ASSETS = new URL('../assets/lead-research/', import.meta.url)
const OUTPUTS = new URL('../outputs/lead-research/', import.meta.url)
const readJson = async <Value>(url: URL) => JSON.parse(await readFile(url, 'utf8')) as Value

const main = async () => {
  const [leads, resources, overrides] = await Promise.all([
    readJson<SaudiSoftwareLeadsFile>(new URL('saudi-software-leads.json', ASSETS)),
    readJson<LeadResearchResourcesFile>(new URL('saudi-lead-resources.json', ASSETS)),
    readJson<EvidencePublicationDateOverridesFile>(new URL('evidence-publication-date-overrides.json', ASSETS)),
  ])
  applyEvidencePublicationDates(leads.rows, overrides)
  applyEvidencePublicationDates(resources.rows, overrides)
  const rows = buildEvidencePublicationDateAudit(leads.rows, resources.rows, overrides)
  const audit = {
    schema_version: 'lead-evidence-publication-date-audit.v1',
    generated_at: new Date().toISOString(),
    checked_at: overrides.checked_at,
    stats: {
      unique_urls: rows.length,
      evidence_occurrences: rows.reduce((sum, row) => sum + row.occurrences, 0),
      dated_urls: rows.filter((row) => row.published_at).length,
      undated_living_urls: rows.filter((row) => row.status === 'not-applicable').length,
      unavailable_exact_date_urls: rows.filter((row) => row.status === 'unavailable').length,
    },
    rows,
  }
  await Promise.all([
    writeFile(new URL('saudi-software-leads.json', ASSETS), `${JSON.stringify(leads, null, 2)}\n`, 'utf8'),
    writeFile(new URL('saudi-lead-resources.json', ASSETS), `${JSON.stringify(resources, null, 2)}\n`, 'utf8'),
    writeFile(new URL('evidence-publication-date-audit.json', OUTPUTS), `${JSON.stringify(audit, null, 2)}\n`, 'utf8'),
  ])
  console.log(JSON.stringify(audit.stats, null, 2))
}

void main()
