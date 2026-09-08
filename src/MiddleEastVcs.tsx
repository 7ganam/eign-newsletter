import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, ThHTMLAttributes } from 'react'
import vcData from '../assets/middle-east-vcs.json'
import { ResizableDataTable } from './resizableColumns'
import type { BasicTableColumn } from './resizableColumns'
import { ArchiveToolbar, RowSelectionCell, useRowArchive } from './rowArchive'
import { usePersistedSort } from './tablePreferences'
import { WorkspaceNav } from './WorkspaceNav'

const VC_COLUMNS = [
  { key: 'rank', label: 'Rank', defaultWidth: 76 },
  { key: 'vc', label: 'VC', defaultWidth: 190 },
  { key: 'base', label: 'Base', defaultWidth: 155 },
  { key: 'scale', label: 'Disclosed scale', defaultWidth: 180 },
  { key: 'basis', label: 'Metric basis', defaultWidth: 135 },
  { key: 'stage', label: 'Stage', defaultWidth: 150 },
  { key: 'structure', label: 'Structure', defaultWidth: 145 },
  { key: 'note', label: 'Context', defaultWidth: 300 },
  { key: 'date', label: 'Evidence date', defaultWidth: 125 },
  { key: 'source', label: 'Source', defaultWidth: 100 },
] as const

type VcColumn = (typeof VC_COLUMNS)[number]['key']
type VcFirm = (typeof vcData.rows)[number]
type ColumnDrop = { column: VcColumn; position: 'before' | 'after' }

const VC_COLUMNS_BY_KEY = new Map(VC_COLUMNS.map((column) => [column.key, column]))
const VC_COLUMN_KEYS = VC_COLUMNS.map((column) => column.key)
const COLUMN_ORDER_STORAGE_KEY = 'eign-middle-east-vcs.column-order.v1'
const ROW_SORT_STORAGE_KEY = 'eign-middle-east-vcs.row-sort.v1'
const DEFAULT_SORT = { field: 'rank', direction: 'asc' } as const
const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const rankedCount = vcData.rows.filter((firm) => firm.rank !== null).length

const restoreColumnOrder = () => {
  const defaultOrder = [...VC_COLUMN_KEYS]
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(stored)) return defaultOrder
    const seen = new Set<VcColumn>()
    const restored = stored.flatMap((key) => {
      if (typeof key !== 'string' || !VC_COLUMNS_BY_KEY.has(key as VcColumn) || seen.has(key as VcColumn)) return []
      seen.add(key as VcColumn)
      return [key as VcColumn]
    })
    return [...restored, ...defaultOrder.filter((key) => !seen.has(key))]
  } catch {
    return defaultOrder
  }
}

const saveColumnOrder = (columns: VcColumn[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // Reordering remains available for the current session.
  }
}

const valueForSort = (firm: VcFirm, column: VcColumn): number | string => {
  if (column === 'rank') return firm.rank ?? Number.POSITIVE_INFINITY
  if (column === 'vc' || column === 'source') return firm.name
  if (column === 'base') return firm.base
  if (column === 'scale') return firm.scale_usd_m ?? -1
  if (column === 'basis') return firm.metric_basis
  if (column === 'stage') return firm.stage
  if (column === 'structure') return firm.structure
  if (column === 'note') return firm.note
  return firm.source_date
}

const renderFirmCell = (firm: VcFirm, column: VcColumn): ReactNode => {
  if (column === 'rank') return firm.rank ?? '—'
  if (column === 'vc') return (
    <div className="vc-name-cell">
      <span className="vc-mark" aria-hidden="true">{firm.short_name}</span>
      <span>
        <a href={firm.website} target="_blank" rel="noreferrer">{firm.name}</a>
        <small>{firm.rank === null ? 'Activity leader' : 'Capital-ranked'}</small>
      </span>
    </div>
  )
  if (column === 'base') return firm.base
  if (column === 'scale') return firm.disclosed_scale
  if (column === 'basis') return <span className="vc-basis">{firm.metric_basis}</span>
  if (column === 'stage') return firm.stage
  if (column === 'structure') return firm.structure
  if (column === 'note') return firm.note
  if (column === 'date') return firm.source_date
  return <a className="vc-source-link" href={firm.source_url} target="_blank" rel="noreferrer">Evidence ↗</a>
}

const cellClassName = (column: VcColumn) => {
  if (column === 'rank') return 'vc-rank'
  if (column === 'scale') return 'vc-scale'
  if (column === 'note') return 'vc-context'
  if (column === 'date') return 'vc-evidence-date'
  return undefined
}

