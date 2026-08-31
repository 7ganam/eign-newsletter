import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react'
import leapData from '../assets/leap-2026-speakers.json'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'
import { usePersistedSort } from './tablePreferences'

type LeapSpeaker = {
  name: string
  title: string | null
  organization: string | null
  profile_url: string
  image_src: string
  image_alt: string
}

type ArabicNameSignal = 'arabic-name-form' | 'unclear-name-form' | 'non-arabic-name-form'
type CampaignSignal = 'explicit-me-region' | 'automatic-me-name-match' | 'arabic-name-indicator' | 'uncertain'

type IndexedLeapSpeaker = LeapSpeaker & {
  sourceIndex: number
  explicitRegionSignal: boolean
  automaticMiddleEastNameMatch: boolean
  arabicNameSignal: ArabicNameSignal
  campaignSignal: CampaignSignal
}

type LeapColumn =
  | 'name'
  | 'title'
  | 'organization'
  | 'profile_url'
  | 'image_alt'
  | 'campaignSignal'
  | 'image_src'

type SortDirection = 'asc' | 'desc'
type ColumnDrop = { column: LeapColumn; position: 'before' | 'after' }
type CompletenessFilter = 'all' | 'complete' | 'missing-title' | 'missing-organization'
type CampaignFilter = 'all' | 'checked' | 'unchecked'

const PAGE_SIZE = 100
const SOURCE_URL = 'https://onegiantleap.com/2026-speakers'
const COLUMN_ORDER_STORAGE_KEY = 'eign-leap-speakers.column-order.v1'
const ROW_SORT_STORAGE_KEY = 'eign-leap-speakers.row-sort.v1'
const REGION_KEYWORDS = [
  'middle east',
  'middle-east',
  'mena',
  'gcc',
  'ksa',
  'u.a.e',
  'uae',
  'united arab emirates',
  'saudi',
  'qatar',
  'kuwait',
  'oman',
  'bahrain',
  'lebanon',
  'jordan',
  'egypt',
  'syria',
  'morocco',
  'tunisia',
  'algeria',
  'iraq',
  'iran',
  'yemen',
  'palestine',
  'libya',
  'sudan',
  'turkey',
  'turkiye',
  'middle east & africa',
  'middleeast',
]

const ARABIC_NAME_PARTICLES = new Set(['al', 'el', 'bin', 'bint', 'ibn'])
const ARABIC_NAME_TOKENS = new Set([
  'abdul',
  'abd',
  'ahmad',
  'ahmed',
  'ali',
  'aly',
  'hassan',
  'hussein',
  'kareem',
  'khaled',
  'muhammad',
  'mohamad',
  'mohammed',
  'omar',
  'osama',
  'samir',
  'sami',
  'salah',
  'fahad',
  'hadi',
  'raed',
  'fathi',
  'nasser',
  'zain',
  'mahmoud',
  'youssef',
  'yusuf',
  'ibrahim',
  'mustafa',
  'samira',
  'lamia',
  'noura',
  'nour',
])

const LEAP_COLUMNS: Array<{ key: LeapColumn; label: string; defaultWidth: number }> = [
  { key: 'name', label: 'Name', defaultWidth: 260 },
  { key: 'title', label: 'Title', defaultWidth: 260 },
  { key: 'organization', label: 'Organization', defaultWidth: 260 },
  { key: 'profile_url', label: 'LEAP Profile URL', defaultWidth: 220 },
  { key: 'campaignSignal', label: 'Middle Eastern', defaultWidth: 130 },
  { key: 'image_alt', label: 'Image alt', defaultWidth: 220 },
  { key: 'image_src', label: 'Image source', defaultWidth: 410 },
]

