import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps, CSSProperties, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react'
import linkedInData from '../assets/riseup-summit-2026-speaker-linkedin.json'
import riseUpData from '../assets/riseup-summit-2026-speakers.json'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'

type NamedValue = {
  id?: number
  name?: string
  code?: string
}
type RiseUpActivity = {
  id: number
  type: string | null
  activity_type: NamedValue | null
  title: string
  description: string | null
  start_time: string | null
  end_time: string | null
  requires_registration: boolean
  track: (NamedValue & { track_date?: string }) | null
  hall: NamedValue | null
}

type RiseUpSpeaker = {
  id: number
  attendee_id: number
  title: string | null
  passport_name: string
  certificate_name: string
  gender: string | null
  country: NamedValue | string | null
  city: NamedValue | string | null
  nationality: NamedValue | string | null
  institute: string | null
  occupation: string | null
  profile_picture_url: string | null
  profile_picture: string | null
  specialty: NamedValue | string | null
  biography: string | null
  social_links: Array<{ title?: string; url?: string }>
  activities: RiseUpActivity[]
}

type SpeakerLinkedInProfile = {
  speaker_id: number
  name: string
  linkedin_url: string
  verification: 'name-and-organisation' | 'linkedin-authored-post' | 'manual-review'
}

type SortDirection = 'asc' | 'desc'
type SpeakerColumn = 'speaker' | 'linkedin' | 'role' | 'organisation' | 'profile' | 'specialty' | 'biography' | 'sessions' | 'source' | 'record'
type ColumnDrop = { column: SpeakerColumn; position: 'before' | 'after' }
type TablePreference = {
  columnOrder: SpeakerColumn[]
  sort: { field: SpeakerColumn; direction: SortDirection }
}

const SPEAKER_SOURCE = 'riseup-2026' as const
const TABLE_PREFERENCE_ENDPOINT = '/api/table-preferences/riseup-speakers'

const SPEAKER_COLUMNS: Array<{ key: SpeakerColumn; label: string; defaultWidth: number }> = [
  { key: 'speaker', label: 'Speaker', defaultWidth: 280 },
  { key: 'linkedin', label: 'LinkedIn', defaultWidth: 150 },
  { key: 'role', label: 'Role', defaultWidth: 220 },
  { key: 'organisation', label: 'Organisation', defaultWidth: 240 },
  { key: 'profile', label: 'Profile', defaultWidth: 180 },
  { key: 'specialty', label: 'Specialty', defaultWidth: 180 },
  { key: 'biography', label: 'Biography', defaultWidth: 420 },
  { key: 'sessions', label: 'Sessions', defaultWidth: 430 },
  { key: 'source', label: 'Source', defaultWidth: 135 },
  { key: 'record', label: 'Source record', defaultWidth: 170 },
]

const SPEAKER_COLUMNS_BY_KEY = new Map(SPEAKER_COLUMNS.map((column) => [column.key, column]))
const DEFAULT_COLUMN_ORDER = SPEAKER_COLUMNS.map((column) => column.key)
const SPEAKER_COLUMN_WIDTHS = Object.fromEntries(
  SPEAKER_COLUMNS.map((column) => [column.key, column.defaultWidth]),
) as Record<SpeakerColumn, number>
const DEFAULT_SORT: TablePreference['sort'] = { field: 'speaker', direction: 'asc' }
const DEFAULT_SORT_DIRECTIONS: Record<SpeakerColumn, SortDirection> = {
  speaker: 'asc',
  linkedin: 'asc',
  role: 'asc',
  organisation: 'asc',
  profile: 'asc',
  specialty: 'asc',
  biography: 'asc',
  sessions: 'desc',
  source: 'asc',
  record: 'asc',
}

const speakers = riseUpData.speakers as RiseUpSpeaker[]
const linkedInBySpeakerId = new Map(
  (linkedInData.profiles as SpeakerLinkedInProfile[]).map((profile) => [profile.speaker_id, profile]),
)

