import { HotTable } from '@handsontable/react-wrapper'
import type { HotTableRef } from '@handsontable/react-wrapper'
import { AutocompleteEditor } from 'handsontable/editors/autocompleteEditor'
import { registerAllModules } from 'handsontable/registry'
import type { BaseRenderer } from 'handsontable/renderers'
import type { CellChange, ChangeSource } from 'handsontable/settings'
import 'handsontable/styles/handsontable.css'
import 'handsontable/styles/ht-theme-main.css'
import { useEffect, useRef, useState } from 'react'
import unifiedPeopleUrl from '../assets/people/unified-people.json?url'
import { newsletterTargetGroupOptions } from './newsletterTargetGroups'
import type { NewsletterTargetGroupOption, UnifiedPeopleFile, UnifiedPeopleSourceId, UnifiedPerson } from './unifiedPeopleTypes'
import { WorkspaceNav } from './WorkspaceNav'

registerAllModules()

type PeopleEditableField =
  | 'name'
  | 'role'
  | 'organization'
  | 'country'
  | 'lane'
  | 'group'
  | 'linkedinUrl'
  | 'followers'
  | 'biography'
  | 'fit'
  | 'potentialTarget'
  | 'target'
  | 'priority'
  | 'middleEastern'

type PropertyKind = 'image' | 'text' | 'number' | 'checkbox' | 'date' | 'select' | 'multiselect'

type PersonImageCell = {
  alt: string
  name: string
  url: string
}

type GridColumn = {
  className?: string
  field?: PeopleEditableField
  kind: PropertyKind
  key: string
  label: string
  groupOptions?: NewsletterTargetGroupOption[]
  options?: string[]
  readOnly?: boolean
  renderer?: BaseRenderer
  width: number
}

type GridLayout = {
  columnOrder: number[]
  columnWidths: number[]
  rowOrder: number[]
}

type GridFilterOperation = 'conjunction' | 'disjunction' | 'disjunctionWithExtraCondition'

type GridFilterState = {
  column: string
  conditions: Array<{ name: string; args: unknown[] }>
  operation: GridFilterOperation
}

type GridViewState = {
  filters: GridFilterState[]
  hiddenColumns: string[]
  hiddenRows: string[]
  sort: { column: string; sortOrder: 'asc' | 'desc' } | null
}

type CellPreview = {
  column: GridColumn
  personName: string
  value: unknown
}

const LAYOUT_STORAGE_KEY = 'eign-people-notion-grid.layout.v3'
const CREATE_GROUP_CHOICE_KEY = '__create_newsletter_group__'
const FILTERS_URL_KEY = 'filters'
const SORT_URL_KEY = 'sort'
const HIDDEN_COLUMNS_URL_KEY = 'hidden'
const HIDDEN_ROWS_URL_KEY = 'hiddenRows'
const FILTER_OPERATIONS = new Set<GridFilterOperation>(['conjunction', 'disjunction', 'disjunctionWithExtraCondition'])

type CreateGroupChoice = {
  key: typeof CREATE_GROUP_CHOICE_KEY
  label: string
  value: string
}

class GroupAutocompleteEditor extends AutocompleteEditor {
  override createElements() {
    super.createElements()
    this.htContainer.classList.add('people-group-autocomplete-editor')
  }
}

const createGroupChoice = (label: string): CreateGroupChoice => ({
  key: CREATE_GROUP_CHOICE_KEY,
  label,
  value: `＋ Create group “${label}”`,
})

const isCreateGroupChoice = (value: unknown): value is CreateGroupChoice => Boolean(
  value
  && typeof value === 'object'
  && (value as Partial<CreateGroupChoice>).key === CREATE_GROUP_CHOICE_KEY
  && typeof (value as Partial<CreateGroupChoice>).label === 'string',
)

const SOURCE_LABELS: Record<UnifiedPeopleSourceId, string> = {
  'leap-2026': 'leap',
  'riseup-2026': 'rise',
  'web-search': 'infl',
  'middle-east-vc-people': 'vc',
  'middle-east-founders': 'founder',
  'juhani-like-accounts': 'juhani',
  'saudi-software-leads': 'lead',
}
const SOURCE_TITLE_BY_LABEL: Record<string, string> = {
  leap: 'LEAP 2026',
  rise: 'RiseUp 2026',
  infl: 'Influencer research',
  vc: 'Middle East VC people',
  founder: 'Middle East founders',
  juhani: 'Juhani-like accounts',
  lead: 'Saudi software leads',
}

const PROPERTY_TYPES: Array<{ label: string; value: PropertyKind }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
]

const DEFAULT_COLUMN_WIDTHS = [
  72, 220, 210, 210, 165, 140, 165, 72, 118, 82, 180, 82,
  118, 245, 115, 260, 360, 250, 82, 88, 130, 285,
]

const isIndexOrder = (value: unknown, length: number): value is number[] => Array.isArray(value)
  && value.length === length
  && new Set(value).size === length
  && value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < length)