export function MiddleEastVcs() {
  const [columnOrder, setColumnOrder] = useState<VcColumn[]>(restoreColumnOrder)
  const [draggingColumn, setDraggingColumn] = useState<VcColumn | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const columnDropRef = useRef<ColumnDrop | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const { setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<VcColumn>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
    VC_COLUMN_KEYS,
  )

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Middle East VCs · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => () => dragCleanupRef.current?.(), [])

  const orderedColumns = useMemo(
    () => columnOrder.map((key) => VC_COLUMNS_BY_KEY.get(key)).filter((column): column is (typeof VC_COLUMNS)[number] => Boolean(column)),
    [columnOrder],
  )
  const sortedRows = useMemo(() => [...vcData.rows].sort((left, right) => {
    const leftValue = valueForSort(left, sortField)
    const rightValue = valueForSort(right, sortField)
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : textCollator.compare(String(leftValue), String(rightValue))
    if (comparison !== 0) return comparison * (sortDirection === 'asc' ? 1 : -1)
    return textCollator.compare(left.name, right.name)
  }), [sortDirection, sortField])
  const archive = useRowArchive({ tableId: 'middle-east-vcs', visibleRowIds: sortedRows.map((firm) => firm.name) })
  const displayedRows = sortedRows.filter((firm) => archive.showArchived === archive.isArchived(firm.name))

  const sortBy = (field: VcColumn) => {
    if (field === sortField) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection(field === 'scale' ? 'desc' : 'asc')
    }
  }

  const moveColumn = (sourceColumn: VcColumn, targetColumn: VcColumn, position: ColumnDrop['position']) => {
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

  const handleColumnPointerDown = (event: ReactPointerEvent<HTMLSpanElement>, column: VcColumn) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    dragCleanupRef.current?.()
    const pointerId = event.pointerId
    setDraggingColumn(column)
    setDropTarget(null)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLTableCellElement>('.vc-column-header')
      const targetColumn = target?.id.replace('vc-column-', '') as VcColumn | undefined
      if (!target || !targetColumn || targetColumn === column || !VC_COLUMNS_BY_KEY.has(targetColumn)) {
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

  const getHeaderProps = (column: BasicTableColumn<VcColumn>): ThHTMLAttributes<HTMLTableCellElement> => ({
    'aria-sort': sortField === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
    className: [
      'vc-column-header',
      draggingColumn === column.key ? 'is-dragging' : '',
      columnDrop?.column === column.key ? `is-drop-${columnDrop.position}` : '',
    ].filter(Boolean).join(' '),
    id: `vc-column-${column.key}`,
    title: `${column.label} · Drag to reorder, click to sort, or use the right edge to resize`,
  })

  const renderHeader = (column: BasicTableColumn<VcColumn>) => (
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
        <section className="influencer-directory vc-directory" aria-labelledby="middle-east-vcs-title">
          <header className="influencer-directory__header vc-directory__header">
            <div>
              <h2 id="middle-east-vcs-title">Middle East VCs</h2>
              <p>Regional venture platforms ordered by latest publicly disclosed capital scale</p>
            </div>
            <div className="vc-directory__actions">
              <a href="/middle-east-vc-people">View VC people →</a>
              <span>{vcData.rows.length} firms · {rankedCount} capital-ranked</span>
              <time dateTime={vcData.updated_at}>Updated 31 Aug 2026</time>
            </div>
          </header>

          <div className="result-meta vc-directory__meta">
            <span>{vcData.scope}</span>
            <strong>Drag to reorder · click to sort · order is saved</strong>
          </div>

          <ArchiveToolbar archive={archive} noun="VC firms" />

          <div className="vc-table-wrap">
            <ResizableDataTable
              className="company-table vc-table"
              columns={orderedColumns}
              getHeaderProps={getHeaderProps}
              renderHeader={renderHeader}
              selection={{ allSelected: archive.allVisibleSelected, onToggle: archive.toggleAllVisible, someSelected: archive.someVisibleSelected }}
              storageKey="eign-middle-east-vcs.column-widths.v1"
            >
              <tbody>
                {displayedRows.map((firm) => (
                  <tr key={firm.name}>
                    <td className="row-select-cell"><RowSelectionCell checked={archive.selectedIds.has(firm.name)} label={`Select ${firm.name}`} onToggle={() => archive.toggleRow(firm.name)} /></td>
                    {orderedColumns.map((column) => (
                      <td className={cellClassName(column.key)} key={column.key}>{renderFirmCell(firm, column.key)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </ResizableDataTable>
          </div>

          <footer className="vc-method-note">
            <strong>Method</strong>
            <span>{vcData.methodology}</span>
          </footer>
        </section>
      </main>
    </div>
  )
}
