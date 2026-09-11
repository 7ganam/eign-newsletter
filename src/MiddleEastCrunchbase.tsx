import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent } from 'react'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'
import { ArchiveToolbar, RowSelectionCell, RowSelectionHeader, useRowArchive } from './rowArchive'
import { usePersistedSort } from './tablePreferences'
import { WorkspaceNav } from './WorkspaceNav'

const COLUMN_KEYS = [
  'name',
  'source',
  'imageUrl',
  'primaryGroup',
  'country',
  'headquarters',
  'foundedYear',
  'foundedOn',
  'foundedOnPrecision',
  'operatingStatus',
  'ownershipStatus',
  'employeeRange',
  'estimatedRevenueRange',
  'industries',
  'totalRaisedUsd',
  'reportedRoundCount',
  'detailedRoundCount',
  'lastFundingDate',
  'lastFundingType',
  'investorCount',
  'investors',
  'founders',
  'website',
  'shortDescription',
  'sourcePartition',
  'permalink',
  'crunchbaseUrl',
  'uuid',
] as const

type ColumnKey = typeof COLUMN_KEYS[number]
type CompanyRow = Record<ColumnKey, string>
type ColumnDrop = { column: ColumnKey; position: 'before' | 'after' }
type SelectedCell = { columnIndex: number; rowIndex: number }

type MiddleEastCrunchbaseResponse = {
  columns: string[]
  items: CompanyRow[]
  source: {
    file: string
    provider: string
    updatedAt: string
    version: number
  }
  summary: {
    countries: number
    foundedDates: number
    total: number
  }
}

const COLUMN_LABELS: Record<ColumnKey, string> = {
  country: 'Country',
  crunchbaseUrl: 'Crunchbase URL',
  detailedRoundCount: 'Detailed rounds',
  employeeRange: 'Employees',
  estimatedRevenueRange: 'Est. revenue',
  foundedOn: 'Founded',
  foundedOnPrecision: 'Date precision',
  foundedYear: 'Founded year',
  founders: 'Founders',
  headquarters: 'Headquarters',
  industries: 'Industries',
  investorCount: 'Investor count',
  investors: 'Investors',
  lastFundingDate: 'Last funding',
  lastFundingType: 'Last funding type',
  name: 'Company',
  imageUrl: 'Crunchbase logo URL',
  operatingStatus: 'Operating status',
  ownershipStatus: 'Ownership',
  permalink: 'Permalink',
  primaryGroup: 'Primary group',
  reportedRoundCount: 'Reported rounds',
  shortDescription: 'Description',
  source: 'Source',
  sourcePartition: 'Source partition',
  totalRaisedUsd: 'Total raised (USD)',
  uuid: 'Crunchbase UUID',
  website: 'Website',
}

const COLUMN_WIDTHS: Record<ColumnKey, number> = {
  country: 150,
  crunchbaseUrl: 330,
  detailedRoundCount: 125,
  employeeRange: 120,
  estimatedRevenueRange: 140,
  foundedOn: 125,
  foundedOnPrecision: 120,
  foundedYear: 120,
  founders: 280,
  headquarters: 260,
  industries: 300,
  investorCount: 130,
  investors: 320,
  lastFundingDate: 125,
  lastFundingType: 150,
  name: 240,
  imageUrl: 360,
  operatingStatus: 140,
  ownershipStatus: 130,
  permalink: 220,
  primaryGroup: 280,
  reportedRoundCount: 135,
  shortDescription: 360,
  source: 115,
  sourcePartition: 160,
  totalRaisedUsd: 150,
  uuid: 300,
  website: 280,
}

const ROW_HEIGHT = 34
const COLUMN_ORDER_STORAGE_KEY = 'eign-middle-east-crunchbase.column-order.v1'
const COLUMN_WIDTH_STORAGE_KEY = 'eign-middle-east-crunchbase.column-widths.v1'
const ROW_SORT_STORAGE_KEY = 'eign-middle-east-crunchbase.row-sort.v1'
const DEFAULT_SORT = { field: 'name', direction: 'asc' } as const

const isColumnKey = (value: string): value is ColumnKey => COLUMN_KEYS.includes(value as ColumnKey)

