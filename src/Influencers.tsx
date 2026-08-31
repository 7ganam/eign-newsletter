import { useEffect, useMemo, useState } from 'react'
import type { ComponentProps, CSSProperties, DragEvent as ReactDragEvent } from 'react'
import { InlineEdit } from './editableCells'
import type { Influencer } from './influencerData'
import type { LinkedInFollowerSnapshot } from './linkedinFollowerData'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'
import { usePersistedSort, type SortDirection } from './tablePreferences'

type SortKey = 'priority' | 'followers' | 'name' | 'country' | 'lane' | 'organisation'
type SortPreset = 'priority' | 'followers' | 'name' | 'country' | 'custom'
type InfluencerColumnKey = 'person' | 'market' | 'lane' | 'platform' | 'followers' | 'signals' | 'linkedin'
type ColumnDrop = { column: InfluencerColumnKey; position: 'before' | 'after' }
type InfluencerRow = Influencer & { __rowId: string; follower: LinkedInFollowerSnapshot }
type InfluencerResponse = {
  items: InfluencerRow[]
  meta: {
    followerSource: string
    followersUpdatedAt: string
    source: string
    verifiedAt: string
  }
}

const COLUMN_ORDER_STORAGE_KEY = 'eign-influencers.column-order.v1'
const COLUMN_WIDTH_STORAGE_KEY = 'eign-influencers.column-widths.v1'
const ROW_SORT_STORAGE_KEY = 'eign-influencers.row-sort.v1'
const SORT_KEYS: SortKey[] = ['priority', 'followers', 'name', 'country', 'lane', 'organisation']
const DEFAULT_SORT = { field: 'priority', direction: 'desc' } as const

const DEFAULT_SORT_DIRECTIONS: Record<SortKey, SortDirection> = {
  priority: 'desc',
  followers: 'desc',
  name: 'asc',
  country: 'asc',
  lane: 'asc',
  organisation: 'asc',
}

const INFLUENCER_COLUMNS: Array<{
  key: InfluencerColumnKey
  label: string
  className: string
  defaultWidth: number
  sortKey: SortKey | null
}> = [
  { key: 'person', label: 'Person', className: 'influencer-cell--person', defaultWidth: 280, sortKey: 'name' },
  { key: 'market', label: 'Market', className: 'influencer-cell--market', defaultWidth: 145, sortKey: 'country' },
  { key: 'lane', label: 'Influence lane', className: 'influencer-cell--lane', defaultWidth: 170, sortKey: 'lane' },
  { key: 'platform', label: 'Current platform', className: 'influencer-cell--platform', defaultWidth: 290, sortKey: 'organisation' },
  { key: 'followers', label: 'LinkedIn followers', className: 'influencer-cell--followers', defaultWidth: 165, sortKey: 'followers' },
  { key: 'signals', label: 'Signals', className: 'influencer-cell--signals', defaultWidth: 190, sortKey: 'priority' },
  { key: 'linkedin', label: 'LinkedIn', className: 'influencer-cell--link', defaultWidth: 74, sortKey: null },
]

const INFLUENCER_COLUMNS_BY_KEY = new Map(INFLUENCER_COLUMNS.map((column) => [column.key, column]))
const INFLUENCER_COLUMN_WIDTHS = Object.fromEntries(
  INFLUENCER_COLUMNS.map((column) => [column.key, column.defaultWidth]),
) as Record<InfluencerColumnKey, number>

const restoreColumnOrder = () => {
  const defaultOrder = INFLUENCER_COLUMNS.map((column) => column.key)
  try {
    const savedOrder = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(savedOrder)) return defaultOrder
    const seen = new Set<InfluencerColumnKey>()
    const restored = savedOrder.flatMap((key) => {
      if (typeof key !== 'string' || !INFLUENCER_COLUMNS_BY_KEY.has(key as InfluencerColumnKey) || seen.has(key as InfluencerColumnKey)) return []
      seen.add(key as InfluencerColumnKey)
      return [key as InfluencerColumnKey]
    })
    return [...restored, ...defaultOrder.filter((key) => !seen.has(key))]
  } catch {
    return defaultOrder
  }
}

