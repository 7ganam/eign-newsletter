import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { InlineEdit } from './editableCells'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'
import { usePersistedSort } from './tablePreferences'
import './research.css'

type NewsletterRecord = {
  __rowId: string
  newsletter: string
  segment: string
  geography: string
  postFocus: string
  similarity: number | null
  menaRelevance: string
  howEignCanUseIt: string
  whatEignCanLearn: string
  website: string
  linkedin: string
  linkedinFollowers: string
  linkedinEmployeeRange: string
  linkedinMetricsStatus: string
  linkedinMetricsObservedAt: string
}

type NewsletterResponse = {
  items: NewsletterRecord[]
  summary: {
    total: number
    segments: number
    geographies: number
    highMenaRelevance: number
    closestMatches: number
    linkedin: number
    linkedinFollowers: number
    linkedinEmployeeRanges: number
  }
  source: string
}

type NewsletterColumn = keyof NewsletterRecord
type SelectedCell = { rowIndex: number; columnIndex: number }
type ColumnDrop = { column: NewsletterColumn; position: 'before' | 'after' }

const ROW_HEIGHT = 32
const COLUMN_ORDER_STORAGE_KEY = 'eign-newsletters.column-order.v1'
const COLUMN_WIDTH_STORAGE_KEY = 'eign-newsletters.column-widths.v1'
const ROW_SORT_STORAGE_KEY = 'eign-newsletters.row-sort.v1'
const RELEVANCE_RANK = { high: 3, medium: 2, low: 1 } as const
const relevanceRank = (value: string) => RELEVANCE_RANK[value.toLocaleLowerCase() as keyof typeof RELEVANCE_RANK] ?? 0

const COLUMNS: Array<{ key: NewsletterColumn; label: string; width: number }> = [
  { key: 'newsletter', label: 'Newsletter', width: 250 },
  { key: 'segment', label: 'Segment', width: 190 },
  { key: 'geography', label: 'Geography', width: 170 },
  { key: 'postFocus', label: 'Post Focus & Examples', width: 420 },
  { key: 'similarity', label: 'Similarity to Eign', width: 135 },
  { key: 'menaRelevance', label: 'MENA Relevance', width: 145 },
  { key: 'howEignCanUseIt', label: 'How Eign Can Use It', width: 420 },
  { key: 'whatEignCanLearn', label: 'What Eign Can Learn', width: 420 },
  { key: 'website', label: 'Website', width: 280 },
  { key: 'linkedin', label: 'LinkedIn', width: 330 },
  { key: 'linkedinFollowers', label: 'LinkedIn Followers', width: 170 },
  { key: 'linkedinEmployeeRange', label: 'LinkedIn Employee Range', width: 200 },
  { key: 'linkedinMetricsStatus', label: 'LinkedIn Metrics Status', width: 175 },
  { key: 'linkedinMetricsObservedAt', label: 'LinkedIn Observed At', width: 165 },
]
const COLUMNS_BY_KEY = new Map(COLUMNS.map((column) => [column.key, column]))
const COLUMN_KEYS = COLUMNS.map((column) => column.key)
const DEFAULT_SORT = { field: 'similarity', direction: 'desc' } as const
const COLUMN_WIDTHS = Object.fromEntries(
  COLUMNS.map((column) => [column.key, column.width]),
) as Record<NewsletterColumn, number>

const restoreColumnOrder = () => {
  const defaultOrder = COLUMNS.map((column) => column.key)
  try {
    const savedOrder = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(savedOrder)) return defaultOrder
    const seen = new Set<NewsletterColumn>()
    const restored = savedOrder.flatMap((key) => {
      if (typeof key !== 'string' || !COLUMNS_BY_KEY.has(key as NewsletterColumn) || seen.has(key as NewsletterColumn)) return []
      seen.add(key as NewsletterColumn)
      return [key as NewsletterColumn]
    })
    return [...restored, ...defaultOrder.filter((key) => !seen.has(key))]
  } catch {
    return defaultOrder
  }
}

