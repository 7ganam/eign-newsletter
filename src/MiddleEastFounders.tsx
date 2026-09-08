import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, ThHTMLAttributes } from 'react'
import founderData from '../assets/people/middle-east-founders.json'
import { InlineEdit } from './editableCells'
import { ResizableDataTable } from './resizableColumns'
import type { BasicTableColumn } from './resizableColumns'
import { ArchiveToolbar, RowSelectionCell, useRowArchive } from './rowArchive'
import { usePersistedSort } from './tablePreferences'
import { WorkspaceNav } from './WorkspaceNav'

const FOUNDER_COLUMNS = [
  { key: 'order', label: 'Order', defaultWidth: 78 },
  { key: 'person', label: 'Founder / entrepreneur', defaultWidth: 210 },
  { key: 'target', label: 'Target', defaultWidth: 88 },
  { key: 'tier', label: 'Influence tier', defaultWidth: 132 },
  { key: 'companies', label: 'Companies', defaultWidth: 230 },
  { key: 'market', label: 'Primary market', defaultWidth: 195 },
  { key: 'sector', label: 'Sector', defaultWidth: 200 },
  { key: 'role', label: 'Founder role', defaultWidth: 180 },
  { key: 'why', label: 'Why selected', defaultWidth: 360 },
  { key: 'signal', label: 'Influence signal', defaultWidth: 360 },
  { key: 'linkedin', label: 'LinkedIn', defaultWidth: 165 },
  { key: 'followers', label: 'LinkedIn followers', defaultWidth: 155 },
  { key: 'source', label: 'Source', defaultWidth: 150 },
  { key: 'evidence', label: 'Evidence', defaultWidth: 125 },
] as const

type FounderColumn = (typeof FOUNDER_COLUMNS)[number]['key']
type FounderDataRow = (typeof founderData.rows)[number]
type FounderRow = Omit<FounderDataRow, 'followers' | 'target'> & { followers: number | null; target: boolean }
type FounderEditableField =
  | 'companies'
  | 'editorial_order'
  | 'founder_role'
  | 'followers'
  | 'influence_signal'
  | 'linkedin_url'
  | 'name'
  | 'primary_market'
  | 'sector'
  | 'source_url'
  | 'target'
  | 'tier'
  | 'why_selected'
type ColumnDrop = { column: FounderColumn; position: 'before' | 'after' }

const FOUNDER_COLUMNS_BY_KEY = new Map(FOUNDER_COLUMNS.map((column) => [column.key, column]))
const FOUNDER_COLUMN_KEYS = FOUNDER_COLUMNS.map((column) => column.key)
const COLUMN_ORDER_STORAGE_KEY = 'eign-middle-east-founders.column-order.v1'
const ROW_SORT_STORAGE_KEY = 'eign-middle-east-founders.row-sort.v1'
const DEFAULT_SORT = { field: 'order', direction: 'asc' } as const
const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const restoreColumnOrder = () => {
  const defaultOrder = [...FOUNDER_COLUMN_KEYS]
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(stored)) return defaultOrder
    const seen = new Set<FounderColumn>()
    const restored = stored.flatMap((key) => {
      if (typeof key !== 'string' || !FOUNDER_COLUMNS_BY_KEY.has(key as FounderColumn) || seen.has(key as FounderColumn)) return []
      seen.add(key as FounderColumn)
      return [key as FounderColumn]
    })
    if (restored.length && !seen.has('followers')) {
      const linkedInIndex = restored.indexOf('linkedin')
      restored.splice(linkedInIndex >= 0 ? linkedInIndex + 1 : restored.length, 0, 'followers')
      seen.add('followers')
    }
    if (restored.length && !seen.has('target')) {
      const personIndex = restored.indexOf('person')
      restored.splice(personIndex >= 0 ? personIndex + 1 : restored.length, 0, 'target')
      seen.add('target')
    }
    return [...restored, ...defaultOrder.filter((key) => !seen.has(key))]
  } catch {
    return defaultOrder
  }
}

const saveColumnOrder = (columns: FounderColumn[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // Reordering remains available for the current session.
  }
}

const initialsFor = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase()

const valueForSort = (founder: FounderRow, column: FounderColumn): number | string => {
  if (column === 'order') return founder.editorial_order
  if (column === 'person') return founder.name
  if (column === 'target') return Number(founder.target)
  if (column === 'tier') return founder.tier
  if (column === 'companies') return founder.companies.join(' ')
  if (column === 'market') return founder.primary_market
  if (column === 'sector') return founder.sector
  if (column === 'role') return founder.founder_role
  if (column === 'why') return founder.why_selected
  if (column === 'signal') return founder.influence_signal
  if (column === 'linkedin') return founder.linkedin_url ?? ''
  if (column === 'followers') return founder.followers ?? -1
  if (column === 'source') return founder.source
  return founder.evidence.label
}

