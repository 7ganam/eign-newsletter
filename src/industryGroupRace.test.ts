import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  buildIndustryGroupRace,
  industryGroupRaceLeaders,
  interpolateIndustryGroupRace,
  layoutIndustryGroupRaceRows,
} from './industryGroupRace'

test('builds cumulative monthly frames and keeps every group visible', () => {
  const race = buildIndustryGroupRace([
    { days: [{ amountUsd: 100, date: '2025-01-10' }, { amountUsd: 50, date: '2025-02-03' }], name: 'SaaS' },
    { days: [{ amountUsd: 200, date: '2025-01-20' }], name: 'Payments' },
  ], [
    { id: 'software', labels: ['SaaS'], name: 'SaaS & Enterprise Software' },
    { id: 'fintech', labels: ['Payments'], name: 'FinTech' },
    { id: 'hardware', labels: ['Hardware'], name: 'Hardware, IoT & Semiconductors' },
  ])

  assert.deepEqual(race.frames, [
    { month: '2025-01', values: [100, 200, 0] },
    { month: '2025-02', values: [150, 200, 0] },
  ])
  assert.deepEqual(race.groupNames, [
    'SaaS & Enterprise Software',
    'FinTech',
    'Hardware, IoT & Semiconductors',
  ])
  assert.equal(race.groupedTotalUsd, 350)
})

test('ranks at most three companies per primary group using cumulative company funding', () => {
  const race = buildIndustryGroupRace([
    { days: [{ amountUsd: 50, date: '2025-01-10' }], name: 'SaaS' },
    { days: [{ amountUsd: 130, date: '2025-01-10' }], name: 'Payments' },
  ], [
    { id: 'software', labels: ['SaaS'], name: 'SaaS & Enterprise Software' },
    { id: 'fintech', labels: ['Payments'], name: 'FinTech' },
  ], [
    {
      crunchbaseUrl: 'https://crunchbase.test/acme',
      days: [{ amountUsd: 100, date: '2025-01-10' }],
      industries: ['SaaS', 'Payments'],
      logoUrl: 'https://logos.test/acme.png',
      primaryGroupId: 'software',
      name: 'Acme',
      website: 'https://acme.test',
    },
    {
      crunchbaseUrl: 'https://crunchbase.test/ledger',
      days: [{ amountUsd: 80, date: '2025-01-10' }],
      industries: ['Payments'],
      logoUrl: null,
      primaryGroupId: 'fintech',
      name: 'Ledger',
      website: 'https://ledger.test',
    },
  ])

  assert.deepEqual(industryGroupRaceLeaders(race, 0), {
    FinTech: [
      { amountUsd: 80, crunchbaseUrl: 'https://crunchbase.test/ledger', logoUrl: null, name: 'Ledger', website: 'https://ledger.test' },
    ],
    'SaaS & Enterprise Software': [
      { amountUsd: 100, crunchbaseUrl: 'https://crunchbase.test/acme', logoUrl: 'https://logos.test/acme.png', name: 'Acme', website: 'https://acme.test' },
    ],
  })
})

test('interpolates between months and ranks every group without hiding zero values', () => {
  const race = buildIndustryGroupRace([
    { days: [{ amountUsd: 100, date: '2025-01-10' }, { amountUsd: 50, date: '2025-02-03' }], name: 'SaaS' },
    { days: [{ amountUsd: 200, date: '2025-01-20' }], name: 'Payments' },
  ], [
    { id: 'software', labels: ['SaaS'], name: 'SaaS & Enterprise Software' },
    { id: 'fintech', labels: ['Payments'], name: 'FinTech' },
    { id: 'hardware', labels: ['Hardware'], name: 'Hardware, IoT & Semiconductors' },
  ])

  assert.deepEqual(interpolateIndustryGroupRace(race, 0.5), {
    month: '2025-01',
    nextMonth: '2025-02',
    rows: [
      { amountUsd: 200, name: 'FinTech', rank: 0 },
      { amountUsd: 125, name: 'SaaS & Enterprise Software', rank: 1 },
      { amountUsd: 0, name: 'Hardware, IoT & Semiconductors', rank: 2 },
    ],
  })
})

test('keeps rendered row identities stable while their visual ranks change', () => {
  const race = buildIndustryGroupRace([
    { days: [{ amountUsd: 100, date: '2025-01-10' }, { amountUsd: 200, date: '2025-02-03' }], name: 'SaaS' },
    { days: [{ amountUsd: 200, date: '2025-01-20' }], name: 'Payments' },
  ], [
    { id: 'software', labels: ['SaaS'], name: 'SaaS & Enterprise Software' },
    { id: 'fintech', labels: ['Payments'], name: 'FinTech' },
  ])

  const beforeCrossing = layoutIndustryGroupRaceRows(race, interpolateIndustryGroupRace(race, 0))
  const afterCrossing = layoutIndustryGroupRaceRows(race, interpolateIndustryGroupRace(race, 1))

  assert.deepEqual(beforeCrossing.map((row) => row.name), [
    'SaaS & Enterprise Software',
    'FinTech',
  ])
  assert.deepEqual(afterCrossing.map((row) => row.name), [
    'SaaS & Enterprise Software',
    'FinTech',
  ])
  assert.deepEqual(beforeCrossing.map((row) => row.rank), [1, 0])
  assert.deepEqual(afterCrossing.map((row) => row.rank), [0, 1])
})

test('every real-data frame shows each company at most once without changing industry totals', () => {
  const data = JSON.parse(readFileSync(new URL('../assets/posts/yc-industry-funding-by-year.json', import.meta.url), 'utf8'))
  const { groups } = JSON.parse(readFileSync(new URL('../assets/posts/yc-industry-groups.json', import.meta.url), 'utf8'))
  for (const scope of Object.values(data.scopes) as Array<{ companies: Parameters<typeof buildIndustryGroupRace>[2]; industries: Parameters<typeof buildIndustryGroupRace>[0] }>) {
    const race = buildIndustryGroupRace(scope.industries, groups, scope.companies)
    const baseline = buildIndustryGroupRace(scope.industries, groups)
    assert.equal(race.groupedTotalUsd, baseline.groupedTotalUsd)
    assert.deepEqual(race.frames.map((frame) => frame.values), baseline.frames.map((frame) => frame.values))
    const home = new Map<string, number>()
    for (const frame of race.frames) {
      const ids = frame.leaders?.flat().map((company) => company.crunchbaseUrl) ?? []
      assert.equal(ids.length, new Set(ids).size, `Repeated company in ${frame.month}`)
      frame.leaders?.forEach((leaders, groupIndex) => leaders.forEach((company) => {
        if (home.has(company.crunchbaseUrl)) assert.equal(home.get(company.crunchbaseUrl), groupIndex)
        home.set(company.crunchbaseUrl, groupIndex)
      }))
    }
  }
})

test('missing or deleted primary groups do not silently reassign a company', () => {
  const industries = [{ name: 'Payments', days: [{ date: '2025-01-01', amountUsd: 100 }] }]
  const groups = [{ id: 'fintech', name: 'FinTech', labels: ['Payments'] }]
  for (const primaryGroupId of [undefined, null, 'deleted-group']) {
    const race = buildIndustryGroupRace(industries, groups, [{ crunchbaseUrl: 'acme', name: 'Acme', website: '', industries: ['Payments'], primaryGroupId, days: industries[0].days }])
    assert.deepEqual(race.frames[0].leaders, [[]])
    assert.equal(race.groupedTotalUsd, 100)
  }
})
