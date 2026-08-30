import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseFundingRoundPage,
  PortfolioLinkCollector,
} from './yc-crunchbase-links'

function round(
  roundKey: string,
  organizationKey: string | undefined,
  name: string | undefined,
  permalink: string | undefined,
) {
  return {
    uuid: roundKey,
    properties: {
      funded_organization_identifier: {
        permalink,
        uuid: organizationKey,
        value: name,
      },
    },
  }
}

test('parses a page and uses the final funding round as the next cursor', () => {
  const page = parseFundingRoundPage({
    count: 3,
    entities: [
      round('round-1', 'org-1', 'Alpha', 'alpha'),
      round('round-2', 'org-2', 'Beta', 'beta'),
    ],
  })

  assert.equal(page.cursor, 'round-2')
  assert.equal(page.entityCount, 2)
  assert.equal(page.totalCount, 3)
  assert.deepEqual(
    page.links.map(({ organizationKey: _organizationKey, ...link }) => link),
    [
      {
        name: 'Alpha',
        slug: 'alpha',
        url: 'https://www.crunchbase.com/organization/alpha',
      },
      {
        name: 'Beta',
        slug: 'beta',
        url: 'https://www.crunchbase.com/organization/beta',
      },
    ],
  )
})

test('deduplicates repeated investments by organization identity', () => {
  const collector = new PortfolioLinkCollector()
  collector.add(
    parseFundingRoundPage({
      count: 3,
      entities: [
        round('round-1', 'org-1', 'Alpha', 'alpha'),
        round('round-2', 'org-1', 'Alpha', 'alpha'),
        round('round-3', 'org-2', 'Beta', 'beta'),
      ],
    }),
  )

  const result = collector.finish()
  assert.equal(result.links.length, 2)
  assert.equal(result.stats.membershipRows, 3)
  assert.equal(
    result.stats.additionalFundingRoundRowsForExistingOrganizations,
    1,
  )
  assert.equal(result.stats.missingOrganizationRows, 0)
  assert.equal(result.stats.uniqueFundingRounds, 3)
})

test('tracks incomplete organization identifiers without publishing them', () => {
  const collector = new PortfolioLinkCollector()
  collector.add(
    parseFundingRoundPage({
      count: 2,
      entities: [
        round('round-1', undefined, 'No identity', 'no-identity'),
        round('round-2', 'org-2', 'Beta', 'beta'),
      ],
    }),
  )

  const result = collector.finish()
  assert.deepEqual(result.links.map((link) => link.slug), ['beta'])
  assert.equal(result.stats.missingOrganizationRows, 1)
  assert.equal(
    result.stats.additionalFundingRoundRowsForExistingOrganizations,
    0,
  )
})

test('rejects malformed pagination cursors', () => {
  assert.throws(
    () =>
      parseFundingRoundPage({
        count: 1,
        entities: [round('', 'org-1', 'Alpha', 'alpha')],
      }),
    /identity|cursor/,
  )
})

test('rejects overlapping funding-round pages', () => {
  const collector = new PortfolioLinkCollector()
  collector.add(
    parseFundingRoundPage({
      count: 1,
      entities: [round('round-1', 'org-1', 'Alpha', 'alpha')],
    }),
  )

  assert.throws(
    () =>
      collector.add(
        parseFundingRoundPage({
          count: 1,
          entities: [round('round-1', 'org-2', 'Beta', 'beta')],
        }),
      ),
    /duplicate funding round/,
  )
})

test('rejects unsafe permalinks', () => {
  assert.throws(
    () =>
      parseFundingRoundPage({
        count: 1,
        entities: [round('round-1', 'org-1', 'Unsafe', '../unsafe')],
      }),
    /Invalid Crunchbase organization permalink/,
  )
})

test('fails closed when documented response fields are missing', () => {
  assert.throws(
    () => parseFundingRoundPage({ count: 1 }),
    /entities array/,
  )
  assert.throws(
    () => parseFundingRoundPage({ entities: [] }),
    /total count/,
  )
})

test('publishes a link when only the optional display name is missing', () => {
  const page = parseFundingRoundPage({
    count: 1,
    entities: [round('round-1', 'org-1', undefined, 'alpha')],
  })

  assert.deepEqual(page.links[0], {
    name: 'alpha',
    organizationKey: 'org-1',
    slug: 'alpha',
    url: 'https://www.crunchbase.com/organization/alpha',
  })
})

test('updates renamed permalinks while retaining one organization', () => {
  const collector = new PortfolioLinkCollector()
  collector.add(
    parseFundingRoundPage({
      count: 2,
      entities: [round('round-1', 'org-1', 'Old name', 'old-name')],
    }),
  )
  collector.add(
    parseFundingRoundPage({
      count: 2,
      entities: [round('round-2', 'org-1', 'New name', 'new-name')],
    }),
  )

  const result = collector.finish()
  assert.deepEqual(result.links, [
    {
      name: 'New name',
      slug: 'new-name',
      url: 'https://www.crunchbase.com/organization/new-name',
    },
  ])
  assert.equal(result.stats.permalinkChanges, 1)
})