const renderFounderCell = (
  founder: FounderRow,
  column: FounderColumn,
  onSave: (field: FounderEditableField, value: unknown) => Promise<void>,
): ReactNode => {
  if (column === 'order') return (
    <InlineEdit
      ariaLabel={`${founder.name} editorial order`}
      inputType="number"
      value={String(founder.editorial_order)}
      onSave={(value) => onSave('editorial_order', Number(value))}
    >
      {founder.editorial_order}
    </InlineEdit>
  )
  if (column === 'person') return (
    <InlineEdit ariaLabel={`${founder.name} name`} value={founder.name} onSave={(value) => onSave('name', value)}>
      <div className="founder-name-cell">
        <span className="founder-monogram" aria-hidden="true">{initialsFor(founder.name)}</span>
        <span>
          <strong>{founder.name}</strong>
          <small>{founder.founder_role}</small>
        </span>
      </div>
    </InlineEdit>
  )
  if (column === 'target') return (
    <label className="founder-target-cell" title={founder.target ? 'Selected as a target' : 'Select as a target'}>
      <input
        aria-label={`${founder.name}: Target`}
        checked={founder.target}
        onChange={(event) => { void onSave('target', event.target.checked).catch(() => undefined) }}
        type="checkbox"
      />
    </label>
  )
  if (column === 'tier') return (
    <InlineEdit
      ariaLabel={`${founder.name} influence tier`}
      options={[
        { label: '1 · Region shaper', value: '1' },
        { label: '2 · Category leader', value: '2' },
        { label: '3 · Breakout builder', value: '3' },
      ]}
      value={String(founder.tier)}
      onSave={(value) => onSave('tier', Number(value))}
    >
      <span className={`founder-tier founder-tier--${founder.tier}`}>{founder.tier}. {founder.tier_label}</span>
    </InlineEdit>
  )
  if (column === 'companies') return (
    <InlineEdit ariaLabel={`${founder.name} companies`} value={founder.companies.join(' · ')} onSave={(value) => onSave('companies', value)}>
      {founder.companies.join(' · ')}
    </InlineEdit>
  )
  if (column === 'market') return (
    <InlineEdit ariaLabel={`${founder.name} primary market`} value={founder.primary_market} onSave={(value) => onSave('primary_market', value)}>
      {founder.primary_market}
    </InlineEdit>
  )
  if (column === 'sector') return (
    <InlineEdit ariaLabel={`${founder.name} sector`} value={founder.sector} onSave={(value) => onSave('sector', value)}>
      {founder.sector}
    </InlineEdit>
  )
  if (column === 'role') return (
    <InlineEdit ariaLabel={`${founder.name} founder role`} value={founder.founder_role} onSave={(value) => onSave('founder_role', value)}>
      {founder.founder_role}
    </InlineEdit>
  )
  if (column === 'why') return (
    <InlineEdit ariaLabel={`${founder.name} why selected`} value={founder.why_selected} onSave={(value) => onSave('why_selected', value)}>
      {founder.why_selected || <span className="founder-empty">—</span>}
    </InlineEdit>
  )
  if (column === 'signal') return (
    <InlineEdit ariaLabel={`${founder.name} influence signal`} value={founder.influence_signal} onSave={(value) => onSave('influence_signal', value)}>
      {founder.influence_signal || <span className="founder-empty">—</span>}
    </InlineEdit>
  )
  if (column === 'linkedin') return (
    <InlineEdit ariaLabel={`${founder.name} LinkedIn URL`} inputType="url" value={founder.linkedin_url ?? ''} onSave={(value) => onSave('linkedin_url', value)}>
      {founder.linkedin_url ? (
        <a
          className="vc-source-link"
          href={founder.linkedin_url}
          target="_blank"
          rel="noreferrer"
          title={`${founder.linkedin_review.profile_name} · ${founder.linkedin_review.confidence} confidence · ${founder.linkedin_review.evidence}`}
        >Profile ↗</a>
      ) : <span className="founder-empty" title={founder.linkedin_review.evidence}>No verified profile</span>}
    </InlineEdit>
  )
  if (column === 'followers') return (
    <InlineEdit
      ariaLabel={`${founder.name} LinkedIn followers`}
      inputType="number"
      value={founder.followers === null ? '' : String(founder.followers)}
      onSave={(value) => onSave('followers', value.trim() ? Number(value) : null)}
    >
      {founder.followers === null
        ? <span className="founder-empty">—</span>
        : founder.followers.toLocaleString()}
    </InlineEdit>
  )
  if (column === 'source') return (
    <span className="founder-source-value" title="Read-only row provenance">
      <strong>{founder.source}</strong>
      <small>read-only</small>
    </span>
  )
  return (
    <InlineEdit ariaLabel={`${founder.name} evidence URL`} inputType="url" value={founder.evidence.url} onSave={(value) => onSave('source_url', value)}>
      <a className="vc-source-link" href={founder.evidence.url} target="_blank" rel="noreferrer" title={founder.evidence.label}>Evidence ↗</a>
    </InlineEdit>
  )
}

