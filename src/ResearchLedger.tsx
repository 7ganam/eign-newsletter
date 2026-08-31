import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { dateEditorValue, InlineEdit, parseJsonEditorValue } from './editableCells'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'
import { usePersistedSort } from './tablePreferences'
import './research.css'

type ResearchField = {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'objectId' | 'unknown'
  bsonTypes: string[]
}

type ResearchSchema = {
  collection: string
  fields: ResearchField[]
  facets: Record<string, string[]>
}

type ResearchFilter = {
  id: string
  field: string
  operator: string
  value: string
  secondValue: string
}

type ResearchResponse = {
  items: Array<Record<string, unknown>>
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

type QueryPayload = {
  limit: number
  search: string
  sortField: string
  sortDirection: 'asc' | 'desc'
  filters: ResearchFilter[]
}

type SelectedCell = {
  rowIndex: number
  columnIndex: number
}

type ColumnDrop = {
  field: string
  position: 'before' | 'after'
}

const PAGE_SIZE = 100
const ROW_HEIGHT = 32
const COLUMN_ORDER_STORAGE_KEY = 'eign-research.companies.column-order.v1'
const COLUMN_WIDTH_STORAGE_KEY = 'eign-research.companies.column-widths.v1'
const ROW_SORT_STORAGE_KEY = 'eign-research.companies.row-sort.v1'
const DEFAULT_SORT = { field: 'name', direction: 'asc' } as const

const OPERATOR_GROUPS: Record<ResearchField['type'], Array<[string, string]>> = {
  string: [
    ['contains', 'contains'],
    ['not_contains', 'does not contain'],
    ['equals', 'equals'],
    ['not_equals', 'does not equal'],
    ['starts_with', 'starts with'],
    ['ends_with', 'ends with'],
    ['in', 'is one of'],
    ['empty', 'is empty'],
    ['not_empty', 'is not empty'],
    ['exists', 'exists'],
    ['not_exists', 'is missing'],
  ],
  number: [
    ['equals', '='],
    ['not_equals', '≠'],
    ['greater_than', '>'],
    ['greater_or_equal', '≥'],
    ['less_than', '<'],
    ['less_or_equal', '≤'],
    ['between', 'is between'],
    ['in', 'is one of'],
    ['exists', 'exists'],
    ['not_exists', 'is missing'],
  ],
  date: [
    ['equals', 'is on'],
    ['before', 'is before'],
    ['after', 'is after'],
    ['between', 'is between'],
    ['exists', 'exists'],
    ['not_exists', 'is missing'],
  ],
  boolean: [
    ['equals', 'equals'],
    ['not_equals', 'does not equal'],
    ['exists', 'exists'],
    ['not_exists', 'is missing'],
  ],
  objectId: [
    ['equals', 'equals'],
    ['not_equals', 'does not equal'],
    ['in', 'is one of'],
    ['exists', 'exists'],
    ['not_exists', 'is missing'],
  ],
  unknown: [
    ['equals', 'equals'],
    ['not_equals', 'does not equal'],
    ['exists', 'exists'],
    ['not_exists', 'is missing'],
  ],
}

const VALUELESS_OPERATORS = new Set(['exists', 'not_exists', 'empty', 'not_empty'])

const makeFilter = (field = 'industry', operator = 'equals', value = ''): ResearchFilter => ({
  id: crypto.randomUUID(),
  field,
  operator,
  value,
  secondValue: '',
})

const rawValue = (value: unknown) => {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const editorValue = (value: unknown, field: ResearchField) => {
  if (value === undefined || value === null) return ''
  if (field.type === 'date') return dateEditorValue(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const IMMUTABLE_RESEARCH_FIELDS = new Set(['_id', 'companyId', 'slug'])
const isEditableField = (field: ResearchField) => field.type !== 'objectId' && !IMMUTABLE_RESEARCH_FIELDS.has(field.name)

const parseResearchDraft = (draft: string, field: ResearchField) => {
  if (field.type === 'number') {
    if (!draft.trim()) return null
    const number = Number(draft)
    if (!Number.isFinite(number)) throw new Error('Enter a valid number.')
    return number
  }
  if (field.type === 'date') return draft || null
  if (field.type === 'boolean') return draft === 'true'
  if (field.type === 'unknown') return draft.trim() ? parseJsonEditorValue(draft) : null
  return draft
}

const displayValue = (value: unknown) => {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
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

const columnWidth = (field: ResearchField) => {
  if (field.name === 'summary' || field.name.endsWith('Note') || field.name === 'fundingSources') return 300
  if (field.name === 'name') return 190
  if (field.name === 'website' || field.name.endsWith('Url')) return 230
  if (field.type === 'number') return 180
  if (field.type === 'date') return 190
  if (field.type === 'objectId') return 215
  return Math.max(150, Math.min(230, field.name.length * 8 + 54))
}

const restoreColumnOrder = (schema: ResearchSchema) => {
  try {
    const savedOrder = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(savedOrder)) return schema

    const fieldsByName = new Map(schema.fields.map((field) => [field.name, field]))
    const seen = new Set<string>()
    const savedFields = savedOrder.flatMap((fieldName) => {
      if (typeof fieldName !== 'string' || seen.has(fieldName)) return []
      const field = fieldsByName.get(fieldName)
      if (!field) return []
      seen.add(fieldName)
      return [field]
    })
    const newFields = schema.fields.filter((field) => !seen.has(field.name))
    return { ...schema, fields: [...savedFields, ...newFields] }
  } catch {
    return schema
  }
}

const saveColumnOrder = (fields: ResearchField[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(fields.map((field) => field.name)))
  } catch {
    // The sheet remains usable if local storage is unavailable.
  }
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])
  return debouncedValue
}

function FilterValueEditor({
  filter,
  field,
  facetValues,
  onChange,
}: {
  filter: ResearchFilter
  field: ResearchField
  facetValues?: string[]
  onChange: (changes: Partial<ResearchFilter>) => void
}) {
  if (VALUELESS_OPERATORS.has(filter.operator)) return <span className="sheet-no-value">No value needed</span>

  if (field.type === 'boolean') {
    return (
      <select value={filter.value || 'true'} onChange={(event) => onChange({ value: event.target.value })}>
        <option value="true">TRUE</option>
        <option value="false">FALSE</option>
      </select>
    )
  }

  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
  const listId = facetValues?.length ? `sheet-facet-${filter.id}` : undefined

  return (
    <div className="sheet-filter-values">
      <input
        type={inputType}
        value={filter.value}
        list={listId}
        placeholder={filter.operator === 'in' ? 'Comma-separated values' : 'Value'}
        onChange={(event) => onChange({ value: event.target.value })}
      />
      {filter.operator === 'between' && (
        <input
          type={inputType}
          value={filter.secondValue}
          aria-label="Upper bound"
          placeholder="Upper bound"
          onChange={(event) => onChange({ secondValue: event.target.value })}
        />
      )}
      {listId && (
        <datalist id={listId}>
          {facetValues?.map((value) => <option key={value} value={value} />)}
        </datalist>
      )}
    </div>
  )
}

export function ResearchLedger() {
  const [schema, setSchema] = useState<ResearchSchema | null>(null)
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [total, setTotal] = useState(0)
  const [loadedPage, setLoadedPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ResearchFilter[]>([])
  const { resetSort, setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<string>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
  )
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [copied, setCopied] = useState(false)
  const [cellSaveError, setCellSaveError] = useState('')
  const [draggingField, setDraggingField] = useState<string | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const querySignatureRef = useRef('')
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Startups · EIGN Data Workspace'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    fetch('/api/research/schema')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load the company fields.')
        return response.json() as Promise<ResearchSchema>
      })
      .then((loadedSchema) => setSchema(restoreColumnOrder(loadedSchema)))
      .catch((caughtError) => setError(caughtError instanceof Error ? caughtError.message : 'Schema query failed.'))
  }, [])

  useEffect(() => {
    if (schema && !schema.fields.some((field) => field.name === sortField)) resetSort()
  }, [resetSort, schema, sortField])

  const debouncedSearch = useDebouncedValue(search, 220)
  const queryPayload = useMemo<QueryPayload>(() => ({
    limit: PAGE_SIZE,
    search: debouncedSearch,
    sortField,
    sortDirection,
    filters,
  }), [debouncedSearch, filters, sortDirection, sortField])
  const querySignature = useMemo(() => JSON.stringify(queryPayload), [queryPayload])

  const fetchPage = useCallback(async (page: number, append: boolean, payload: QueryPayload, signature: string) => {
    if (append) {
      if (loadingMoreRef.current) return
      loadingMoreRef.current = true
      setLoadingMore(true)
    } else {
      setInitialLoading(true)
      setRows([])
      setSelectedCell(null)
    }

    setError('')
    try {
      const response = await fetch('/api/research/companies/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, page }),
      })
      if (!response.ok) throw new Error('The company query could not be completed.')
      const result = await response.json() as ResearchResponse
      if (querySignatureRef.current !== signature) return

      setRows((current) => append ? [...current, ...result.items] : result.items)
      setTotal(result.pagination.total)
      setLoadedPage(result.pagination.page)
      setHasMore(result.pagination.page < result.pagination.pages)
    } catch (caughtError) {
      if (querySignatureRef.current === signature) {
        setError(caughtError instanceof Error ? caughtError.message : 'Research query failed.')
      }
    } finally {
      if (append) {
        loadingMoreRef.current = false
        setLoadingMore(false)
      } else if (querySignatureRef.current === signature) {
        setInitialLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!schema) return
    querySignatureRef.current = querySignature
    loadingMoreRef.current = false
    setLoadedPage(0)
    setHasMore(false)
    scrollRef.current?.scrollTo({ top: 0 })
    void fetchPage(1, false, queryPayload, querySignature)
  }, [fetchPage, queryPayload, querySignature, schema?.collection])

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? rows.length + 1 : rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 14,
    useFlushSync: false,
    getItemKey: (index) => String(rows[index]?._id ?? `loader-${index}`),
  })
  const virtualRows = rowVirtualizer.getVirtualItems()

  useEffect(() => {
    const lastVirtualRow = virtualRows.at(-1)
    if (!lastVirtualRow || !hasMore || initialLoading || loadingMore) return
    if (lastVirtualRow.index >= rows.length - 8) {
      void fetchPage(loadedPage + 1, true, queryPayload, querySignature)
    }
  }, [fetchPage, hasMore, initialLoading, loadedPage, loadingMore, queryPayload, querySignature, rows.length, virtualRows])

  const fieldKeys = useMemo(() => schema?.fields.map((field) => field.name) ?? [], [schema])
  const defaultWidths = useMemo(() => Object.fromEntries(
    schema?.fields.map((field) => [field.name, columnWidth(field)]) ?? [],
  ), [schema])
  const { getResizeHandleProps, widths: resizedWidths } = useResizableColumns({
    defaults: defaultWidths,
    storageKey: COLUMN_WIDTH_STORAGE_KEY,
  })
  const widths = useMemo(() => fieldKeys.map((field) => resizedWidths[field]), [fieldKeys, resizedWidths])
  const gridTemplateColumns = useMemo(() => `52px ${widths.map((width) => `${width}px`).join(' ')}`, [widths])
  const gridWidth = 52 + widths.reduce((sum, width) => sum + width, 0)

  const updateFilter = (id: string, changes: Partial<ResearchFilter>) => {
    setFilters((current) => current.map((filter) => {
      if (filter.id !== id) return filter
      const next = { ...filter, ...changes }
      if (changes.field && schema) {
        const nextField = schema.fields.find((field) => field.name === changes.field)
        next.operator = OPERATOR_GROUPS[nextField?.type ?? 'unknown'][0][0]
        next.value = nextField?.type === 'boolean' ? 'true' : ''
        next.secondValue = ''
      }
      if (changes.operator) next.secondValue = ''
      return next
    }))
  }

  const addFilter = (fieldName?: string) => {
    const field = schema?.fields.find((item) => item.name === fieldName) ?? schema?.fields[0]
    if (!field) return
    setFilters((current) => [...current, makeFilter(field.name, OPERATOR_GROUPS[field.type][0][0], field.type === 'boolean' ? 'true' : '')])
    setFilterPanelOpen(true)
  }

  const sortBy = (fieldName: string) => {
    if (sortField === fieldName) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(fieldName)
      setSortDirection('asc')
    }
  }

  const moveColumn = (sourceField: string, targetField: string, position: ColumnDrop['position']) => {
    if (sourceField === targetField) return
    setSchema((current) => {
      if (!current) return current
      const source = current.fields.find((field) => field.name === sourceField)
      if (!source) return current

      const nextFields = current.fields.filter((field) => field.name !== sourceField)
      const targetIndex = nextFields.findIndex((field) => field.name === targetField)
      if (targetIndex === -1) return current
      nextFields.splice(targetIndex + (position === 'after' ? 1 : 0), 0, source)
      saveColumnOrder(nextFields)
      return { ...current, fields: nextFields }
    })
    setSelectedCell(null)
  }

  const handleColumnDragStart = (event: ReactDragEvent<HTMLDivElement>, fieldName: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', fieldName)
    setDraggingField(fieldName)
  }

  const handleColumnDragOver = (event: ReactDragEvent<HTMLDivElement>, fieldName: string) => {
    if (!draggingField || draggingField === fieldName) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setColumnDrop({ field: fieldName, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
  }

  const handleColumnDrop = (event: ReactDragEvent<HTMLDivElement>, fieldName: string) => {
    event.preventDefault()
    const sourceField = event.dataTransfer.getData('text/plain') || draggingField
    const position = columnDrop?.field === fieldName ? columnDrop.position : 'before'
    if (sourceField) moveColumn(sourceField, fieldName, position)
    setDraggingField(null)
    setColumnDrop(null)
  }

  const finishColumnDrag = () => {
    setDraggingField(null)
    setColumnDrop(null)
  }

  const selectedValue = selectedCell && schema
    ? rawValue(rows[selectedCell.rowIndex]?.[schema.fields[selectedCell.columnIndex]?.name])
    : ''
  const selectedAddress = selectedCell ? `${columnLetter(selectedCell.columnIndex)}${selectedCell.rowIndex + 1}` : ''

  const selectCell = (rowIndex: number, columnIndex: number) => {
    setSelectedCell({ rowIndex, columnIndex })
    setCopied(false)
  }

  const saveCell = async (row: Record<string, unknown>, field: ResearchField, draft: string) => {
    const recordId = String(row.__recordId ?? row._id ?? '')
    if (!recordId || !isEditableField(field)) throw new Error('That identity field is read-only.')
    const value = parseResearchDraft(draft, field)
    setCellSaveError('')
    const response = await fetch(`/api/records/companies/${encodeURIComponent(recordId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ field: field.name, value }),
    })
    const result = await response.json().catch(() => null) as { error?: string; value?: unknown } | null
    if (!response.ok) {
      const message = result?.error || `The data service returned ${response.status}.`
      setCellSaveError(message)
      throw new Error(message)
    }
    setRows((current) => current.map((item) => String(item.__recordId ?? item._id ?? '') === recordId
      ? { ...item, [field.name]: result?.value }
      : item))
  }

  const copySelectedCell = async () => {
    if (!selectedCell) return
    await navigator.clipboard.writeText(selectedValue)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1000)
  }

  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!selectedCell || !schema) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      void copySelectedCell()
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
    const nextRow = Math.max(0, Math.min(rows.length - 1, selectedCell.rowIndex + move[0]))
    const nextColumn = Math.max(0, Math.min(schema.fields.length - 1, selectedCell.columnIndex + move[1]))
    setSelectedCell({ rowIndex: nextRow, columnIndex: nextColumn })
    rowVirtualizer.scrollToIndex(nextRow, { align: 'auto' })
  }

  const clearQuery = () => {
    setSearch('')
    setFilters([])
    resetSort()
  }

  const styleVariables = {
    '--sheet-grid-width': `${gridWidth}px`,
    '--sheet-grid-columns': gridTemplateColumns,
  } as CSSProperties

  return (
    <main className="sheet-app">
      <header className="workspace-header sheet-workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem directories</span></div>
        <nav aria-label="Primary navigation">
          <a href="/">Dashboard</a>
          <a href="/software-companies">Software companies</a>
          <a href="/influencers">Influencers</a>
          <a href="/research" aria-current="page">Startups</a>
          <a href="/newsletters">Newsletters</a>
          <a href="/posts">Posts</a>
        </nav>
      </header>

      <header className="sheet-titlebar">
        <div className="sheet-document">
          <strong>Startups</strong>
          <span>Local JSON files · {schema?.collection ?? 'companies'}</span>
        </div>
      </header>

      <div className="sheet-toolbar">
        <label className="sheet-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            placeholder="Search all text fields"
            aria-label="Search all text fields"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className={filterPanelOpen ? 'is-active' : ''} onClick={() => setFilterPanelOpen((current) => !current)}>
          <span aria-hidden="true">▽</span> Filter{filters.length ? ` (${filters.length})` : ''}
        </button>
        <button title="Reverse current sort" onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}>
          {sortDirection === 'asc' ? '↑' : '↓'} {sortField}
        </button>
        {(search || filters.length > 0 || sortField !== 'name' || sortDirection !== 'asc') && (
          <button onClick={clearQuery}>Clear</button>
        )}
        <span className="sheet-result-count">{initialLoading ? 'Loading…' : `${total.toLocaleString()} rows`}</span>
      </div>

      {filters.length > 0 && (
        <div className="sheet-filter-chips" aria-label="Active filters">
          {filters.map((filter) => (
            <button key={filter.id} onClick={() => setFilterPanelOpen(true)}>
              <strong>{filter.field}</strong> {filter.operator.replaceAll('_', ' ')} {filter.value}
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${filter.field} filter`}
                onClick={(event) => {
                  event.stopPropagation()
                  setFilters((current) => current.filter((item) => item.id !== filter.id))
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.stopPropagation()
                    setFilters((current) => current.filter((item) => item.id !== filter.id))
                  }
                }}
              >×</span>
            </button>
          ))}
        </div>
      )}

      {filterPanelOpen && schema && (
        <section className="sheet-filter-popover" aria-label="Filter conditions">
          <div className="sheet-filter-popover__heading">
            <div><strong>Filters</strong><span>All conditions use AND</span></div>
            <button aria-label="Close filters" onClick={() => setFilterPanelOpen(false)}>×</button>
          </div>
          <div className="sheet-filter-list">
            {filters.length === 0 && <p>No filters applied. Add one to narrow the sheet.</p>}
            {filters.map((filter) => {
              const field = schema.fields.find((item) => item.name === filter.field) ?? schema.fields[0]
              return (
                <div className="sheet-filter-row" key={filter.id}>
                  <select aria-label="Field" value={filter.field} onChange={(event) => updateFilter(filter.id, { field: event.target.value })}>
                    {schema.fields.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                  </select>
                  <select aria-label="Operator" value={filter.operator} onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}>
                    {OPERATOR_GROUPS[field.type].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <FilterValueEditor
                    filter={filter}
                    field={field}
                    facetValues={schema.facets[field.name]}
                    onChange={(changes) => updateFilter(filter.id, changes)}
                  />
                  <button className="sheet-filter-remove" aria-label={`Remove ${filter.field} filter`} onClick={() => setFilters((current) => current.filter((item) => item.id !== filter.id))}>×</button>
                </div>
              )
            })}
          </div>
          <div className="sheet-filter-actions">
            <button onClick={() => addFilter()}>＋ Add condition</button>
            {filters.length > 0 && <button onClick={() => setFilters([])}>Clear all</button>}
          </div>
        </section>
      )}

      <div className="sheet-formula-bar">
        <output className="sheet-cell-address">{selectedAddress || '—'}</output>
        <span className="sheet-fx" aria-hidden="true">fx</span>
        <input value={selectedValue} readOnly aria-label="Selected cell value" placeholder="Select a cell to inspect its full value" />
        <button disabled={!selectedCell} onClick={() => void copySelectedCell()}>{copied ? 'Copied' : 'Copy'}</button>
        <span className="table-edit-hint">Pencil or double-click a cell to edit</span>
      </div>

      {error && <div className="sheet-error" role="alert">{error}</div>}
      {cellSaveError && <div className="sheet-error" role="alert">Cell was not saved: {cellSaveError}</div>}

      <div
        ref={scrollRef}
        className="sheet-grid-scroll"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        aria-label="Startups spreadsheet"
      >
        <div className="sheet-grid" style={styleVariables}>
          <div className="sheet-grid-header">
            <div className="sheet-letter-row">
              <div className="sheet-corner" />
              {schema?.fields.map((field, index) => <div key={field.name}>{columnLetter(index)}</div>)}
            </div>
            <div className="sheet-field-row">
              <div className="sheet-row-heading">#</div>
              {schema?.fields.map((field) => (
                <div
                  className={[
                    'sheet-column-header',
                    sortField === field.name ? 'is-sorted' : '',
                    draggingField === field.name ? 'is-dragging' : '',
                    columnDrop?.field === field.name ? `is-drop-${columnDrop.position}` : '',
                  ].filter(Boolean).join(' ')}
                  draggable
                  key={field.name}
                  title={`${field.name} · ${field.type} · Drag to reorder; use the right edge to resize`}
                  onDragStart={(event) => handleColumnDragStart(event, field.name)}
                  onDragOver={(event) => handleColumnDragOver(event, field.name)}
                  onDrop={(event) => handleColumnDrop(event, field.name)}
                  onDragEnd={finishColumnDrag}
                >
                  <button className="sheet-field-sort" onClick={() => sortBy(field.name)}>
                    <span className="sheet-drag-handle" aria-hidden="true">⠿</span>
                    <span className="sheet-field-name">{field.name}</span>
                    {sortField === field.name && <b>{sortDirection === 'asc' ? '↑' : '↓'}</b>}
                  </button>
                  <button className="sheet-field-filter" aria-label={`Filter ${field.name}`} title={`Filter ${field.name}`} onClick={() => addFilter(field.name)}>▽</button>
                  <ColumnResizeHandle {...getResizeHandleProps(field.name, field.name)} />
                </div>
              ))}
            </div>
          </div>

          {initialLoading ? (
            <div className="sheet-initial-loading">Loading rows…</div>
          ) : rows.length === 0 ? (
            <div className="sheet-empty">No rows match the current filters.</div>
          ) : (
            <div className="sheet-virtual-body" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index]
                if (!row) {
                  return (
                    <div
                      className="sheet-loader-row"
                      key={virtualRow.key}
                      style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                    >
                      {loadingMore ? 'Loading more rows…' : 'Scroll for more'}
                    </div>
                  )
                }

                return (
                  <div
                    className="sheet-data-row"
                    data-row-index={virtualRow.index}
                    key={virtualRow.key}
                    style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div className="sheet-row-number">{virtualRow.index + 1}</div>
                    {schema?.fields.map((field, columnIndex) => {
                      const isSelected = selectedCell?.rowIndex === virtualRow.index && selectedCell.columnIndex === columnIndex
                      const value = row[field.name]
                      return (
                        <div
                          className={`sheet-cell sheet-cell--${field.type}${isSelected ? ' is-selected' : ''}${value === undefined ? ' is-missing' : ''}`}
                          data-field={field.name}
                          key={field.name}
                          title={displayValue(value)}
                          onClick={() => selectCell(virtualRow.index, columnIndex)}
                        >
                          <InlineEdit
                            ariaLabel={`${field.name}, row ${virtualRow.index + 1}`}
                            disabled={!isEditableField(field)}
                            inputType={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            onSave={(draft) => saveCell(row, field, draft)}
                            options={field.type === 'boolean' ? [{ label: 'TRUE', value: 'true' }, { label: 'FALSE', value: 'false' }] : undefined}
                            selected={isSelected}
                            value={editorValue(value, field)}
                          >
                            {displayValue(value)}
                          </InlineEdit>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="sheet-statusbar">
        <span className="sheet-tab">Startups</span>
        <span>{schema?.fields.length ?? 0} columns</span>
        <span>{rows.length.toLocaleString()} of {total.toLocaleString()} rows loaded</span>
        <span>{hasMore ? 'Scroll down to load more' : 'All matching rows loaded'}</span>
      </footer>
    </main>
  )
}