const isFilterArgument = (value: unknown, depth = 0): boolean => {
  if (value === null || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.length <= 2_000
  return depth < 2
    && Array.isArray(value)
    && value.length <= 2_000
    && value.every((entry) => isFilterArgument(entry, depth + 1))
}

const readGridViewState = (): GridViewState => {
  const emptyState: GridViewState = { filters: [], hiddenColumns: [], hiddenRows: [], sort: null }
  if (typeof window === 'undefined') return emptyState
  const params = new URLSearchParams(window.location.search)
  let filters: GridFilterState[] = []

  try {
    const parsed = JSON.parse(params.get(FILTERS_URL_KEY) ?? '[]') as unknown
    if (Array.isArray(parsed)) {
      filters = parsed.slice(0, 50).flatMap((entry): GridFilterState[] => {
        if (!entry || typeof entry !== 'object') return []
        const candidate = entry as Partial<GridFilterState>
        if (typeof candidate.column !== 'string'
          || candidate.column.length > 100
          || !FILTER_OPERATIONS.has(candidate.operation as GridFilterOperation)
          || !Array.isArray(candidate.conditions)) return []
        const conditions = candidate.conditions.slice(0, 10).flatMap((condition) => {
          if (!condition || typeof condition !== 'object') return []
          const value = condition as { name?: unknown; args?: unknown }
          if (typeof value.name !== 'string'
            || !/^[a-z][a-z0-9_]{0,50}$/i.test(value.name)
            || !Array.isArray(value.args)
            || !value.args.every((argument) => isFilterArgument(argument))) return []
          return [{ name: value.name, args: value.args }]
        })
        return conditions.length ? [{
          column: candidate.column,
          conditions,
          operation: candidate.operation as GridFilterOperation,
        }] : []
      })
    }
  } catch {
    filters = []
  }

  const sortValue = params.get(SORT_URL_KEY) ?? ''
  const sortSeparator = sortValue.lastIndexOf(':')
  const sortColumn = sortSeparator > 0 ? sortValue.slice(0, sortSeparator) : ''
  const sortOrder = sortSeparator > 0 ? sortValue.slice(sortSeparator + 1) : ''
  const readList = (key: string, limit: number) => [...new Set(
    (params.get(key) ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  )].slice(0, limit)

  return {
    filters,
    hiddenColumns: readList(HIDDEN_COLUMNS_URL_KEY, DEFAULT_COLUMN_WIDTHS.length),
    hiddenRows: readList(HIDDEN_ROWS_URL_KEY, 2_000),
    sort: sortColumn && (sortOrder === 'asc' || sortOrder === 'desc')
      ? { column: sortColumn, sortOrder }
      : null,
  }
}

const writeGridViewState = ({ filters, hiddenColumns, hiddenRows, sort }: GridViewState) => {
  const url = new URL(window.location.href)
  const setOrDelete = (key: string, value: string) => {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  }
  setOrDelete(FILTERS_URL_KEY, filters.length ? JSON.stringify(filters) : '')
  setOrDelete(SORT_URL_KEY, sort ? `${sort.column}:${sort.sortOrder}` : '')
  setOrDelete(HIDDEN_COLUMNS_URL_KEY, hiddenColumns.join(','))
  setOrDelete(HIDDEN_ROWS_URL_KEY, hiddenRows.join(','))

  const nextUrl = `${url.pathname}${url.search}${url.hash}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (nextUrl !== currentUrl) window.history.replaceState(window.history.state, '', nextUrl)
}

const temporaryColumnKey = () => `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const loadGridLayout = (rowCount: number): GridLayout | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) ?? 'null') as Partial<GridLayout> | null
    if (!parsed || !isIndexOrder(parsed.columnOrder, DEFAULT_COLUMN_WIDTHS.length)) return null
    if (!Array.isArray(parsed.columnWidths)
      || parsed.columnWidths.length !== DEFAULT_COLUMN_WIDTHS.length
      || parsed.columnWidths.some((width) => typeof width !== 'number' || width < 40 || width > 1_000)) return null
    if (!isIndexOrder(parsed.rowOrder, rowCount)) return null
    return {
      columnOrder: parsed.columnOrder,
      columnWidths: parsed.columnWidths,
      rowOrder: parsed.rowOrder,
    }
  } catch {
    return null
  }
}

const linkedInProfile = (person: UnifiedPerson) => person.profiles.find(
  (profile) => profile.platform === 'linkedin' && profile.followers?.count != null,
) ?? person.profiles.find((profile) => profile.platform === 'linkedin')

const sessionCount = (person: UnifiedPerson) => person.event_appearances.reduce(
  (total, appearance) => total + appearance.sessions.length,
  0,
)

const latestObservedDate = (person: UnifiedPerson) => person.source_records
  .map((record) => record.observed_at)
  .filter((value): value is string => Boolean(value))
  .sort()
  .at(-1)
  ?.slice(0, 10) ?? ''