const namedValue = (value: NamedValue | string | null) =>
  typeof value === 'string' ? value : value?.name ?? null

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase()

const formatSourceDate = (value: string | null) => {
  if (!value) return 'Unknown'
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const formatSessionTime = (activity: RiseUpActivity) => {
  const date = activity.track?.track_date
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(`${activity.track.track_date}T00:00:00`))
    : null
  const time = [activity.start_time, activity.end_time].filter(Boolean).join('–')
  return [date, time, activity.hall?.name].filter(Boolean).join(' · ')
}

const isSpeakerColumn = (value: unknown): value is SpeakerColumn =>
  typeof value === 'string' && SPEAKER_COLUMNS_BY_KEY.has(value as SpeakerColumn)

const validateColumnOrder = (value: unknown): SpeakerColumn[] | null => {
  if (!Array.isArray(value) || value.length !== DEFAULT_COLUMN_ORDER.length) return null
  if (!value.every(isSpeakerColumn) || new Set(value).size !== DEFAULT_COLUMN_ORDER.length) return null
  return value
}

const sortValue = (speaker: RiseUpSpeaker, column: SpeakerColumn): string | number => {
  switch (column) {
    case 'speaker': return speaker.passport_name
    case 'linkedin': return linkedInBySpeakerId.get(speaker.id)?.linkedin_url ?? ''
    case 'role': return speaker.occupation ?? ''
    case 'organisation': return speaker.institute ?? ''
    case 'profile': return [
      speaker.gender,
      namedValue(speaker.country),
      namedValue(speaker.city),
      namedValue(speaker.nationality),
    ].filter(Boolean).join(' ')
    case 'specialty': return namedValue(speaker.specialty) ?? ''
    case 'biography': return speaker.biography ?? ''
    case 'sessions': return speaker.activities.length
    case 'source': return SPEAKER_SOURCE
    case 'record': return speaker.id
  }
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

type SpeakerHeaderProps = {
  columnKey: SpeakerColumn
  draggingColumn: SpeakerColumn | null
  drop: ColumnDrop | null
  onDragEnd: () => void
  onDragOver: (event: ReactDragEvent<HTMLTableCellElement>, column: SpeakerColumn) => void
  onDragStart: (event: ReactDragEvent<HTMLTableCellElement>, column: SpeakerColumn) => void
  onDrop: (event: ReactDragEvent<HTMLTableCellElement>, column: SpeakerColumn) => void
  onPointerDragStart: (event: ReactPointerEvent<HTMLSpanElement>, column: SpeakerColumn) => void
  onSort: (column: SpeakerColumn) => void
  resizeHandle: ComponentProps<typeof ColumnResizeHandle>
  sort: TablePreference['sort']
}

function SpeakerHeader({
  columnKey,
  draggingColumn,
  drop,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onPointerDragStart,
  onSort,
  resizeHandle,
  sort,
}: SpeakerHeaderProps) {
  const column = SPEAKER_COLUMNS_BY_KEY.get(columnKey)!
  const active = sort.field === columnKey
  const nextDirection = active
    ? sort.direction === 'asc' ? 'desc' : 'asc'
    : DEFAULT_SORT_DIRECTIONS[columnKey]
  const dropClass = drop?.column === columnKey ? ` is-drop-${drop.position}` : ''

  return (
    <th
      aria-sort={active ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}
      className={`influencer-draggable-header${draggingColumn === columnKey ? ' is-dragging' : ''}${dropClass}`}
      data-column-key={columnKey}
      draggable
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDragOver(event, columnKey)}
      onDragStart={(event) => onDragStart(event, columnKey)}
      onDrop={(event) => onDrop(event, columnKey)}
      scope="col"
    >
      <span
        className="riseup-column-drag-handle"
        draggable
        aria-hidden="true"
        onPointerDown={(event) => onPointerDragStart(event, columnKey)}
        title={`Drag to move ${column.label}`}
      >
        ⋮⋮
      </span>
      <button
        aria-label={`Sort ${column.label} ${nextDirection === 'asc' ? 'ascending' : 'descending'}`}
        className="influencer-sort-button"
        onClick={() => onSort(columnKey)}
        type="button"
      >
        <span className="influencer-header-label">{column.label}</span>
        <span className={`influencer-sort-arrow${active ? ' is-active' : ''}`} aria-hidden="true">
          {active ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}
        </span>
      </button>
      <ColumnResizeHandle {...resizeHandle} />
    </th>
  )
}