const LEAP_COLUMN_WIDTHS = Object.fromEntries(
  LEAP_COLUMNS.map((column) => [column.key, column.defaultWidth]),
) as Record<LeapColumn, number>
const LEAP_COLUMNS_BY_KEY = new Map(LEAP_COLUMNS.map((column) => [column.key, column]))
const LEAP_COLUMN_KEYS = LEAP_COLUMNS.map((column) => column.key)
const DEFAULT_SORT = { field: 'name', direction: 'asc' } as const
const DEFAULT_SORT_DIRECTIONS: Record<LeapColumn, SortDirection> = {
  name: 'asc',
  title: 'asc',
  organization: 'asc',
  profile_url: 'asc',
  campaignSignal: 'asc',
  image_alt: 'asc',
  image_src: 'asc',
}

const isLeapColumn = (value: unknown): value is LeapColumn =>
  typeof value === 'string' && LEAP_COLUMNS_BY_KEY.has(value as LeapColumn)

const restoreColumnOrder = () => {
  try {
    const savedOrder = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(savedOrder)) return LEAP_COLUMN_KEYS
    const seen = new Set<LeapColumn>()
    const restored = savedOrder.flatMap((column) => {
      if (!isLeapColumn(column) || seen.has(column)) return []
      seen.add(column)
      return [column]
    })
    return [...restored, ...LEAP_COLUMN_KEYS.filter((column) => !seen.has(column))]
  } catch {
    return LEAP_COLUMN_KEYS
  }
}

const saveColumnOrder = (columns: LeapColumn[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // Column reordering remains available for the current session.
  }
}
const AUTOMATIC_MIDDLE_EAST_NAME_SUBSTRINGS = [
  'abdul',
  'al',
  'el',
  'ahmed',
  'ahmad',
  'mahmoud',
  'mohamed',
]

const normalizeText = (value: string) => value
  .toLocaleLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const hasMiddleEastRegionSignal = (speaker: LeapSpeaker) => {
  const text = normalizeText([speaker.title, speaker.organization, speaker.profile_url].filter(Boolean).join(' '))
  return REGION_KEYWORDS.some((keyword) => text.includes(keyword))
}

const hasAutomaticMiddleEastNameMatch = (value: string) => {
  const normalizedName = normalizeText(value)
  return AUTOMATIC_MIDDLE_EAST_NAME_SUBSTRINGS.some((substring) => normalizedName.includes(substring))
}

const arabicNameSignal = (value: string): ArabicNameSignal => {
  const cleanName = normalizeText(value)
    .replace(/\b(?:dr|prof|ms|mrs|mr|he|hrh|hon|h\.e|miss|phd|md)\.?\b/g, ' ')
    .trim()
  const tokens = cleanName.split(/\s+/).filter(Boolean)
  if (!tokens.length) return 'unclear-name-form'

  if (cleanName.includes('abdul')) return 'arabic-name-form'

  let score = 0
  if (tokens.some((token) => ARABIC_NAME_PARTICLES.has(token))) score += 2
  if (tokens.some((token) => ARABIC_NAME_TOKENS.has(token))) score += 2
  if (/[^\x00-\x7F]/.test(value)) score += 1

  if (score >= 4) return 'arabic-name-form'
  if (score >= 3) return 'unclear-name-form'
  if (tokens.some((token) => ARABIC_NAME_PARTICLES.has(token) && token.length > 1)) return 'unclear-name-form'
  return 'non-arabic-name-form'
}

const CAMPAIGN_SIGNAL_LABEL: Record<CampaignSignal, string> = {
  'explicit-me-region': 'Explicit Middle East/org signal',
  'automatic-me-name-match': 'Middle Eastern — configured name rule',
  'arabic-name-indicator': 'Arabic name-form indicator',
  uncertain: 'No current signal',
}