const uniqueValues = (values: Array<string | null | undefined>) => [...new Set(
  values.filter((value): value is string => Boolean(value)),
)].sort((left, right) => left.localeCompare(right))

const personInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toLocaleUpperCase() ?? '')
  .join('') || '—'

const renderInitials = (container: HTMLElement, name: string) => {
  const fallback = document.createElement('span')
  fallback.className = 'people-grid-avatar-fallback'
  fallback.textContent = personInitials(name)
  fallback.setAttribute('aria-hidden', 'true')
  container.replaceChildren(fallback)
}

const personImageRenderer: BaseRenderer = (_instance, td, _row, _column, _prop, value) => {
  const image = value as PersonImageCell | null
  const name = image?.name?.trim() || 'Person'
  const container = document.createElement('span')
  container.className = 'people-grid-avatar'
  td.textContent = ''
  td.setAttribute('aria-label', image?.url ? `Photo of ${name}` : `${name} avatar`)

  if (image?.url) {
    const element = document.createElement('img')
    element.alt = image.alt || `Photo of ${name}`
    element.loading = 'lazy'
    element.src = image.url
    element.addEventListener('error', () => renderInitials(container, name), { once: true })
    container.append(element)
  } else {
    renderInitials(container, name)
  }

  td.append(container)
}

const sourceTagsRenderer: BaseRenderer = (instance, td, row, column) => {
  const physicalRow = instance.toPhysicalRow(row)
  const sourceValue = instance.getSourceDataAtCell(physicalRow, column)
  const values = Array.isArray(sourceValue) ? sourceValue.map(String) : []
  const container = document.createElement('span')
  container.className = 'people-grid-source-tags'
  td.textContent = ''

  values.forEach((value) => {
    const tag = document.createElement('span')
    tag.className = 'people-grid-source-tag'
    tag.textContent = value
    tag.title = SOURCE_TITLE_BY_LABEL[value] ?? value
    container.append(tag)
  })

  td.append(container)
}

const initialColumns = (data: UnifiedPeopleFile): GridColumn[] => {
  const countries = uniqueValues(data.people.map((person) => person.location.country))
  const lanes = uniqueValues(data.people.map((person) => person.influence.lane))
  const specialties = uniqueValues(data.people.flatMap((person) => person.specialties))
  const groupOptions = newsletterTargetGroupOptions(data)

  return [
    { key: 'photo', label: 'Photo', kind: 'image', readOnly: true, width: 72 },
    { key: 'name', label: 'Name', kind: 'text', field: 'name', width: 220 },
    { key: 'role', label: 'Role', kind: 'text', field: 'role', width: 210 },
    { key: 'organization', label: 'Organization', kind: 'text', field: 'organization', width: 210 },
    { key: 'market', label: 'Market', kind: 'select', field: 'country', options: countries, width: 165 },
    { key: 'city', label: 'City', kind: 'text', width: 140 },
    { key: 'influence-lane', label: 'Influence lane', kind: 'select', field: 'lane', options: lanes, width: 165 },
    { key: 'fit', label: 'Fit', kind: 'checkbox', field: 'fit', width: 72 },
    { key: 'potential-target', label: 'Potential target', kind: 'checkbox', field: 'potentialTarget', width: 118 },
    { key: 'target', label: 'Target', kind: 'checkbox', field: 'target', width: 82 },
    { key: 'group', label: 'Group', kind: 'select', field: 'group', groupOptions, options: groupOptions.map((option) => option.label), width: 180 },
    { key: 'priority', label: 'Priority', kind: 'checkbox', field: 'priority', width: 82 },
    { key: 'middle-eastern', label: 'Middle Eastern', kind: 'checkbox', field: 'middleEastern', width: 118 },
    { key: 'linkedin', label: 'LinkedIn', kind: 'text', field: 'linkedinUrl', width: 245 },
    { key: 'followers', label: 'Followers', kind: 'number', field: 'followers', width: 115 },
    { key: 'specialties', label: 'Specialties', kind: 'multiselect', options: specialties, width: 260 },
    { key: 'biography', label: 'Biography', kind: 'text', field: 'biography', width: 360 },
    { key: 'sources', label: 'Sources', kind: 'multiselect', options: Object.values(SOURCE_LABELS), readOnly: true, className: 'people-grid-sources-cell', renderer: sourceTagsRenderer, width: 250 },
    { key: 'events', label: 'Events', kind: 'number', readOnly: true, width: 82 },
    { key: 'sessions', label: 'Sessions', kind: 'number', readOnly: true, width: 88 },
    { key: 'observed', label: 'Observed', kind: 'date', readOnly: true, width: 130 },
    { key: 'record-id', label: 'Record ID', kind: 'text', readOnly: true, width: 285 },
  ]
}

