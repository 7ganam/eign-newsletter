import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent } from 'react'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'

type SoftwareSource = 'linkedin' | 'kattch'
type SoftwareCompanyRow = Record<string, string> & { source: SoftwareSource }

type SoftwareCompaniesResponse = {
  columns: string[]
  items: SoftwareCompanyRow[]
  summary: {
    total: number
    linkedin: number
    kattch: number
    columns: number
    exactNameOverlaps: number
  }
  sources: {
    curated: string
    review: string
  }
}

type SelectedCell = {
  rowIndex: number
  columnIndex: number
}

type ColumnDrop = { column: string; position: 'before' | 'after' }
type LinkedInFilter = 'all' | 'available' | 'missing'
type FilterOption = { value: string; count: number }

const ROW_HEIGHT = 34
const COLUMN_ORDER_STORAGE_KEY = 'eign-software-companies.column-order.v4'
const LEGACY_COLUMN_ORDER_STORAGE_KEY = 'eign-software-companies.column-order.v3'
const COLUMN_WIDTH_STORAGE_KEY = 'eign-software-companies.column-widths.v1'

const restoreColumnOrder = (columns: string[]) => {
  try {
    const currentOrder = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY)
    const legacyOrder = localStorage.getItem(LEGACY_COLUMN_ORDER_STORAGE_KEY)
    const savedOrder = JSON.parse(currentOrder ?? legacyOrder ?? '[]') as unknown
    if (!Array.isArray(savedOrder)) return columns
    const available = new Set(columns)
    const seen = new Set<string>()
    const restored = savedOrder.flatMap((column) => {
      if (typeof column !== 'string' || !available.has(column) || seen.has(column)) return []
      seen.add(column)
      return [column]
    })
    const next = [...restored, ...columns.filter((column) => !seen.has(column))]
    if (!currentOrder && next.includes('fit')) {
      const migrated = next.filter((column) => column !== 'fit')
      const sourceIndex = migrated.indexOf('source')
      migrated.splice(sourceIndex >= 0 ? sourceIndex + 1 : 0, 0, 'fit')
      saveColumnOrder(migrated)
      return migrated
    }
    return next
  } catch {
    return columns
  }
}

const saveColumnOrder = (columns: string[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // The sheet remains usable if local storage is unavailable.
  }
}

const columnWidth = (column: string) => {
  if (column === 'fit') return 58
  if (column === 'source') return 90
  if (['company_name', 'title'].includes(column)) return 210
  if (['company_description', 'shortAbout', 'highlights'].includes(column)) return 340
  if (['linkedin_company_url', 'linkedin_search_params'].includes(column)) return 280
  if (['company_location', 'address'].includes(column)) return 240
  if (['categories', 'emails', 'phones'].includes(column)) return 220
  if (['id', 'createdAt', 'updatedAt'].includes(column)) return 210
  if (['hidden', 'isActive'].includes(column)) return 90
  return Math.max(135, Math.min(220, column.length * 8 + 42))
}