const speakers = (leapData as LeapSpeaker[]).map((speaker, sourceIndex): IndexedLeapSpeaker => {
  const explicitRegionSignal = hasMiddleEastRegionSignal(speaker)
  const nameSignal = arabicNameSignal(speaker.name)
  const automaticMiddleEastNameMatch = hasAutomaticMiddleEastNameMatch(speaker.name)
  return {
    ...speaker,
    sourceIndex,
    explicitRegionSignal,
    automaticMiddleEastNameMatch,
    arabicNameSignal: nameSignal,
    campaignSignal: automaticMiddleEastNameMatch
      ? 'automatic-me-name-match'
      : explicitRegionSignal
        ? 'explicit-me-region'
      : nameSignal === 'arabic-name-form'
        ? 'arabic-name-indicator'
        : 'uncertain',
  }
})

const LEAP_SUMMARY = (() => {
  let missingTitles = 0
  let missingOrganizations = 0
  let explicitRegionSignals = 0
  let automaticMiddleEastNameMatches = 0
  let arabicIndicators = 0
  let checkedTargets = 0

  for (const speaker of speakers) {
    if (!speaker.title) missingTitles += 1
    if (!speaker.organization) missingOrganizations += 1
    if (speaker.explicitRegionSignal) explicitRegionSignals += 1
    if (speaker.automaticMiddleEastNameMatch) automaticMiddleEastNameMatches += 1
    if (speaker.arabicNameSignal === 'arabic-name-form') arabicIndicators += 1
    if (speaker.campaignSignal !== 'uncertain') checkedTargets += 1
  }

  return {
    missingTitles,
    missingOrganizations,
    explicitRegionSignals,
    automaticMiddleEastNameMatches,
    arabicIndicators,
    checkedTargets,
  }
})()

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase()

const profilePath = (value: string) => {
  try {
    return new URL(value).pathname.replace('/2026-speakers/', '') || value
  } catch {
    return value
  }
}

const fileName = (value: string) => value.split('/').pop() || value