const gridRow = (person: UnifiedPerson, groupOptions: NewsletterTargetGroupOption[]) => {
  const linkedIn = linkedInProfile(person)
  const group = person.group ? groupOptions.find((option) => option.value === person.group) : null
  return [
    {
      alt: person.image.alt ?? '',
      name: person.name.display,
      url: person.image.url ?? '',
    } satisfies PersonImageCell,
    person.name.display,
    person.current_role.title ?? '',
    person.current_role.organization ?? '',
    person.location.country ?? '',
    person.location.city ?? '',
    person.influence.lane ?? '',
    person.influence.fit,
    person.influence.potential_target,
    person.influence.target,
    group?.label ?? person.group ?? '',
    Boolean(person.influence.priority),
    Boolean(person.influence.middle_eastern.value),
    linkedIn?.url ?? '',
    linkedIn?.followers?.count ?? null,
    person.specialties,
    person.biography ?? '',
    person.source_ids.map((sourceId) => SOURCE_LABELS[sourceId]),
    person.event_appearances.length,
    sessionCount(person),
    latestObservedDate(person),
    person.id,
  ]
}

const cellProperties = (column: GridColumn | undefined) => {
  if (!column) return { type: 'text' }

  const shared = {
    className: [column.readOnly ? 'people-grid-readonly' : '', column.className ?? ''].filter(Boolean).join(' ') || undefined,
    readOnly: column.readOnly,
  }
  if (column.kind === 'image') return {
    ...shared,
    className: 'people-grid-readonly people-grid-image-cell',
    renderer: personImageRenderer,
  }
  if (column.kind === 'number') return {
    ...shared,
    type: 'numeric',
    numericFormat: { maximumFractionDigits: 0 },
  }
  if (column.kind === 'checkbox') return { ...shared, type: 'checkbox' }
  if (column.kind === 'date') return {
    ...shared,
    type: 'intl-date',
    allowInvalid: false,
    dateFormat: { day: '2-digit', month: 'short', year: 'numeric' },
    locale: 'en-GB',
  }
  if (column.field === 'group') return {
    ...shared,
    type: 'autocomplete',
    editor: GroupAutocompleteEditor,
    source: (query: unknown, process: (choices: unknown[]) => void) => {
      const options = column.groupOptions ?? []
      if (isCreateGroupChoice(query)) {
        process([query])
        return
      }
      const term = typeof query === 'string' ? query.trim() : String(query ?? '').trim()
      if (!term) {
        process(options.map((option) => option.label))
        return
      }
      const normalizedTerm = term.toLocaleLowerCase()
      const matches = options
        .map((option) => option.label)
        .filter((label) => label.toLocaleLowerCase().includes(normalizedTerm))
      process(matches.length ? matches : [createGroupChoice(term)])
    },
    filter: true,
    strict: true,
    trimDropdown: false,
    visibleRows: 8,
  }
  if (column.kind === 'select') return {
    ...shared,
    type: 'dropdown',
    source: column.options ?? ['Option 1', 'Option 2', 'Option 3'],
    strict: false,
    trimDropdown: false,
  }
  if (column.kind === 'multiselect') return {
    ...shared,
    type: 'multiselect',
    source: column.options ?? ['Option 1', 'Option 2', 'Option 3'],
    searchInput: true,
    visibleRows: 9,
    ...(column.renderer ? { renderer: column.renderer } : {}),
  }
  return { ...shared, type: 'text' }
}

const saveValue = (column: GridColumn, value: unknown) => {
  if (column.kind === 'checkbox') return Boolean(value)
  if (column.kind === 'number') return value === '' || value === null ? null : Number(value)
  if (column.field === 'group') {
    const option = column.groupOptions?.find((candidate) => candidate.label === value)
    if (!option && value !== '') throw new Error('Choose an existing group or create a new one.')
    return option?.value ?? ''
  }
  return typeof value === 'string' ? value : String(value ?? '')
}

