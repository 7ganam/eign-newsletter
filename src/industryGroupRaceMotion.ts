import { interpolateIndustryGroupRace } from './industryGroupRace'
import type { IndustryGroupRace } from './industryGroupRace'

// Presentation only: amounts still come from the original monthly interpolation.
// Quiet periods run faster; overtakes take longer. Every bar shares a linear,
// zero-based scale, and vertical travel is capped independently of playback speed.
export const MAX_RACE_ROWS_PER_SECOND = 3

export type RaceMotion = {
  position: number
  ranks: Record<string, number>
  axisMax: number
  axisTarget: number
  overtake: { name: string; fromRank: number; toRank: number } | null
}

const scaleCeiling = (value: number) => {
  const power = 10 ** Math.floor(Math.log10(Math.max(1, value)))
  const step = [1, 2, 5, 10].find((candidate) => candidate * power >= value) ?? 10
  return step * power
}

export const createRaceMotion = (race: IndustryGroupRace, position = 0): RaceMotion => {
  const clamped = Math.max(0, Math.min(race.frames.length - 1, position))
  const rows = interpolateIndustryGroupRace(race, clamped).rows
  const axisMax = scaleCeiling(Math.max(1, rows[0]?.amountUsd ?? 0) * 1.4)
  return {
    position: clamped,
    ranks: Object.fromEntries(rows.map((row) => [row.name, row.rank])),
    axisMax,
    axisTarget: axisMax,
    overtake: null,
  }
}

export const raceMonthHasFunding = (race: IndustryGroupRace, position: number) => {
  const index = Math.min(Math.floor(position), race.frames.length - 1)
  const frame = race.frames[index]
  const next = race.frames[index + 1]
  return Boolean(next && frame && next.values.some((value, i) => value > frame.values[i]))
}

export const raceMonthDuration = (race: IndustryGroupRace, position: number) => {
  const index = Math.min(Math.floor(position), race.frames.length - 1)
  const frame = race.frames[index]
  const next = race.frames[index + 1]
  if (!frame || !next) return 150
  const total = frame.values.reduce((sum, value) => sum + value, 0)
  const added = next.values.reduce((sum, value, i) => sum + Math.max(0, value - frame.values[i]), 0)
  if (!added) return 150
  // Small changes against a large historical total need less screen time.
  return Math.min(1100, 250 + added / Math.max(1, total) * 26_000)
}

export const raceMotionSettled = (race: IndustryGroupRace, motion: RaceMotion) => {
  const rows = interpolateIndustryGroupRace(race, motion.position).rows
  return rows.every((row) => Math.abs((motion.ranks[row.name] ?? row.rank) - row.rank) < .003)
    && Math.abs(motion.axisTarget - motion.axisMax) / Math.max(1, motion.axisTarget) < .001
}

export const advanceRaceMotion = (
  race: IndustryGroupRace,
  previous: RaceMotion,
  elapsedMs: number,
  speed = 1,
): RaceMotion => {
  const elapsed = Math.max(0, Math.min(64, elapsedMs))
  const currentRows = interpolateIndustryGroupRace(race, previous.position).rows
  const lag = Math.max(0, ...currentRows.map((row) => Math.abs((previous.ranks[row.name] ?? row.rank) - row.rank)))
  const busyPace = 1 / (1 + lag * 1.5)
  const monthDuration = raceMonthDuration(race, previous.position)
  const position = Math.min(
    Math.max(0, race.frames.length - 1),
    previous.position + elapsed * speed * busyPace / monthDuration,
  )
  const rows = interpolateIndustryGroupRace(race, position).rows
  const ranks = Object.fromEntries(rows.map((row) => {
    const before = previous.ranks[row.name] ?? row.rank
    const distance = row.rank - before
    // A bounded exponential approach avoids both large leaps and overshoot.
    const step = Math.min(Math.abs(distance) * (1 - Math.exp(-elapsed / 180)), MAX_RACE_ROWS_PER_SECOND * elapsed / 1000)
    const next = before + Math.sign(distance) * step
    return [row.name, Math.abs(row.rank - next) < .002 ? row.rank : next]
  }))
  const leader = Math.max(1, rows[0]?.amountUsd ?? 0)
  const axisTarget = leader > previous.axisTarget * .85
    ? scaleCeiling(leader * 1.4)
    : previous.axisTarget
  const axisMax = Math.max(
    leader * 1.04,
    previous.axisMax + (axisTarget - previous.axisMax) * (1 - Math.exp(-elapsed / 650)),
  )
  const existing = rows.find((row) => row.name === previous.overtake?.name)
  const rising = existing && ranks[existing.name] - existing.rank > .1
    ? existing
    : [...rows].sort((left, right) => (ranks[right.name] - right.rank) - (ranks[left.name] - left.rank))
      .find((row) => ranks[row.name] - row.rank > .75)
  const overtake = rising ? {
    name: rising.name,
    fromRank: previous.overtake?.name === rising.name ? previous.overtake.fromRank : Math.round(previous.ranks[rising.name] ?? rising.rank),
    toRank: rising.rank,
  } : null
  return { position, ranks, axisMax, axisTarget, overtake }
}

export const raceMonthGains = (race: IndustryGroupRace, position: number) => {
  const snapshot = interpolateIndustryGroupRace(race, position)
  const monthIndex = Math.max(0, Math.min(race.frames.length - 1, Math.ceil(position)))
  const baseline = race.frames[monthIndex - 1]?.values
  const byName = new Map(snapshot.rows.map((row) => [row.name, row.amountUsd]))
  return {
    month: race.frames[monthIndex]?.month ?? '',
    gains: Object.fromEntries(race.groupNames.map((name, index) => [name, Math.max(0, (byName.get(name) ?? 0) - (baseline?.[index] ?? 0))])),
  }
}
