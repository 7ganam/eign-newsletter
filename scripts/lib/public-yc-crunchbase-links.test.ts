import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPublicLinkDataset,
  canonicalizeCrunchbaseOrganizationUrl,
  parseCsv,
  parseCurrentYcCompanies,
} from './public-yc-crunchbase-links'
import { assertAllowedSourceUrl } from '../export-yc-crunchbase-links-public'

test('parses quoted commas, escaped quotes, multiline fields, CRLF, and a BOM', () => {
  const rows = parseCsv(
    '\uFEFFid,name,description\r\n1,"Acme, Inc.","first\nsecond"\r\n2,Beta,"said ""hi"""\r\n',
  )
  assert.deepEqual(rows, [
    { id: '1', name: 'Acme, Inc.', description: 'first\nsecond' },
    { id: '2', name: 'Beta', description: 'said "hi"' },
  ])
})

test('canonicalizes Crunchbase organization URLs and explicit slug values', () => {
  assert.deepEqual(
    canonicalizeCrunchbaseOrganizationUrl(
      'http://crunchbase.com/organization/Acme/',
    ),
    {
      slug: 'acme',
      url: 'https://www.crunchbase.com/organization/acme',
    },
  )
  assert.equal(
    canonicalizeCrunchbaseOrganizationUrl(
      'https://www.crunchbase.com/person/acme',
    ),
    undefined,
  )
  assert.deepEqual(
    canonicalizeCrunchbaseOrganizationUrl(
      'https://www.crunchbase.com/organization/acme/company_financials',
    ),
    {
      slug: 'acme',
      url: 'https://www.crunchbase.com/organization/acme',
    },
  )
  assert.deepEqual(
    canonicalizeCrunchbaseOrganizationUrl('Portão-3'),
    {
      slug: 'portão-3',
      url: 'https://www.crunchbase.com/organization/port%C3%A3o-3',
    },
  )
  assert.equal(
    canonicalizeCrunchbaseOrganizationUrl('https://example.com/organization/acme'),
    undefined,
  )
})

test('unions current and historical rosters while separating inferred candidates', () => {
  const current = parseCurrentYcCompanies([
    {
      id: 1,
      name: 'Acme',
      slug: 'acme',
      batch: 'Winter 2026',
      status: 'Active',
      website: 'https://acme.test',
      url: 'https://www.ycombinator.com/companies/acme',
    },
    {
      id: 2,
      name: 'Beta',
      slug: 'beta',
      batch: 'Winter 2026',
      status: 'Active',
      website: 'https://beta.test',
      url: 'https://www.ycombinator.com/companies/beta',
    },
  ])
  const result = buildPublicLinkDataset(current, [
    {
      'Company ID': '1',
      'Company Name': 'Old Acme',
      Slug: 'old-acme',
      Batch: 'Winter 2020',
      Status: 'Active',
      Website: 'https://old-acme.test',
      'YC DC Company URL': '/companies/old-acme',
      'CB URL': 'https://www.crunchbase.com/organization/acme-inc',
    },
    {
      'Company ID': '3',
      'Company Name': 'Historical',
      Slug: 'historical',
      Batch: 'Summer 2010',
      Status: 'Inactive',
      Website: '',
      'YC DC Company URL': '/companies/historical',
      'CB URL': '',
    },
  ])

  assert.equal(result.stats.rosterCompanies, 3)
  assert.equal(result.stats.historicalOnlyCompanies, 1)
  assert.equal(result.stats.publiclySourcedUniqueLinks, 1)
  assert.equal(result.stats.unverifiedCandidateCompanies, 2)
  assert.deepEqual(result.publiclySourcedLinks, [
    {
      slug: 'acme-inc',
      url: 'https://www.crunchbase.com/organization/acme-inc',
    },
  ])
  assert.equal(
    result.auditRows.find((row) => row.ycId === '1')?.name,
    'Acme',
  )
})

test('excludes the YC directory self-entry from the funded-company roster', () => {
  const current = parseCurrentYcCompanies([
    {
      id: 64,
      name: 'Y Combinator',
      slug: 'y-combinator',
      batch: 'Unspecified',
      status: 'Active',
      website: 'https://www.ycombinator.com',
      url: 'https://www.ycombinator.com/companies/y-combinator',
    },
  ])
  const result = buildPublicLinkDataset(current, [])
  assert.equal(result.stats.rosterCompanies, 0)
  assert.equal(result.stats.excludedNonPortfolioRows, 1)
})

test('source-network guard rejects Crunchbase, credentials, and non-HTTPS URLs', () => {
  assert.equal(
    assertAllowedSourceUrl('https://huggingface.co/example').hostname,
    'huggingface.co',
  )
  assert.throws(
    () => assertAllowedSourceUrl('https://www.crunchbase.com/organization/acme'),
    /non-allowlisted/,
  )
  assert.throws(
    () => assertAllowedSourceUrl('http://yc-oss.github.io/api/meta.json'),
    /non-allowlisted/,
  )
  assert.throws(
    () =>
      assertAllowedSourceUrl(
        'https://user:password@raw.githubusercontent.com/example',
      ),
    /credentials/,
  )
})
