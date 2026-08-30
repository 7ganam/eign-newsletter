import { useEffect, useMemo, useState } from 'react'
import { INFLUENCERS, INFLUENCERS_VERIFIED_AT, type Influencer } from './influencerData'
import {
  LINKEDIN_FOLLOWERS,
  LINKEDIN_FOLLOWERS_UPDATED_AT,
  type LinkedInFollowerSnapshot,
} from './linkedinFollowerData'

type SortKey = 'priority' | 'followers' | 'name' | 'country' | 'lane' | 'organisation'
type SortDirection = 'asc' | 'desc'
type SortPreset = 'priority' | 'followers' | 'name' | 'country' | 'custom'

const DEFAULT_SORT_DIRECTIONS: Record<SortKey, SortDirection> = {
  priority: 'desc',
  followers: 'desc',
  name: 'asc',
  country: 'asc',
  lane: 'asc',
  organisation: 'asc',
}

const COUNTRY_ORDER: Influencer['country'][] = [
  'Egypt',
  'Saudi Arabia',
  'United Arab Emirates',
  'Qatar',
  'Bahrain',
  'Kuwait',
  'Oman',
  'Regional',
]

const COUNTRY_LABELS: Record<Influencer['country'], string> = {
  Egypt: 'Egypt',
  'Saudi Arabia': 'Saudi Arabia',
  'United Arab Emirates': 'UAE',
  Qatar: 'Qatar',
  Bahrain: 'Bahrain',
  Kuwait: 'Kuwait',
  Oman: 'Oman',
  Regional: 'Regional',
}

const COUNTRY_CODES: Record<Influencer['country'], string> = {
  Egypt: 'EG',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  Qatar: 'QA',
  Bahrain: 'BH',
  Kuwait: 'KW',
  Oman: 'OM',
  Regional: 'ME',
}

const COUNTRY_COUNTS = new Map(COUNTRY_ORDER.map((item) => [
  item,
  INFLUENCERS.filter((influencer) => influencer.country === item).length,
]))

const LANES = [...new Set(INFLUENCERS.map((influencer) => influencer.lane))]
  .sort((left, right) => left.localeCompare(right))

const PRIORITY_COUNT = INFLUENCERS.filter((influencer) => influencer.priority).length
const ARABIC_COUNT = INFLUENCERS.filter((influencer) => influencer.arabicOrBilingual).length
const FOLLOWER_COVERAGE = INFLUENCERS.filter((influencer) => LINKEDIN_FOLLOWERS[influencer.linkedinUrl]?.count != null).length

const UNKNOWN_FOLLOWER_SNAPSHOT: LinkedInFollowerSnapshot = {
  count: null,
  observedAt: null,
  status: 'not-verified',
}

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase()

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.1 8.2v5.7M6.1 5.9v.1M9.2 13.9V8.2m0 2.4c.5-1.5 4.4-1.9 4.4 1v2.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  )
}

type SortableHeaderProps = {
  activeSortKey: SortKey
  className: string
  direction: SortDirection
  label: string
  onSort: (key: SortKey) => void
  sortKey: SortKey
}