const saveColumnOrder = (columns: InfluencerColumnKey[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // The directory remains usable if local storage is unavailable.
  }
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

type InfluencerHeaderProps = {
  activeSortKey: SortKey
  columnKey: InfluencerColumnKey
  direction: SortDirection
  draggingColumn: InfluencerColumnKey | null
  drop: ColumnDrop | null
  onDragEnd: () => void
  onDragOver: (event: ReactDragEvent<HTMLTableCellElement>, column: InfluencerColumnKey) => void
  onDragStart: (event: ReactDragEvent<HTMLTableCellElement>, column: InfluencerColumnKey) => void
  onDrop: (event: ReactDragEvent<HTMLTableCellElement>, column: InfluencerColumnKey) => void
  onSort: (key: SortKey) => void
  resizeHandle: ComponentProps<typeof ColumnResizeHandle>
}

function InfluencerHeader({ activeSortKey, columnKey, direction, draggingColumn, drop, onDragEnd, onDragOver, onDragStart, onDrop, onSort, resizeHandle }: InfluencerHeaderProps) {
  const column = INFLUENCER_COLUMNS_BY_KEY.get(columnKey)!
  const active = column.sortKey !== null && activeSortKey === column.sortKey
  const nextDirection = active && column.sortKey
    ? direction === 'asc' ? 'desc' : 'asc'
    : column.sortKey ? DEFAULT_SORT_DIRECTIONS[column.sortKey] : null
  const dropClass = drop?.column === columnKey ? ` is-drop-${drop.position}` : ''

  return (
    <th
      className={`${column.className} influencer-draggable-header${draggingColumn === columnKey ? ' is-dragging' : ''}${dropClass}`}
      aria-sort={column.sortKey ? active ? direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined}
      draggable
      onDragStart={(event) => onDragStart(event, columnKey)}
      onDragOver={(event) => onDragOver(event, columnKey)}
      onDrop={(event) => onDrop(event, columnKey)}
      onDragEnd={onDragEnd}
    >
      {column.sortKey ? (
        <button
          className="influencer-sort-button"
          type="button"
          onClick={() => onSort(column.sortKey!)}
          aria-label={`Sort ${column.label} ${nextDirection === 'asc' ? 'ascending' : 'descending'}`}
        >
          <span className="influencer-header-label"><i aria-hidden="true">⋮⋮</i>{column.label}</span>
          <span className={`influencer-sort-arrow${active ? ' is-active' : ''}`} aria-hidden="true">
            {active ? direction === 'asc' ? '↑' : '↓' : '↕'}
          </span>
        </button>
      ) : (
        <span className="influencer-static-header"><i aria-hidden="true">⋮⋮</i>{column.label}</span>
      )}
      <ColumnResizeHandle {...resizeHandle} />
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
  const [data, setData] = useState<InfluencerResponse | null>(null)
  const [loadError, setLoadError] = useState('')
  const [cellSaveError, setCellSaveError] = useState('')
  const [savingSignals, setSavingSignals] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState<Influencer['country'] | 'all'>('all')
  const [lane, setLane] = useState<Influencer['lane'] | 'all'>('all')
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [arabicOnly, setArabicOnly] = useState(false)
  const {
    resetSort,
    setSortDirection,
    setSortField: setSortKey,
    sortDirection,
    sortField: sortKey,
  } = usePersistedSort<SortKey>(ROW_SORT_STORAGE_KEY, DEFAULT_SORT, SORT_KEYS)
  const [columnOrder, setColumnOrder] = useState<InfluencerColumnKey[]>(restoreColumnOrder)
  const [draggingColumn, setDraggingColumn] = useState<InfluencerColumnKey | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const { getResizeHandleProps, totalWidth, widths } = useResizableColumns({
    defaults: INFLUENCER_COLUMN_WIDTHS,
    storageKey: COLUMN_WIDTH_STORAGE_KEY,
  })
  const tableStyle = {
    '--resizable-table-width': `${totalWidth(columnOrder)}px`,
  } as CSSProperties

  useEffect(() => {
    const previousTitle = document.title
    const controller = new AbortController()
    document.title = 'Influencer index · EIGN Data Workspace'
    fetch('/api/influencers', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`The influencer data service returned ${response.status}.`)
        return response.json() as Promise<InfluencerResponse>
      })
      .then(setData)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setLoadError(reason instanceof Error ? reason.message : 'Unable to load the influencer files.')
      })
    return () => {
      controller.abort()
      document.title = previousTitle
    }
  }, [])

  const influencers = useMemo(() => data?.items ?? [], [data])
  const countryCounts = useMemo(() => new Map(COUNTRY_ORDER.map((item) => [
    item,
    influencers.filter((influencer) => influencer.country === item).length,
  ])), [influencers])
  const lanes = useMemo(() => [...new Set(influencers.map((influencer) => influencer.lane))]
    .sort((left, right) => left.localeCompare(right)), [influencers])
  const followerCoverage = useMemo(() => influencers.filter((influencer) => influencer.follower.count != null).length, [influencers])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return influencers
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
          const leftFollowers = left.follower.count ?? -1
          const rightFollowers = right.follower.count ?? -1
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
  }, [arabicOnly, country, influencers, lane, priorityOnly, query, sortDirection, sortKey])

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
    resetSort()
  }

  const moveColumn = (source: InfluencerColumnKey, target: InfluencerColumnKey, position: ColumnDrop['position']) => {
    if (source === target) return
    setColumnOrder((current) => {
      const next = current.filter((column) => column !== source)
      const targetIndex = next.indexOf(target)
      if (targetIndex === -1) return current
      next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, source)
      saveColumnOrder(next)
      return next
    })
  }

  const handleColumnDragStart = (event: ReactDragEvent<HTMLTableCellElement>, column: InfluencerColumnKey) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', column)
    setDraggingColumn(column)
  }

  const handleColumnDragOver = (event: ReactDragEvent<HTMLTableCellElement>, column: InfluencerColumnKey) => {
    if (!draggingColumn || draggingColumn === column) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setColumnDrop({ column, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
  }

  const handleColumnDrop = (event: ReactDragEvent<HTMLTableCellElement>, column: InfluencerColumnKey) => {
    event.preventDefault()
    const source = (event.dataTransfer.getData('text/plain') || draggingColumn) as InfluencerColumnKey | null
    const position = columnDrop?.column === column ? columnDrop.position : 'before'
    if (source && INFLUENCER_COLUMNS_BY_KEY.has(source)) moveColumn(source, column, position)
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const finishColumnDrag = () => {
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const saveCell = async (influencer: InfluencerRow, field: string, value: unknown) => {
    setCellSaveError('')
    const response = await fetch(`/api/influencers/${encodeURIComponent(influencer.__rowId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ field, value }),
    })
    const result = await response.json().catch(() => null) as { error?: string; item?: InfluencerRow } | null
    if (!response.ok || !result?.item) {
      const message = result?.error || `The data service returned ${response.status}.`
      setCellSaveError(message)
      throw new Error(message)
    }
    setData((current) => current ? {
      ...current,
      items: current.items.map((item) => item.__rowId === influencer.__rowId ? result.item! : item),
    } : current)
  }

  const saveSignal = async (influencer: InfluencerRow, field: 'priority' | 'arabicOrBilingual', checked: boolean) => {
    const savingKey = `${influencer.__rowId}:${field}`
    if (savingSignals.has(savingKey)) return
    setSavingSignals((current) => new Set(current).add(savingKey))
    try {
      await saveCell(influencer, field, checked)
    } catch {
      // The shared error banner and inline state explain the failed write.
    } finally {
      setSavingSignals((current) => {
        const next = new Set(current)
        next.delete(savingKey)
        return next
      })
    }
  }

  return (
    <div className="app-shell influencers-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem people</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/software-companies">Software companies</a>
          <a href="/valid-links">Valid links</a>
          <a href="/influencers" aria-current="page">Influencers</a>
          <a href="/research">Startups</a>
          <a href="/newsletters">Newsletters</a>
          <a href="/posts">Posts</a>
        </nav>
      </header>

      <main className="influencers-main">
        <section className="influencer-country-index" aria-label="People by market">
          {COUNTRY_ORDER.map((item) => {
            const count = countryCounts.get(item) ?? 0
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
                Directory verified {data?.meta.verifiedAt ? formatVerifiedDate(data.meta.verifiedAt) : '—'} · Follower lookup checked {data?.meta.followersUpdatedAt ? formatVerifiedDate(data.meta.followersUpdatedAt) : '—'} · {followerCoverage} / {influencers.length} counts available
              </p>
            </div>
            <div><span>{results.length} / {influencers.length}</span><small className="table-edit-hint">Pencil or double-click to edit</small></div>
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
                {lanes.map((item) => <option key={item} value={item}>{item}</option>)}
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

          {loadError && <div className="software-error" role="alert">{loadError}</div>}
          {cellSaveError && <div className="software-error" role="alert">Cell was not saved: {cellSaveError}</div>}

          <div className="influencer-table-wrap">
            <table className="influencer-table resizable-table" style={tableStyle}>
              <colgroup>
                {columnOrder.map((column) => <col key={column} style={{ width: `${widths[column]}px` }} />)}
              </colgroup>
              <thead>
                <tr>
                  {columnOrder.map((column) => (
                    <InfluencerHeader
                      key={column}
                      columnKey={column}
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      draggingColumn={draggingColumn}
                      drop={columnDrop}
                      onDragStart={handleColumnDragStart}
                      onDragOver={handleColumnDragOver}
                      onDrop={handleColumnDrop}
                      onDragEnd={finishColumnDrag}
                      onSort={toggleSort}
                      resizeHandle={getResizeHandleProps(column, INFLUENCER_COLUMNS_BY_KEY.get(column)!.label)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((influencer, index) => {
                  const followerSnapshot = influencer.follower ?? UNKNOWN_FOLLOWER_SNAPSHOT
                  const formattedFollowers = followerSnapshot.count == null
                    ? '—'
                    : `${followerSnapshot.precision === 'rounded' ? '≈' : ''}${formatFollowerCount(followerSnapshot.count)}`
                  const followerLabel = followerSnapshot.count == null
                    ? 'LinkedIn follower count not verified'
                    : `${followerSnapshot.precision === 'rounded' ? 'Approximately ' : ''}${formatFollowerCount(followerSnapshot.count)} LinkedIn followers; ${followerSnapshot.source === 'search-index' ? 'public search-index snapshot checked' : 'observed'} ${formatVerifiedDate(followerSnapshot.observedAt!)}`

                  return (
                  <tr key={influencer.__rowId}>
                    {columnOrder.map((column) => {
                      if (column === 'person') return (
                        <td className="influencer-cell--person" key={column}>
                          <InlineEdit ariaLabel={`${influencer.name} name`} value={influencer.name} onSave={(value) => saveCell(influencer, 'name', value)}>
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
                          </InlineEdit>
                        </td>
                      )
                      if (column === 'market') return <td className="influencer-cell--market" key={column}><InlineEdit ariaLabel={`${influencer.name} market`} options={COUNTRY_ORDER.map((item) => ({ label: COUNTRY_LABELS[item], value: item }))} value={influencer.country} onSave={(value) => saveCell(influencer, 'country', value)}><span className={`influencer-market country-${COUNTRY_CODES[influencer.country].toLowerCase()}`}><i />{COUNTRY_LABELS[influencer.country]}</span></InlineEdit></td>
                      if (column === 'lane') return <td className="influencer-cell--lane" key={column}><InlineEdit ariaLabel={`${influencer.name} influence lane`} options={lanes.map((item) => ({ label: item, value: item }))} value={influencer.lane} onSave={(value) => saveCell(influencer, 'lane', value)}><span className="influencer-lane">{influencer.lane}</span></InlineEdit></td>
                      if (column === 'platform') return <td className="influencer-cell--platform" key={column}><InlineEdit ariaLabel={`${influencer.name} current platform`} value={influencer.organisation} onSave={(value) => saveCell(influencer, 'organisation', value)}><strong className="influencer-organisation">{influencer.organisation}</strong></InlineEdit></td>
                      if (column === 'followers') return (
                        <td className="influencer-cell--followers" key={column}>
                          <InlineEdit ariaLabel={`${influencer.name} LinkedIn followers`} inputType="number" value={followerSnapshot.count == null ? '' : String(followerSnapshot.count)} onSave={(value) => saveCell(influencer, 'followers', value.trim() ? Number(value) : null)}>
                            <span className={`influencer-followers${followerSnapshot.count == null ? ' is-unverified' : ''}`} aria-label={followerLabel} title={followerLabel}>
                              <strong>{formattedFollowers}</strong>
                              <small>{followerSnapshot.count == null ? 'Not verified' : followerSnapshot.precision === 'rounded' ? 'indexed estimate' : 'followers'}</small>
                            </span>
                          </InlineEdit>
                        </td>
                      )
                      if (column === 'signals') return (
                        <td className="influencer-cell--signals" key={column}>
                          <div className="influencer-signal-editors">
                            <label title="Priority"><input type="checkbox" checked={influencer.priority} disabled={savingSignals.has(`${influencer.__rowId}:priority`)} onChange={(event) => void saveSignal(influencer, 'priority', event.target.checked)} /><span>Priority</span></label>
                            <label title="Arabic or bilingual"><input type="checkbox" checked={influencer.arabicOrBilingual} disabled={savingSignals.has(`${influencer.__rowId}:arabicOrBilingual`)} onChange={(event) => void saveSignal(influencer, 'arabicOrBilingual', event.target.checked)} /><span>AR / EN</span></label>
                          </div>
                        </td>
                      )
                      return <td className="influencer-cell--link" key={column}><InlineEdit ariaLabel={`${influencer.name} LinkedIn URL`} inputType="url" value={influencer.linkedinUrl} onSave={(value) => saveCell(influencer, 'linkedinUrl', value)}><a className="influencer-linkedin" href={influencer.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`Open ${influencer.name} on LinkedIn`}><LinkedInIcon /></a></InlineEdit></td>
                    })}
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
