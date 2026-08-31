import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import leapPeopleUrl from '../assets/people/leap-2026-people.json?url'
import riseUpPeopleUrl from '../assets/people/riseup-2026-people.json?url'
import unifiedPeopleUrl from '../assets/people/unified-people.json?url'
import webSearchPeopleUrl from '../assets/people/web-search-people.json?url'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'
import { usePersistedSort } from './tablePreferences'
import type { UnifiedPeopleFile, UnifiedPeopleSourceId, UnifiedPerson } from './unifiedPeopleTypes'

type PeopleColumn = 'person' | 'role' | 'organization' | 'market' | 'lane' | 'linkedin' | 'followers' | 'profile' | 'events' | 'signals' | 'sources'
type SourceFilter = 'all' | UnifiedPeopleSourceId | 'multi-source'
type CoverageFilter = 'all' | 'linkedin' | 'followers' | 'biography' | 'sessions'

const LOAD_BATCH_SIZE = 100
const ROW_SORT_STORAGE_KEY = 'eign-unified-people.row-sort.v1'
const SOURCE_LABELS: Record<UnifiedPeopleSourceId, string> = {
  'leap-2026': 'LEAP 2026',
  'riseup-2026': 'RiseUp 2026',
  'web-search': 'Web search',
}
const SOURCE_SHORT_LABELS: Record<UnifiedPeopleSourceId, string> = {
  'leap-2026': 'LEAP',
  'riseup-2026': 'RU26',
  'web-search': 'WEB',
}

const COLUMNS: Array<{ key: PeopleColumn; label: string; width: number }> = [
  { key: 'person', label: 'Person', width: 270 },
  { key: 'role', label: 'Role', width: 220 },
  { key: 'organization', label: 'Organization', width: 230 },
  { key: 'market', label: 'Market', width: 175 },
  { key: 'lane', label: 'Influence lane', width: 160 },
  { key: 'linkedin', label: 'LinkedIn', width: 165 },
  { key: 'followers', label: 'Followers', width: 135 },
  { key: 'profile', label: 'Profile notes', width: 330 },
  { key: 'events', label: 'Event appearances', width: 270 },
  { key: 'signals', label: 'Signals', width: 230 },
  { key: 'sources', label: 'Sources', width: 190 },
]
const COLUMN_KEYS = COLUMNS.map((column) => column.key)
const COLUMN_WIDTHS = Object.fromEntries(COLUMNS.map((column) => [column.key, column.width])) as Record<PeopleColumn, number>
const DEFAULT_SORT = { field: 'person', direction: 'asc' } as const

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toLocaleUpperCase()

const formatDate = (value: string) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value))

const formatFollowers = (value: number) => new Intl.NumberFormat('en').format(value)

const linkedinProfile = (person: UnifiedPerson) => person.profiles.find((profile) => profile.platform === 'linkedin')
const followerCount = (person: UnifiedPerson) => linkedinProfile(person)?.followers?.count ?? null
const sessionCount = (person: UnifiedPerson) => person.event_appearances.reduce((total, appearance) => total + appearance.sessions.length, 0)
const locationLabel = (person: UnifiedPerson) => [person.location.city, person.location.country].filter(Boolean).join(', ')

const sortValue = (person: UnifiedPerson, column: PeopleColumn): string | number => {
  if (column === 'person') return person.name.display
  if (column === 'role') return person.current_role.title ?? ''
  if (column === 'organization') return person.current_role.organization ?? ''
  if (column === 'market') return locationLabel(person)
  if (column === 'lane') return person.influence.lane ?? ''
  if (column === 'linkedin') return linkedinProfile(person)?.url ?? ''
  if (column === 'followers') return followerCount(person) ?? -1
  if (column === 'profile') return person.biography ?? person.specialties.join(' ')
  if (column === 'events') return person.event_appearances.length * 10_000 + sessionCount(person)
  if (column === 'signals') return Number(person.influence.priority) * 4 + Number(person.influence.arabic_or_bilingual) * 2 + Number(person.influence.middle_eastern.value)
  return person.source_ids.length
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function PersonAvatar({ person }: { person: UnifiedPerson }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [person.image.url])

  return (
    <span className="unified-person-avatar" aria-hidden="true">
      {person.image.url && !failed
        ? <img src={person.image.url} alt="" loading="lazy" onError={() => setFailed(true)} />
        : initials(person.name.display)}
    </span>
  )
}

