import assert from 'node:assert/strict'
import test from 'node:test'
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

test('ranks at most three companies per group using their cumulative group-attributed funding', () => {
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
      name: 'Acme',
      website: 'https://acme.test',
    },
    {
      crunchbaseUrl: 'https://crunchbase.test/ledger',
      days: [{ amountUsd: 80, date: '2025-01-10' }],
      industries: ['Payments'],
      logoUrl: null,
      name: 'Ledger',
      website: 'https://ledger.test',
    },
  ])

  assert.deepEqual(industryGroupRaceLeaders(race, 0), {
    FinTech: [
      { amountUsd: 80, crunchbaseUrl: 'https://crunchbase.test/ledger', logoUrl: null, name: 'Ledger', website: 'https://ledger.test' },
      { amountUsd: 50, crunchbaseUrl: 'https://crunchbase.test/acme', logoUrl: 'https://logos.test/acme.png', name: 'Acme', website: 'https://acme.test' },
    ],
    'SaaS & Enterprise Software': [
      { amountUsd: 50, crunchbaseUrl: 'https://crunchbase.test/acme', logoUrl: 'https://logos.test/acme.png', name: 'Acme', website: 'https://acme.test' },
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
