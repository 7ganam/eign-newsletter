import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'
import { usePersistedSort } from './tablePreferences'
import { WorkspaceNav } from './WorkspaceNav'

type ValidLinkRecord = {
  __rowId: string
  organization: string
  permalink: string
  url: string
}

type ValidLinkColumn = Exclude<keyof ValidLinkRecord, '__rowId'>

type ValidLinksResponse = {
  items: ValidLinkRecord[]
  summary: {
    total: number
    unique: number
  }
  source: string
}

type SelectedCell = { rowIndex: number; columnIndex: number }

const ROW_HEIGHT = 34
const ROW_SORT_STORAGE_KEY = 'eign-valid-links.row-sort.v1'
const COLUMN_WIDTH_STORAGE_KEY = 'eign-valid-links.column-widths.v1'
const DEFAULT_SORT = { field: 'organization', direction: 'asc' } as const
const COLUMNS: Array<{ key: ValidLinkColumn; label: string; width: number }> = [
  { key: 'organization', label: 'Organization', width: 260 },
  { key: 'permalink', label: 'Permalink', width: 240 },
  { key: 'url', label: 'Crunchbase URL', width: 520 },
]
const COLUMN_KEYS = COLUMNS.map((column) => column.key)
const COLUMN_WIDTHS = Object.fromEntries(
  COLUMNS.map((column) => [column.key, column.width]),
) as Record<ValidLinkColumn, number>

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function ValidLinks() {
  const [data, setData] = useState<ValidLinksResponse | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const { setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<ValidLinkColumn>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const { getResizeHandleProps, widths } = useResizableColumns({
    defaults: COLUMN_WIDTHS,
    storageKey: COLUMN_WIDTH_STORAGE_KEY,
  })

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Valid links · EIGN Data Workspace'
    fetch('/api/valid-links')
      .then((response) => {
        if (!response.ok) throw new Error(`The data service returned ${response.status}.`)
        return response.json() as Promise<ValidLinksResponse>
      })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load valid links.json.'))
    return () => { document.title = previousTitle }
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return data.items
      .filter((row) => !normalizedQuery || COLUMN_KEYS.some((column) => row[column].toLocaleLowerCase().includes(normalizedQuery)))
      .sort((left, right) => (
        left[sortField].localeCompare(right[sortField], undefined, { numeric: true, sensitivity: 'base' })
        * (sortDirection === 'asc' ? 1 : -1)
      ))
  }, [data, query, sortDirection, sortField])

  useEffect(() => {
    setSelectedCell(null)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [query, sortDirection, sortField])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 16,
    getItemKey: (index) => rows[index]?.__rowId ?? index,
  })

  const gridTemplateColumns = `48px ${COLUMN_KEYS.map((column) => `${widths[column]}px`).join(' ')}`
  const gridWidth = 48 + COLUMN_KEYS.reduce((sum, column) => sum + widths[column], 0)
  const gridStyle = {
    '--software-grid-width': `${gridWidth}px`,
    '--software-grid-columns': gridTemplateColumns,
  } as CSSProperties

  const sortBy = (field: ValidLinkColumn) => {
    if (sortField === field) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const selectedRow = selectedCell ? rows[selectedCell.rowIndex] : null
  const selectedColumn = selectedCell ? COLUMN_KEYS[selectedCell.columnIndex] : null
  const selectedValue = selectedRow && selectedColumn ? selectedRow[selectedColumn] : ''
  const selectedLink = selectedRow?.url ?? ''

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

  return (
    <div className="app-shell software-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem directories</span></div>
        <WorkspaceNav active="in-progress" />
      </header>

      <main className="software-main">
        <section className="software-summary" aria-label="Valid Crunchbase links summary">
          <div>
            <strong>Valid Crunchbase links</strong>
            <span>{data?.source ?? 'valid links.json'} · Confirmed organization URLs</span>
          </div>
          <dl>
            <div><dt>Total links</dt><dd>{data?.summary.total.toLocaleString() ?? '—'}</dd></div>
            <div><dt>Unique URLs</dt><dd>{data?.summary.unique.toLocaleString() ?? '—'}</dd></div>
            <div><dt>Visible</dt><dd>{rows.length.toLocaleString()}</dd></div>
          </dl>
        </section>

        <div className="software-toolbar">
          <label className="software-search">
            <SearchIcon />
            <input type="search" value={query} placeholder="Search organization, permalink, or URL" aria-label="Search valid links" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button title="Reverse current sort" onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}>
            {sortDirection === 'asc' ? '↑' : '↓'} {COLUMNS.find((column) => column.key === sortField)?.label}
          </button>
          {query && <button className="software-clear-filters" onClick={() => setQuery('')}>Clear search</button>}
          <span className="software-result-count">{rows.length.toLocaleString()} rows</span>
        </div>

        <div className="software-formula-bar">
          <output>{selectedCell && selectedColumn ? `${selectedColumn} · row ${selectedCell.rowIndex + 1}` : '—'}</output>
          <input value={selectedValue} readOnly placeholder="Select a cell to inspect its full value" aria-label="Selected cell value" />
          {selectedLink && <a href={selectedLink} target="_blank" rel="noreferrer">Open</a>}
          <button disabled={!selectedCell} onClick={() => void copySelectedValue()}>{copied ? 'Copied' : 'Copy'}</button>
        </div>

        {error && <div className="software-error" role="alert">{error}</div>}
        {!data && !error ? <div className="software-loading"><span className="loading-spinner" /> Loading valid links.json…</div> : data && (
          <div className="software-grid-scroll" ref={scrollRef}>
            <div className="software-grid" style={gridStyle}>
              <div className="software-grid-header">
                <div className="software-row-number">#</div>
                {COLUMNS.map((column) => (
                  <div className={`software-column-header${sortField === column.key ? ' is-sorted' : ''}`} key={column.key}>
                    <button className="software-column-sort" onClick={() => sortBy(column.key)}>
                      <span className="software-column-label">{column.label}</span>
                      {sortField === column.key && <b>{sortDirection === 'asc' ? '↑' : '↓'}</b>}
                    </button>
                    <ColumnResizeHandle {...getResizeHandleProps(column.key, column.label)} />
                  </div>
                ))}
              </div>
              <div className="software-virtual-body" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <div className="software-data-row" key={virtualRow.key} style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                      <div className="software-row-number">{virtualRow.index + 1}</div>
                      {COLUMN_KEYS.map((column, columnIndex) => {
                        const value = row[column]
                        const selected = selectedCell?.rowIndex === virtualRow.index && selectedCell.columnIndex === columnIndex
                        const selectCell = () => {
                          setSelectedCell({ rowIndex: virtualRow.index, columnIndex })
                          setCopied(false)
                        }
                        if (column === 'url') {
                          return (
                            <div
                              className={`software-cell software-cell--link${selected ? ' is-selected' : ''}`}
                              key={column}
                              onClick={selectCell}
                              title={value}
                            >
                              <a href={value} rel="noreferrer" target="_blank">{value}</a>
                            </div>
                          )
                        }
                        return (
                          <div className={`software-cell${selected ? ' is-selected' : ''}${!value ? ' is-empty' : ''}`} key={column} title={value} onClick={selectCell}>
                            {value}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              {!rows.length && <div className="software-empty">No links match the current search.</div>}
            </div>
          </div>
        )}

        <footer className="software-statusbar">
          <span>{data?.source ?? 'valid links.json'}</span>
          <span>{rows.length.toLocaleString()} of {data?.summary.total.toLocaleString() ?? '—'} links</span>
        </footer>
      </main>
    </div>
  )
}
