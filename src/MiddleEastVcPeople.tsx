import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, ThHTMLAttributes } from 'react'
import { InlineEdit } from './editableCells'
import {
  primaryVcAffiliation,
  vcAffiliations,
  vcFirmLabel,
  vcRoleLabel,
} from './vcPeopleData'
import { ResizableDataTable } from './resizableColumns'
import type { BasicTableColumn } from './resizableColumns'
import { ArchiveToolbar, RowSelectionCell, useRowArchive } from './rowArchive'
import { usePersistedSort } from './tablePreferences'
import type { UnifiedPeopleFile, UnifiedPerson } from './unifiedPeopleTypes'
import { WorkspaceNav } from './WorkspaceNav'

const initialData: UnifiedPeopleFile = {
  schema_version: 'people.v1',
  generated_at: '',
  sources: [],
  stats: { source_records: 0, unique_people: 0, multi_source_people: 0, duplicate_source_records_collapsed: 0 },
  people: [],
}

const PEOPLE_COLUMNS = [
  { key: 'firm_rank', label: 'Firm rank', defaultWidth: 78 },
  { key: 'person', label: 'Person', defaultWidth: 190 },
  { key: 'target', label: 'Target', defaultWidth: 88 },
  { key: 'firm', label: 'VC', defaultWidth: 170 },
  { key: 'role', label: 'Role', defaultWidth: 220 },
  { key: 'linkedin', label: 'LinkedIn', defaultWidth: 112 },
  { key: 'followers', label: 'Followers', defaultWidth: 125 },
  { key: 'precision', label: 'Count quality', defaultWidth: 122 },
  { key: 'observed', label: 'Observed', defaultWidth: 112 },
  { key: 'location', label: 'Location', defaultWidth: 160 },
  { key: 'source', label: 'Leadership source', defaultWidth: 130 },
] as const

type PeopleColumn = (typeof PEOPLE_COLUMNS)[number]['key']
type VcPeopleEditableField = 'name' | 'role' | 'organization' | 'linkedinUrl' | 'followers' | 'target'
type ColumnDrop = { column: PeopleColumn; position: 'before' | 'after' }
type VcPerson = UnifiedPerson

const PEOPLE_COLUMNS_BY_KEY = new Map(PEOPLE_COLUMNS.map((column) => [column.key, column]))
const PEOPLE_COLUMN_KEYS = PEOPLE_COLUMNS.map((column) => column.key)
const COLUMN_ORDER_STORAGE_KEY = 'eign-middle-east-vc-people.column-order.v1'
const ROW_SORT_STORAGE_KEY = 'eign-middle-east-vc-people.row-sort.v1'
const DEFAULT_SORT = { field: 'firm_rank', direction: 'asc' } as const
const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const linkedInFor = (person: UnifiedPerson) => person.profiles.find((profile) => profile.platform === 'linkedin')
const followerFor = (person: UnifiedPerson) => linkedInFor(person)?.followers ?? null
const firmRankFor = (person: UnifiedPerson) => {
  const ranks = vcAffiliations(person).flatMap((affiliation) => affiliation.rank == null ? [] : [affiliation.rank])
  return ranks.length > 0 ? Math.min(...ranks) : null
}
const locationFor = (person: UnifiedPerson) => [person.location.city, person.location.country].filter(Boolean).join(', ')

const restoreColumnOrder = () => {
  const defaultOrder = [...PEOPLE_COLUMN_KEYS]
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(stored)) return defaultOrder
    const seen = new Set<PeopleColumn>()
    const restored = stored.flatMap((key) => {
      if (typeof key !== 'string' || !PEOPLE_COLUMNS_BY_KEY.has(key as PeopleColumn) || seen.has(key as PeopleColumn)) return []
      seen.add(key as PeopleColumn)
      return [key as PeopleColumn]
    })
    return [...restored, ...defaultOrder.filter((key) => !seen.has(key))]
  } catch {
    return defaultOrder
  }
}

