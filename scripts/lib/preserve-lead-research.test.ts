import assert from 'node:assert/strict'
import test from 'node:test'
import type { LeadResearchStatus } from '../../src/leadResearchTypes'
import { preserveLeadResearchRows } from './preserve-lead-research'

const lead = (id: string, strategy = false) => ({
  id,
  identity: { linkedin_url: `https://www.linkedin.com/in/${id}/` as string | null },
  company: { website_url: `https://www.${id}.example/` as string | null },
  discovery: {
    ...(strategy ? { strategy: { id: 'linkedin-intent-first-v1', batch_id: 'import-batch' } } : {}),
    resource_ids: ['official-resource'],
  },
  research: {
    status: 'watchlist' as LeadResearchStatus,
    notes: null as string | null,
    next_review_at: '2026-12-02' as string | null,
    last_researched_at: '2026-09-03',
  },
  qualification: { score: 9 },
  evidence: [{ id: `${id}-e1`, summary: 'Immutable source evidence', resource_id: 'official-resource' }],
})

test('regeneration retains imported strategy rows and their complete evidence without mutating inputs', () => {
  const generated = [lead('legacy')]
  const imported = lead('imported', true)
  imported.research.status = 'researching'
  imported.research.notes = 'Check the commissioning project'
  imported.discovery.resource_ids = ['import-only-resource']
  const existing = [lead('legacy'), imported]
  const before = structuredClone({ generated, existing })

  const result = preserveLeadResearchRows(generated, existing)

  assert.deepEqual(result.map((row) => row.id), ['legacy', 'imported'])
  assert.deepEqual(result[1], imported)
  assert.deepEqual({ generated, existing }, before)
  result[1].evidence[0].summary = 'Changed output'
  assert.equal(imported.evidence[0].summary, 'Immutable source evidence')
})

test('same-ID legacy rows retain editable research fields, including deliberate empty and null values', () => {
  const generated = lead('legacy')
  generated.research.notes = 'Generated note'
  generated.research.last_researched_at = '2026-10-01'
  generated.qualification.score = 12
  const existing = lead('legacy')
  existing.research.status = 'rejected'
  existing.research.notes = ''
  existing.research.next_review_at = null
  existing.evidence[0].summary = 'Old generated evidence'

  const [result] = preserveLeadResearchRows([generated], [existing])

  assert.equal(result.research.status, 'rejected')
  assert.equal(result.research.notes, '')
  assert.equal(result.research.next_review_at, null)
  assert.equal(result.research.last_researched_at, '2026-10-01')
  assert.equal(result.qualification.score, 12)
  assert.deepEqual(result.evidence, generated.evidence)
})

test('new generation works without an existing file and unrelated old legacy rows are not appended', () => {
  assert.deepEqual(preserveLeadResearchRows([lead('new')], []), [lead('new')])
  assert.deepEqual(preserveLeadResearchRows([lead('new')], [lead('retired')]), [lead('new')])
})

test('protected rows cannot be overwritten or included in historical generation', () => {
  assert.throws(() => preserveLeadResearchRows([lead('shared')], [lead('shared', true)]), /protected ID collision/)
  assert.throws(() => preserveLeadResearchRows([lead('imported', true)], []), /must not enter historical generation/)
})

test('duplicate IDs fail closed within generated and existing rows', () => {
  assert.throws(() => preserveLeadResearchRows([lead('same'), lead('same')], []), /generated rows.*duplicate ID/)
  assert.throws(() => preserveLeadResearchRows([], [lead('same'), lead('same', true)]), /existing rows.*duplicate ID/)
})

test('canonical profiles collide despite locale, tracking, encoded slug and trailing slash differences', () => {
  const imported = lead('imported', true)
  imported.identity.linkedin_url = 'https://sa.linkedin.com/in/Some%2DPerson/ar/?trk=example'
  const generated = lead('legacy')
  generated.identity.linkedin_url = 'https://www.linkedin.com/in/some-person'
  assert.throws(() => preserveLeadResearchRows([generated], [imported]), /profile collision/)
  assert.throws(() => preserveLeadResearchRows([], [imported, generated]), /existing rows profile collision/)
  assert.throws(() => preserveLeadResearchRows([imported, generated], []), /generated rows profile collision/)
})

test('canonical company domains collide across protocol, www, case and path variants', () => {
  const imported = lead('imported', true)
  imported.company.website_url = 'http://EXAMPLE.COM/old'
  const generated = lead('legacy')
  generated.company.website_url = 'https://www.example.com/new?ref=one'
  assert.throws(() => preserveLeadResearchRows([generated], [imported]), /domain collision/)
  assert.throws(() => preserveLeadResearchRows([], [imported, generated]), /existing rows domain collision/)
})

test('matching IDs do not mask changes in a known profile or company identity', () => {
  const changedProfile = lead('same')
  changedProfile.identity.linkedin_url = 'https://www.linkedin.com/in/other-person/'
  assert.throws(() => preserveLeadResearchRows([changedProfile], [lead('same')]), /profile changed for matching ID/)
  const changedCompany = lead('same')
  changedCompany.company.website_url = 'https://other-company.example/'
  assert.throws(() => preserveLeadResearchRows([changedCompany], [lead('same')]), /domain changed for matching ID/)
})

test('missing identity keys remain unknown and do not collide with other unknowns', () => {
  const generated = lead('legacy')
  const imported = lead('imported', true)
  generated.identity.linkedin_url = imported.identity.linkedin_url = null
  generated.company.website_url = imported.company.website_url = null
  assert.equal(preserveLeadResearchRows([generated], [imported]).length, 2)
})

test('malformed identity URLs abort preservation rather than disabling collision detection', () => {
  for (const value of ['not a URL', 'https://evillinkedin.com/in/name', 'https://linkedin.com/company/name', 'https://linkedin.com/in/%ZZ']) {
    const imported = lead('imported', true)
    imported.identity.linkedin_url = value
    assert.throws(() => preserveLeadResearchRows([], [imported]), /invalid LinkedIn/)
  }
  const invalidDomain = lead('bad')
  invalidDomain.company.website_url = 'example.com'
  assert.throws(() => preserveLeadResearchRows([invalidDomain], []), /invalid company website URL/)
})
