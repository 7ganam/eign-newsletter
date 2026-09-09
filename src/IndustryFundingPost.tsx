import { hierarchy, treemap, treemapSquarify } from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  buildIndustryGroupRace,
  industryGroupRaceLeaders,
  interpolateIndustryGroupRace,
  layoutIndustryGroupRaceRows,
} from './industryGroupRace'
import { advanceRaceMotion, createRaceMotion, raceMonthDuration, raceMonthGains, raceMonthHasFunding, raceMotionSettled } from './industryGroupRaceMotion'
import { WorkspaceNav } from './WorkspaceNav'

type ScopeKey = 'all' | 'lowerRisk'

type IndustryYearValue = {
  amountUsd: number
  roundAppearances: number
  year: number
}

type IndustryDayValue = {
  amountUsd: number
  date: string
}

type IndustryMonthValue = {
  amountUsd: number
  month: number
  year: number
}

type IndustryFunding = {
  days?: IndustryDayValue[]
  months?: IndustryMonthValue[]
  name: string
  totalUsd: number
  values: IndustryYearValue[]
}

type FundingScope = {
  companies?: Array<{
    crunchbaseUrl: string
    days?: IndustryDayValue[]
    industries: string[]
    logoUrl?: string | null
    primaryGroupId?: string | null
    primaryGroup?: string | null
    name: string
    website: string
  }>
  industries: IndustryFunding[]
  summary: {
    companiesWithRecordedRounds: number
    industries: number
    profiles: number
    recordedRounds: number
    recordedUsd: number
  }
}

type IndustryFundingResponse = {
  methodology: {
    allocation: string
    caveat: string
    currency: string
    dateField: string
    lowerRiskDefinition: string
    startYear: number
  }
  scopes: Record<ScopeKey, FundingScope>
  source: {
    provider: string
    updatedAt: string
  }
  version: number
  years: number[]
}

type IndustryTrendGroup = {
  id: string
  labels: string[]
  name: string
}

type IndustryTaxonomyResponse = {
  groups: IndustryTrendGroup[]
}

const SCOPE_LABELS: Record<ScopeKey, string> = {
  all: 'All successful pulls',
  lowerRisk: 'Lower-risk links',
}

const compactUsdFormatters = [0, 1].map((maximumFractionDigits) => new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits,
  notation: 'compact',
  style: 'currency',
}))

const exactUsdFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency',
})

const compactUsd = (amount: number) => amount > 0
  ? compactUsdFormatters[amount >= 1_000_000_000 ? 1 : 0].format(amount)
  : '—'

const exactUsd = (amount: number) => exactUsdFormatter.format(amount)

const raceUsdFormatters = [0, 1, 2, 3].map((maximumFractionDigits) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits,
}))
const raceUsd = (amount: number) => raceUsdFormatters[amount >= 1_000_000_000 ? 3 : amount >= 1_000_000 ? 2 : amount >= 1000 ? 1 : 0].format(amount)

const snapshotLabel = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'Unknown date'
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const INDUSTRY_COLORS = [
  '#155f4b', '#238268', '#39765f', '#4f765a', '#96691f', '#ad7829',
  '#984a32', '#b15f40', '#526d8f', '#627da0', '#745d88', '#836b92',
]

const industryColor = (name: string) => {
  const hash = [...name].reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0)
  return INDUSTRY_COLORS[Math.abs(hash) % INDUSTRY_COLORS.length]
}

const GROUP_RACE_COLORS = ['#e8b56b', '#82bca2', '#e19b83', '#91afd0', '#c9a4bd', '#a6ba85', '#7dbdbd', '#d8aa80']

const groupRaceColor = (name: string) => {
  const hash = [...name].reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0)
  return GROUP_RACE_COLORS[Math.abs(hash) % GROUP_RACE_COLORS.length]
}

const monthLabelFormatters = {
  month: new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }),
  year: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric' }),
  full: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC', year: 'numeric' }),
}