function SourceBadges({ sourceIds }: { sourceIds: UnifiedPeopleSourceId[] }) {
  return (
    <span className="unified-source-badges">
      {sourceIds.map((sourceId) => (
        <span className={`unified-source-badge source-${sourceId}`} key={sourceId} title={SOURCE_LABELS[sourceId]}>
          {SOURCE_SHORT_LABELS[sourceId]}
        </span>
      ))}
    </span>
  )
}

export function UnifiedPeople() {
  const [data, setData] = useState<UnifiedPeopleFile | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<SourceFilter>('all')
  const [market, setMarket] = useState('all')
  const [coverage, setCoverage] = useState<CoverageFilter>('all')
  const [visibleCount, setVisibleCount] = useState(LOAD_BATCH_SIZE)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<PeopleColumn>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
    COLUMN_KEYS,
  )
  const { getResizeHandleProps, totalWidth, widths } = useResizableColumns({
    defaults: COLUMN_WIDTHS,
    storageKey: 'eign-unified-people.column-widths.v1',
  })

  useEffect(() => {
    const previousTitle = document.title
    const controller = new AbortController()
    document.title = 'Unified people · EIGN Data Workspace'
    fetch(unifiedPeopleUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`The unified people file returned ${response.status}.`)
        return response.json() as Promise<UnifiedPeopleFile>
      })
      .then(setData)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Unable to load the unified people file.')
      })
    return () => {
      controller.abort()
      document.title = previousTitle
    }
  }, [])

  const markets = useMemo(() => [...new Set(
    data?.people.map((person) => person.location.country).filter((value): value is string => Boolean(value)) ?? [],
  )].sort(), [data])

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return [...(data?.people ?? [])]
      .filter((person) => {
        if (source === 'all') return true
        if (source === 'multi-source') return person.source_ids.length > 1
        return person.source_ids.includes(source)
      })
      .filter((person) => market === 'all' || person.location.country === market)
      .filter((person) => {
        if (coverage === 'linkedin') return Boolean(linkedinProfile(person))
        if (coverage === 'followers') return followerCount(person) !== null
        if (coverage === 'biography') return Boolean(person.biography)
        if (coverage === 'sessions') return sessionCount(person) > 0
        return true
      })
      .filter((person) => {
        if (!normalizedQuery) return true
        return [
          person.name.display,
          person.name.passport,
          person.name.certificate,
          person.current_role.title,
          person.current_role.organization,
          person.location.country,
          person.location.city,
          person.location.nationality,
          person.biography,
          person.influence.lane,
          person.specialties.join(' '),
          linkedinProfile(person)?.url,
          ...person.event_appearances.flatMap((appearance) => [
            SOURCE_LABELS[appearance.event_id],
            ...appearance.sessions.flatMap((session) => [session.title, session.track, session.hall]),
          ]),
        ].filter(Boolean).join(' ').toLocaleLowerCase().includes(normalizedQuery)
      })
      .sort((left, right) => {
        const leftValue = sortValue(left, sortField)
        const rightValue = sortValue(right, sortField)
        const leftBlank = leftValue === '' || leftValue === -1
        const rightBlank = rightValue === '' || rightValue === -1
        if (leftBlank !== rightBlank) return leftBlank ? 1 : -1
        const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' })
        return comparison * (sortDirection === 'asc' ? 1 : -1)
          || left.name.display.localeCompare(right.name.display)
      })
  }, [coverage, data, market, query, sortDirection, sortField, source])

  useEffect(() => {
    setVisibleCount(LOAD_BATCH_SIZE)
    tableScrollRef.current?.scrollTo({ top: 0 })
  }, [rows])

  const visibleRows = rows.slice(0, visibleCount)
  const hasMoreRows = visibleRows.length < rows.length
  const hasFilters = Boolean(query || source !== 'all' || market !== 'all' || coverage !== 'all')
  const tableStyle = {
    '--resizable-table-width': `${totalWidth(COLUMN_KEYS)}px`,
  } as CSSProperties

  useEffect(() => {
    const root = tableScrollRef.current
    const target = loadMoreRef.current
    if (!root || !target || !hasMoreRows) return

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      setVisibleCount((current) => Math.min(current + LOAD_BATCH_SIZE, rows.length))
    }, {
      root,
      rootMargin: '420px 0px',
      threshold: 0,
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreRows, rows.length, visibleRows.length])

  const sortBy = (field: PeopleColumn) => {
    if (field === sortField) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection(field === 'followers' || field === 'events' || field === 'signals' || field === 'sources' ? 'desc' : 'asc')
    }
  }

  const clearFilters = () => {
    setQuery('')
    setSource('all')
    setMarket('all')
    setCoverage('all')
  }

  return (
    <div className="app-shell unified-people-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Unified people and source provenance</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/software-companies">Software companies</a>
          <a href="/influencers">Influencers</a>
          <a href="/research">Startups</a>
          <a href="/newsletters">Newsletters</a>
          <a href="/posts">Posts</a>
          <a href="/people" aria-current="page">Unified people</a>
        </nav>
      </header>

      <main className="unified-people-main">
        <section className="unified-people-hero" aria-labelledby="unified-people-title">
          <div className="unified-people-hero__copy">
            <span className="unified-people-eyebrow">PEOPLE / NORMALIZED / V1</span>
            <h1 id="unified-people-title">One register.<br />Every source intact.</h1>
            <p>LEAP, RiseUp, and web research reconciled into a shared people schema. Original records remain embedded as provenance.</p>
          </div>
          <div className="unified-people-metrics" aria-label="Unified people summary">
            <span><small>Unique people</small><strong>{data?.stats.unique_people.toLocaleString() ?? '—'}</strong></span>
            <span><small>Source records</small><strong>{data?.stats.source_records.toLocaleString() ?? '—'}</strong></span>
            <span><small>Multi-source</small><strong>{data?.stats.multi_source_people.toLocaleString() ?? '—'}</strong></span>
            <span><small>Schema</small><strong>{data?.schema_version ?? 'people.v1'}</strong></span>
          </div>
          <div className="unified-people-files" aria-label="Generated JSON files">
            <a href={unifiedPeopleUrl} download>Unified JSON <span>↓</span></a>
            <a href={leapPeopleUrl} download>LEAP JSON <span>↓</span></a>
            <a href={riseUpPeopleUrl} download>RiseUp JSON <span>↓</span></a>
            <a href={webSearchPeopleUrl} download>Web JSON <span>↓</span></a>
          </div>
        </section>

        <section className="unified-register" aria-labelledby="unified-register-title">
          <header className="unified-register__header">
            <div>
              <span>REGISTER 01</span>
              <h2 id="unified-register-title">Unified people table</h2>
            </div>
            <p>{data ? `Generated ${formatDate(data.generated_at)}` : 'Loading generated file…'}</p>
          </header>

          <div className="unified-people-toolbar">
            <label className="unified-people-search">
              <span className="sr-only">Search unified people</span>
              <SearchIcon />
              <input value={query} type="search" placeholder="Search people, organizations, sessions, profiles…" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label><span>Source</span><select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}>
              <option value="all">All sources</option>
              <option value="multi-source">Multiple sources</option>
              <option value="leap-2026">LEAP 2026</option>
              <option value="riseup-2026">RiseUp 2026</option>
              <option value="web-search">Web search</option>
            </select></label>
            <label><span>Market</span><select value={market} onChange={(event) => setMarket(event.target.value)}>
              <option value="all">All markets</option>
              {markets.map((value) => <option value={value} key={value}>{value}</option>)}
            </select></label>
            <label><span>Coverage</span><select value={coverage} onChange={(event) => setCoverage(event.target.value as CoverageFilter)}>
              <option value="all">Any coverage</option>
              <option value="linkedin">Has LinkedIn</option>
              <option value="followers">Has followers</option>
              <option value="biography">Has biography</option>
              <option value="sessions">Has sessions</option>
            </select></label>
            <button type="button" disabled={!hasFilters} onClick={clearFilters}>Clear</button>
          </div>

          <div className="unified-register__meta" aria-live="polite">
            <span><strong>{rows.length.toLocaleString()}</strong> matching people</span>
            <span>{visibleRows.length.toLocaleString()} loaded</span>
            <span>Infinite scroll · click headers to sort · drag edges to resize</span>
          </div>

          {error && <div className="software-error" role="alert">{error}</div>}
          {!data && !error && <div className="unified-people-loading"><span className="loading-spinner" /> Loading unified people…</div>}

          {data && (
            <div className="unified-table-wrap" ref={tableScrollRef}>
              <table className="unified-table resizable-table" style={tableStyle}>
                <colgroup>{COLUMNS.map((column) => <col key={column.key} style={{ width: `${widths[column.key]}px` }} />)}</colgroup>
                <thead><tr>{COLUMNS.map((column) => {
                  const active = sortField === column.key
                  return (
                    <th key={column.key} aria-sort={active ? sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'}>
                      <button type="button" onClick={() => sortBy(column.key)}>
                        <span>{column.label}</span><i aria-hidden="true">{active ? sortDirection === 'asc' ? '↑' : '↓' : '↕'}</i>
                      </button>
                      <ColumnResizeHandle {...getResizeHandleProps(column.key, column.label)} />
                    </th>
                  )
                })}</tr></thead>
                <tbody>{visibleRows.map((person, index) => {
                  const linkedIn = linkedinProfile(person)
                  const followers = followerCount(person)
                  const sessions = sessionCount(person)
                  const location = locationLabel(person)
                  return (
                    <tr key={person.id}>
                      <td><div className="unified-person-cell"><PersonAvatar person={person} /><span><strong>{person.name.title ? `${person.name.title} ` : ''}{person.name.display}</strong><small>{person.id} · #{String(index + 1).padStart(4, '0')}</small></span></div></td>
                      <td>{person.current_role.title || <span className="unified-empty">—</span>}</td>
                      <td><strong className="unified-organization">{person.current_role.organization || '—'}</strong></td>
                      <td>{location ? <span className="unified-market">{person.location.country_code && <i>{person.location.country_code}</i>}{location}</span> : <span className="unified-empty">—</span>}{person.location.nationality && <small className="unified-cell-note">Nationality: {person.location.nationality}</small>}</td>
                      <td>{person.influence.lane ? <span className="unified-lane">{person.influence.lane}</span> : <span className="unified-empty">—</span>}</td>
                      <td>{linkedIn ? <a className="unified-link" href={linkedIn.url} target="_blank" rel="noreferrer">Open profile ↗<small>{linkedIn.verification || 'LinkedIn'}</small></a> : <span className="unified-empty">—</span>}</td>
                      <td>{followers === null ? <span className="unified-empty">—</span> : <span className="unified-follower"><strong>{formatFollowers(followers)}</strong><small>{linkedIn?.followers?.precision ?? 'observed'}</small></span>}</td>
                      <td>{person.biography || person.specialties.length ? <details className="unified-profile-notes"><summary>{person.specialties.join(' · ') || person.biography}</summary>{person.specialties.length > 0 && <strong>{person.specialties.join(' · ')}</strong>}{person.biography && <p>{person.biography}</p>}</details> : <span className="unified-empty">—</span>}</td>
                      <td>{person.event_appearances.length ? <div className="unified-events">{person.event_appearances.map((appearance, appearanceIndex) => <span key={`${person.id}-${appearance.event_id}-${appearance.speaker_id ?? appearance.profile_url ?? appearanceIndex}`}><b>{SOURCE_SHORT_LABELS[appearance.event_id]}</b>{appearance.profile_url ? <a href={appearance.profile_url} target="_blank" rel="noreferrer">Profile ↗</a> : <small>{appearance.speaker_id ? `Speaker ${appearance.speaker_id}` : 'Appearance'}</small>}</span>)}{sessions > 0 && <em>{sessions} {sessions === 1 ? 'session' : 'sessions'}</em>}</div> : <span className="unified-empty">—</span>}</td>
                      <td><div className="unified-signals">{person.influence.priority && <span className="is-priority">Priority</span>}{person.influence.arabic_or_bilingual && <span>AR / EN</span>}{person.influence.middle_eastern.value && <span>Middle Eastern</span>}{!person.influence.priority && !person.influence.arabic_or_bilingual && !person.influence.middle_eastern.value && <span className="unified-empty">—</span>}</div></td>
                      <td><SourceBadges sourceIds={person.source_ids} /><small className="unified-cell-note">{person.source_records.length} source {person.source_records.length === 1 ? 'record' : 'records'}</small></td>
                    </tr>
                  )
                })}</tbody>
              </table>
              {!visibleRows.length && <div className="unified-people-empty"><strong>No matching people</strong><span>Change the source or coverage filters, or search more broadly.</span><button type="button" onClick={clearFilters}>Reset filters</button></div>}
              {visibleRows.length > 0 && <div className={`unified-infinite-status${hasMoreRows ? ' is-loading' : ' is-complete'}`} ref={loadMoreRef} aria-live="polite">
                {hasMoreRows
                  ? <><span className="loading-spinner" aria-hidden="true" /> Scroll to load more · {visibleRows.length.toLocaleString()} / {rows.length.toLocaleString()}</>
                  : <>End of register · all {rows.length.toLocaleString()} people loaded</>}
              </div>}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