const previewText = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'No content'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.join('\n') : 'No content'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export function PeopleNotionTable() {
  const hotTableRef = useRef<HotTableRef>(null)
  const columnsRef = useRef<GridColumn[]>([])
  const rowIdsRef = useRef<Array<string | null>>([])
  const pendingPropertyRef = useRef<GridColumn | null>(null)
  const cellPreviewTimerRef = useRef<number | null>(null)
  const viewRestoreTimerRef = useRef<number | null>(null)
  const restoringViewStateRef = useRef(false)
  const [data, setData] = useState<unknown[][] | null>(null)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [savingCount, setSavingCount] = useState(0)
  const [propertyName, setPropertyName] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyKind>('text')
  const [initialLayout, setInitialLayout] = useState<GridLayout | null>(null)
  const [cellPreview, setCellPreview] = useState<CellPreview | null>(null)

  useEffect(() => {
    const previousTitle = document.title
    const controller = new AbortController()
    document.title = 'People · Notion-style table · EIGN Data Workspace'
    fetch(unifiedPeopleUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`The unified people file returned ${response.status}.`)
        return response.json() as Promise<UnifiedPeopleFile>
      })
      .then((file) => {
        const groupOptions = newsletterTargetGroupOptions(file)
        columnsRef.current = initialColumns(file)
        rowIdsRef.current = file.people.map((person) => person.id)
        setInitialLayout(loadGridLayout(file.people.length))
        setData(file.people.map((person) => gridRow(person, groupOptions)))
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Unable to load the unified people file.')
      })
    return () => {
      controller.abort()
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCellPreview(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (cellPreviewTimerRef.current !== null) window.clearTimeout(cellPreviewTimerRef.current)
      if (viewRestoreTimerRef.current !== null) window.clearTimeout(viewRestoreTimerRef.current)
    }
  }, [])

  const addProperty = () => {
    const hot = hotTableRef.current?.hotInstance
    if (!hot) return
    const typeLabel = PROPERTY_TYPES.find((type) => type.value === propertyType)?.label ?? 'Text'
    pendingPropertyRef.current = {
      key: temporaryColumnKey(),
      label: propertyName.trim() || `New ${typeLabel.toLocaleLowerCase()} property`,
      kind: propertyType,
      options: propertyType === 'select' || propertyType === 'multiselect'
        ? ['Option 1', 'Option 2', 'Option 3']
        : undefined,
      width: propertyType === 'checkbox' ? 110 : 180,
    }
    hot.alter('insert_col_end', undefined, 1, 'typed-property')
    setPropertyName('')
  }

  const afterCreateColumn = (visualIndex: number, amount: number) => {
    const hot = hotTableRef.current?.hotInstance
    if (!hot) return
    const physicalIndex = hot.toPhysicalColumn(visualIndex)
    if (physicalIndex === null) return
    const requested = pendingPropertyRef.current
    const additions = Array.from({ length: amount }, (_, offset): GridColumn => requested && offset === 0
      ? requested
      : { key: temporaryColumnKey(), label: `New property ${columnsRef.current.length + offset + 1}`, kind: 'text', width: 180 })
    columnsRef.current.splice(physicalIndex, 0, ...additions)
    pendingPropertyRef.current = null
    hot.render()
  }

  const saveGridLayout = () => {
    const hot = hotTableRef.current?.hotInstance
    if (!hot || hot.countCols() !== DEFAULT_COLUMN_WIDTHS.length || hot.countRows() !== rowIdsRef.current.length) return
    const columnOrder = Array.from({ length: hot.countCols() }, (_, visualIndex) => hot.toPhysicalColumn(visualIndex))
    const rowOrder = Array.from({ length: hot.countRows() }, (_, visualIndex) => hot.toPhysicalRow(visualIndex))
    if (columnOrder.some((index) => index === null) || rowOrder.some((index) => index === null)) return
    const nextLayout: GridLayout = {
      columnOrder: columnOrder as number[],
      columnWidths: Array.from({ length: hot.countCols() }, (_, visualIndex) => hot.getColWidth(visualIndex)),
      rowOrder: rowOrder as number[],
    }
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(nextLayout))
    } catch {
      // Handsontable interactions remain available for the current session.
    }
  }

  const captureGridViewState = (): GridViewState => {
    const hot = hotTableRef.current?.hotInstance
    if (!hot) return { filters: [], hiddenColumns: [], hiddenRows: [], sort: null }

    const filters = hot.getPlugin('filters').exportConditions().flatMap((entry): GridFilterState[] => {
      const column = columnsRef.current[entry.column]
      if (!column || !entry.conditions.length || !FILTER_OPERATIONS.has(entry.operation)) return []
      return [{
        column: column.key,
        conditions: entry.conditions.map((condition) => ({ name: condition.name, args: condition.args })),
        operation: entry.operation,
      }]
    })

    const rawSort = hot.getPlugin('columnSorting').getSortConfig()
    const sortConfig = Array.isArray(rawSort) ? rawSort[0] : rawSort
    const sortPhysicalColumn = sortConfig ? hot.toPhysicalColumn(sortConfig.column) : null
    const sortColumn = sortPhysicalColumn === null ? undefined : columnsRef.current[sortPhysicalColumn]

    const hiddenColumns = hot.getPlugin('hiddenColumns').getHiddenColumns().flatMap((visualColumn) => {
      const physicalColumn = hot.toPhysicalColumn(visualColumn)
      const column = physicalColumn === null ? undefined : columnsRef.current[physicalColumn]
      return column ? [column.key] : []
    })
    const hiddenRows = hot.getPlugin('hiddenRows').getHiddenRows().flatMap((visualRow) => {
      const physicalRow = hot.toPhysicalRow(visualRow)
      const rowId = physicalRow === null ? null : rowIdsRef.current[physicalRow]
      return rowId ? [rowId] : []
    })

    return {
      filters,
      hiddenColumns,
      hiddenRows,
      sort: sortConfig && sortColumn && (sortConfig.sortOrder === 'asc' || sortConfig.sortOrder === 'desc')
        ? { column: sortColumn.key, sortOrder: sortConfig.sortOrder }
        : null,
    }
  }

  const syncGridViewStateToUrl = () => {
    if (restoringViewStateRef.current) return
    writeGridViewState(captureGridViewState())
  }

  const restoreGridViewStateFromUrl = () => {
    const hot = hotTableRef.current?.hotInstance
    if (!hot) return
    const state = readGridViewState()
    const physicalColumnByKey = new Map(columnsRef.current.map((column, index) => [column.key, index]))
    const physicalRowById = new Map(rowIdsRef.current.flatMap((rowId, index) => rowId ? [[rowId, index] as const] : []))
    const filtersPlugin = hot.getPlugin('filters')
    const sortingPlugin = hot.getPlugin('columnSorting')
    const hiddenColumnsPlugin = hot.getPlugin('hiddenColumns')
    const hiddenRowsPlugin = hot.getPlugin('hiddenRows')

    restoringViewStateRef.current = true
    try {
      const currentlyHiddenColumns = hiddenColumnsPlugin.getHiddenColumns()
      if (currentlyHiddenColumns.length) hiddenColumnsPlugin.showColumns(currentlyHiddenColumns)
      const columnsToHide = state.hiddenColumns.flatMap((key) => {
        const physicalColumn = physicalColumnByKey.get(key)
        if (physicalColumn === undefined) return []
        const visualColumn = hot.toVisualColumn(physicalColumn)
        return visualColumn === null ? [] : [visualColumn]
      })
      if (columnsToHide.length) hiddenColumnsPlugin.hideColumns(columnsToHide)

      const currentlyHiddenRows = hiddenRowsPlugin.getHiddenRows()
      if (currentlyHiddenRows.length) hiddenRowsPlugin.showRows(currentlyHiddenRows)
      const rowsToHide = state.hiddenRows.flatMap((rowId) => {
        const physicalRow = physicalRowById.get(rowId)
        if (physicalRow === undefined) return []
        const visualRow = hot.toVisualRow(physicalRow)
        return visualRow === null ? [] : [visualRow]
      })
      if (rowsToHide.length) hiddenRowsPlugin.hideRows(rowsToHide)

      const restoredFilters = state.filters.flatMap((entry) => {
        const column = physicalColumnByKey.get(entry.column)
        return column === undefined ? [] : [{ ...entry, column }]
      })
      filtersPlugin.clearConditions()
      if (restoredFilters.length) filtersPlugin.importConditions(restoredFilters)
      filtersPlugin.filter()

      const sortPhysicalColumn = state.sort ? physicalColumnByKey.get(state.sort.column) : undefined
      const sortVisualColumn = sortPhysicalColumn === undefined ? null : hot.toVisualColumn(sortPhysicalColumn)
      if (state.sort && sortVisualColumn !== null) {
        sortingPlugin.sort({ column: sortVisualColumn, sortOrder: state.sort.sortOrder })
      } else {
        sortingPlugin.clearSort()
      }
      hot.render()
    } catch {
      filtersPlugin.clearConditions()
      filtersPlugin.filter()
      sortingPlugin.clearSort()
      const hiddenColumns = hiddenColumnsPlugin.getHiddenColumns()
      if (hiddenColumns.length) hiddenColumnsPlugin.showColumns(hiddenColumns)
      const hiddenRows = hiddenRowsPlugin.getHiddenRows()
      if (hiddenRows.length) hiddenRowsPlugin.showRows(hiddenRows)
      hot.render()
    } finally {
      restoringViewStateRef.current = false
      writeGridViewState(captureGridViewState())
    }
  }

  useEffect(() => {
    const restoreFromHistory = () => restoreGridViewStateFromUrl()
    window.addEventListener('popstate', restoreFromHistory)
    return () => window.removeEventListener('popstate', restoreFromHistory)
  }, [])

  const afterRemoveColumn = (_visualIndex: number, _amount: number, physicalColumns: number[]) => {
    physicalColumns
      .slice()
      .sort((left, right) => right - left)
      .forEach((physicalIndex) => columnsRef.current.splice(physicalIndex, 1))
  }

  const afterCreateRow = (visualIndex: number, amount: number) => {
    const hot = hotTableRef.current?.hotInstance
    if (!hot) return
    const physicalIndex = hot.toPhysicalRow(visualIndex)
    if (physicalIndex === null) return
    rowIdsRef.current.splice(physicalIndex, 0, ...Array.from({ length: amount }, () => null))
  }

  const afterRemoveRow = (_visualIndex: number, _amount: number, physicalRows: number[]) => {
    physicalRows
      .slice()
      .sort((left, right) => right - left)
      .forEach((physicalIndex) => rowIdsRef.current.splice(physicalIndex, 1))
  }

  const afterChange = (changes: CellChange[] | null, source: ChangeSource) => {
    if (!changes || source === 'loadData' || source === 'DataProvider.revert' || String(source) === 'GroupProvider.resolve') return
    const hot = hotTableRef.current?.hotInstance
    if (!hot) return

    const saves = changes.flatMap(([visualRow, prop, previousValue, nextValue]) => {
      const physicalRow = hot.toPhysicalRow(visualRow)
      if (typeof prop !== 'number') return []
      const physicalColumn = prop
      const personId = physicalRow === null ? null : rowIdsRef.current[physicalRow]
      const column = Number.isInteger(physicalColumn) ? columnsRef.current[physicalColumn] : undefined
      if (!personId || !column?.field || Object.is(previousValue, nextValue)) return []

      return [{ visualRow, prop, previousValue, personId, column, nextValue }]
    })
    if (!saves.length) return

    setSaveError('')
    setSavingCount((current) => current + saves.length)
    saves.forEach(({ visualRow, prop, previousValue, personId, column, nextValue }) => {
      Promise.resolve()
        .then(async () => {
          let storedValue: unknown
          if (column.field === 'group' && isCreateGroupChoice(nextValue)) {
            const createResponse = await fetch('/api/people/groups', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ label: nextValue.label }),
            })
            const createResult = await createResponse.json().catch(() => null) as {
              error?: string
              group?: NewsletterTargetGroupOption
            } | null
            if (!createResponse.ok || !createResult?.group) {
              throw new Error(createResult?.error || `The data service returned ${createResponse.status}.`)
            }
            const currentOptions = column.groupOptions ?? []
            if (!currentOptions.some((option) => option.value === createResult.group!.value)) {
              column.groupOptions = [...currentOptions, createResult.group]
              column.options = column.groupOptions.map((option) => option.label)
            }
            storedValue = createResult.group.value
            hot.setDataAtRowProp(visualRow, prop, createResult.group.label, 'GroupProvider.resolve')
            hot.render()
          } else {
            storedValue = saveValue(column, nextValue)
          }

          const response = await fetch(`/api/people/${encodeURIComponent(personId)}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ field: column.field, value: storedValue }),
          })
          const result = await response.json().catch(() => null) as { error?: string } | null
          if (!response.ok) throw new Error(result?.error || `The data service returned ${response.status}.`)
        })
        .catch((reason) => {
          hot.setDataAtRowProp(visualRow, prop, previousValue, 'DataProvider.revert')
          setSaveError(reason instanceof Error ? reason.message : 'The cell could not be saved.')
        })
        .finally(() => setSavingCount((current) => Math.max(0, current - 1)))
    })
  }

  const openCellPreview = (visualRow: number, visualColumn: number) => {
    const hot = hotTableRef.current?.hotInstance
    if (!hot || visualRow < 0 || visualColumn < 0) return
    const physicalRow = hot.toPhysicalRow(visualRow)
    const physicalColumn = hot.toPhysicalColumn(visualColumn)
    if (physicalRow === null || physicalColumn === null) return
    const column = columnsRef.current[physicalColumn]
    if (!column) return
    setCellPreview({
      column,
      personName: String(data?.[physicalRow]?.[1] ?? `Row ${visualRow + 1}`),
      value: data?.[physicalRow]?.[physicalColumn],
    })
  }

  return (
    <div className="app-shell people-notion-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Handsontable evaluation view</span></div>
        <WorkspaceNav active="in-progress" />
      </header>

      <main className="people-notion-main">
        <section className="people-notion-controls" aria-label="Table controls">
          <div className="people-notion-add-property">
            <input
              aria-label="New property name"
              placeholder="Property name"
              value={propertyName}
              onChange={(event) => setPropertyName(event.target.value)}
            />
            <select aria-label="New property type" value={propertyType} onChange={(event) => setPropertyType(event.target.value as PropertyKind)}>
              {PROPERTY_TYPES.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
            </select>
            <button type="button" disabled={!data} onClick={addProperty}>+ Add property</button>
          </div>
          <div className="people-notion-status" aria-live="polite">
            {savingCount > 0 ? `Saving ${savingCount} ${savingCount === 1 ? 'cell' : 'cells'}…` : 'Source-backed cells save automatically'}
          </div>
        </section>

        <div className="people-notion-guide">
          <span>Drag row and column headers to move</span>
          <span>Click a cell to preview its full content</span>
          <span>Double-click a cell to edit its type</span>
          <span>Use header menus to sort and filter</span>
          <span>Right-click to add, hide, reveal, or delete</span>
        </div>

        <aside className="people-notion-license" role="note">
          Evaluation view: Handsontable’s free key is for non-commercial/hobby use or limited commercial evaluation. Source-backed field edits persist; added properties and structural row/column changes are exploratory in this page.
        </aside>

        {error && <div className="software-error" role="alert">{error}</div>}
        {saveError && <div className="software-error" role="alert">Cell was restored because it could not be saved: {saveError}</div>}

        {!data && !error && <div className="people-notion-loading"><span className="loading-spinner" /> Loading unified people…</div>}
        {data && (
          <section className="people-notion-grid" aria-label="Notion-style people table">
            <HotTable
              ref={hotTableRef}
              id="eign-people-notion-grid-v2"
              data={data}
              themeName="ht-theme-main"
              width="100%"
              height="calc(100vh - 328px)"
              rowHeaders={true}
              colHeaders={(physicalColumn) => {
                return columnsRef.current[physicalColumn]?.label ?? `Property ${physicalColumn + 1}`
              }}
              cells={(_physicalRow, physicalColumn) => cellProperties(columnsRef.current[physicalColumn])}
              colWidths={DEFAULT_COLUMN_WIDTHS}
              manualColumnMove={true}
              manualRowMove={true}
              rowHeights={30}
              autoRowSize={false}
              wordWrap={false}
              textEllipsis={true}
              stretchH="last"
              navigableHeaders={true}
              tabNavigation={true}
              autoWrapRow={true}
              autoWrapCol={true}
              manualRowResize={false}
              manualColumnResize={true}
              columnSorting={true}
              filters={true}
              dropdownMenu={true}
              contextMenu={true}
              hiddenColumns={{ indicators: true }}
              hiddenRows={{ indicators: true }}
              search={true}
              undo={true}
              viewportRowRenderingOffset={30}
              licenseKey="non-commercial-and-evaluation"
              afterInit={() => {
                if (viewRestoreTimerRef.current !== null) window.clearTimeout(viewRestoreTimerRef.current)
                viewRestoreTimerRef.current = window.setTimeout(() => {
                  viewRestoreTimerRef.current = null
                  const hot = hotTableRef.current?.hotInstance
                  if (hot && initialLayout) {
                    hot.columnIndexMapper.setIndexesSequence(initialLayout.columnOrder)
                    hot.rowIndexMapper.setIndexesSequence(initialLayout.rowOrder)
                    const resizePlugin = hot.getPlugin('manualColumnResize')
                    initialLayout.columnWidths.forEach((width, visualColumn) => {
                      resizePlugin.setManualSize(visualColumn, width)
                    })
                    hot.render()
                  }
                  restoreGridViewStateFromUrl()
                }, 0)
              }}
              afterChange={afterChange}
              afterColumnSort={syncGridViewStateToUrl}
              afterFilter={syncGridViewStateToUrl}
              afterHideColumns={(_current, _destination, _possible, stateChanged) => {
                if (stateChanged) syncGridViewStateToUrl()
              }}
              afterUnhideColumns={(_current, _destination, _possible, stateChanged) => {
                if (stateChanged) syncGridViewStateToUrl()
              }}
              afterHideRows={(_current, _destination, _possible, stateChanged) => {
                if (stateChanged) syncGridViewStateToUrl()
              }}
              afterUnhideRows={(_current, _destination, _possible, stateChanged) => {
                if (stateChanged) syncGridViewStateToUrl()
              }}
              afterOnCellMouseDown={(event, coords) => {
                const { row, col } = coords
                if (row === null || col === null || row < 0 || col < 0 || event.button !== 0) return
                if (cellPreviewTimerRef.current !== null) window.clearTimeout(cellPreviewTimerRef.current)
                if (event.detail > 1) return
                cellPreviewTimerRef.current = window.setTimeout(() => {
                  openCellPreview(row, col)
                  cellPreviewTimerRef.current = null
                }, 300)
              }}
              afterCreateCol={afterCreateColumn}
              afterRemoveCol={afterRemoveColumn}
              afterCreateRow={afterCreateRow}
              afterRemoveRow={afterRemoveRow}
              afterColumnResize={saveGridLayout}
              afterColumnMove={(_movedColumns, _finalIndex, _dropIndex, _movePossible, orderChanged) => {
                if (orderChanged) saveGridLayout()
              }}
              afterRowMove={(_movedRows, _finalIndex, _dropIndex, _movePossible, orderChanged) => {
                if (orderChanged) saveGridLayout()
              }}
            />
          </section>
        )}

        {cellPreview && (
          <div
            className="people-cell-preview-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setCellPreview(null)
            }}
          >
            <section
              aria-labelledby="people-cell-preview-title"
              aria-modal="true"
              className="people-cell-preview"
              role="dialog"
            >
              <header className="people-cell-preview__header">
                <div>
                  <span>{cellPreview.personName}</span>
                  <h2 id="people-cell-preview-title">{cellPreview.column.label}</h2>
                </div>
                <button aria-label="Close content preview" onClick={() => setCellPreview(null)} type="button">×</button>
              </header>
              <div className="people-cell-preview__content">
                {cellPreview.column.kind === 'image' && typeof cellPreview.value === 'object' && cellPreview.value !== null
                  ? (() => {
                      const image = cellPreview.value as PersonImageCell
                      return image.url
                        ? <img alt={image.alt || `Photo of ${image.name}`} src={image.url} />
                        : <span className="people-cell-preview__empty">No image</span>
                    })()
                  : <pre>{previewText(cellPreview.value)}</pre>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