const cellClassName = (column: FounderColumn) => {
  if (column === 'order') return 'vc-rank founder-order'
  if (column === 'target') return 'founder-target-column'
  if (column === 'why' || column === 'signal') return 'vc-context founder-narrative'
  if (column === 'role') return 'founder-role'
  return undefined
}

export function MiddleEastFounders() {
  const [rows, setRows] = useState<FounderRow[]>(() => structuredClone(founderData.rows))
  const [cellSaveError, setCellSaveError] = useState('')
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<'all' | '1' | '2' | '3'>('all')
  const [columnOrder, setColumnOrder] = useState<FounderColumn[]>(restoreColumnOrder)
  const [draggingColumn, setDraggingColumn] = useState<FounderColumn | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const columnDropRef = useRef<ColumnDrop | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const { setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<FounderColumn>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
    FOUNDER_COLUMN_KEYS,
  )

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Middle East founders · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch('/api/middle-east-founders')
      .then(async (response) => {
        const result = await response.json().catch(() => null) as { error?: string; rows?: FounderRow[] } | null
        if (!response.ok || !result?.rows) throw new Error(result?.error || `The data service returned ${response.status}.`)
        if (!cancelled) setRows(result.rows)
      })
      .catch((error) => {
        if (!cancelled) setCellSaveError(error instanceof Error ? error.message : 'Live founder edits are unavailable.')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => () => dragCleanupRef.current?.(), [])

  const orderedColumns = useMemo(
    () => columnOrder.map((key) => FOUNDER_COLUMNS_BY_KEY.get(key)).filter((column): column is (typeof FOUNDER_COLUMNS)[number] => Boolean(column)),
    [columnOrder],
  )
  const tableStats = useMemo(() => ({
    linkedinProfiles: rows.filter((founder) => founder.linkedin_url).length,
    sectors: new Set(rows.map((founder) => founder.sector)).size,
    unresolvedProfiles: rows.filter((founder) => !founder.linkedin_url).length,
  }), [rows])
  const normalizedQuery = query.trim().toLowerCase()
  const visibleRows = useMemo(() => rows.filter((founder) => {
    if (tier !== 'all' && founder.tier !== Number(tier)) return false
    if (!normalizedQuery) return true
    return [
      founder.name,
      founder.founder_role,
      founder.companies.join(' '),
      founder.primary_market,
      founder.sector,
      founder.tier_label,
      founder.why_selected,
      founder.influence_signal,
    ].join(' ').toLowerCase().includes(normalizedQuery)
  }).sort((left, right) => {
    const leftValue = valueForSort(left, sortField)
    const rightValue = valueForSort(right, sortField)
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : textCollator.compare(String(leftValue), String(rightValue))
    if (comparison !== 0) return comparison * (sortDirection === 'asc' ? 1 : -1)
    return textCollator.compare(left.name, right.name)
  }), [normalizedQuery, rows, sortDirection, sortField, tier])
  const archive = useRowArchive({ tableId: 'middle-east-founders', visibleRowIds: visibleRows.map((founder) => founder.id) })
  const displayedRows = visibleRows.filter((founder) => archive.showArchived === archive.isArchived(founder.id))

  const saveFounderField = async (founder: FounderRow, field: FounderEditableField, value: unknown) => {
    setCellSaveError('')
    const response = await fetch(`/api/middle-east-founders/${encodeURIComponent(founder.id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ field, value }),
    })
    const result = await response.json().catch(() => null) as { error?: string; founder?: FounderRow } | null
    if (!response.ok || !result?.founder) {
      const message = result?.error || `The data service returned ${response.status}.`
      setCellSaveError(message)
      throw new Error(message)
    }
    setRows((current) => current.map((candidate) => candidate.id === founder.id ? result.founder! : candidate))
  }

  const sortBy = (field: FounderColumn) => {
    if (field === sortField) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const moveColumn = (sourceColumn: FounderColumn, targetColumn: FounderColumn, position: ColumnDrop['position']) => {
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

  const handleColumnPointerDown = (event: ReactPointerEvent<HTMLSpanElement>, column: FounderColumn) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    dragCleanupRef.current?.()
    const pointerId = event.pointerId
    setDraggingColumn(column)
    setDropTarget(null)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLTableCellElement>('.founder-column-header')
      const targetColumn = target?.id.replace('founder-column-', '') as FounderColumn | undefined
      if (!target || !targetColumn || targetColumn === column || !FOUNDER_COLUMNS_BY_KEY.has(targetColumn)) {
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

  const getHeaderProps = (column: BasicTableColumn<FounderColumn>): ThHTMLAttributes<HTMLTableCellElement> => ({
    'aria-sort': sortField === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
    className: [
      'vc-column-header founder-column-header',
      draggingColumn === column.key ? 'is-dragging' : '',
      columnDrop?.column === column.key ? `is-drop-${columnDrop.position}` : '',
    ].filter(Boolean).join(' '),
    id: `founder-column-${column.key}`,
    title: `${column.label} · Drag to reorder, click to sort, or use the right edge to resize`,
  })

  const renderHeader = (column: BasicTableColumn<FounderColumn>) => (
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
    <div className="app-shell middle-east-vcs-page middle-east-founders-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Founders, companies, and regional influence</span></div>
        <WorkspaceNav active="in-progress" />
      </header>

      <main className="middle-east-vcs-main">
        <section className="influencer-directory vc-directory" aria-labelledby="middle-east-founders-title">
          <header className="influencer-directory__header vc-directory__header">
            <div>
              <h2 id="middle-east-founders-title">Middle East founders &amp; entrepreneurs</h2>
              <p>A source-backed editorial index of region-shaping company builders</p>
            </div>
            <div className="vc-directory__actions">
              <a href="/people">Unified people →</a>
              <span>{rows.length} people · {tableStats.sectors} sectors</span>
              <span>{tableStats.linkedinProfiles} LinkedIn profiles · {tableStats.unresolvedProfiles} unresolved</span>
              <time dateTime={founderData.observed_at}>Reviewed 1 Sep 2026</time>
            </div>
          </header>

          <div className="founders-toolbar">
            <label className="founders-search">
              <span>Search</span>
              <input
                aria-label="Search founders"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, company, market, sector, or signal"
                type="search"
                value={query}
              />
            </label>
            <label>
              <span>Tier</span>
              <select aria-label="Filter by influence tier" onChange={(event) => setTier(event.target.value as typeof tier)} value={tier}>
                <option value="all">All tiers</option>
                <option value="1">1 · Region shapers</option>
                <option value="2">2 · Category leaders</option>
                <option value="3">3 · Breakout builders</option>
              </select>
            </label>
            <div className="founders-toolbar__status" aria-live="polite">
              <strong>{displayedRows.length}</strong>
              <span>visible of {rows.length}</span>
            </div>
          </div>

          <ArchiveToolbar archive={archive} noun="founders" />

          <div className="result-meta vc-directory__meta founder-directory__meta">
            <span>{founderData.scope}</span>
            <strong>Hover a cell to edit · drag to reorder · click headers to sort · widths and order are saved</strong>
          </div>
          {cellSaveError ? <div className="founder-save-error" role="alert">{cellSaveError}</div> : null}

          <div className="vc-table-wrap founder-table-wrap">
            <ResizableDataTable
              className="company-table vc-table founder-table"
              columns={orderedColumns}
              getHeaderProps={getHeaderProps}
              renderHeader={renderHeader}
              selection={{ allSelected: archive.allVisibleSelected, onToggle: archive.toggleAllVisible, someSelected: archive.someVisibleSelected }}
              storageKey="eign-middle-east-founders.column-widths.v1"
            >
              <tbody>
                {displayedRows.map((founder) => (
                  <tr key={founder.id}>
                    <td className="row-select-cell"><RowSelectionCell checked={archive.selectedIds.has(founder.id)} label={`Select ${founder.name}`} onToggle={() => archive.toggleRow(founder.id)} /></td>
                    {orderedColumns.map((column) => (
                      <td className={cellClassName(column.key)} key={column.key}>
                        {renderFounderCell(founder, column.key, (field, value) => saveFounderField(founder, field, value))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </ResizableDataTable>
          </div>

          <footer className="vc-method-note founders-method-note">
            <strong>Method</strong>
            <span>{founderData.methodology}</span>
          </footer>
        </section>
      </main>
    </div>
  )
}
