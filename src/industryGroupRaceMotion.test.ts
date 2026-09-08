import assert from 'node:assert/strict'
import test from 'node:test'
import { buildIndustryGroupRace, interpolateIndustryGroupRace } from './industryGroupRace'
import { advanceRaceMotion, createRaceMotion, MAX_RACE_ROWS_PER_SECOND, raceMonthDuration, raceMonthGains, raceMotionSettled } from './industryGroupRaceMotion'

const groups = Array.from({ length: 25 }, (_, index) => ({ id: String(index), name: `Group ${index}`, labels: [`Label ${index}`] }))
const race = buildIndustryGroupRace(groups.map((_, index) => ({
  name: `Label ${index}`,
  days: [
    { date: '2025-01-01', amountUsd: (25 - index) * 100 },
    ...(index === 24 ? [{ date: '2025-03-01', amountUsd: 100_000 }] : []),
  ],
})), groups)

test('quiet months advance faster, while overtakes slow the calendar without changing funding', () => {
  const quiet = advanceRaceMotion(race, createRaceMotion(race, 0), 16)
  const busy = advanceRaceMotion(race, createRaceMotion(race, 1), 16)
  assert.ok(quiet.position > busy.position - 1)
  const behind = { ...busy, ranks: { ...busy.ranks, 'Group 24': 24 } }
  const next = advanceRaceMotion(race, behind, 16)
  assert.ok(next.position - behind.position < 16 / raceMonthDuration(race, behind.position))
  const newcomer = interpolateIndustryGroupRace(race, next.position).rows.find((row) => row.name === 'Group 24')!
  assert.equal(newcomer.amountUsd, 100 + 100_000 * (next.position - 1))
})

test('a 24-place overtake has a bounded travel speed and settles at the correct final rank', () => {
  let motion = { ...createRaceMotion(race, 0), position: 2 }
  const finalAmounts = race.frames.at(-1)?.values.slice()
  let capturedOvertake = false
  for (let tick = 0; tick < 1000; tick++) {
    const previous = motion
    motion = advanceRaceMotion(race, motion, 16, 2)
    for (const name of race.groupNames) {
      assert.ok(Math.abs(motion.ranks[name] - previous.ranks[name]) <= MAX_RACE_ROWS_PER_SECOND * .016 + .002)
    }
    capturedOvertake ||= motion.overtake?.name === 'Group 24'
    assert.equal(motion.position, 2)
  }
  assert.ok(capturedOvertake)
  assert.ok(raceMotionSettled(race, motion))
  assert.equal(motion.ranks['Group 24'], 0)
  assert.deepEqual(race.frames.at(-1)?.values, finalAmounts)
})

test('axis headroom lets a leading bar grow and monthly gains reveal small changes', () => {
  const smallRace = buildIndustryGroupRace([{
    name: 'Label 0', days: [{ date: '2025-01-01', amountUsd: 1_000_000 }, { date: '2025-02-01', amountUsd: 1000 }],
  }], groups.slice(0, 1))
  const start = createRaceMotion(smallRace)
  assert.ok(raceMonthDuration(smallRace, 0) < raceMonthDuration(race, 1))
  const next = advanceRaceMotion(smallRace, start, 32)
  assert.equal(next.axisMax, start.axisMax)
  assert.ok(interpolateIndustryGroupRace(smallRace, next.position).rows[0].amountUsd / next.axisMax > 1_000_000 / start.axisMax)
  assert.deepEqual(raceMonthGains(smallRace, .5), { month: '2025-02', gains: { 'Group 0': 500 } })
  assert.deepEqual(raceMonthGains(smallRace, 1), { month: '2025-02', gains: { 'Group 0': 1000 } })
  assert.deepEqual(raceMonthGains(smallRace, 0), { month: '2025-01', gains: { 'Group 0': 1_000_000 } })
})
