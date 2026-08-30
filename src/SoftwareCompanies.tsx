import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

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
  sources: Record<SoftwareSource, string>
}

type SelectedCell = {
  rowIndex: number
  columnIndex: number
}

const ROW_HEIGHT = 34

const columnWidth = (column: string) => {
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
  const [sortField, setSortField] = useState('company_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Software companies · EIGN Data Workspace'
    fetch('/api/software-companies')
      .then((response) => {
        if (!response.ok) throw new Error(`The data service returned ${response.status}.`)
        return response.json() as Promise<SoftwareCompaniesResponse>
      })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the software-company files.'))
    return () => { document.title = previousTitle }
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return data.items
      .filter((row) => source === 'all' || row.source === source)
      .filter((row) => !normalizedQuery || data.columns.some((column) => (row[column] ?? '').toLocaleLowerCase().includes(normalizedQuery)))
      .sort((left, right) => {
        const leftValue = left[sortField] ?? ''
        const rightValue = right[sortField] ?? ''
        return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' }) * (sortDirection === 'asc' ? 1 : -1)
      })
  }, [data, query, sortDirection, sortField, source])

  useEffect(() => {
    setSelectedCell(null)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [query, sortDirection, sortField, source])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    getItemKey: (index) => `${rows[index]?.source}-${rows[index]?.linkedin_company_url || rows[index]?.id || index}`,
  })

  const widths = useMemo(() => data?.columns.map(columnWidth) ?? [], [data])
  const gridTemplateColumns = useMemo(() => `48px ${widths.map((width) => `${width}px`).join(' ')}`, [widths])
  const gridWidth = 48 + widths.reduce((sum, width) => sum + width, 0)
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

  const selectedRow = selectedCell ? rows[selectedCell.rowIndex] : null
  const selectedColumn = selectedCell && data ? data.columns[selectedCell.columnIndex] : ''
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

  return (
    <div className="app-shell software-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem directories</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/visualisations">Funding map</a>
          <a href="/software-companies" aria-current="page">Software companies</a>
          <a href="/influencers">Influencers</a>
          <a href="/research">Research sheet</a>
        </nav>
      </header>

      <main className="software-main">
        <section className="software-summary" aria-label="Combined source summary">
          <div><strong>Software-company directory</strong><span>Union of both CSV schemas; source rows are preserved without deduplication.</span></div>
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
          <label><span>Sort</span><select value={sortField} onChange={(event) => setSortField(event.target.value)}><option value="company_name">Company name</option><option value="source">Source</option>{data?.columns.filter((column) => !['source', 'company_name'].includes(column)).map((column) => <option key={column} value={column}>{column}</option>)}</select></label>
          <button onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}</button>
          {(query || source !== 'all' || sortField !== 'company_name' || sortDirection !== 'asc') && <button onClick={() => { setQuery(''); setSource('all'); setSortField('company_name'); setSortDirection('asc') }}>Clear</button>}
          <span className="software-result-count">{rows.length.toLocaleString()} rows</span>
        </div>

        <div className="software-formula-bar">
          <output>{selectedCell ? `${selectedColumn} · row ${selectedCell.rowIndex + 1}` : '—'}</output>
          <input value={selectedValue} readOnly placeholder="Select a cell to inspect its full value" aria-label="Selected cell value" />
          {selectedLink && <a href={selectedLink} target="_blank" rel="noreferrer">Open</a>}
          <button disabled={!selectedCell} onClick={() => void copySelectedValue()}>{copied ? 'Copied' : 'Copy'}</button>
        </div>

        {error && <div className="software-error" role="alert">{error}</div>}
        {!data && !error ? <div className="software-loading"><span className="loading-spinner" /> Loading both CSV files…</div> : data && (
          <div className="software-grid-scroll" ref={scrollRef}>
            <div className="software-grid" style={gridStyle}>
              <div className="software-grid-header">
                <div className="software-row-number">#</div>
                {data.columns.map((column) => (
                  <button className={sortField === column ? 'is-sorted' : ''} key={column} onClick={() => sortBy(column)} title={`Sort by ${column}`}>
                    <span>{column}</span>{sortField === column && <b>{sortDirection === 'asc' ? '↑' : '↓'}</b>}
                  </button>
                ))}
              </div>
              <div className="software-virtual-body" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <div className="software-data-row" key={virtualRow.key} style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                      <div className="software-row-number">{virtualRow.index + 1}</div>
                      {data.columns.map((column, columnIndex) => {
                        const value = row[column] ?? ''
                        const selected = selectedCell?.rowIndex === virtualRow.index && selectedCell.columnIndex === columnIndex
                        return (
                          <button className={`software-cell${selected ? ' is-selected' : ''}${!value ? ' is-empty' : ''}`} key={column} title={value} onClick={() => { setSelectedCell({ rowIndex: virtualRow.index, columnIndex }); setCopied(false) }}>
                            {column === 'source' ? <span className={`software-source software-source--${row.source}`}>{row.source}</span> : value}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              {!rows.length && <div className="software-empty">No rows match the current search and source filter.</div>}
            </div>
          </div>
        )}

        <footer className="software-statusbar">
          <span>{data?.sources.linkedin}</span><span>{data?.sources.kattch}</span><span>{rows.length.toLocaleString()} visible rows</span>
        </footer>
      </main>
    </div>
  )
}