function SpeakerPortrait({ imageAlt, imageSrc, name }: { imageAlt: string; imageSrc: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const source = `/leap-2026-speakers/${encodeURIComponent(fileName(imageSrc))}`

  return (
    <span className="leap-speaker-avatar" aria-hidden="true" title={imageAlt}>
      {!failed
        ? <img src={source} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        : initials(name)}
    </span>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function LeapSpeakerCell({ column, speaker }: { column: LeapColumn; speaker: IndexedLeapSpeaker }) {
  if (column === 'name') {
    return (
      <td>
        <div className="leap-speaker-person">
          <SpeakerPortrait
            imageAlt={speaker.image_alt}
            imageSrc={speaker.image_src}
            name={speaker.name}
          />
          <span>
            <strong>{speaker.name}</strong>
            <small>#{String(speaker.sourceIndex + 1).padStart(4, '0')}</small>
          </span>
        </div>
      </td>
    )
  }

  if (column === 'title') return <td>{speaker.title || <span className="riseup-speaker-missing">—</span>}</td>
  if (column === 'organization') return <td><strong className="leap-organization">{speaker.organization || '—'}</strong></td>

  if (column === 'profile_url') {
    return (
      <td>
        <div className="leap-profile-link">
          <a href={speaker.profile_url} target="_blank" rel="noreferrer">Open profile ↗</a>
          <small title={speaker.profile_url}>{profilePath(speaker.profile_url)}</small>
        </div>
      </td>
    )
  }

  if (column === 'campaignSignal') {
    return (
      <td>
        <input
          aria-label={`${speaker.name}: Middle Eastern ${speaker.campaignSignal === 'uncertain' ? 'unchecked' : 'checked'}`}
          className="leap-target-checkbox"
          checked={speaker.campaignSignal !== 'uncertain'}
          readOnly
          title={CAMPAIGN_SIGNAL_LABEL[speaker.campaignSignal]}
          type="checkbox"
        />
      </td>
    )
  }

  if (column === 'image_alt') return <td>{speaker.image_alt}</td>

  return (
    <td>
      <code className="leap-image-source" title={speaker.image_src}>{fileName(speaker.image_src)}</code>
    </td>
  )
}

export function LeapData() {
  const [query, setQuery] = useState('')
  const [completeness, setCompleteness] = useState<CompletenessFilter>('all')
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('all')
  const {
    resetSort,
    setSortDirection,
    setSortField,
    sortDirection,
    sortField,
  } = usePersistedSort<LeapColumn>(ROW_SORT_STORAGE_KEY, DEFAULT_SORT, LEAP_COLUMN_KEYS)
  const [columnOrder, setColumnOrder] = useState<LeapColumn[]>(restoreColumnOrder)
  const [draggingColumn, setDraggingColumn] = useState<LeapColumn | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const [page, setPage] = useState(1)
  const pointerDragCleanup = useRef<(() => void) | null>(null)
  const deferredQuery = useDeferredValue(query)
  const { getResizeHandleProps, totalWidth, widths } = useResizableColumns({
    defaults: LEAP_COLUMN_WIDTHS,
    storageKey: 'eign-leap-speakers.column-widths.v1',
  })

  const results = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLocaleLowerCase()

    return speakers
      .filter((speaker) => {
        if (completeness === 'complete') return Boolean(speaker.title && speaker.organization)
        if (completeness === 'missing-title') return !speaker.title
        if (completeness === 'missing-organization') return !speaker.organization
        return true
      })
      .filter((speaker) => {
        if (campaignFilter === 'checked') return speaker.campaignSignal !== 'uncertain'
        if (campaignFilter === 'unchecked') return speaker.campaignSignal === 'uncertain'
        return true
      })
      .filter((speaker) => {
        if (!normalizedQuery) return true

        return LEAP_COLUMNS.some((column) => {
          const value = column.key === 'campaignSignal'
            ? speaker.campaignSignal === 'uncertain' ? 'unchecked' : 'checked middle eastern'
            : speaker[column.key]
          return String(value ?? '').toLocaleLowerCase().includes(normalizedQuery)
        })
      })
      .sort((left, right) => {
        const leftValue = String(left[sortField] ?? '')
        const rightValue = String(right[sortField] ?? '')
        if (!leftValue || !rightValue) {
          if (!leftValue && rightValue) return 1
          if (leftValue && !rightValue) return -1
        }
        const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' })
        return (sortDirection === 'asc' ? comparison : -comparison) || left.sourceIndex - right.sourceIndex
      })
  }, [completeness, campaignFilter, deferredQuery, sortDirection, sortField])

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const visibleSpeakers = results.slice(pageStart, pageStart + PAGE_SIZE)
  const firstVisible = results.length ? pageStart + 1 : 0
  const lastVisible = Math.min(pageStart + PAGE_SIZE, results.length)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'LEAP 2026 speaker data · EIGN Data Workspace'
    return () => {
      pointerDragCleanup.current?.()
      document.title = previousTitle
    }
  }, [])

  const toggleSort = (field: LeapColumn) => {
    setPage(1)
    if (sortField === field) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortField(field)
    setSortDirection(DEFAULT_SORT_DIRECTIONS[field])
  }

  const moveColumn = (source: LeapColumn, target: LeapColumn, position: ColumnDrop['position']) => {
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

  const handleColumnDragStart = (event: ReactDragEvent<HTMLTableCellElement>, column: LeapColumn) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', column)
    setDraggingColumn(column)
  }

  const handlePointerColumnDragStart = (event: ReactPointerEvent<HTMLSpanElement>, source: LeapColumn) => {
    if (event.button !== 0) return
    event.preventDefault()
    pointerDragCleanup.current?.()
    setDraggingColumn(source)

    const locateDrop = (clientX: number) => {
      const headers = Array.from(document.querySelectorAll<HTMLTableCellElement>('.leap-data-table th[data-column-key]'))
      const target = headers.find((header) => {
        const bounds = header.getBoundingClientRect()
        return clientX >= bounds.left && clientX <= bounds.right
      })
      const column = target?.dataset.columnKey
      if (!target || !isLeapColumn(column) || column === source) return null
      const bounds = target.getBoundingClientRect()
      return {
        column,
        position: clientX < bounds.left + bounds.width / 2 ? 'before' as const : 'after' as const,
      }
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextDrop = locateDrop(moveEvent.clientX)
      if (nextDrop) setColumnDrop(nextDrop)
    }
    const finishPointerDrag = (upEvent: PointerEvent) => {
      const nextDrop = locateDrop(upEvent.clientX)
      if (nextDrop) moveColumn(source, nextDrop.column, nextDrop.position)
      cleanup()
      setDraggingColumn(null)
      setColumnDrop(null)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishPointerDrag)
      window.removeEventListener('pointercancel', finishPointerDrag)
      pointerDragCleanup.current = null
    }

    pointerDragCleanup.current = cleanup
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishPointerDrag)
    window.addEventListener('pointercancel', finishPointerDrag)
  }

  const handleColumnDragOver = (event: ReactDragEvent<HTMLTableCellElement>, column: LeapColumn) => {
    if (!draggingColumn || draggingColumn === column) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setColumnDrop({ column, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
  }

  const handleColumnDrop = (event: ReactDragEvent<HTMLTableCellElement>, column: LeapColumn) => {
    event.preventDefault()
    const source = (event.dataTransfer.getData('text/plain') || draggingColumn) as LeapColumn | null
    const position = columnDrop?.column === column ? columnDrop.position : 'before'
    if (source && isLeapColumn(source)) moveColumn(source, column, position)
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const finishColumnDrag = () => {
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const clearFilters = () => {
    setQuery('')
    setCompleteness('all')
    setCampaignFilter('all')
    resetSort()
    setPage(1)
  }

  const filtersActive = Boolean(
    query
    || completeness !== 'all'
    || campaignFilter !== 'all'
    || sortField !== DEFAULT_SORT.field
    || sortDirection !== DEFAULT_SORT.direction,
  )
  const tableStyle = {
    '--resizable-table-width': `${totalWidth(columnOrder)}px`,
  } as CSSProperties

  return (
    <div className="app-shell leap-data-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem people</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/software-companies">Software companies</a>
          <a href="/influencers">Influencers</a>
          <a href="/research">Startups</a>
          <a href="/newsletters">Newsletters</a>
          <a href="/posts">Posts</a>
          <a href="/in-progress" aria-current="page">In progress</a>
        </nav>
      </header>

      <main className="riseup-speakers-main leap-data-main">
        <section className="influencer-directory riseup-speakers-directory leap-data-directory" aria-labelledby="leap-data-title">
          <header className="influencer-directory__header riseup-speakers-header leap-data-header">
            <div>
              <span className="leap-data-kicker">31 August–3 September 2026</span>
              <h2 id="leap-data-title">LEAP 2026 speaker data</h2>
              <p>Source-preserving conference directory extracted from the saved speaker page.</p>
            </div>
            <div>
              <span>{results.length.toLocaleString()} / {speakers.length.toLocaleString()}</span>
              <a href={SOURCE_URL} target="_blank" rel="noreferrer">Open source ↗</a>
            </div>
          </header>

          <div className="filter-bar riseup-speakers-filters leap-data-filters">
            <label className="search-field">
              <span className="sr-only">Search LEAP speakers</span>
              <SearchIcon />
              <input
                type="search"
                value={query}
                placeholder="Search names, titles, organizations, profiles, signals, or image fields"
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
              />
            </label>
            <label className="leap-data-completeness">
              <span>Completeness</span>
              <select value={completeness} onChange={(event) => {
                setCompleteness(event.target.value as CompletenessFilter)
                setPage(1)
              }}>
                <option value="all">All records</option>
                <option value="complete">Title + organization</option>
                <option value="missing-title">Missing title</option>
                <option value="missing-organization">Missing organization</option>
              </select>
            </label>
            <label className="leap-data-completeness">
              <span>Campaign targeting</span>
              <select value={campaignFilter} onChange={(event) => {
                setCampaignFilter(event.target.value as CampaignFilter)
                setPage(1)
              }}>
                <option value="all">All targets</option>
                <option value="checked">Checked</option>
                <option value="unchecked">Unchecked</option>
              </select>
            </label>
            <button className="reset-button" type="button" disabled={!filtersActive} onClick={clearFilters}>Clear</button>
          </div>

          <div className="result-meta leap-data-meta" aria-live="polite">
            <span>{results.length.toLocaleString()} matching speakers · sorted by {LEAP_COLUMNS_BY_KEY.get(sortField)?.label.toLocaleLowerCase()} {sortDirection === 'asc' ? '↑' : '↓'}</span>
            <span>{LEAP_SUMMARY.checkedTargets} automatically checked · drag headers to reorder · click arrows to sort · drag edges to resize</span>
          </div>

          <div className="riseup-speakers-table-wrap leap-data-table-wrap">
            <table className="company-table riseup-speakers-table leap-data-table resizable-table" style={tableStyle}>
              <colgroup>
                {columnOrder.map((column) => <col key={column} style={{ width: `${widths[column]}px` }} />)}
              </colgroup>
              <thead>
                <tr>
                  {columnOrder.map((columnKey) => {
                    const column = LEAP_COLUMNS_BY_KEY.get(columnKey)!
                    const active = sortField === column.key
                    const nextDirection = active
                      ? sortDirection === 'asc' ? 'descending' : 'ascending'
                      : DEFAULT_SORT_DIRECTIONS[column.key] === 'asc' ? 'ascending' : 'descending'
                    const dropClass = columnDrop?.column === column.key ? ` is-drop-${columnDrop.position}` : ''
                    return (
                      <th
                        key={column.key}
                        aria-sort={active ? sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'}
                        className={`influencer-draggable-header${draggingColumn === column.key ? ' is-dragging' : ''}${dropClass}`}
                        data-column-key={column.key}
                        draggable
                        onDragEnd={finishColumnDrag}
                        onDragOver={(event) => handleColumnDragOver(event, column.key)}
                        onDragStart={(event) => handleColumnDragStart(event, column.key)}
                        onDrop={(event) => handleColumnDrop(event, column.key)}
                        scope="col"
                      >
                        <span
                          aria-hidden="true"
                          className="riseup-column-drag-handle"
                          draggable
                          onPointerDown={(event) => handlePointerColumnDragStart(event, column.key)}
                          title={`Drag to move ${column.label}`}
                        >
                          ⋮⋮
                        </span>
                        <button
                          aria-label={`Sort ${column.label} ${nextDirection}`}
                          className="influencer-sort-button"
                          onClick={() => toggleSort(column.key)}
                          type="button"
                        >
                          <span className="influencer-header-label">{column.label}</span>
                          <span className={`influencer-sort-arrow${active ? ' is-active' : ''}`} aria-hidden="true">
                            {active ? sortDirection === 'asc' ? '↑' : '↓' : '↕'}
                          </span>
                        </button>
                        <ColumnResizeHandle {...getResizeHandleProps(column.key, column.label)} />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleSpeakers.map((speaker) => (
                  <tr key={`${speaker.profile_url}-${speaker.sourceIndex}`}>
                    {columnOrder.map((column) => (
                      <LeapSpeakerCell key={column} column={column} speaker={speaker} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!results.length && <div className="empty-results">No LEAP speakers match the current filters.</div>}
          </div>

          <footer className="leap-data-pager">
            <span>Rows {firstVisible.toLocaleString()}–{lastVisible.toLocaleString()} of {results.length.toLocaleString()}</span>
            <div>
              <button type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <span>Page {safePage} of {pageCount}</span>
              <button type="button" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}