type SpeakerCellProps = {
  column: SpeakerColumn
  index: number
  linkedInProfile?: SpeakerLinkedInProfile
  speaker: RiseUpSpeaker
}

function SpeakerCell({ column, index, linkedInProfile, speaker }: SpeakerCellProps) {
  if (column === 'speaker') {
    return (
      <td>
        <div className="riseup-speaker-person">
          <span className="riseup-speaker-avatar">
            {speaker.profile_picture_url
              ? <img src={speaker.profile_picture_url} alt="" loading="lazy" />
              : initials(speaker.passport_name)}
          </span>
          <span>
            <strong>{speaker.title ? `${speaker.title} ` : ''}{speaker.passport_name}</strong>
            <small>#{String(index + 1).padStart(3, '0')}</small>
          </span>
        </div>
      </td>
    )
  }

  if (column === 'linkedin') {
    return (
      <td>
        {linkedInProfile ? (
          <div className="riseup-linkedin-profile">
            <a href={linkedInProfile.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>
            <small>{linkedInProfile.verification === 'name-and-organisation' ? 'Organisation matched' : 'Manually verified'}</small>
          </div>
        ) : (
          <span className="riseup-linkedin-unresolved" title="No reliable public LinkedIn profile was found.">Unresolved</span>
        )}
      </td>
    )
  }

  if (column === 'role') return <td>{speaker.occupation || <span className="riseup-speaker-missing">—</span>}</td>
  if (column === 'organisation') return <td><strong className="riseup-speaker-organisation">{speaker.institute || '—'}</strong></td>

  if (column === 'profile') {
    const values = [
      speaker.gender,
      namedValue(speaker.country),
      namedValue(speaker.city),
      namedValue(speaker.nationality),
    ].filter((value): value is string => Boolean(value))
    return (
      <td>
        {values.length
          ? <div className="riseup-speaker-profile">{values.map((value, valueIndex) => <span key={`${value}-${valueIndex}`}>{value}</span>)}</div>
          : <span className="riseup-speaker-missing">—</span>}
      </td>
    )
  }

  if (column === 'specialty') return <td>{namedValue(speaker.specialty) || <span className="riseup-speaker-missing">—</span>}</td>

  if (column === 'biography') {
    return (
      <td>
        {speaker.biography ? (
          <details className="riseup-speaker-details">
            <summary>{speaker.biography}</summary>
            <p>{speaker.biography}</p>
          </details>
        ) : <span className="riseup-speaker-missing">—</span>}
      </td>
    )
  }

  if (column === 'sessions') {
    return (
      <td>
        {speaker.activities.length ? (
          <details className="riseup-speaker-details riseup-speaker-sessions">
            <summary>{speaker.activities.length} {speaker.activities.length === 1 ? 'session' : 'sessions'}</summary>
            <ul>
              {speaker.activities.map((activity) => (
                <li key={activity.id}>
                  <strong>{activity.title}</strong>
                  <span>{[
                    `Session ID ${activity.id}`,
                    activity.type,
                    activity.activity_type?.name,
                    activity.track?.name,
                    formatSessionTime(activity),
                  ].filter(Boolean).join(' · ')}</span>
                  {activity.requires_registration && <small>Registration required</small>}
                  {activity.description && <p>{activity.description}</p>}
                </li>
              ))}
            </ul>
          </details>
        ) : <span className="riseup-speaker-missing">—</span>}
      </td>
    )
  }

  if (column === 'source') return <td><span className="riseup-speaker-source">{SPEAKER_SOURCE}</span></td>

  return (
    <td>
      <div className="riseup-speaker-record">
        <span>Speaker ID {speaker.id}</span>
        <span>Attendee ID {speaker.attendee_id}</span>
        {speaker.profile_picture_url && <a href={speaker.profile_picture_url} target="_blank" rel="noreferrer">Photo ↗</a>}
        {speaker.social_links.map((link, linkIndex) => link.url && (
          <a key={`${speaker.id}-${linkIndex}`} href={link.url} target="_blank" rel="noreferrer">{link.title || 'Social link'} ↗</a>
        ))}
      </div>
    </td>
  )
}

export function Influencers2() {
  const [query, setQuery] = useState('')
  const [sessionsOnly, setSessionsOnly] = useState(false)
  const [columnOrder, setColumnOrder] = useState<SpeakerColumn[]>(DEFAULT_COLUMN_ORDER)
  const [sort, setSort] = useState<TablePreference['sort']>(DEFAULT_SORT)
  const [draggingColumn, setDraggingColumn] = useState<SpeakerColumn | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const [preferenceStatus, setPreferenceStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading')
  const [preferenceError, setPreferenceError] = useState('')
  const preferenceWriteQueue = useRef<Promise<void>>(Promise.resolve())
  const preferenceWriteVersion = useRef(0)
  const pointerDragCleanup = useRef<(() => void) | null>(null)
  const { getResizeHandleProps, totalWidth, widths } = useResizableColumns({
    defaults: SPEAKER_COLUMN_WIDTHS,
    storageKey: 'eign-riseup-speakers.column-widths.v1',
  })
  const tableStyle = {
    '--resizable-table-width': `${totalWidth(columnOrder)}px`,
  } as CSSProperties

  useEffect(() => {
    const previousTitle = document.title
    const controller = new AbortController()
    document.title = 'RiseUp Summit 2026 speakers · EIGN Data Workspace'

    fetch(TABLE_PREFERENCE_ENDPOINT, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`The preference service returned ${response.status}.`)
        return response.json() as Promise<Partial<TablePreference>>
      })
      .then((preference) => {
        const nextOrder = validateColumnOrder(preference.columnOrder)
        if (nextOrder) setColumnOrder(nextOrder)
        if (preference.sort && isSpeakerColumn(preference.sort.field) && (preference.sort.direction === 'asc' || preference.sort.direction === 'desc')) {
          setSort(preference.sort)
        }
        setPreferenceStatus('saved')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setPreferenceError(error instanceof Error ? error.message : 'Unable to load table preferences.')
        setPreferenceStatus('error')
      })

    return () => {
      controller.abort()
      pointerDragCleanup.current?.()
      document.title = previousTitle
    }
  }, [])

  const persistPreferences = useCallback((preference: TablePreference) => {
    const writeVersion = ++preferenceWriteVersion.current
    setPreferenceStatus('saving')
    setPreferenceError('')

    const operation = preferenceWriteQueue.current.then(async () => {
      const response = await fetch(TABLE_PREFERENCE_ENDPOINT, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(preference),
      })
      const result = await response.json().catch(() => null) as { error?: string } | null
      if (!response.ok) throw new Error(result?.error || `The preference service returned ${response.status}.`)
    })
    preferenceWriteQueue.current = operation.catch(() => undefined)
    operation.then(() => {
      if (preferenceWriteVersion.current === writeVersion) setPreferenceStatus('saved')
    }).catch((error) => {
      if (preferenceWriteVersion.current !== writeVersion) return
      setPreferenceError(error instanceof Error ? error.message : 'Unable to save table preferences.')
      setPreferenceStatus('error')
    })
  }, [])

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return speakers
      .filter((speaker) => !sessionsOnly || speaker.activities.length > 0)
      .filter((speaker) => {
        if (!normalizedQuery) return true
        const searchable = [
          speaker.passport_name,
          speaker.certificate_name,
          speaker.occupation,
          speaker.institute,
          speaker.biography,
          speaker.gender,
          namedValue(speaker.country),
          namedValue(speaker.city),
          namedValue(speaker.nationality),
          namedValue(speaker.specialty),
          linkedInBySpeakerId.get(speaker.id)?.linkedin_url,
          ...speaker.activities.flatMap((activity) => [activity.title, activity.description, activity.track?.name, activity.hall?.name]),
        ].filter(Boolean).join(' ').toLocaleLowerCase()
        return searchable.includes(normalizedQuery)
      })
      .sort((left, right) => {
        const leftValue = sortValue(left, sort.field)
        const rightValue = sortValue(right, sort.field)
        const leftBlank = leftValue === ''
        const rightBlank = rightValue === ''
        if (leftBlank !== rightBlank) return leftBlank ? 1 : -1
        const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue))
        return (sort.direction === 'asc' ? comparison : -comparison)
          || left.passport_name.localeCompare(right.passport_name)
      })
  }, [query, sessionsOnly, sort])

  const moveColumn = (source: SpeakerColumn, target: SpeakerColumn, position: ColumnDrop['position']) => {
    if (source === target) return
    setColumnOrder((current) => {
      const next = current.filter((column) => column !== source)
      const targetIndex = next.indexOf(target)
      if (targetIndex === -1) return current
      next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, source)
      persistPreferences({ columnOrder: next, sort })
      return next
    })
  }

  const handleColumnDragStart = (event: ReactDragEvent<HTMLTableCellElement>, column: SpeakerColumn) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', column)
    setDraggingColumn(column)
  }

  const handlePointerColumnDragStart = (event: ReactPointerEvent<HTMLSpanElement>, source: SpeakerColumn) => {
    if (event.button !== 0) return
    event.preventDefault()
    pointerDragCleanup.current?.()
    setDraggingColumn(source)

    const locateDrop = (clientX: number) => {
      const headers = Array.from(document.querySelectorAll<HTMLTableCellElement>('th[data-column-key]'))
      const target = headers.find((header) => {
        const bounds = header.getBoundingClientRect()
        return clientX >= bounds.left && clientX <= bounds.right
      })
      const column = target?.dataset.columnKey
      if (!target || !isSpeakerColumn(column) || column === source) return null
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

  const handleColumnDragOver = (event: ReactDragEvent<HTMLTableCellElement>, column: SpeakerColumn) => {
    if (!draggingColumn || draggingColumn === column) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setColumnDrop({ column, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
  }

  const handleColumnDrop = (event: ReactDragEvent<HTMLTableCellElement>, column: SpeakerColumn) => {
    event.preventDefault()
    const source = (event.dataTransfer.getData('text/plain') || draggingColumn) as SpeakerColumn | null
    const position = columnDrop?.column === column ? columnDrop.position : 'before'
    if (source && SPEAKER_COLUMNS_BY_KEY.has(source)) moveColumn(source, column, position)
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const finishColumnDrag = () => {
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const toggleSort = (field: SpeakerColumn) => {
    const nextSort = {
      field,
      direction: sort.field === field
        ? sort.direction === 'asc' ? 'desc' : 'asc'
        : DEFAULT_SORT_DIRECTIONS[field],
    } as TablePreference['sort']
    setSort(nextSort)
    persistPreferences({ columnOrder, sort: nextSort })
  }

  const clearFilters = () => {
    setQuery('')
    setSessionsOnly(false)
    setSort(DEFAULT_SORT)
    persistPreferences({ columnOrder, sort: DEFAULT_SORT })
  }

  const filtersActive = Boolean(query || sessionsOnly || sort.field !== DEFAULT_SORT.field || sort.direction !== DEFAULT_SORT.direction)
  const preferenceLabel = preferenceStatus === 'loading'
    ? 'Loading layout…'
    : preferenceStatus === 'saving'
      ? 'Saving layout…'
      : preferenceStatus === 'saved'
        ? 'Layout saved'
        : 'Layout not saved'

  return (
    <div className="app-shell influencers-2-page">
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

      <main className="riseup-speakers-main">
        <section className="influencer-directory riseup-speakers-directory" aria-labelledby="riseup-speakers-title">
          <header className="influencer-directory__header riseup-speakers-header">
            <div>
              <h2 id="riseup-speakers-title">RiseUp Summit 2026 speakers</h2>
              <p>Egypt Summit directory · Source data updated {formatSourceDate(riseUpData.source_data_updated_at)}</p>
            </div>
            <div>
              <span>{results.length} / {riseUpData.count}</span>
              <a href={riseUpData.source} target="_blank" rel="noreferrer">Open source ↗</a>
            </div>
          </header>

          <div className="filter-bar riseup-speakers-filters">
            <label className="search-field">
              <span className="sr-only">Search RiseUp speakers</span>
              <SearchIcon />
              <input
                type="search"
                value={query}
                placeholder="Search speakers, organisations, roles, biographies, sessions, or LinkedIn"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <span
              className={`riseup-preference-status${preferenceStatus === 'error' ? ' has-error' : ''}`}
              title={preferenceError || 'Column order and row sorting are stored on the server.'}
            >
              {preferenceLabel}
            </span>
            <button
              className={`riseup-speakers-toggle${sessionsOnly ? ' is-active' : ''}`}
              type="button"
              aria-pressed={sessionsOnly}
              onClick={() => setSessionsOnly((current) => !current)}
            >
              Has sessions
            </button>
            <button className="reset-button" type="button" disabled={!filtersActive} onClick={clearFilters}>Clear</button>
          </div>

          <div className="result-meta">
            <span>{results.length} matching speakers · drag headers to reorder · use arrows to sort</span>
            <span>{linkedInData.verified_count} verified LinkedIn profiles · {linkedInData.unresolved_count} unresolved · {riseUpData.speakers.filter((speaker) => speaker.biography).length} biographies · {riseUpData.speakers.reduce((total, speaker) => total + speaker.activities.length, 0)} session assignments</span>
          </div>

          <div className="riseup-speakers-table-wrap">
            <table className="company-table riseup-speakers-table resizable-table" style={tableStyle}>
              <colgroup>
                {columnOrder.map((column) => <col key={column} style={{ width: `${widths[column]}px` }} />)}
              </colgroup>
              <thead>
                <tr>
                  {columnOrder.map((column) => (
                    <SpeakerHeader
                      key={column}
                      columnKey={column}
                      draggingColumn={draggingColumn}
                      drop={columnDrop}
                      onDragEnd={finishColumnDrag}
                      onDragOver={handleColumnDragOver}
                      onDragStart={handleColumnDragStart}
                      onDrop={handleColumnDrop}
                      onPointerDragStart={handlePointerColumnDragStart}
                      onSort={toggleSort}
                      resizeHandle={getResizeHandleProps(column, SPEAKER_COLUMNS_BY_KEY.get(column)!.label)}
                      sort={sort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((speaker, index) => (
                  <tr key={speaker.id}>
                    {columnOrder.map((column) => (
                      <SpeakerCell
                        key={column}
                        column={column}
                        index={index}
                        linkedInProfile={linkedInBySpeakerId.get(speaker.id)}
                        speaker={speaker}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!results.length && <div className="empty-results">No RiseUp speakers match the current filters.</div>}
          </div>
        </section>
      </main>
    </div>
  )
}