const restoreColumnOrder = (availableColumns: readonly ColumnKey[]) => {
  try {
    const saved = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(saved)) return [...availableColumns]
    const available = new Set(availableColumns)
    const seen = new Set<ColumnKey>()
    const restored = saved.flatMap((column) => {
      if (typeof column !== 'string' || !isColumnKey(column) || !available.has(column) || seen.has(column)) return []
      seen.add(column)
      return [column]
    })
    return [...restored, ...availableColumns.filter((column) => !seen.has(column))]
  } catch {
    return [...availableColumns]
  }
}

const saveColumnOrder = (columns: readonly ColumnKey[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // The table remains usable if local storage is unavailable.
  }
}

const formatSnapshotDate = (value: string) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function MiddleEastCrunchbase() {
  const [data, setData] = useState<MiddleEastCrunchbaseResponse | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('all')
  const [precision, setPrecision] = useState('all')
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [copied, setCopied] = useState(false)
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => restoreColumnOrder(COLUMN_KEYS))
  const [draggingColumn, setDraggingColumn] = useState<ColumnKey | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { resetSort, setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<ColumnKey>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
    COLUMN_KEYS,
  )

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Middle East Crunchbase · EIGN Data Workspace'
    fetch('/api/middle-east-crunchbase')
      .then(async (response) => {
        const result = await response.json().catch(() => null) as MiddleEastCrunchbaseResponse | { error?: string } | null
        if (!response.ok) throw new Error(result && 'error' in result ? result.error : `The data service returned ${response.status}.`)
        return result as MiddleEastCrunchbaseResponse
      })
      .then((result) => {
        setData(result)
        const availableColumns = result.columns.filter(isColumnKey)
        setColumnOrder(restoreColumnOrder(availableColumns.length ? availableColumns : COLUMN_KEYS))
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the Crunchbase snapshot.'))
    return () => { document.title = previousTitle }
  }, [])

  const countryOptions = useMemo(() => {
    const counts = new Map<string, number>()
    data?.items.forEach((row) => counts.set(row.country, (counts.get(row.country) ?? 0) + 1))
    return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right))
  }, [data])

  const precisionOptions = useMemo(() => {
    const counts = new Map<string, number>()
    data?.items.forEach((row) => {
      if (row.foundedOnPrecision) counts.set(row.foundedOnPrecision, (counts.get(row.foundedOnPrecision) ?? 0) + 1)
    })
    return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right))
  }, [data])

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return [...(data?.items ?? [])]
      .filter((row) => country === 'all' || row.country === country)
      .filter((row) => precision === 'all' || row.foundedOnPrecision === precision)
      .filter((row) => !normalizedQuery || COLUMN_KEYS.some((column) => row[column].toLocaleLowerCase().includes(normalizedQuery)))
      .sort((left, right) => {
        const primary = left[sortField].localeCompare(right[sortField], undefined, { numeric: true, sensitivity: 'base' })
        if (primary !== 0) return primary * (sortDirection === 'asc' ? 1 : -1)
        const name = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
        return name || left.uuid.localeCompare(right.uuid)
      })
  }, [country, data, precision, query, sortDirection, sortField])

  const archive = useRowArchive({
    tableId: 'middle-east-crunchbase-companies',
    visibleRowIds: rows.map((row) => row.uuid),
  })
  const displayedRows = rows.filter((row) => archive.showArchived === archive.isArchived(row.uuid))

  useEffect(() => {
    setSelectedCell(null)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [archive.showArchived, country, precision, query, sortDirection, sortField])

  const virtualizer = useVirtualizer({
    count: displayedRows.length,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => displayedRows[index]?.uuid ?? index,
    getScrollElement: () => scrollRef.current,
    overscan: 12,
  })

  const { getResizeHandleProps, widths } = useResizableColumns({
    defaults: COLUMN_WIDTHS,
    storageKey: COLUMN_WIDTH_STORAGE_KEY,
  })
  const gridTemplateColumns = useMemo(
    () => `48px ${columnOrder.map((column) => `${widths[column]}px`).join(' ')}`,
    [columnOrder, widths],
  )
  const gridWidth = 48 + columnOrder.reduce((sum, column) => sum + widths[column], 0)
  const gridStyle = {
    '--software-grid-columns': gridTemplateColumns,
    '--software-grid-width': `${gridWidth}px`,
  } as CSSProperties

  const selectedRow = selectedCell ? displayedRows[selectedCell.rowIndex] : null
  const selectedColumn = selectedCell ? columnOrder[selectedCell.columnIndex] : null
  const selectedValue = selectedRow && selectedColumn ? selectedRow[selectedColumn] : ''
  const selectedLink = selectedColumn === 'crunchbaseUrl' ? selectedValue : ''
  const hasActiveFilters = Boolean(query || country !== 'all' || precision !== 'all')
  const rowCountLabel = `${displayedRows.length.toLocaleString()} ${displayedRows.length === 1 ? 'row' : 'rows'}`

  const sortBy = (field: ColumnKey) => {
    if (sortField === field) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const moveColumn = (sourceColumn: ColumnKey, targetColumn: ColumnKey, position: ColumnDrop['position']) => {
    if (sourceColumn === targetColumn) return
    setColumnOrder((current) => {
      const next = current.filter((column) => column !== sourceColumn)
      const targetIndex = next.indexOf(targetColumn)
      next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, sourceColumn)
      saveColumnOrder(next)
      return next
    })
    setSelectedCell(null)
  }

  const handleColumnDragStart = (event: ReactDragEvent<HTMLButtonElement>, column: ColumnKey) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', column)
    setDraggingColumn(column)
  }

  const handleColumnDragOver = (event: ReactDragEvent<HTMLDivElement>, column: ColumnKey) => {
    if (!draggingColumn || draggingColumn === column) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setColumnDrop({ column, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
  }

  const handleColumnDrop = (event: ReactDragEvent<HTMLDivElement>, column: ColumnKey) => {
    event.preventDefault()
    const transferred = event.dataTransfer.getData('text/plain')
    const sourceColumn = isColumnKey(transferred) ? transferred : draggingColumn
    const position = columnDrop?.column === column ? columnDrop.position : 'before'
    if (sourceColumn) moveColumn(sourceColumn, column, position)
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const copySelectedValue = async () => {
    if (!selectedCell) return
    try {
      await navigator.clipboard.writeText(selectedValue)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1000)
    } catch {
      setCopied(false)
    }
  }

  const clearFilters = () => {
    setQuery('')
    setCountry('all')
    setPrecision('all')
  }

  return (
    <div className="app-shell software-page crunchbase-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem directories</span></div>
        <WorkspaceNav active="in-progress" />
      </header>

      <main className="software-main">
        <section className="software-summary" aria-label="Middle East Crunchbase snapshot summary">
          <div>
            <strong>Middle East Crunchbase companies</strong>
            <span>Read-only detailed Crunchbase profiles; source fields remain unchanged and archives affect only this workspace view.</span>
          </div>
          <dl>
            <div><dt>Companies</dt><dd>{data?.summary.total.toLocaleString() ?? '—'}</dd></div>
            <div><dt>Countries</dt><dd>{data?.summary.countries ?? '—'}</dd></div>
            <div><dt>Founded dates</dt><dd>{data?.summary.foundedDates.toLocaleString() ?? '—'}</dd></div>
            <div><dt>Snapshot</dt><dd>{data ? formatSnapshotDate(data.source.updatedAt) : '—'}</dd></div>
          </dl>
        </section>

        <div className="software-toolbar">
          <label className="software-search"><SearchIcon /><input type="search" value={query} placeholder="Search every column" aria-label="Search every column" onChange={(event) => setQuery(event.target.value)} /></label>
          <label><span>Country</span><select value={country} onChange={(event) => setCountry(event.target.value)}><option value="all">All countries</option>{countryOptions.map(([value, count]) => <option key={value} value={value}>{value} ({count})</option>)}</select></label>
          <label><span>Date precision</span><select value={precision} onChange={(event) => setPrecision(event.target.value)}><option value="all">Any precision</option>{precisionOptions.map(([value, count]) => <option key={value} value={value}>{value} ({count})</option>)}</select></label>
          <label><span>Sort</span><select value={sortField} onChange={(event) => setSortField(event.target.value as ColumnKey)}>{COLUMN_KEYS.map((column) => <option key={column} value={column}>{COLUMN_LABELS[column]}</option>)}</select></label>
          <button onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}</button>
          {(hasActiveFilters || sortField !== 'name' || sortDirection !== 'asc') && <button className="software-clear-filters" onClick={() => { clearFilters(); resetSort() }}>Clear</button>}
          <span className="software-result-count">{rowCountLabel}</span>
        </div>

        <ArchiveToolbar archive={archive} noun="Crunchbase companies" />

        <div className="software-formula-bar">
          <output>{selectedCell && selectedColumn ? `${COLUMN_LABELS[selectedColumn]} · row ${selectedCell.rowIndex + 1}` : '—'}</output>
          <input value={selectedValue} readOnly placeholder="Select a cell to inspect its full value" aria-label="Selected cell value" />
          {selectedLink && <a href={selectedLink} target="_blank" rel="noreferrer">Open</a>}
          <button disabled={!selectedCell} onClick={() => void copySelectedValue()}>{copied ? 'Copied' : 'Copy'}</button>
          <span className="table-edit-hint">Read-only source snapshot</span>
        </div>

        {error && <div className="software-error" role="alert">{error}</div>}
        {!data && !error ? <div className="software-loading"><span className="loading-spinner" /> Loading the pulled Crunchbase snapshot…</div> : data && (
          <div className="software-grid-scroll" ref={scrollRef} role="region" aria-label="Middle East Crunchbase companies table" tabIndex={0}>
            <div className="software-grid" style={gridStyle} role="table" aria-colcount={columnOrder.length + 1} aria-rowcount={displayedRows.length + 1}>
              <div className="software-grid-header" role="row">
                <div className="software-row-number" role="columnheader"><RowSelectionHeader allSelected={archive.allVisibleSelected} onToggle={archive.toggleAllVisible} someSelected={archive.someVisibleSelected} /></div>
                {columnOrder.map((column) => (
                  <div
                    aria-sort={sortField === column ? sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'}
                    className={`software-column-header crunchbase-column-header${sortField === column ? ' is-sorted' : ''}${draggingColumn === column ? ' is-dragging' : ''}${columnDrop?.column === column ? ` is-drop-${columnDrop.position}` : ''}`}
                    key={column}
                    onDragOver={(event) => handleColumnDragOver(event, column)}
                    onDrop={(event) => handleColumnDrop(event, column)}
                    role="columnheader"
                  >
                    <button
                      aria-label={`Drag ${COLUMN_LABELS[column]} column`}
                      className="crunchbase-column-grip"
                      draggable
                      onDragEnd={() => { setDraggingColumn(null); setColumnDrop(null) }}
                      onDragStart={(event) => handleColumnDragStart(event, column)}
                      title={`Drag to reorder ${COLUMN_LABELS[column]}`}
                      type="button"
                    >⋮⋮</button>
                    <button className="software-column-sort" onClick={() => sortBy(column)} title={`Sort by ${COLUMN_LABELS[column]}`} type="button">
                      <span className="software-column-label">{COLUMN_LABELS[column]}</span>{sortField === column && <b aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</b>}
                    </button>
                    <ColumnResizeHandle {...getResizeHandleProps(column, COLUMN_LABELS[column])} />
                  </div>
                ))}
              </div>
              <div className="software-virtual-body" style={{ height: `${virtualizer.getTotalSize()}px` }} role="rowgroup">
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = displayedRows[virtualRow.index]
                  return (
                    <div className="software-data-row" key={virtualRow.key} role="row" style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                      <div className="software-row-number" role="cell"><RowSelectionCell checked={archive.selectedIds.has(row.uuid)} label={`Select ${row.name}`} onToggle={() => archive.toggleRow(row.uuid)} /></div>
                      {columnOrder.map((column, columnIndex) => {
                        const value = row[column]
                        const selected = selectedCell?.rowIndex === virtualRow.index && selectedCell.columnIndex === columnIndex
                        const selectCell = () => {
                          setSelectedCell({ columnIndex, rowIndex: virtualRow.index })
                          setCopied(false)
                        }
                        if (column === 'crunchbaseUrl') {
                          return (
                            <div className={`software-cell software-cell--link${selected ? ' is-selected' : ''}`} key={column} onClick={selectCell} role="cell" title={`Open ${row.name} on Crunchbase`}>
                              <a href={value} rel="noreferrer" target="_blank">{value}</a>
                            </div>
                          )
                        }
                        return (
                          <div className={`software-cell${selected ? ' is-selected' : ''}${!value ? ' is-empty' : ''}`} key={column} onClick={selectCell} role="cell" title={value || 'Empty'}>
                            {column === 'source' ? <span className="software-source software-source--crunchbase">{value}</span> : value || '—'}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              {!displayedRows.length && <div className="software-empty">{archive.showArchived ? 'No archived companies match the current filters.' : 'No companies match the current filters.'}</div>}
            </div>
          </div>
        )}

        <footer className="software-statusbar">
          <span>{data?.source.file}</span><span>source: {data?.source.provider ?? 'Crunchbase'}</span><span>{rowCountLabel}</span>
        </footer>
      </main>
    </div>
  )
}
