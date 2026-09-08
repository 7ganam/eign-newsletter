import assert from 'node:assert/strict'
import test from 'node:test'
import type { LeadResearchEvidence } from '../../src/leadResearchTypes'
import {
  applyEvidencePublicationDates,
  buildEvidencePublicationDateAudit,
  type EvidencePublicationDateOverridesFile,
} from './lead-evidence-publication-dates'

const overrides: EvidencePublicationDateOverridesFile = {
  schema_version: 'lead-evidence-publication-date-overrides.v1',
  checked_at: '2026-09-05',
  rows: [{
    source_url: 'https://example.com/news',
    published_at: '2026-08-20',
    status: 'verified',
    basis: 'Visible page date.',
  }],
}

const evidence = (sourceUrl: string, publishedAt: string | null = null): LeadResearchEvidence => ({
  id: sourceUrl,
  claim_key: 'qualification',
  source_url: sourceUrl,
  source_title: sourceUrl,
  source_type: sourceUrl.includes('/in/') ? 'first_party_profile' : 'first_party_post',
  resource_id: null,
  published_at: publishedAt,
  observed_at: '2026-09-05',
  source_quality: 'primary',
  confidence: 'high',
  summary: 'Test evidence.',
})

test('decodes canonical LinkedIn activity timestamps and replaces an inaccurate stored date', () => {
  const item = evidence('https://www.linkedin.com/feed/update/urn:li:activity:7500223144914329600/', '2026-09-01')
  applyEvidencePublicationDates([{ evidence: [item] }], overrides)
  assert.equal(item.published_at, '2026-08-31')
})

test('applies a verified page override and keeps living profiles undated', () => {
  const news = evidence('https://example.com/news')
  const profile = evidence('https://www.linkedin.com/in/example')
  applyEvidencePublicationDates([{ evidence: [news, profile] }], overrides)
  assert.equal(news.published_at, '2026-08-20')
  assert.equal(profile.published_at, null)
})

test('audit distinguishes exact-date gaps from undated living sources', () => {
  const profile = evidence('https://www.linkedin.com/in/example')
  const job = evidence('https://www.linkedin.com/jobs/view/123')
  job.source_type = 'venture_job_listing'
  const rows = buildEvidencePublicationDateAudit([
    { id: 'lead-1', identity: { display_name: 'One' }, evidence: [profile, job] } as never,
  ], [], overrides)
  assert.equal(rows.find((row) => row.source_url === profile.source_url)?.status, 'not-applicable')
  assert.equal(rows.find((row) => row.source_url === job.source_url)?.status, 'unavailable')
})