const saveColumnOrder = (columns: NewsletterColumn[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // The table remains usable if local storage is unavailable.
  }
}

const columnLetter = (index: number) => {
  let letter = ''
  let position = index + 1
  while (position > 0) {
    position -= 1
    letter = String.fromCharCode(65 + (position % 26)) + letter
    position = Math.floor(position / 26)
  }
  return letter
}

const cellValue = (item: NewsletterRecord, column: NewsletterColumn) => String(item[column] ?? '')
const linksFromCell = (value: string) => value.split('|').map((link) => link.trim()).filter((link) => /^https?:\/\//i.test(link))
const firstMetric = (value: string) => Number(value.split('|')[0]?.trim()) || -1
const formatFollowerValue = (value: string) => value
  .split('|')
  .map((part) => {
    const trimmed = part.trim()
    const number = Number(trimmed)
    return Number.isFinite(number) && trimmed ? number.toLocaleString() : trimmed
  })
  .join(' | ')

export function Newsletters() {
  const [data, setData] = useState<NewsletterResponse | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [segment, setSegment] = useState('all')
  const [geography, setGeography] = useState('all')
  const [relevance, setRelevance] = useState('all')
  const [linkedin, setLinkedin] = useState('all')
  const { setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<NewsletterColumn>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
    COLUMN_KEYS,
  )
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [copied, setCopied] = useState(false)
  const [cellSaveError, setCellSaveError] = useState('')
  const [columnOrder, setColumnOrder] = useState<NewsletterColumn[]>(restoreColumnOrder)
  const [draggingColumn, setDraggingColumn] = useState<NewsletterColumn | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const { getResizeHandleProps, widths } = useResizableColumns({
    defaults: COLUMN_WIDTHS,
    storageKey: COLUMN_WIDTH_STORAGE_KEY,
  })

  useEffect(() => {
    const previousTitle = document.title
    const controller = new AbortController()
    document.title = 'Newsletters · EIGN Data Workspace'
    fetch('/api/newsletters', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`The newsletter data service returned ${response.status}.`)
        return response.json() as Promise<NewsletterResponse>
      })
      .then(setData)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Unable to load newsletter research.')
      })

    return () => {
      document.title = previousTitle
      controller.abort()
    }
  }, [])

  const segments = useMemo(
    () => [...new Set(data?.items.map((item) => item.segment).filter(Boolean) ?? [])].sort(),
    [data],
  )
  const geographies = useMemo(
    () => [...new Set(data?.items.map((item) => item.geography).filter(Boolean) ?? [])].sort(),
    [data],
  )
  const orderedColumns = useMemo(
    () => columnOrder.map((key) => COLUMNS_BY_KEY.get(key)).filter((column): column is (typeof COLUMNS)[number] => Boolean(column)),
    [columnOrder],
  )
  const rows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    return [...(data?.items ?? [])]
      .filter((item) => segment === 'all' || item.segment === segment)
      .filter((item) => geography === 'all' || item.geography === geography)
      .filter((item) => relevance === 'all' || item.menaRelevance.toLocaleLowerCase() === relevance)
      .filter((item) => linkedin === 'all' || (linkedin === 'available' ? Boolean(item.linkedin) : !item.linkedin))
      .filter((item) => !search || COLUMNS.some((column) => cellValue(item, column.key).toLocaleLowerCase().includes(search)))
      .sort((left, right) => {
        let comparison = 0
        if (sortField === 'similarity') comparison = (left.similarity ?? -1) - (right.similarity ?? -1)
        else if (sortField === 'menaRelevance') comparison = relevanceRank(left.menaRelevance) - relevanceRank(right.menaRelevance)
        else if (sortField === 'linkedinFollowers') comparison = firstMetric(left.linkedinFollowers) - firstMetric(right.linkedinFollowers)
        else comparison = cellValue(left, sortField).localeCompare(cellValue(right, sortField), undefined, { numeric: true, sensitivity: 'base' })
        if (comparison !== 0) return comparison * (sortDirection === 'asc' ? 1 : -1)
        return left.newsletter.localeCompare(right.newsletter)
      })
  }, [data, geography, linkedin, query, relevance, segment, sortDirection, sortField])

  useEffect(() => {
    setSelectedCell(null)
    setCopied(false)
  }, [geography, linkedin, query, relevance, segment, sortDirection, sortField])

  const selectedColumn = selectedCell ? orderedColumns[selectedCell.columnIndex] : null
  const selectedValue = selectedCell && selectedColumn ? cellValue(rows[selectedCell.rowIndex], selectedColumn.key) : ''
  const selectedAddress = selectedCell ? `${columnLetter(selectedCell.columnIndex)}${selectedCell.rowIndex + 1}` : ''
  const hasFilters = Boolean(query || segment !== 'all' || geography !== 'all' || relevance !== 'all' || linkedin !== 'all')
  const gridWidth = 52 + orderedColumns.reduce((sum, column) => sum + widths[column.key], 0)
  const gridStyle = {
    '--sheet-grid-width': `${gridWidth}px`,
    '--sheet-grid-columns': `52px ${orderedColumns.map((column) => `${widths[column.key]}px`).join(' ')}`,
  } as CSSProperties

  const selectCell = (rowIndex: number, columnIndex: number) => {
    setSelectedCell({ rowIndex, columnIndex })
    setCopied(false)
  }

  const sortBy = (field: NewsletterColumn) => {
    if (field === sortField) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection(field === 'similarity' || field === 'menaRelevance' ? 'desc' : 'asc')
    }
  }

  const moveColumn = (sourceColumn: NewsletterColumn, targetColumn: NewsletterColumn, position: ColumnDrop['position']) => {
    if (sourceColumn === targetColumn) return
    setColumnOrder((current) => {
      const next = current.filter((column) => column !== sourceColumn)
      const targetIndex = next.indexOf(targetColumn)
      if (targetIndex === -1) return current
      next.splice(targetIndex + (position === 'after' ? 1 : 0), 0, sourceColumn)
      saveColumnOrder(next)
      return next
    })
    setSelectedCell(null)
  }

  const handleColumnDragStart = (event: ReactDragEvent<HTMLDivElement>, column: NewsletterColumn) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', column)
    setDraggingColumn(column)
  }

  const handleColumnDragOver = (event: ReactDragEvent<HTMLDivElement>, column: NewsletterColumn) => {
    if (!draggingColumn || draggingColumn === column) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setColumnDrop({ column, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
  }

  const handleColumnDrop = (event: ReactDragEvent<HTMLDivElement>, column: NewsletterColumn) => {
    event.preventDefault()
    const sourceColumn = (event.dataTransfer.getData('text/plain') || draggingColumn) as NewsletterColumn | null
    const position = columnDrop?.column === column ? columnDrop.position : 'before'
    if (sourceColumn && COLUMNS_BY_KEY.has(sourceColumn)) moveColumn(sourceColumn, column, position)
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const finishColumnDrag = () => {
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const clearFilters = () => {
    setQuery('')
    setSegment('all')
    setGeography('all')
    setRelevance('all')
    setLinkedin('all')
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

  const saveCell = async (row: NewsletterRecord, column: NewsletterColumn, draft: string) => {
    const value = column === 'similarity'
      ? draft.trim() ? Number(draft) : null
      : draft
    if (column === 'similarity' && value !== null && !Number.isFinite(value)) throw new Error('Enter a valid similarity number.')
    setCellSaveError('')
    const response = await fetch(`/api/newsletters/${encodeURIComponent(row.__rowId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ field: column, value }),
    })
    const result = await response.json().catch(() => null) as { error?: string } | null
    if (!response.ok) {
      const message = result?.error || `The data service returned ${response.status}.`
      setCellSaveError(message)
      throw new Error(message)
    }
    setData((current) => current ? {
      ...current,
      items: current.items.map((item) => item.__rowId === row.__rowId ? { ...item, [column]: value } : item),
    } : current)
  }

  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!selectedCell || !rows.length) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'c') {
      event.preventDefault()
      void copySelectedValue()
      return
    }
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    setSelectedCell({
      rowIndex: Math.max(0, Math.min(rows.length - 1, selectedCell.rowIndex + move[0])),
      columnIndex: Math.max(0, Math.min(orderedColumns.length - 1, selectedCell.columnIndex + move[1])),
    })
  }

  return (
    <main className="sheet-app newsletter-sheet">
      <header className="workspace-header sheet-workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem directories</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/software-companies">Software companies</a>
          <a href="/valid-links">Valid links</a>
          <a href="/influencers">Influencers</a>
          <a href="/research">Startups</a>
          <a href="/newsletters" aria-current="page">Newsletters</a>
          <a href="/posts">Posts</a>
        </nav>
      </header>

      <header className="sheet-titlebar">
        <div className="sheet-document">
          <strong>Newsletters</strong>
          <span>{data?.source ?? 'assets/newsletter-research.csv'} · Publishing intelligence directory</span>
        </div>
        <div className="newsletter-sheet-metrics" aria-label="Newsletter summary">
          <span><strong>{data?.summary.total ?? '—'}</strong> sources</span>
          <span><strong>{data?.summary.linkedin ?? '—'}</strong> LinkedIn</span>
          <span><strong>{data?.summary.linkedinFollowers ?? '—'}</strong> follower snapshots</span>
          <span><strong>{data?.summary.highMenaRelevance ?? '—'}</strong> high MENA</span>
        </div>
      </header>

      <div className="sheet-toolbar newsletter-sheet-toolbar">
        <label className="sheet-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" value={query} placeholder="Search every column" aria-label="Search every column" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label><span>Segment</span><select value={segment} onChange={(event) => setSegment(event.target.value)}><option value="all">All segments</option>{segments.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Geography</span><select value={geography} onChange={(event) => setGeography(event.target.value)}><option value="all">All geographies</option>{geographies.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>MENA</span><select value={relevance} onChange={(event) => setRelevance(event.target.value)}><option value="all">Any relevance</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
        <label><span>LinkedIn</span><select value={linkedin} onChange={(event) => setLinkedin(event.target.value)}><option value="all">Any status</option><option value="available">Available</option><option value="missing">Missing</option></select></label>
        <button title="Reverse current sort" onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑' : '↓'} {COLUMNS.find((column) => column.key === sortField)?.label}</button>
        {hasFilters && <button onClick={clearFilters}>Clear</button>}
        <span className="sheet-result-count">{rows.length.toLocaleString()} rows</span>
      </div>

      <div className="sheet-formula-bar">
        <output className="sheet-cell-address">{selectedAddress || '—'}</output>
        <span className="sheet-fx" aria-hidden="true">fx</span>
        <input value={selectedValue} readOnly aria-label="Selected cell value" placeholder="Select a cell to inspect its full value" />
        <button disabled={!selectedCell} onClick={() => void copySelectedValue()}>{copied ? 'Copied' : 'Copy'}</button>
        <span className="table-edit-hint">Pencil or double-click a cell to edit</span>
      </div>

      {error && <div className="sheet-error" role="alert">{error}</div>}
      {cellSaveError && <div className="sheet-error" role="alert">Cell was not saved: {cellSaveError}</div>}

      <div className="sheet-grid-scroll" tabIndex={0} onKeyDown={handleGridKeyDown} aria-label="Newsletter research spreadsheet">
        <div className="sheet-grid" style={gridStyle}>
          <div className="sheet-grid-header">
            <div className="sheet-letter-row">
              <div className="sheet-corner" />
              {orderedColumns.map((column, index) => <div key={column.key}>{columnLetter(index)}</div>)}
            </div>
            <div className="sheet-field-row">
              <div className="sheet-row-heading">#</div>
              {orderedColumns.map((column) => (
                <div
                  className={[
                    'sheet-column-header',
                    sortField === column.key ? 'is-sorted' : '',
                    draggingColumn === column.key ? 'is-dragging' : '',
                    columnDrop?.column === column.key ? `is-drop-${columnDrop.position}` : '',
                  ].filter(Boolean).join(' ')}
                  draggable
                  key={column.key}
                  title={`${column.label} · Drag to reorder, click to sort, or use the right edge to resize`}
                  onDragStart={(event) => handleColumnDragStart(event, column.key)}
                  onDragOver={(event) => handleColumnDragOver(event, column.key)}
                  onDrop={(event) => handleColumnDrop(event, column.key)}
                  onDragEnd={finishColumnDrag}
                >
                  <button className="sheet-field-sort" onClick={() => sortBy(column.key)}>
                    <span className="sheet-drag-handle" aria-hidden="true">⠿</span>
                    <span className="sheet-field-name">{column.label}</span>
                    {sortField === column.key && <b>{sortDirection === 'asc' ? '↑' : '↓'}</b>}
                  </button>
                  <ColumnResizeHandle {...getResizeHandleProps(column.key, column.label)} />
                </div>
              ))}
            </div>
          </div>

          {!data && !error ? (
            <div className="sheet-initial-loading">Loading newsletter rows…</div>
          ) : rows.length === 0 ? (
            <div className="sheet-empty">No rows match the current filters.</div>
          ) : (
            <div className="sheet-virtual-body" style={{ height: `${rows.length * ROW_HEIGHT}px` }}>
              {rows.map((row, rowIndex) => (
                <div className="sheet-data-row" key={row.__rowId} style={{ height: `${ROW_HEIGHT}px`, transform: `translateY(${rowIndex * ROW_HEIGHT}px)` }}>
                  <div className="sheet-row-number">{rowIndex + 1}</div>
                  {orderedColumns.map((column, columnIndex) => {
                    const value = cellValue(row, column.key)
                    const displayValue = column.key === 'linkedinFollowers' ? formatFollowerValue(value) : value
                    const selected = selectedCell?.rowIndex === rowIndex && selectedCell.columnIndex === columnIndex
                    const links = column.key === 'website' || column.key === 'linkedin' ? linksFromCell(value) : []
                    if (links.length) {
                      return (
                        <div className={`sheet-cell newsletter-sheet-link-cell${selected ? ' is-selected' : ''}`} key={column.key} title={value} onClick={() => selectCell(rowIndex, columnIndex)}>
                          <InlineEdit ariaLabel={`${column.label}, row ${rowIndex + 1}`} inputType="url" selected={selected} value={value} onSave={(draft) => saveCell(row, column.key, draft)}>
                            {links.map((link, linkIndex) => (
                              <a href={link} key={link} rel="noreferrer" target="_blank" onClick={() => selectCell(rowIndex, columnIndex)}>
                                {links.length === 1 ? link : `${column.label} ${linkIndex + 1}`}
                              </a>
                            ))}
                          </InlineEdit>
                        </div>
                      )
                    }
                    return (
                      <div className={`sheet-cell${column.key === 'similarity' ? ' sheet-cell--number' : ''}${selected ? ' is-selected' : ''}${!value ? ' is-missing' : ''}`} key={column.key} title={value} onClick={() => selectCell(rowIndex, columnIndex)}>
                        <InlineEdit ariaLabel={`${column.label}, row ${rowIndex + 1}`} inputType={column.key === 'similarity' ? 'number' : 'text'} selected={selected} value={value} onSave={(draft) => saveCell(row, column.key, draft)}>
                          {displayValue}
                        </InlineEdit>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="sheet-statusbar">
        <span className="sheet-tab">Newsletters</span>
        <span>{COLUMNS.length} columns</span>
        <span>{rows.length.toLocaleString()} of {data?.summary.total.toLocaleString() ?? '—'} rows</span>
        <span>{data?.summary.linkedin?.toLocaleString() ?? '—'} rows with LinkedIn links</span>
      </footer>
    </main>
  )
}