const saveColumnOrder = (columns: PeopleColumn[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // Reordering remains available for the current session.
  }
}

const valueForSort = (person: VcPerson, column: PeopleColumn): number | string => {
  if (column === 'firm_rank') return firmRankFor(person) ?? Number.POSITIVE_INFINITY
  if (column === 'person') return person.name.display
  if (column === 'target') return Number(person.influence.target ? 1 : 0)
  if (column === 'firm') return vcFirmLabel(person)
  if (column === 'role') return vcRoleLabel(person)
  if (column === 'linkedin') return linkedInFor(person)?.url ?? ''
  if (column === 'followers') return followerFor(person)?.count ?? -1
  if (column === 'precision') return followerFor(person)?.precision ?? 'unavailable'
  if (column === 'observed') return followerFor(person)?.observed_at ?? ''
  if (column === 'location') return locationFor(person)
  return primaryVcAffiliation(person)?.sourceUrl ?? ''
}

const initialsFor = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

const formattedFollowers = (person: UnifiedPerson) => {
  const followers = followerFor(person)
  if (followers?.count === null || followers?.count === undefined) return '—'
  return `${followers.precision === 'rounded' ? '~' : ''}${followers.count.toLocaleString('en-US')}`
}

const renderPersonCell = (
  person: VcPerson,
  column: PeopleColumn,
  onSave: (field: VcPeopleEditableField, value: unknown) => Promise<void>,
): ReactNode => {
  const profile = linkedInFor(person)
  const followers = followerFor(person)
  const affiliations = vcAffiliations(person)
  const multipleAffiliations = affiliations.length > 1
  if (column === 'firm_rank') return firmRankFor(person) ?? '—'
  if (column === 'person') return (
    <InlineEdit ariaLabel={`${person.name.display} name`} value={person.name.display} onSave={(value) => onSave('name', value)}>
      <div className="vc-person-name-cell">
        <span className="vc-person-monogram" aria-hidden="true">{initialsFor(person.name.display)}</span>
        <strong>{person.name.display}</strong>
      </div>
    </InlineEdit>
  )
  if (column === 'target') return (
    <label className="vc-target-cell" title={person.influence.target ? 'Selected as a target' : 'Select as a target'}>
      <input
        aria-label={`${person.name.display}: Target`}
        checked={Boolean(person.influence.target)}
        onChange={(event) => { void onSave('target', event.target.checked).catch(() => undefined) }}
        type="checkbox"
      />
    </label>
  )
  if (column === 'firm') {
    const firm = vcFirmLabel(person)
    if (multipleAffiliations) return (
      <span className="vc-merged-affiliations" title="Multiple VC affiliations are merged under this Unified People identity.">
        <strong className="vc-person-firm">{firm || '—'}</strong>
        <small>{affiliations.length} affiliations · edit canonical identity in Unified People</small>
      </span>
    )
    return (
      <InlineEdit ariaLabel={`${person.name.display} VC`} value={firm} onSave={(value) => onSave('organization', value)}>
        <strong className="vc-person-firm">{firm || '—'}</strong>
      </InlineEdit>
    )
  }
  if (column === 'role') {
    const role = vcRoleLabel(person)
    if (multipleAffiliations) return <span className="vc-merged-affiliations" title="Role is derived from multiple preserved VC source records.">{role || '—'}</span>
    return (
      <InlineEdit ariaLabel={`${person.name.display} role`} value={role} onSave={(value) => onSave('role', value)}>
        {role || '—'}
      </InlineEdit>
    )
  }
  if (column === 'linkedin') return (
    <InlineEdit ariaLabel={`${person.name.display} LinkedIn URL`} inputType="url" value={profile?.url ?? ''} onSave={(value) => onSave('linkedinUrl', value)}>
      {profile ? <a className="vc-source-link" href={profile.url} target="_blank" rel="noreferrer">Profile ↗</a> : '—'}
    </InlineEdit>
  )
  if (column === 'followers') return (
    <InlineEdit
      ariaLabel={`${person.name.display} LinkedIn followers`}
      inputType="number"
      value={followers?.count === null || followers?.count === undefined ? '' : String(followers.count)}
      onSave={(value) => onSave('followers', value.trim() ? Number(value) : null)}
    >
      <strong className={followers?.count === null ? 'vc-followers is-unavailable' : 'vc-followers'}>{formattedFollowers(person)}</strong>
    </InlineEdit>
  )
  if (column === 'precision') return followers?.status === 'observed'
    ? <span className={`vc-count-quality is-${followers.precision}`}>{followers.precision === 'rounded' ? 'Rounded' : 'Exact'}</span>
    : <span className="vc-count-quality is-unavailable">Not exposed</span>
  if (column === 'observed') return followers?.observed_at ?? '—'
  if (column === 'location') return locationFor(person) || '—'
  const sourceLinks = affiliations.filter((affiliation) => affiliation.sourceUrl)
  if (sourceLinks.length === 0) return '—'
  return (
    <span className="vc-source-links">
      {sourceLinks.map((affiliation, index) => (
        <a className="vc-source-link" href={affiliation.sourceUrl!} key={affiliation.record.record_id} target="_blank" rel="noreferrer" title={affiliation.firm ?? 'Firm evidence'}>
          {sourceLinks.length > 1 ? `${index + 1} ↗` : 'Firm evidence ↗'}
        </a>
      ))}
    </span>
  )
}