const isLinkValue = (column: string, value: string) => {
  if (/^https?:\/\//i.test(value)) return value
  if (column === 'domain' && value) return `https://${value}`
  return null
}

const getCategories = (row: SoftwareCompanyRow) => {
  const value = row.categories?.trim()
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
  } catch {
    // Fall back to a simple comma-separated value for manually edited rows.
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

const buildFilterOptions = (items: SoftwareCompanyRow[], valuesForRow: (row: SoftwareCompanyRow) => string[]) => {
  const counts = new Map<string, number>()
  items.forEach((row) => {
    new Set(valuesForRow(row).filter(Boolean)).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  })
  return [...counts.entries()]
    .map(([value, count]): FilterOption => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value, undefined, { sensitivity: 'base' }))
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function SoftwareCompanies() {
  const [data, setData] = useState<SoftwareCompaniesResponse | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<SoftwareSource | 'all'>('all')
  const [country, setCountry] = useState('all')
  const [industry, setIndustry] = useState('all')
  const [category, setCategory] = useState('all')
  const [linkedin, setLinkedin] = useState<LinkedInFilter>('all')
  const [sortField, setSortField] = useState('company_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [copied, setCopied] = useState(false)
  const [fitSaveError, setFitSaveError] = useState('')
  const [savingFitRows, setSavingFitRows] = useState<Set<string>>(() => new Set())
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Software companies · EIGN Data Workspace'
    fetch('/api/software-companies')
      .then((response) => {
        if (!response.ok) throw new Error(`The data service returned ${response.status}.`)
        return response.json() as Promise<SoftwareCompaniesResponse>
      })
      .then((result) => {
        setData(result)
        setColumnOrder(restoreColumnOrder(result.columns))
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the software-company files.'))
    return () => { document.title = previousTitle }
  }, [])

  const countryOptions = useMemo(() => buildFilterOptions(data?.items ?? [], (row) => [row.country]), [data])
  const industryOptions = useMemo(() => buildFilterOptions(data?.items ?? [], (row) => [row.company_industry]), [data])
  const categoryOptions = useMemo(() => buildFilterOptions(data?.items ?? [], getCategories), [data])

  const rows = useMemo(() => {
    if (!data) return []
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return data.items
      .filter((row) => source === 'all' || row.source === source)
      .filter((row) => country === 'all' || row.country === country)
      .filter((row) => industry === 'all' || row.company_industry === industry)
      .filter((row) => category === 'all' || getCategories(row).includes(category))
      .filter((row) => linkedin === 'all' || (linkedin === 'available' ? Boolean(row.linkedin_company_url) : !row.linkedin_company_url))
      .filter((row) => !normalizedQuery || data.columns.some((column) => (row[column] ?? '').toLocaleLowerCase().includes(normalizedQuery)))
      .sort((left, right) => {
        const leftValue = left[sortField] ?? ''
        const rightValue = right[sortField] ?? ''
        return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' }) * (sortDirection === 'asc' ? 1 : -1)
      })
  }, [category, country, data, industry, linkedin, query, sortDirection, sortField, source])

  useEffect(() => {
    setSelectedCell(null)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [category, country, industry, linkedin, query, sortDirection, sortField, source])

  const hasActiveFilters = Boolean(query || source !== 'all' || country !== 'all' || industry !== 'all' || category !== 'all' || linkedin !== 'all')

  const clearFilters = () => {
    setQuery('')
    setSource('all')
    setCountry('all')
    setIndustry('all')
    setCategory('all')
    setLinkedin('all')
  }

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    getItemKey: (index) => `${rows[index]?.source}-${rows[index]?.linkedin_company_url || rows[index]?.id || index}`,
  })

  const displayColumns = useMemo(() => columnOrder.length ? columnOrder : data?.columns ?? [], [columnOrder, data])
  const defaultWidths = useMemo(() => Object.fromEntries(
    (data?.columns ?? []).map((column) => [column, columnWidth(column)]),
  ), [data])
  const { getResizeHandleProps, widths } = useResizableColumns({
    defaults: defaultWidths,
    storageKey: COLUMN_WIDTH_STORAGE_KEY,
  })
  const gridTemplateColumns = useMemo(() => `48px ${displayColumns.map((column) => `${widths[column]}px`).join(' ')}`, [displayColumns, widths])
  const gridWidth = 48 + displayColumns.reduce((sum, column) => sum + widths[column], 0)
  const gridStyle = {
    '--software-grid-width': `${gridWidth}px`,
    '--software-grid-columns': gridTemplateColumns,
  } as CSSProperties

  const sortBy = (field: string) => {
    if (sortField === field) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const moveColumn = (sourceColumn: string, targetColumn: string, position: ColumnDrop['position']) => {
    if (sourceColumn === targetColumn) return
    setColumnOrder((current) => {
      if (!current.includes(sourceColumn) || !current.includes(targetColumn)) return current
      const next = current.filter((column) => column !== sourceColumn)
      const targetIndex = next.indexOf(targetColumn)
      next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, sourceColumn)
      saveColumnOrder(next)
      return next
    })
    setSelectedCell(null)
  }

  const handleColumnDragStart = (event: ReactDragEvent<HTMLDivElement>, column: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', column)
    setDraggingColumn(column)
  }

  const handleColumnDragOver = (event: ReactDragEvent<HTMLDivElement>, column: string) => {
    if (!draggingColumn || draggingColumn === column) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setColumnDrop({ column, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
  }

  const handleColumnDrop = (event: ReactDragEvent<HTMLDivElement>, column: string) => {
    event.preventDefault()
    const sourceColumn = event.dataTransfer.getData('text/plain') || draggingColumn
    const position = columnDrop?.column === column ? columnDrop.position : 'before'
    if (sourceColumn) moveColumn(sourceColumn, column, position)
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const finishColumnDrag = () => {
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const selectedRow = selectedCell ? rows[selectedCell.rowIndex] : null
  const selectedColumn = selectedCell ? displayColumns[selectedCell.columnIndex] ?? '' : ''
  const selectedValue = selectedRow && selectedColumn ? selectedRow[selectedColumn] ?? '' : ''
  const selectedLink = selectedColumn ? isLinkValue(selectedColumn, selectedValue) : null

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

  const setRowFit = (rowKey: string, fit: boolean) => {
    setData((current) => current ? {
      ...current,
      items: current.items.map((item) => item.__rowKey === rowKey ? { ...item, fit: fit ? 'true' : '' } : item),
    } : current)
  }

  const saveFit = async (row: SoftwareCompanyRow, fit: boolean) => {
    const rowKey = row.__rowKey
    if (!rowKey || savingFitRows.has(rowKey)) return
    const previousFit = row.fit === 'true'
    setFitSaveError('')
    setRowFit(rowKey, fit)
    setSavingFitRows((current) => new Set(current).add(rowKey))
    try {
      const response = await fetch('/api/software-companies/fit', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fit, rowKey }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(result?.error || `The data service returned ${response.status}.`)
      }
    } catch (reason) {
      setRowFit(rowKey, previousFit)
      setFitSaveError(reason instanceof Error ? reason.message : 'Unable to save the fit checkmark.')
    } finally {
      setSavingFitRows((current) => {
        const next = new Set(current)
        next.delete(rowKey)
        return next
      })
    }
  }

  return (
    <div className="app-shell software-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem directories</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/software-companies" aria-current="page">Software companies</a>
          <a href="/influencers">Influencers</a>
          <a href="/research">Startups</a>
          <a href="/newsletters">Newsletters</a>
          <a href="/posts">Posts</a>
        </nav>
      </header>

      <main className="software-main">
        <section className="software-summary" aria-label="Combined source summary">
          <div><strong>Software-company directory</strong><span>MENA-only curated view; fit decisions save to the curated CSV.</span></div>
          <dl>
            <div><dt>Combined rows</dt><dd>{data?.summary.total ?? '—'}</dd></div>
            <div><dt>LinkedIn</dt><dd>{data?.summary.linkedin ?? '—'}</dd></div>
            <div><dt>Kattch</dt><dd>{data?.summary.kattch ?? '—'}</dd></div>
            <div><dt>Columns</dt><dd>{data?.summary.columns ?? '—'}</dd></div>
            <div><dt>Name overlap</dt><dd>{data?.summary.exactNameOverlaps ?? '—'}</dd></div>
          </dl>
        </section>

        <div className="software-toolbar">
          <label className="software-search"><SearchIcon /><input type="search" value={query} placeholder="Search every column" aria-label="Search every column" onChange={(event) => setQuery(event.target.value)} /></label>
          <label><span>Source</span><select value={source} onChange={(event) => setSource(event.target.value as SoftwareSource | 'all')}><option value="all">All sources</option><option value="linkedin">LinkedIn</option><option value="kattch">Kattch</option></select></label>
          <label><span>Country</span><select value={country} onChange={(event) => setCountry(event.target.value)}><option value="all">All countries</option>{countryOptions.map((option) => <option key={option.value} value={option.value}>{option.value} ({option.count})</option>)}</select></label>
          <label><span>Industry</span><select value={industry} onChange={(event) => setIndustry(event.target.value)}><option value="all">All industries</option>{industryOptions.map((option) => <option key={option.value} value={option.value}>{option.value} ({option.count})</option>)}</select></label>
          <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.value} ({option.count})</option>)}</select></label>
          <label><span>LinkedIn</span><select value={linkedin} onChange={(event) => setLinkedin(event.target.value as LinkedInFilter)}><option value="all">Any status</option><option value="available">Available</option><option value="missing">Missing</option></select></label>
          <label><span>Sort</span><select value={sortField} onChange={(event) => setSortField(event.target.value)}><option value="company_name">Company name</option><option value="source">Source</option>{data?.columns.filter((column) => !['source', 'company_name'].includes(column)).map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
          <button onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}</button>
          {(hasActiveFilters || sortField !== 'company_name' || sortDirection !== 'asc') && <button className="software-clear-filters" onClick={() => { clearFilters(); setSortField('company_name'); setSortDirection('asc') }}>Clear</button>}
          <span className="software-result-count">{rows.length.toLocaleString()} rows</span>
        </div>

        <div className="software-formula-bar">
          <output>{selectedCell ? `${selectedColumn} · row ${selectedCell.rowIndex + 1}` : '—'}</output>
          <input value={selectedValue} readOnly placeholder="Select a cell to inspect its full value" aria-label="Selected cell value" />
          {selectedLink && <a href={selectedLink} target="_blank" rel="noreferrer">Open</a>}
          <button disabled={!selectedCell} onClick={() => void copySelectedValue()}>{copied ? 'Copied' : 'Copy'}</button>
        </div>

        {error && <div className="software-error" role="alert">{error}</div>}
        {fitSaveError && <div className="software-error" role="alert">Fit was not saved: {fitSaveError}</div>}
        {!data && !error ? <div className="software-loading"><span className="loading-spinner" /> Loading both CSV files…</div> : data && (
          <div className="software-grid-scroll" ref={scrollRef}>
            <div className="software-grid" style={gridStyle}>
              <div className="software-grid-header">
                <div className="software-row-number">#</div>
                {displayColumns.map((column) => (
                  <div
                    className={`software-column-header${sortField === column ? ' is-sorted' : ''}${draggingColumn === column ? ' is-dragging' : ''}${columnDrop?.column === column ? ` is-drop-${columnDrop.position}` : ''}`}
                    key={column}
                    draggable
                    onDragStart={(event) => handleColumnDragStart(event, column)}
                    onDragOver={(event) => handleColumnDragOver(event, column)}
                    onDrop={(event) => handleColumnDrop(event, column)}
                    onDragEnd={finishColumnDrag}
                    title={`Drag to reorder, click to sort, or use the right edge to resize ${column}`}
                  >
                    <button className="software-column-sort" onClick={() => sortBy(column)}>
                      <span className="software-column-label"><i aria-hidden="true">⋮⋮</i>{column}</span>{sortField === column && <b>{sortDirection === 'asc' ? '↑' : '↓'}</b>}
                    </button>
                    <ColumnResizeHandle {...getResizeHandleProps(column, column)} />
                  </div>
                ))}
              </div>
              <div className="software-virtual-body" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <div className="software-data-row" key={virtualRow.key} style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                      <div className="software-row-number">{virtualRow.index + 1}</div>
                      {displayColumns.map((column, columnIndex) => {
                        const value = row[column] ?? ''
                        const selected = selectedCell?.rowIndex === virtualRow.index && selectedCell.columnIndex === columnIndex
                        const linkedinLink = column === 'linkedin_company_url' ? isLinkValue(column, value) : null
                        const selectCell = () => {
                          setSelectedCell({ rowIndex: virtualRow.index, columnIndex })
                          setCopied(false)
                        }
                        if (column === 'fit') {
                          const isSaving = savingFitRows.has(row.__rowKey)
                          return (
                            <label className={`software-cell software-fit-cell${selected ? ' is-selected' : ''}${isSaving ? ' is-saving' : ''}`} key={column} onClick={selectCell} title={value === 'true' ? 'Marked as fit' : 'Mark as fit'}>
                              <input
                                aria-label={`${value === 'true' ? 'Remove' : 'Mark'} ${row.company_name || 'company'} as fit`}
                                checked={value === 'true'}
                                disabled={isSaving}
                                onChange={(event) => void saveFit(row, event.target.checked)}
                                type="checkbox"
                              />
                            </label>
                          )
                        }
                        if (linkedinLink) {
                          return (
                            <a
                              className={`software-cell software-cell--link${selected ? ' is-selected' : ''}`}
                              href={linkedinLink}
                              key={column}
                              onClick={selectCell}
                              rel="noreferrer"
                              target="_blank"
                              title={`Open ${row.company_name || 'company'} on LinkedIn`}
                            >
                              {value}
                            </a>
                          )
                        }
                        return (
                          <button className={`software-cell${selected ? ' is-selected' : ''}${!value ? ' is-empty' : ''}`} key={column} title={value} onClick={selectCell}>
                            {column === 'source' ? <span className={`software-source software-source--${row.source}`}>{row.source}</span> : value}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              {!rows.length && <div className="software-empty">No rows match the current filters.</div>}
            </div>
          </div>
        )}

        <footer className="software-statusbar">
          <span>{data?.sources.curated}</span><span>{data?.sources.review}</span><span>{rows.length.toLocaleString()} visible rows</span>
        </footer>
      </main>
    </div>
  )
}