function SortableHeader({ activeSortKey, className, direction, label, onSort, sortKey }: SortableHeaderProps) {
  const active = activeSortKey === sortKey
  const nextDirection = active
    ? direction === 'asc' ? 'desc' : 'asc'
    : DEFAULT_SORT_DIRECTIONS[sortKey]

  return (
    <th className={className} aria-sort={active ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
      <button
        className="influencer-sort-button"
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort ${label} ${nextDirection === 'asc' ? 'ascending' : 'descending'}`}
      >
        <span>{label}</span>
        <span className={`influencer-sort-arrow${active ? ' is-active' : ''}`} aria-hidden="true">
          {active ? direction === 'asc' ? '↑' : '↓' : '↕'}
        </span>
      </button>
    </th>
  )
}

const formatVerifiedDate = (date: string) => new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${date}T00:00:00Z`))

const formatFollowerCount = (count: number) => new Intl.NumberFormat('en').format(count)

export function Influencers() {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState<Influencer['country'] | 'all'>('all')
  const [lane, setLane] = useState<Influencer['lane'] | 'all'>('all')
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [arabicOnly, setArabicOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Influencer index · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return INFLUENCERS
      .filter((influencer) => country === 'all' || influencer.country === country)
      .filter((influencer) => lane === 'all' || influencer.lane === lane)
      .filter((influencer) => !priorityOnly || influencer.priority)
      .filter((influencer) => !arabicOnly || influencer.arabicOrBilingual)
      .filter((influencer) => !normalizedQuery || [
        influencer.name,
        influencer.country,
        influencer.lane,
        influencer.organisation,
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)))
      .sort((left, right) => {
        let comparison = 0

        if (sortKey === 'followers') {
          const leftFollowers = LINKEDIN_FOLLOWERS[left.linkedinUrl]?.count ?? -1
          const rightFollowers = LINKEDIN_FOLLOWERS[right.linkedinUrl]?.count ?? -1
          if (leftFollowers === -1 && rightFollowers !== -1) return 1
          if (rightFollowers === -1 && leftFollowers !== -1) return -1
          comparison = leftFollowers - rightFollowers
        } else if (sortKey === 'name') {
          comparison = left.name.localeCompare(right.name)
        } else if (sortKey === 'country') {
          comparison = COUNTRY_ORDER.indexOf(left.country) - COUNTRY_ORDER.indexOf(right.country)
        } else if (sortKey === 'lane') {
          comparison = left.lane.localeCompare(right.lane)
        } else if (sortKey === 'organisation') {
          comparison = left.organisation.localeCompare(right.organisation)
        } else {
          comparison = Number(left.priority) - Number(right.priority)
        }

        return comparison * (sortDirection === 'asc' ? 1 : -1)
          || (sortKey === 'priority' ? COUNTRY_ORDER.indexOf(left.country) - COUNTRY_ORDER.indexOf(right.country) : 0)
          || left.name.localeCompare(right.name)
      })
  }, [arabicOnly, country, lane, priorityOnly, query, sortDirection, sortKey])

  const sortPreset: SortPreset = sortKey === 'priority' && sortDirection === 'desc'
    ? 'priority'
    : sortKey === 'followers' && sortDirection === 'desc'
      ? 'followers'
      : sortKey === 'country' && sortDirection === 'asc'
        ? 'country'
        : sortKey === 'name' && sortDirection === 'asc'
          ? 'name'
          : 'custom'

  const filtersActive = Boolean(query || country !== 'all' || lane !== 'all' || priorityOnly || arabicOnly || sortKey !== 'priority' || sortDirection !== 'desc')

  const applySortPreset = (preset: Exclude<SortPreset, 'custom'>) => {
    setSortKey(preset)
    setSortDirection(DEFAULT_SORT_DIRECTIONS[preset])
  }

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection(DEFAULT_SORT_DIRECTIONS[key])
  }

  const clearFilters = () => {
    setQuery('')
    setCountry('all')
    setLane('all')
    setPriorityOnly(false)
    setArabicOnly(false)
    setSortKey('priority')
    setSortDirection('desc')
  }

  return (
    <div className="app-shell influencers-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem people</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/visualisations">Funding map</a>
          <a href="/software-companies">Software companies</a>
          <a href="/influencers" aria-current="page">Influencers</a>
          <a href="/research">Startups</a>
        </nav>
      </header>

      <main className="influencers-main">
        <section className="influencer-country-index" aria-label="People by market">
          {COUNTRY_ORDER.map((item) => {
            const count = COUNTRY_COUNTS.get(item) ?? 0
            const active = country === item
            return (
              <button
                key={item}
                className={`influencer-country-index__item country-${COUNTRY_CODES[item].toLowerCase()}${active ? ' is-active' : ''}`}
                onClick={() => setCountry(active ? 'all' : item)}
                aria-pressed={active}
              >
                <span>{COUNTRY_CODES[item]}</span>
                <strong>{count}</strong>
                <small>{COUNTRY_LABELS[item]}</small>
              </button>
            )
          })}
        </section>

        <section className="influencer-directory" aria-labelledby="directory-title">
          <header className="influencer-directory__header">
            <div>
              <h2 id="directory-title">Influencer directory</h2>
              <p>
                Directory verified {formatVerifiedDate(INFLUENCERS_VERIFIED_AT)} · Follower lookup checked {formatVerifiedDate(LINKEDIN_FOLLOWERS_UPDATED_AT)} · {FOLLOWER_COVERAGE} / {INFLUENCERS.length} counts available
              </p>
            </div>
            <span>{results.length} / {INFLUENCERS.length}</span>
          </header>

          <div className="influencer-filters">
            <label className="influencer-search">
              <span className="sr-only">Search people and organisations</span>
              <SearchIcon />
              <input value={query} type="search" placeholder="Search people, funds, startups, or roles" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              <span>Market</span>
              <select value={country} onChange={(event) => setCountry(event.target.value as Influencer['country'] | 'all')}>
                <option value="all">All markets</option>
                {COUNTRY_ORDER.map((item) => <option key={item} value={item}>{COUNTRY_LABELS[item]}</option>)}
              </select>
            </label>
            <label>
              <span>Influence lane</span>
              <select value={lane} onChange={(event) => setLane(event.target.value as Influencer['lane'] | 'all')}>
                <option value="all">All lanes</option>
                {LANES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sortPreset} onChange={(event) => applySortPreset(event.target.value as Exclude<SortPreset, 'custom'>)}>
                <option value="priority">Priority first</option>
                <option value="followers">Followers, high–low</option>
                <option value="country">Market, then name</option>
                <option value="name">Name A–Z</option>
                <option value="custom" disabled>Header sort</option>
              </select>
            </label>
            <div className="influencer-filter-toggles" aria-label="Quick filters">
              <button className={priorityOnly ? 'is-active' : ''} aria-pressed={priorityOnly} onClick={() => setPriorityOnly((current) => !current)}>Priority</button>
              <button className={arabicOnly ? 'is-active' : ''} aria-pressed={arabicOnly} onClick={() => setArabicOnly((current) => !current)}>Arabic / bilingual</button>
              {filtersActive && <button className="influencer-clear" onClick={clearFilters}>Clear</button>}
            </div>
          </div>

          <div className="influencer-table-wrap">
            <table className="influencer-table">
              <thead>
                <tr>
                  <SortableHeader className="influencer-cell--person" label="Person" sortKey="name" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader className="influencer-cell--market" label="Market" sortKey="country" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader className="influencer-cell--lane" label="Influence lane" sortKey="lane" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader className="influencer-cell--platform" label="Current platform" sortKey="organisation" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader className="influencer-cell--followers" label="LinkedIn followers" sortKey="followers" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <SortableHeader className="influencer-cell--signals" label="Signals" sortKey="priority" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                  <th className="influencer-cell--link"><span className="sr-only">LinkedIn</span></th>
                </tr>
              </thead>
              <tbody>
                {results.map((influencer, index) => {
                  const followerSnapshot = LINKEDIN_FOLLOWERS[influencer.linkedinUrl] ?? UNKNOWN_FOLLOWER_SNAPSHOT
                  const formattedFollowers = followerSnapshot.count == null
                    ? '—'
                    : `${followerSnapshot.precision === 'rounded' ? '≈' : ''}${formatFollowerCount(followerSnapshot.count)}`
                  const followerLabel = followerSnapshot.count == null
                    ? 'LinkedIn follower count not verified'
                    : `${followerSnapshot.precision === 'rounded' ? 'Approximately ' : ''}${formatFollowerCount(followerSnapshot.count)} LinkedIn followers; ${followerSnapshot.source === 'search-index' ? 'public search-index snapshot checked' : 'observed'} ${formatVerifiedDate(followerSnapshot.observedAt!)}`

                  return (
                  <tr key={influencer.linkedinUrl}>
                    <td className="influencer-cell--person">
                      <div className="influencer-person">
                        <span className={`influencer-avatar country-${COUNTRY_CODES[influencer.country].toLowerCase()}`}>{initials(influencer.name)}</span>
                        <span>
                          <a
                            className="influencer-person-profile"
                            href={influencer.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View ${influencer.name} on LinkedIn`}
                          >
                            <strong>{influencer.name}</strong>
                            <i aria-hidden="true">↗</i>
                          </a>
                          <small>#{String(index + 1).padStart(3, '0')}</small>
                        </span>
                      </div>
                    </td>
                    <td className="influencer-cell--market"><span className={`influencer-market country-${COUNTRY_CODES[influencer.country].toLowerCase()}`}><i />{COUNTRY_LABELS[influencer.country]}</span></td>
                    <td className="influencer-cell--lane"><span className="influencer-lane">{influencer.lane}</span></td>
                    <td className="influencer-cell--platform"><strong className="influencer-organisation">{influencer.organisation}</strong></td>
                    <td className="influencer-cell--followers">
                      <span className={`influencer-followers${followerSnapshot.count == null ? ' is-unverified' : ''}`} aria-label={followerLabel} title={followerLabel}>
                        <strong>{formattedFollowers}</strong>
                        <small>{followerSnapshot.count == null ? 'Not verified' : followerSnapshot.precision === 'rounded' ? 'indexed estimate' : 'followers'}</small>
                      </span>
                    </td>
                    <td className="influencer-cell--signals">
                      <div className="influencer-signals">
                        {influencer.priority && <span className="signal-priority">Priority</span>}
                        {influencer.arabicOrBilingual && <span>AR / EN</span>}
                        {!influencer.priority && !influencer.arabicOrBilingual && <span className="signal-muted">Verified</span>}
                      </div>
                    </td>
                    <td className="influencer-cell--link"><a className="influencer-linkedin" href={influencer.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`Open ${influencer.name} on LinkedIn`}><LinkedInIcon /></a></td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            {!results.length && (
              <div className="influencer-empty">
                <strong>No matching people</strong>
                <span>Try a broader market, lane, or search term.</span>
                <button onClick={clearFilters}>Reset filters</button>
              </div>
            )}
          </div>
        </section>

        <footer className="influencer-method">
          <span><strong>Included</strong> Capital allocators, scaled founders, program leaders, and primary research voices</span>
          <span><strong>Excluded</strong> Generic business creators without a verifiable startup track record</span>
          <span><strong>Scope</strong> Egypt, Saudi Arabia, UAE, Qatar, Bahrain, Kuwait, and Oman</span>
          <span><strong>Follower counts</strong> Dated public snapshots; unavailable or ambiguous values remain unverified</span>
        </footer>
      </main>
    </div>
  )
}