const monthLabel = (month: string, part?: 'month' | 'year') => {
  const date = new Date(`${month}-01T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return month
  return monthLabelFormatters[part ?? 'full'].format(date)
}

const companyInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase()

const companyFavicon = (website: string) => {
  if (!website.trim()) return ''
  try {
    const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`)
    return `${url.origin}/favicon.ico`
  } catch {
    return ''
  }
}

function IndustryFundingGroupBarRace({
  companies,
  groups,
  industries,
  recordedTotalUsd,
  scopeLabel,
}: {
  companies: NonNullable<FundingScope['companies']>
  groups: IndustryTrendGroup[]
  industries: IndustryFunding[]
  recordedTotalUsd: number
  scopeLabel: string
}) {
  const race = useMemo(() => buildIndustryGroupRace(industries, groups, companies), [companies, groups, industries])
  const finalPosition = Math.max(0, race.frames.length - 1)
  const [motion, setMotion] = useState(() => createRaceMotion(race))
  const motionRef = useRef(motion)
  const position = motion.position
  const [playing, setPlaying] = useState(true)
  const [motionEnabled, setMotionEnabled] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [focusView, setFocusView] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const focusButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!focusView) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    focusButtonRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusView(false)
      if (event.key !== 'Tab') return
      const controls = sectionRef.current?.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]')
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      focusButtonRef.current?.focus({ preventScroll: true })
    }
  }, [focusView])

  const updatePosition = (nextPosition: number) => {
    const clamped = Math.max(0, Math.min(finalPosition, nextPosition))
    const nextMotion = createRaceMotion(race, clamped)
    motionRef.current = nextMotion
    setMotion(nextMotion)
  }

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    updatePosition(0)
    setMotionEnabled(!prefersReducedMotion)
    setPlaying(!prefersReducedMotion && finalPosition > 0)
  }, [finalPosition, race])

  useEffect(() => {
    if (!playing || finalPosition <= 0) return
    let animationFrame = 0
    let previousTime = 0

    const tick = (time: number) => {
      if (!previousTime) {
        previousTime = time
        animationFrame = requestAnimationFrame(tick)
        return
      }
      const elapsed = time - previousTime
      previousTime = time
      const nextMotion = advanceRaceMotion(race, motionRef.current, elapsed, speed)
      motionRef.current = nextMotion
      setMotion(nextMotion)
      if (nextMotion.position >= finalPosition && raceMotionSettled(race, nextMotion)) {
        setPlaying(false)
        return
      }
      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrame)
  }, [finalPosition, playing, race, speed])

  const snapshot = useMemo(() => interpolateIndustryGroupRace(race, position), [position, race])
  const layoutRows = useMemo(() => layoutIndustryGroupRaceRows(race, snapshot), [race, snapshot])
  const monthGains = useMemo(() => raceMonthGains(race, position), [race, position])
  const companyLeaders = useMemo(() => industryGroupRaceLeaders(race, position), [position, race])
  const displayedMonth = monthGains.month
  const currentTotal = snapshot.rows.reduce((total, row) => total + row.amountUsd, 0)
  const quietMonth = !raceMonthHasFunding(race, position) && position < finalPosition
  const smallChanges = raceMonthDuration(race, position) < 600
  const expandingScale = motion.axisMax < motion.axisTarget * .985
  const monthGainTotal = Object.values(monthGains.gains).reduce((total, value) => total + value, 0)
  const coverage = recordedTotalUsd > 0 ? race.groupedTotalUsd / recordedTotalUsd * 100 : 0
  const groupedLabelCount = groups.reduce((total, group) => total + group.labels.length, 0)
  const firstMonth = race.frames[0]?.month ?? ''
  const lastMonth = race.frames.at(-1)?.month ?? ''

  const togglePlayback = () => {
    const finished = motionRef.current.position >= finalPosition && raceMotionSettled(race, motionRef.current)
    const nextPlaying = !playing || finished
    if (finished) updatePosition(0)
    if (nextPlaying) setMotionEnabled(true)
    setPlaying(nextPlaying)
  }

  if (!race.frames.length) {
    return <div className="industry-funding-error" role="status">No grouped funding dates are available for this scope.</div>
  }

  return (
    <section
      ref={sectionRef}
      className={`industry-group-race${motionEnabled ? ' industry-group-race--motion' : ''}${focusView ? ' industry-group-race--focus' : ''}`}
      aria-labelledby="industry-group-race-title"
      aria-modal={focusView || undefined}
      role={focusView ? 'dialog' : undefined}
      style={{ '--group-race-count': groups.length } as CSSProperties}
    >
      <header className="industry-group-race__header">
        <div>
          <span>YC × Crunchbase · {groups.length} technology groups</span>
          <h2 id="industry-group-race-title">The funding race</h2>
          <p>Cumulative funding · USD. Each company’s logo appears only in its primary group; green numbers show this month’s gain.</p>
        </div>
        <button
          className="industry-group-race__focus-button"
          ref={focusButtonRef}
          aria-pressed={focusView}
          onClick={() => setFocusView((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">{focusView ? '↙' : '⛶'}</span>
          {focusView ? 'Exit focus' : 'Focus view'}
        </button>
      </header>

      <div className="industry-group-race__controls">
        <button aria-label={playing ? 'Pause animation' : 'Play animation'} onClick={togglePlayback} type="button">
          <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>{playing ? 'Pause' : position >= finalPosition ? 'Replay' : 'Play'}
        </button>
        <button aria-label="Restart animation" onClick={() => { updatePosition(0); setMotionEnabled(true); setPlaying(true) }} type="button">↺</button>
        <label>
          <span>{monthLabel(firstMonth)}</span>
          <input
            aria-label="Funding race timeline"
            aria-valuetext={monthLabel(displayedMonth)}
            max={finalPosition}
            min="0"
            onChange={(event) => { setPlaying(false); setMotionEnabled(true); updatePosition(Number(event.target.value)) }}
            step="0.01"
            type="range"
            value={position}
            style={{ '--race-progress': `${finalPosition ? position / finalPosition * 100 : 0}%` } as CSSProperties}
          />
          <span>{monthLabel(lastMonth)}</span>
        </label>
        <label className="industry-group-race__speed">
          <span>Speed</span>
          <select aria-label="Animation speed" onChange={(event) => setSpeed(Number(event.target.value))} value={speed}>
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
          </select>
        </label>
      </div>

      <div className="industry-group-race__viewport">
        <div
          aria-label={`${monthLabel(displayedMonth)} cumulative funding ranking across ${groups.length} technology groups`}
          className="industry-group-race__stage"
          role="img"
        >
          <div className="industry-group-race__scoreboard" aria-hidden="true">
            <div className="industry-group-race__date">
              <span>{monthLabel(displayedMonth, 'month')}</span>
              <strong>{monthLabel(displayedMonth, 'year')}</strong>
            </div>
            <div className="industry-group-race__total">
              <span><i data-playing={playing} />{playing ? motion.overtake ? 'Following an overtake' : quietMonth ? 'Quiet month · fast-forwarding' : expandingScale ? 'Scale expanding' : smallChanges ? 'Small changes · faster playback' : 'In motion' : position >= finalPosition ? 'Final frame' : 'Paused'}</span>
              <strong>{raceUsd(currentTotal)}</strong>
              <small>+{raceUsd(monthGainTotal)} this month</small>
            </div>
            <div className="industry-group-race__activity">
              {motion.overtake
                ? <><b>↑ {motion.overtake.fromRank + 1} → {motion.overtake.toRank + 1}</b> {motion.overtake.name}</>
                : <><span>Adaptive pace</span> Quiet months pass faster. Overtakes get more time.</>}
            </div>
          </div>

          <div className="industry-group-race__grid" aria-hidden="true">
            {[.25, .5, .75, 1].map((mark) => (
              <span key={mark} style={{ left: `${mark * 100}%` }}>
                <i />
                <b>{compactUsd(motion.axisMax * mark)}</b>
              </span>
            ))}
          </div>

          <div className="industry-group-race__rows">
            {layoutRows.map((row) => {
              const share = Math.max(0, Math.min(1, row.amountUsd / motion.axisMax))
              const monthGain = monthGains.gains[row.name] ?? 0
              const leaders = companyLeaders[row.name] ?? []
              const style = {
                '--group-race-color': groupRaceColor(row.name),
                '--group-race-rank': row.rank,
                '--group-race-position': motion.ranks[row.name] ?? row.rank,
                '--group-race-share': share,
              } as CSSProperties
              return (
                <div className="industry-group-race__row" key={row.name} style={style} data-leading={row.rank < 3} data-funded={row.amountUsd > 0} data-overtaking={motion.overtake?.name === row.name}>
                  <b className="industry-group-race__rank">{String(row.rank + 1).padStart(2, '0')}</b>
                  <span className="industry-group-race__name" title={row.name}>{row.name}</span>
                  <span className="industry-group-race__lane">
                    <span className="industry-group-race__bar"><i /></span>
                    <span className="industry-group-race__tip">
                      {leaders.length > 0 && <span aria-label={`Top funded companies in ${row.name}`} className="industry-group-race__logos">
                        {leaders.map((company) => {
                          const faviconUrl = companyFavicon(company.website)
                          const logoUrl = company.logoUrl || faviconUrl
                          return (
                            <span
                              aria-label={`${company.name}, ${exactUsd(company.amountUsd)} recorded funding; primary group ${row.name}`}
                              className="industry-group-race__logo"
                              key={company.crunchbaseUrl}
                              role="img"
                              title={`${company.name} · ${exactUsd(company.amountUsd)} recorded funding · primary group ${row.name}`}
                            >
                              <span aria-hidden="true">{companyInitials(company.name)}</span>
                              {logoUrl && <img
                                alt=""
                                decoding="async"
                                onError={(event) => {
                                  if (faviconUrl && logoUrl !== faviconUrl && !event.currentTarget.dataset.fallbackAttempted) {
                                    event.currentTarget.dataset.fallbackAttempted = 'true'
                                    event.currentTarget.src = faviconUrl
                                    return
                                  }
                                  event.currentTarget.hidden = true
                                }}
                                src={logoUrl}
                              />}
                            </span>
                          )
                        })}
                      </span>}
                      <strong className="industry-group-race__value" title={`${exactUsd(row.amountUsd)} cumulative; ${exactUsd(monthGain)} added this month`}>
                        {raceUsd(row.amountUsd)}
                        {monthGain > 0 && <em>+{raceUsd(monthGain)}</em>}
                      </strong>
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <p className="industry-group-race__note">
        <span>{scopeLabel} · {coverage.toFixed(1)}% funding coverage</span>
        Monthly cumulative funding across {groupedLabelCount.toLocaleString()} grouped labels. Each row shows up to three companies assigned to that primary group, ranked by their recorded funding. Industry totals still use fractional label allocation across all groups. Movement between months is interpolated; playback pace varies. The shared zero-based scale expands as funding grows. Vague labels remain excluded.
      </p>
    </section>
  )
}

const FLOURISH_VISUALISATION_URL = 'https://flo.uri.sh/visualisation/30164351/embed'
const FLOURISH_PUBLIC_URL = 'https://public.flourish.studio/visualisation/30164351/'
const FLOURISH_SMOOTHED_VISUALISATION_URL = 'https://flo.uri.sh/visualisation/30164483/embed?v=all-time-smoothed-30d'
const FLOURISH_SMOOTHED_PUBLIC_URL = 'https://public.flourish.studio/visualisation/30164483/'

function IndustryFundingBarRace() {
  return (
    <section className="industry-funding-flourish" aria-labelledby="industry-funding-race-title">
      <header className="industry-funding-flourish__meta">
        <div>
          <span>Professional hosted animation</span>
          <strong id="industry-funding-race-title">Daily industry funding race</strong>
        </div>
        <a href={FLOURISH_PUBLIC_URL} rel="noreferrer" target="_blank">Open in Flourish ↗</a>
      </header>
      <iframe
        allowFullScreen
        className="industry-funding-flourish__frame"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        src={FLOURISH_VISUALISATION_URL}
        title="YC industry funding share bar chart race for 2025"
      />
      <p className="industry-funding-flourish__note">Hosted snapshot: lower-risk YC-to-Crunchbase matches · 2025 · 365 daily cumulative percentage frames.</p>
    </section>
  )
}

function IndustryFundingSmoothedBarRace() {
  return (
    <section className="industry-funding-flourish industry-funding-flourish--smoothed" aria-labelledby="industry-funding-smoothed-race-title">
      <header className="industry-funding-flourish__meta">
        <div>
          <span>Continuous history · 30-day visual smoothing</span>
          <strong id="industry-funding-smoothed-race-title">All-time cumulative industry funding race</strong>
        </div>
        <a href={FLOURISH_SMOOTHED_PUBLIC_URL} rel="noreferrer" target="_blank">Open in Flourish ↗</a>
      </header>
      <iframe
        allowFullScreen
        className="industry-funding-flourish__frame"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        src={FLOURISH_SMOOTHED_VISUALISATION_URL}
        title="YC industry funding all-time smoothed cumulative USD bar chart race from 2005 to 2026"
      />
      <p className="industry-funding-flourish__note">Hosted snapshot: lower-risk YC-to-Crunchbase matches · Jun 2005–Aug 2026 · continuous two-week frames in USD millions · no annual resets.</p>
    </section>
  )
}

type YearIndustry = {
  amountUsd: number
  name: string
  roundAppearances: number
}

function IndustryYearTreemap({
  industries,
  onSelect,
  selectedIndustry,
  year,
}: {
  industries: YearIndustry[]
  onSelect: (industry: string) => void
  selectedIndustry: string
  year: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ height: 560, width: 900 })

  useEffect(() => {
    if (!containerRef.current) return
    const update = () => {
      const width = containerRef.current?.clientWidth ?? 0
      if (width) setDimensions({ height: Math.max(420, Math.min(620, width * .64)), width })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const leaves = useMemo(() => {
    const root = hierarchy<{ amountUsd?: number; children?: YearIndustry[]; name: string }>({
      children: industries,
      name: 'Industries',
    })
      .sum((datum) => datum.amountUsd ?? 0)
      .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))
    return treemap<{ amountUsd?: number; children?: YearIndustry[]; name: string }>()
      .tile(treemapSquarify)
      .size([dimensions.width, dimensions.height])
      .paddingInner(2)
      .round(true)(root)
      .leaves()
  }, [dimensions, industries])

  return (
    <div className="industry-year-treemap" ref={containerRef}>
      <svg aria-label={`${year} funding composition across ${industries.length} industries`} height={dimensions.height} role="img" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} width={dimensions.width}>
        {leaves.map((leaf) => {
          const datum = leaf.data as unknown as YearIndustry
          const width = leaf.x1 - leaf.x0
          const height = leaf.y1 - leaf.y0
          const showName = width >= 92 && height >= 42
          const showAmount = width >= 72 && height >= 58
          const selected = datum.name === selectedIndustry
          return (
            <g
              aria-label={`${datum.name}: ${exactUsd(datum.amountUsd)} in ${year}`}
              className={selected ? 'is-selected' : ''}
              key={datum.name}
              onClick={() => onSelect(datum.name)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(datum.name)
                }
              }}
              role="button"
              tabIndex={0}
              transform={`translate(${leaf.x0} ${leaf.y0})`}
            >
              <title>{datum.name} · {exactUsd(datum.amountUsd)} · {datum.roundAppearances} round appearances</title>
              <rect fill={industryColor(datum.name)} height={height} rx="1" width={width} />
              {showName && <text className="industry-year-treemap__name" x="10" y="20">{datum.name.length > Math.floor(width / 7) ? `${datum.name.slice(0, Math.max(7, Math.floor(width / 7) - 1))}…` : datum.name}</text>}
              {showAmount && <text className="industry-year-treemap__amount" x="10" y="37">{compactUsd(datum.amountUsd)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function IndustryFundingPost() {
  const [data, setData] = useState<IndustryFundingResponse | null>(null)
  const [error, setError] = useState('')
  const [trendGroups, setTrendGroups] = useState<IndustryTrendGroup[] | null>(null)
  const [trendGroupsError, setTrendGroupsError] = useState('')
  const [scopeKey, setScopeKey] = useState<ScopeKey>('lowerRisk')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedYear, setSelectedYear] = useState(2025)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Funding by industry and year · EIGN'
    fetch('/api/posts/yc-industry-funding-by-year')
      .then(async (response) => {
        const body = await response.json().catch(() => null) as IndustryFundingResponse | { error?: string } | null
        if (!response.ok) throw new Error(body && 'error' in body ? body.error : `The data service returned ${response.status}.`)
        return body as IndustryFundingResponse
      })
      .then((body) => {
        setData(body)
        const latestYear = body.years.at(-1) ?? new Date().getUTCFullYear()
        setSelectedYear(body.years.includes(latestYear - 1) ? latestYear - 1 : latestYear)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the industry funding post.'))
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    fetch('/api/yc-industry-taxonomy')
      .then(async (response) => {
        const body = await response.json().catch(() => null) as IndustryTaxonomyResponse | { error?: string } | null
        if (!response.ok) throw new Error(body && 'error' in body ? body.error : `The taxonomy service returned ${response.status}.`)
        if (!body || !('groups' in body) || !Array.isArray(body.groups)) throw new Error('The taxonomy service returned no groups.')
        return body as IndustryTaxonomyResponse
      })
      .then((body) => setTrendGroups(body.groups))
      .catch((reason) => setTrendGroupsError(reason instanceof Error ? reason.message : 'Unable to load the trend groups.'))
  }, [])

  const scope = data?.scopes[scopeKey]
  const filteredIndustries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const rows = scope?.industries ?? []
    return normalizedQuery ? rows.filter((industry) => industry.name.toLocaleLowerCase().includes(normalizedQuery)) : rows
  }, [query, scope])
  const displayedIndustries = showAll ? filteredIndustries : filteredIndustries.slice(0, 60)

  const annualTotals = useMemo(() => new Map((data?.years ?? []).map((year) => [
    year,
    (scope?.industries ?? []).reduce(
      (total, industry) => total + (industry.values.find((value) => value.year === year)?.amountUsd ?? 0),
      0,
    ),
  ])), [data?.years, scope])
  const yearIndustries = useMemo<YearIndustry[]>(() => (scope?.industries ?? [])
    .flatMap((industry) => {
      const value = industry.values.find((entry) => entry.year === selectedYear)
      return value ? [{ amountUsd: value.amountUsd, name: industry.name, roundAppearances: value.roundAppearances }] : []
    })
    .sort((left, right) => right.amountUsd - left.amountUsd || left.name.localeCompare(right.name)), [scope, selectedYear])
  const selectedYearTotal = annualTotals.get(selectedYear) ?? 0
  const selectedYearIndustry = yearIndustries.find((industry) => industry.name === selectedIndustry)
  const maxAnnualTotal = Math.max(1, ...annualTotals.values())
  const maxCellAmount = useMemo(() => Math.max(
    1,
    ...(scope?.industries.flatMap((industry) => industry.values.map((value) => value.amountUsd)) ?? []),
  ), [scope])

  useEffect(() => {
    if (!yearIndustries.length) {
      setSelectedIndustry('')
      return
    }
    if (!yearIndustries.some((industry) => industry.name === selectedIndustry)) {
      setSelectedIndustry(yearIndustries[0].name)
    }
  }, [selectedIndustry, yearIndustries])

  const changeScope = (nextScope: ScopeKey) => {
    setScopeKey(nextScope)
    setShowAll(false)
    setSelectedIndustry('')
  }

  return (
    <div className="app-shell industry-funding-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem directories</span></div>
        <WorkspaceNav active="posts" />
      </header>

      <main className="industry-funding-main">
        <div className="industry-funding-navline">
          <a className="industry-funding-back" href="/posts">← All posts</a>
          <a className="industry-funding-group-link" href="/industry-taxonomy">Group overlapping labels →</a>
        </div>
        <section className="industry-funding-hero">
          <div className="industry-funding-hero__copy">
            <span>YC × Crunchbase · capital chronology</span>
            <h1>The annual shape of startup capital.</h1>
            <p>Choose a year to see every funded industry as part of the market—not a single-theme or AI-only view.</p>
          </div>
          <div className="industry-funding-hero__stamp">
            <span>Snapshot</span>
            <strong>{data ? snapshotLabel(data.source.updatedAt) : 'Loading…'}</strong>
            <small>2026 is a partial year</small>
          </div>
        </section>

        {error && <div className="industry-funding-error" role="alert">{error}</div>}
        {!data && !error && <div className="industry-funding-loading"><span /> Building the capital chronology…</div>}

        {data && scope && <>
          <section className="industry-funding-metrics" aria-label={`${SCOPE_LABELS[scopeKey]} summary`}>
            <div><span>Recorded funding</span><strong>{compactUsd(scope.summary.recordedUsd)}</strong><small>USD rounds with known amounts</small></div>
            <div><span>Industry labels</span><strong>{scope.summary.industries.toLocaleString()}</strong><small>Every label remains searchable</small></div>
            <div><span>Funding rounds</span><strong>{scope.summary.recordedRounds.toLocaleString()}</strong><small>From {scope.summary.companiesWithRecordedRounds.toLocaleString()} companies</small></div>
            <div><span>Profiles in scope</span><strong>{scope.summary.profiles.toLocaleString()}</strong><small>{scopeKey === 'lowerRisk' ? 'Evidence-filtered mappings' : 'All completed pulls'}</small></div>
          </section>

          <section className="industry-funding-workbench">
            <header className="industry-funding-toolbar">
              <div>
                <span>Mapping scope</span>
                <div className="industry-funding-scope" role="group" aria-label="YC to Crunchbase mapping scope">
                  {(Object.keys(SCOPE_LABELS) as ScopeKey[]).map((key) => (
                    <button className={scopeKey === key ? 'active' : ''} key={key} onClick={() => changeScope(key)} type="button">{SCOPE_LABELS[key]}</button>
                  ))}
                </div>
              </div>
              <label className="industry-funding-search">
                <span>Filter the data table</span>
                <input aria-label="Filter the data table by industry" onChange={(event) => setQuery(event.target.value)} placeholder="Software, biotech, fintech…" type="search" value={query} />
              </label>
            </header>

            {!trendGroups && !trendGroupsError && <div className="industry-funding-loading"><span /> Building the grouped funding race…</div>}
            {trendGroupsError && <div className="industry-funding-error" role="alert">{trendGroupsError}</div>}
            {trendGroups && <IndustryFundingGroupBarRace
              companies={scope.companies ?? []}
              groups={trendGroups}
              industries={scope.industries}
              recordedTotalUsd={scope.summary.recordedUsd}
              scopeLabel={SCOPE_LABELS[scopeKey]}
            />}

            <IndustryFundingBarRace />
            <IndustryFundingSmoothedBarRace />

            <section className="industry-year-selector" aria-label="Choose a funding year">
              <div className="industry-year-selector__intro">
                <span>Year selector</span>
                <strong>{selectedYear}</strong>
                <small>{selectedYear === data.years.at(-1) ? 'Partial year' : 'Full calendar year'}</small>
              </div>
              <div className="industry-year-selector__bars">
                {data.years.map((year) => {
                  const amount = annualTotals.get(year) ?? 0
                  const height = Math.max(4, amount / maxAnnualTotal * 100)
                  return (
                    <button aria-label={`${year}: ${exactUsd(amount)}`} aria-pressed={selectedYear === year} className={selectedYear === year ? 'active' : ''} key={year} onClick={() => setSelectedYear(year)} title={`${year} · ${exactUsd(amount)}`} type="button">
                      <span style={{ height: `${height}%` }} />
                      <b>{year}</b>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="industry-year-heading">
              <div><span>{selectedYear} composition</span><h2>{compactUsd(selectedYearTotal)} across {yearIndustries.length.toLocaleString()} industries</h2></div>
              <p>Area represents each industry’s share of disclosed funding. Select any territory or ranked row to inspect it.</p>
            </div>

            <div className="industry-year-composition">
              <IndustryYearTreemap industries={yearIndustries} onSelect={setSelectedIndustry} selectedIndustry={selectedIndustry} year={selectedYear} />
              <aside className="industry-year-ranking">
                <header>
                  <div><span>Industry ranking</span><strong>{selectedYear}</strong></div>
                  <small>{yearIndustries.length.toLocaleString()} funded</small>
                </header>
                <div className="industry-year-ranking__selected">
                  <i style={{ background: industryColor(selectedYearIndustry?.name ?? '') }} />
                  <div><span>{selectedYearIndustry?.name ?? 'Select an industry'}</span><strong>{compactUsd(selectedYearIndustry?.amountUsd ?? 0)}</strong></div>
                  <small>{selectedYearIndustry && selectedYearTotal ? `${(selectedYearIndustry.amountUsd / selectedYearTotal * 100).toFixed(1)}%` : '—'}</small>
                </div>
                <ol>
                  {yearIndustries.map((industry, index) => (
                    <li className={selectedIndustry === industry.name ? 'is-selected' : ''} key={industry.name}>
                      <button onClick={() => setSelectedIndustry(industry.name)} type="button">
                        <b>{String(index + 1).padStart(2, '0')}</b>
                        <span><i style={{ background: industryColor(industry.name), width: `${Math.max(2, industry.amountUsd / (yearIndustries[0]?.amountUsd ?? 1) * 100)}%` }} />{industry.name}</span>
                        <strong>{compactUsd(industry.amountUsd)}</strong>
                      </button>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>
          </section>

          <section className="industry-funding-matrix-section">
            <header>
              <div><span>Annual funding matrix</span><h2>Every industry, every year</h2></div>
              <div className="industry-funding-matrix-actions">
                <span>{displayedIndustries.length.toLocaleString()} of {filteredIndustries.length.toLocaleString()} industries</span>
                {filteredIndustries.length > 60 && <button onClick={() => setShowAll((current) => !current)} type="button">{showAll ? 'Show top 60' : `Show all ${filteredIndustries.length.toLocaleString()}`}</button>}
              </div>
            </header>
            <div className="industry-funding-matrix" role="region" aria-label="Industry funding by year table" tabIndex={0}>
              <table>
                <thead><tr><th>Industry</th><th>Total</th>{data.years.map((year) => <th key={year}>{year}</th>)}</tr></thead>
                <tbody>
                  {displayedIndustries.map((industry) => {
                    const values = new Map(industry.values.map((value) => [value.year, value]))
                    return (
                      <tr className={selectedIndustry === industry.name ? 'is-selected' : ''} key={industry.name}>
                        <th><button onClick={() => setSelectedIndustry(industry.name)} type="button">{industry.name}</button></th>
                        <td className="industry-funding-total">{compactUsd(industry.totalUsd)}</td>
                        {data.years.map((year) => {
                          const value = values.get(year)
                          const intensity = value ? Math.max(0.08, Math.log10(value.amountUsd + 1) / Math.log10(maxCellAmount + 1)) : 0
                          const style = { '--heat-alpha': intensity.toFixed(3) } as CSSProperties
                          return <td className={value ? 'has-value' : ''} key={year} style={style} title={`${industry.name} · ${year}: ${exactUsd(value?.amountUsd ?? 0)}${value ? ` · ${value.roundAppearances} round appearances` : ''}`}>{compactUsd(value?.amountUsd ?? 0)}</td>
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!displayedIndustries.length && <div className="industry-funding-empty">No industry matches “{query}”.</div>}
            </div>
          </section>

          <aside className="industry-funding-notes" aria-label="Methodology and data caveats">
            <div><span>01 · Attribution</span><p>{data.methodology.allocation}</p></div>
            <div><span>02 · Scope</span><p>Only disclosed USD round amounts announced from {data.methodology.startYear} onward are included. Undisclosed and non-USD rounds are omitted.</p></div>
            <div><span>03 · Identity</span><p>{data.methodology.caveat}</p></div>
            <div><span>04 · Interpretation</span><p>Funding is capital raised, not company valuation. Industry labels overlap conceptually even though amounts are fractionally allocated.</p></div>
          </aside>
        </>}
      </main>
    </div>
  )
}
