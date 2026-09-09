export type GroupRaceIndustry = {
  days?: Array<{ amountUsd: number; date: string }>
  name: string
}

export type GroupRaceGroup = {
  id: string
  labels: string[]
  name: string
}

export type GroupRaceCompany = {
  crunchbaseUrl: string
  days?: Array<{ amountUsd: number; date: string }>
  industries: string[]
  logoUrl?: string | null
  primaryGroupId?: string | null
  name: string
  website: string
}

export type GroupRaceCompanyLeader = {
  amountUsd: number
  crunchbaseUrl: string
  logoUrl?: string | null
  name: string
  website: string
}

export type GroupRaceFrame = {
  leaders?: GroupRaceCompanyLeader[][]
  month: string
  values: number[]
}

export type IndustryGroupRace = {
  frames: GroupRaceFrame[]
  groupedTotalUsd: number
  groupNames: string[]
}

export type IndustryGroupRaceRow = { amountUsd: number; name: string; rank: number }

export type IndustryGroupRaceSnapshot = {
  month: string
  nextMonth: string
  rows: IndustryGroupRaceRow[]
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const monthSequence = (firstMonth: string, lastMonth: string) => {
  const [startYear, startMonth] = firstMonth.split('-').map(Number)
  const [endYear, endMonth] = lastMonth.split('-').map(Number)
  const months: string[] = []

  for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth);) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month === 13) {
      year += 1
      month = 1
    }
  }
  return months
}

export const buildIndustryGroupRace = (
  industries: GroupRaceIndustry[],
  groups: GroupRaceGroup[],
  companies: GroupRaceCompany[] = [],
): IndustryGroupRace => {
  const labelToGroupIndex = new Map<string, number>()
  groups.forEach((group, groupIndex) => {
    group.labels.forEach((label) => {
      if (!labelToGroupIndex.has(label)) labelToGroupIndex.set(label, groupIndex)
    })
  })

  const monthlyAdditions = new Map<string, number[]>()
  const companyMonthlyAdditions = new Map<string, Map<number, Map<string, GroupRaceCompanyLeader>>>()
  let groupedTotalUsd = 0

  industries.forEach((industry) => {
    const groupIndex = labelToGroupIndex.get(industry.name)
    if (groupIndex === undefined) return

    industry.days?.forEach(({ amountUsd, date }) => {
      const month = date.slice(0, 7)
      if (!MONTH_PATTERN.test(month) || !Number.isFinite(amountUsd) || amountUsd <= 0) return
      const additions = monthlyAdditions.get(month) ?? Array(groups.length).fill(0)
      additions[groupIndex] += amountUsd
      monthlyAdditions.set(month, additions)
      groupedTotalUsd += amountUsd
    })
  })

  companies.forEach((company) => {
    // Display eligibility is separate from funding allocation. Never move funding
    // between groups or select a new logo home as the animation progresses.
    const primaryIndex = groups.findIndex((group) => group.id === company.primaryGroupId)
    if (primaryIndex < 0) return

    company.days?.forEach(({ amountUsd, date }) => {
      const month = date.slice(0, 7)
      if (!MONTH_PATTERN.test(month) || !Number.isFinite(amountUsd) || amountUsd <= 0) return
      const monthAdditions = companyMonthlyAdditions.get(month) ?? new Map()
      const groupAdditions = monthAdditions.get(primaryIndex) ?? new Map()
      const current = groupAdditions.get(company.crunchbaseUrl)
      groupAdditions.set(company.crunchbaseUrl, {
        amountUsd: (current?.amountUsd ?? 0) + amountUsd,
        crunchbaseUrl: company.crunchbaseUrl,
        logoUrl: company.logoUrl,
        name: company.name,
        website: company.website,
      })
      monthAdditions.set(primaryIndex, groupAdditions)
      companyMonthlyAdditions.set(month, monthAdditions)
    })
  })

  const observedMonths = [...monthlyAdditions.keys()].sort()
  if (!observedMonths.length) {
    return { frames: [], groupedTotalUsd: 0, groupNames: groups.map((group) => group.name) }
  }

  const cumulative = Array(groups.length).fill(0) as number[]
  const companyCumulative = groups.map(() => new Map<string, GroupRaceCompanyLeader>())
  const frames = monthSequence(observedMonths[0], observedMonths.at(-1) as string).map((month) => {
    const additions = monthlyAdditions.get(month)
    if (additions) additions.forEach((amount, index) => { cumulative[index] += amount })
    companyMonthlyAdditions.get(month)?.forEach((groupAdditions, groupIndex) => {
      const groupCumulative = companyCumulative[groupIndex]
      groupAdditions.forEach((company, id) => {
        const current = groupCumulative.get(id)
        groupCumulative.set(id, { ...company, amountUsd: (current?.amountUsd ?? 0) + company.amountUsd })
      })
    })
    const leaders = companies.length ? companyCumulative.map((groupCompanies) => [...groupCompanies.values()]
      .sort((left, right) => right.amountUsd - left.amountUsd || left.name.localeCompare(right.name))
      .slice(0, 3)) : undefined
    return { ...(leaders ? { leaders } : {}), month, values: [...cumulative] }
  })

  return {
    frames,
    groupedTotalUsd,
    groupNames: groups.map((group) => group.name),
  }
}

export const industryGroupRaceLeaders = (
  race: IndustryGroupRace,
  position: number,
): Record<string, GroupRaceCompanyLeader[]> => {
  if (!race.frames.length) return {}
  const frameIndex = Math.max(0, Math.min(race.frames.length - 1, Math.ceil(position)))
  const leaders = race.frames[frameIndex].leaders ?? []
  return Object.fromEntries(race.groupNames.map((name, index) => [name, leaders[index] ?? []]))
}

export const interpolateIndustryGroupRace = (
  race: IndustryGroupRace,
  position: number,
): IndustryGroupRaceSnapshot => {
  if (!race.frames.length) return { month: '', nextMonth: '', rows: [] }

  const lastIndex = race.frames.length - 1
  const clampedPosition = Math.max(0, Math.min(lastIndex, position))
  const frameIndex = Math.floor(clampedPosition)
  const nextFrameIndex = Math.min(lastIndex, frameIndex + 1)
  const progress = clampedPosition - frameIndex
  const frame = race.frames[frameIndex]
  const nextFrame = race.frames[nextFrameIndex]

  const rows = race.groupNames
    .map((name, index) => ({
      amountUsd: frame.values[index] + (nextFrame.values[index] - frame.values[index]) * progress,
      index,
      name,
    }))
    .sort((left, right) => right.amountUsd - left.amountUsd || left.index - right.index)
    .map(({ amountUsd, name }, rank) => ({ amountUsd, name, rank }))

  return { month: frame.month, nextMonth: nextFrame.month, rows }
}

export const layoutIndustryGroupRaceRows = (
  race: IndustryGroupRace,
  snapshot: IndustryGroupRaceSnapshot,
): IndustryGroupRaceRow[] => {
  const rowByName = new Map(snapshot.rows.map((row) => [row.name, row]))
  return race.groupNames.flatMap((name) => {
    const row = rowByName.get(name)
    return row ? [row] : []
  })
}