const cellClassName = (column: PeopleColumn) => {
  if (column === 'firm_rank') return 'vc-rank'
  if (column === 'target') return 'vc-target-column'
  if (column === 'followers') return 'vc-followers-cell'
  if (column === 'observed') return 'vc-evidence-date'
  if (column === 'role') return 'vc-person-role'
  return undefined
}

export function MiddleEastVcPeople() {
  const [data, setData] = useState<UnifiedPeopleFile>(() => structuredClone(initialData))
  const [cellSaveError, setCellSaveError] = useState('')
  const [dataLoadError, setDataLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [columnOrder, setColumnOrder] = useState<PeopleColumn[]>(restoreColumnOrder)
  const [draggingColumn, setDraggingColumn] = useState<PeopleColumn | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const columnDropRef = useRef<ColumnDrop | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const { setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<PeopleColumn>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
    PEOPLE_COLUMN_KEYS,
  )

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Middle East VC people · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    const load = async () => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await fetch('/api/middle-east-vc-people', { signal: controller.signal }).catch((error: unknown) => {
          if (attempt === 3 || controller.signal.aborted) throw error
          return null
        })
        if (!response) {
          await new Promise((resolve) => window.setTimeout(resolve, 175 * (attempt + 1)))
          continue
        }
        const result = await response.json().catch(() => null) as UnifiedPeopleFile | { error?: string } | null
        if (response.ok && result && 'people' in result) return result
        if (attempt < 3 && [502, 503, 504].includes(response.status)) {
          await new Promise((resolve) => window.setTimeout(resolve, 175 * (attempt + 1)))
          continue
        }
        throw new Error(result && 'error' in result ? result.error || `The data service returned ${response.status}.` : `The data service returned ${response.status}.`)
      }
      throw new Error('The VC people data service did not become ready.')
    }
    load()
      .then((result) => {
        setData(result)
        setDataLoadError('')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setDataLoadError(error instanceof Error ? error.message : 'The VC people data could not be loaded.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => () => dragCleanupRef.current?.(), [])

  const orderedColumns = useMemo(
    () => columnOrder.map((key) => PEOPLE_COLUMNS_BY_KEY.get(key)).filter((column): column is (typeof PEOPLE_COLUMNS)[number] => Boolean(column)),
    [columnOrder],
  )
  const metrics = useMemo(() => ({
    exactCount: data.people.filter((person) => followerFor(person)?.precision === 'exact').length,
    firmCount: new Set(data.people.flatMap((person) => vcAffiliations(person).flatMap((affiliation) => affiliation.firm ? [affiliation.firm] : []))).size,
    observedCount: data.people.filter((person) => followerFor(person)?.status === 'observed').length,
    roundedCount: data.people.filter((person) => followerFor(person)?.precision === 'rounded').length,
  }), [data.people])
  const sortedRows = useMemo(() => [...data.people].sort((left, right) => {
    if (sortField === 'followers') {
      const leftCount = followerFor(left)?.count
      const rightCount = followerFor(right)?.count
      if (leftCount === null || leftCount === undefined) return rightCount === null || rightCount === undefined ? 0 : 1
      if (rightCount === null || rightCount === undefined) return -1
    }
    const leftValue = valueForSort(left, sortField)
    const rightValue = valueForSort(right, sortField)
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : textCollator.compare(String(leftValue), String(rightValue))
    if (comparison !== 0) return comparison * (sortDirection === 'asc' ? 1 : -1)
    return textCollator.compare(left.name.display, right.name.display)
  }), [data.people, sortDirection, sortField])
  const archive = useRowArchive({ tableId: 'middle-east-vc-people', visibleRowIds: sortedRows.map((person) => person.id) })
  const displayedRows = sortedRows.filter((person) => archive.showArchived === archive.isArchived(person.id))

  const savePersonField = async (person: UnifiedPerson, field: VcPeopleEditableField, value: unknown) => {
    setCellSaveError('')
    const response = await fetch(`/api/middle-east-vc-people/${encodeURIComponent(person.id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ field, value }),
    })
    const result = await response.json().catch(() => null) as { error?: string; generatedAt?: string; person?: UnifiedPerson } | null
    if (!response.ok || !result?.person) {
      const message = result?.error || `The data service returned ${response.status}.`
      setCellSaveError(message)
      throw new Error(message)
    }
    setData((current) => ({
      ...current,
      generated_at: result.generatedAt ?? current.generated_at,
      people: current.people.map((candidate) => candidate.id === person.id ? result.person! : candidate),
    }))
  }

  const sortBy = (field: PeopleColumn) => {
    if (field === sortField) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection(field === 'followers' ? 'desc' : 'asc')
    }
  }

  const moveColumn = (sourceColumn: PeopleColumn, targetColumn: PeopleColumn, position: ColumnDrop['position']) => {
    if (sourceColumn === targetColumn) return
    setColumnOrder((current) => {
      const next = current.filter((column) => column !== sourceColumn)
      const targetIndex = next.indexOf(targetColumn)
      if (targetIndex === -1) return current
      next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, sourceColumn)
      saveColumnOrder(next)
      return next
    })
  }

  const setDropTarget = (drop: ColumnDrop | null) => {
    columnDropRef.current = drop
    setColumnDrop(drop)
  }

  const handleColumnPointerDown = (event: ReactPointerEvent<HTMLSpanElement>, column: PeopleColumn) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    dragCleanupRef.current?.()
    const pointerId = event.pointerId
    setDraggingColumn(column)
    setDropTarget(null)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLTableCellElement>('.vc-people-column-header')
      const targetColumn = target?.id.replace('vc-people-column-', '') as PeopleColumn | undefined
      if (!target || !targetColumn || targetColumn === column || !PEOPLE_COLUMNS_BY_KEY.has(targetColumn)) {
        setDropTarget(null)
        return
      }
      const bounds = target.getBoundingClientRect()
      setDropTarget({ column: targetColumn, position: moveEvent.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
    }

    function removePointerListeners() {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      dragCleanupRef.current = null
    }
    const finishPointerDrag = (commit: boolean) => {
      removePointerListeners()
      const drop = columnDropRef.current
      if (commit && drop) moveColumn(column, drop.column, drop.position)
      setDraggingColumn(null)
      setDropTarget(null)
    }
    const handlePointerUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === pointerId) finishPointerDrag(true)
    }
    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) finishPointerDrag(false)
    }

    dragCleanupRef.current = removePointerListeners
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
  }

  const getHeaderProps = (column: BasicTableColumn<PeopleColumn>): ThHTMLAttributes<HTMLTableCellElement> => ({
    'aria-sort': sortField === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
    className: [
      'vc-column-header vc-people-column-header',
      draggingColumn === column.key ? 'is-dragging' : '',
      columnDrop?.column === column.key ? `is-drop-${columnDrop.position}` : '',
    ].filter(Boolean).join(' '),
    id: `vc-people-column-${column.key}`,
    title: `${column.label} · Drag to reorder, click to sort, or use the right edge to resize`,
  })

  const renderHeader = (column: BasicTableColumn<PeopleColumn>) => (
    <>
      <span
        className="vc-column-grip"
        aria-hidden="true"
        onPointerDown={(event) => handleColumnPointerDown(event, column.key)}
        title={`Drag ${column.label} column`}
      >⠿</span>
      <button
        aria-label={`Sort by ${column.label}`}
        className="vc-column-sort"
        onClick={() => sortBy(column.key)}
        type="button"
      >
        <span>{column.label}</span>
        {sortField === column.key ? <b aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</b> : null}
      </button>
    </>
  )

  return (
    <div className="app-shell middle-east-vcs-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem people</span></div>
        <WorkspaceNav active="in-progress" />
      </header>

      <main className="middle-east-vcs-main">
        <section className="influencer-directory vc-directory" aria-labelledby="middle-east-vc-people-title">
          <header className="influencer-directory__header vc-directory__header">
            <div>
              <h2 id="middle-east-vc-people-title">Middle East VC people</h2>
              <p>Unified People identities connected to founders, partners, principals, board members, and senior leaders in the VC register</p>
            </div>
            <div className="vc-directory__actions">
              <a href="/middle-east-vcs">← VC register</a>
              <span>{data.people.length} people · {metrics.firmCount} firms</span>
              {data.generated_at && <time dateTime={data.generated_at}>Updated {new Date(data.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</time>}
            </div>
          </header>

          <div className="result-meta vc-directory__meta">
            <span>{metrics.observedCount} follower observations · {metrics.exactCount} exact · {metrics.roundedCount} rounded · {data.people.length - metrics.observedCount} not publicly exposed</span>
            <strong>Pencil or double-click to edit · drag to reorder · click to sort</strong>
          </div>

          {cellSaveError && <div className="software-error" role="alert">Cell was not saved: {cellSaveError}</div>}
          {dataLoadError && <div className="software-error" role="alert">VC people could not be loaded: {dataLoadError}</div>}

          <ArchiveToolbar archive={archive} noun="VC people" />

          <div className="vc-table-wrap vc-people-table-wrap">
            <ResizableDataTable
              className="company-table vc-table vc-people-table"
              columns={orderedColumns}
              getHeaderProps={getHeaderProps}
              renderHeader={renderHeader}
              selection={{ allSelected: archive.allVisibleSelected, onToggle: archive.toggleAllVisible, someSelected: archive.someVisibleSelected }}
              storageKey="eign-middle-east-vc-people.column-widths.v1"
            >
              <tbody>
                {isLoading && <tr><td className="software-empty" colSpan={orderedColumns.length + 1}>Loading Unified People VC records…</td></tr>}
                {displayedRows.map((person) => (
                  <tr key={person.id}>
                    <td className="row-select-cell"><RowSelectionCell checked={archive.selectedIds.has(person.id)} label={`Select ${person.name.display}`} onToggle={() => archive.toggleRow(person.id)} /></td>
                    {orderedColumns.map((column) => (
                      <td className={cellClassName(column.key)} key={column.key}>{renderPersonCell(person, column.key, (field, value) => savePersonField(person, field, value))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </ResizableDataTable>
          </div>

          <footer className="vc-method-note">
            <strong>Method</strong>
            <span>This is a source-filtered view of assets/people/unified-people.json. Duplicate identities are merged while every VC affiliation and its raw evidence remain preserved as source records. Exact and rounded follower counts retain their observed precision; unavailable counts are left blank, never estimated.</span>
          </footer>
        </section>
      </main>
    </div>
  )
}
