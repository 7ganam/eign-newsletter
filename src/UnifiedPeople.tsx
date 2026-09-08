import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react'
import unifiedPeopleUrl from '../assets/people/unified-people.json?url'
import { InlineEdit } from './editableCells'
import { DEFAULT_NEWSLETTER_TARGET_GROUP_OPTIONS, newsletterTargetGroupOptions } from './newsletterTargetGroups'
import { ColumnResizeHandle, useResizableColumns } from './resizableColumns'
import { ArchiveToolbar, RowSelectionCell, RowSelectionHeader, useRowArchive } from './rowArchive'
import { usePersistedSort } from './tablePreferences'
import type { NewsletterTargetGroupOption, UnifiedPeopleFile, UnifiedPeopleSourceId, UnifiedPerson } from './unifiedPeopleTypes'
import { WorkspaceNav } from './WorkspaceNav'

type PeopleColumn = 'person' | 'role' | 'organization' | 'founder' | 'market' | 'lane' | 'fit' | 'potential-target' | 'target' | 'group' | 'linkedin' | 'followers' | 'profile' | 'events' | 'signals' | 'sources'
type ColumnDrop = { column: PeopleColumn; position: 'before' | 'after' }
type SourceFilter = UnifiedPeopleSourceId | 'multi-source'
type CoverageFilter = 'all' | 'linkedin' | 'no-linkedin' | 'followers' | 'biography' | 'sessions'
type SignalFilter = 'any' | 'fit' | 'potential-target' | 'target' | 'priority' | 'middle-eastern' | 'none'
type PeopleSignalField = 'fit' | 'potentialTarget' | 'priority' | 'middleEastern' | 'target'
type PeopleEditableField = 'name' | 'role' | 'organization' | 'country' | 'lane' | 'group' | 'linkedinUrl' | 'followers' | 'biography' | PeopleSignalField
type PeopleFilters = {
  query: string
  sources: SourceFilter[]
  market: string
  coverage: CoverageFilter
  signals: SignalFilter[]
}

const LOAD_BATCH_SIZE = 100
const COLUMN_ORDER_STORAGE_KEY = 'eign-unified-people.column-order.v1'
const ROW_SORT_STORAGE_KEY = 'eign-unified-people.row-sort.v1'
const SOURCE_LABELS: Record<UnifiedPeopleSourceId, string> = {
  'leap-2026': 'LEAP 2026',
  'riseup-2026': 'RiseUp 2026',
  'web-search': 'influncer',
  'middle-east-vc-people': 'Middle East VC people',
  'middle-east-founders': 'Middle East founders',
  'juhani-like-accounts': 'Juhani-like accounts',
  'saudi-software-leads': 'Saudi software leads',
}
const SOURCE_SHORT_LABELS: Record<UnifiedPeopleSourceId, string> = {
  'leap-2026': 'LEAP',
  'riseup-2026': 'RU26',
  'web-search': 'INFLUNCER',
  'middle-east-vc-people': 'VC',
  'middle-east-founders': 'FNDR',
  'juhani-like-accounts': 'JUHANI',
  'saudi-software-leads': 'LEAD',
}

const COLUMNS: Array<{ key: PeopleColumn; label: string; width: number }> = [
  { key: 'person', label: 'Person', width: 270 },
  { key: 'role', label: 'Role', width: 220 },
  { key: 'organization', label: 'Organization', width: 230 },
  { key: 'founder', label: 'Founder index', width: 410 },
  { key: 'market', label: 'Market', width: 175 },
  { key: 'lane', label: 'Influence lane', width: 160 },
  { key: 'fit', label: 'Fit', width: 85 },
  { key: 'potential-target', label: 'Potential target', width: 125 },
  { key: 'target', label: 'Target', width: 88 },
  { key: 'group', label: 'Group', width: 220 },
  { key: 'linkedin', label: 'LinkedIn', width: 165 },
  { key: 'followers', label: 'LinkedIn followers', width: 165 },
  { key: 'profile', label: 'Profile notes', width: 330 },
  { key: 'events', label: 'Event appearances', width: 270 },
  { key: 'signals', label: 'Signals', width: 230 },
  { key: 'sources', label: 'Sources', width: 190 },
]
const COLUMNS_BY_KEY = new Map(COLUMNS.map((column) => [column.key, column]))
const COLUMN_KEYS = COLUMNS.map((column) => column.key)
const COLUMN_WIDTHS = Object.fromEntries(COLUMNS.map((column) => [column.key, column.width])) as Record<PeopleColumn, number>
const DEFAULT_SORT = { field: 'person', direction: 'asc' } as const
const SOURCE_FILTERS = new Set<SourceFilter>(['multi-source', 'leap-2026', 'riseup-2026', 'web-search', 'middle-east-vc-people', 'middle-east-founders', 'juhani-like-accounts', 'saudi-software-leads'])
const SOURCE_FILTER_OPTIONS: Array<{ label: string; value: SourceFilter }> = [
  { value: 'leap-2026', label: SOURCE_LABELS['leap-2026'] },
  { value: 'riseup-2026', label: SOURCE_LABELS['riseup-2026'] },
  { value: 'web-search', label: SOURCE_LABELS['web-search'] },
  { value: 'middle-east-vc-people', label: SOURCE_LABELS['middle-east-vc-people'] },
  { value: 'middle-east-founders', label: SOURCE_LABELS['middle-east-founders'] },
  { value: 'juhani-like-accounts', label: SOURCE_LABELS['juhani-like-accounts'] },
  { value: 'saudi-software-leads', label: SOURCE_LABELS['saudi-software-leads'] },
  { value: 'multi-source', label: 'Has multiple sources' },
]
const COVERAGE_FILTERS = new Set<CoverageFilter>(['all', 'linkedin', 'no-linkedin', 'followers', 'biography', 'sessions'])
const SIGNAL_FILTERS = new Set<SignalFilter>(['any', 'fit', 'potential-target', 'target', 'priority', 'middle-eastern', 'none'])
const SIGNAL_FILTER_OPTIONS: Array<{ label: string; value: SignalFilter }> = [
  { value: 'any', label: 'Has any signal' },
  { value: 'fit', label: 'Fit' },
  { value: 'potential-target', label: 'Potential target' },
  { value: 'target', label: 'Target' },
  { value: 'priority', label: 'Priority' },
  { value: 'middle-eastern', label: 'Middle Eastern' },
  { value: 'none', label: 'No signals' },
]
const filterValue = <Value extends string>(value: string | null, allowed: Set<Value>, fallback: Value) =>
  value !== null && allowed.has(value as Value) ? value as Value : fallback

const readSourceFilters = (params: URLSearchParams) => [...new Set(
  params.getAll('source')
    .flatMap((value) => value.split(','))
    .filter((value): value is SourceFilter => SOURCE_FILTERS.has(value as SourceFilter)),
)]

const readSignalFilters = (params: URLSearchParams) => [...new Set(
  params.getAll('signal')
    .flatMap((value) => value.split(','))
    .filter((value): value is SignalFilter => SIGNAL_FILTERS.has(value as SignalFilter)),
)]

const readPeopleFilters = (): PeopleFilters => {
  if (typeof window === 'undefined') return { query: '', sources: [], market: 'all', coverage: 'all', signals: [] }
  const params = new URLSearchParams(window.location.search)
  return {
    query: params.get('q') ?? '',
    sources: readSourceFilters(params),
    market: params.get('market') || 'all',
    coverage: filterValue(params.get('coverage'), COVERAGE_FILTERS, 'all'),
    signals: readSignalFilters(params),
  }
}

const writePeopleFilters = ({ query, sources, market, coverage, signals }: PeopleFilters) => {
  const url = new URL(window.location.href)
  const setOrDelete = (key: string, value: string, defaultValue: string) => {
    if (value === defaultValue) url.searchParams.delete(key)
    else url.searchParams.set(key, value)
  }
  setOrDelete('q', query, '')
  url.searchParams.delete('source')
  if (sources.length > 0) url.searchParams.set('source', sources.join(','))
  setOrDelete('market', market, 'all')
  setOrDelete('coverage', coverage, 'all')
  url.searchParams.delete('signal')
  if (signals.length > 0) url.searchParams.set('signal', signals.join(','))

  const nextUrl = `${url.pathname}${url.search}${url.hash}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (nextUrl !== currentUrl) window.history.replaceState(window.history.state, '', nextUrl)
}

const isPeopleColumn = (value: unknown): value is PeopleColumn =>
  typeof value === 'string' && COLUMNS_BY_KEY.has(value as PeopleColumn)

const restoreColumnOrder = () => {
  try {
    const savedOrder = JSON.parse(localStorage.getItem(COLUMN_ORDER_STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(savedOrder)) return COLUMN_KEYS
    const seen = new Set<PeopleColumn>()
    const restored = savedOrder.flatMap((column) => {
      if (!isPeopleColumn(column) || seen.has(column)) return []
      seen.add(column)
      return [column]
    })
    if (restored.length > 0 && !seen.has('founder')) {
      const organizationIndex = restored.indexOf('organization')
      restored.splice(organizationIndex >= 0 ? organizationIndex + 1 : restored.length, 0, 'founder')
      seen.add('founder')
    }
    if (restored.length > 0 && !seen.has('potential-target')) {
      const targetIndex = restored.indexOf('target')
      const fitIndex = restored.indexOf('fit')
      const insertIndex = targetIndex >= 0 ? targetIndex : fitIndex >= 0 ? fitIndex + 1 : restored.length
      restored.splice(insertIndex, 0, 'potential-target')
      seen.add('potential-target')
    }
    if (restored.length > 0 && !seen.has('group')) {
      const targetIndex = restored.indexOf('target')
      restored.splice(targetIndex >= 0 ? targetIndex + 1 : restored.length, 0, 'group')
      seen.add('group')
    }
    return [...restored, ...COLUMN_KEYS.filter((column) => !seen.has(column))]
  } catch {
    return COLUMN_KEYS
  }
}

const saveColumnOrder = (columns: PeopleColumn[]) => {
  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columns))
  } catch {
    // Column reordering remains available for the current session.
  }
}

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toLocaleUpperCase()

const formatDate = (value: string) => new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value))

const formatFollowers = (value: number) => new Intl.NumberFormat('en').format(value)

const linkedinProfile = (person: UnifiedPerson) => person.profiles.find(
  (profile) => profile.platform === 'linkedin' && profile.followers?.count != null,
) ?? person.profiles.find((profile) => profile.platform === 'linkedin')
const followerCount = (person: UnifiedPerson) => linkedinProfile(person)?.followers?.count ?? null
const sessionCount = (person: UnifiedPerson) => person.event_appearances.reduce((total, appearance) => total + appearance.sessions.length, 0)
const locationLabel = (person: UnifiedPerson) => [person.location.city, person.location.country].filter(Boolean).join(', ')

const sortValue = (person: UnifiedPerson, column: PeopleColumn): string | number => {
  if (column === 'person') return person.name.display
  if (column === 'role') return person.current_role.title ?? ''
  if (column === 'organization') return person.current_role.organization ?? ''
  if (column === 'founder') return person.founder ? `${person.founder.tier}-${String(person.founder.editorial_order).padStart(4, '0')}` : ''
  if (column === 'market') return locationLabel(person)
  if (column === 'lane') return person.influence.lane ?? ''
  if (column === 'fit') return Number(person.influence.fit)
  if (column === 'potential-target') return Number(person.influence.potential_target)
  if (column === 'target') return Number(Boolean(person.influence.target))
  if (column === 'group') return person.group ?? ''
  if (column === 'linkedin') return linkedinProfile(person)?.url ?? ''
  if (column === 'followers') return followerCount(person) ?? -1
  if (column === 'profile') return person.biography ?? person.specialties.join(' ')
  if (column === 'events') return person.event_appearances.length * 10_000 + sessionCount(person)
  if (column === 'signals') return Number(person.influence.priority) * 2 + Number(person.influence.middle_eastern.value)
  return person.source_ids.length
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.5 12.5 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function PersonAvatar({ person }: { person: UnifiedPerson }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [person.image.url])
  const linkedIn = linkedinProfile(person)

  const avatar = (
    <span className="riseup-speaker-avatar unified-person-avatar" aria-hidden="true">
      {person.image.url && !failed
        ? <img src={person.image.url} alt="" loading="lazy" onError={() => setFailed(true)} />
        : initials(person.name.display)}
    </span>
  )

  if (!linkedIn) return avatar

  return (
    <a
      aria-label={`Open ${person.name.display} on LinkedIn`}
      className="unified-person-avatar-link"
      href={linkedIn.url}
      rel="noreferrer"
      target="_blank"
      title={`Open ${person.name.display} on LinkedIn`}
    >
      {avatar}
    </a>
  )
}

function SourceBadges({ sourceIds }: { sourceIds: UnifiedPeopleSourceId[] }) {
  return (
    <span className="unified-source-badges">
      {sourceIds.map((sourceId) => (
        <span className={`unified-source-badge source-${sourceId}`} key={sourceId} title={SOURCE_LABELS[sourceId]}>
          {SOURCE_SHORT_LABELS[sourceId]}
        </span>
      ))}
    </span>
  )
}

function useCloseDetailsOnOutsidePointerDown() {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const details = detailsRef.current
      if (!details?.open) return
      if (event.target instanceof Node && !details.contains(event.target)) details.open = false
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
  }, [])

  return detailsRef
}

function SourceMultiSelect({
  onChange,
  value,
}: {
  onChange: (value: SourceFilter[]) => void
  value: SourceFilter[]
}) {
  const detailsRef = useCloseDetailsOnOutsidePointerDown()
  const selectionLabel = value.length === 0
    ? 'All sources'
    : value.length === 1
      ? SOURCE_FILTER_OPTIONS.find((option) => option.value === value[0])?.label ?? value[0]
      : `${value.length} selected`

  const toggleSource = (source: SourceFilter) => {
    const selected = new Set(value)
    if (selected.has(source)) selected.delete(source)
    else selected.add(source)
    onChange(SOURCE_FILTER_OPTIONS.flatMap((option) => selected.has(option.value) ? [option.value] : []))
  }

  return (
    <details className="unified-source-filter" ref={detailsRef}>
      <summary aria-label={`Sources: ${selectionLabel}`}>
        <span>{selectionLabel}</span>
        {value.length > 1 && <b>OR</b>}
      </summary>
      <div className="unified-source-filter__menu">
        <header><strong>Sources</strong><span>Match any selected (OR)</span></header>
        <button className={value.length === 0 ? 'is-active' : ''} type="button" onClick={() => onChange([])}>All sources</button>
        {SOURCE_FILTER_OPTIONS.map((option) => (
          <label key={option.value}>
            <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggleSource(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  )
}

function SignalMultiSelect({
  onChange,
  value,
}: {
  onChange: (value: SignalFilter[]) => void
  value: SignalFilter[]
}) {
  const detailsRef = useCloseDetailsOnOutsidePointerDown()
  const selectionLabel = value.length === 0
    ? 'All signals'
    : value.length === 1
      ? SIGNAL_FILTER_OPTIONS.find((option) => option.value === value[0])?.label ?? value[0]
      : `${value.length} selected`

  const toggleSignal = (signal: SignalFilter) => {
    const selected = new Set(value)
    if (selected.has(signal)) selected.delete(signal)
    else selected.add(signal)
    onChange(SIGNAL_FILTER_OPTIONS.flatMap((option) => selected.has(option.value) ? [option.value] : []))
  }

  return (
    <details className="unified-source-filter unified-signal-filter" ref={detailsRef}>
      <summary aria-label={`Signals: ${selectionLabel}`}>
        <span>{selectionLabel}</span>
        {value.length > 1 && <b>OR</b>}
      </summary>
      <div className="unified-source-filter__menu">
        <header><strong>Signals</strong><span>Match any selected (OR)</span></header>
        <button className={value.length === 0 ? 'is-active' : ''} type="button" onClick={() => onChange([])}>All signals</button>
        {SIGNAL_FILTER_OPTIONS.map((option) => (
          <label key={option.value}>
            <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggleSignal(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  )
}

function PersonCell({
  column,
  index,
  onSave,
  onSignalSave,
  person,
  groupOptions,
  savingSignals,
}: {
  column: PeopleColumn
  groupOptions: NewsletterTargetGroupOption[]
  index: number
  onSave: (field: PeopleEditableField, value: unknown) => Promise<void>
  onSignalSave: (field: PeopleSignalField, checked: boolean) => Promise<void>
  person: UnifiedPerson
  savingSignals: Set<string>
}) {
  const linkedIn = linkedinProfile(person)
  const followers = followerCount(person)
  const sessions = sessionCount(person)
  const location = locationLabel(person)

  if (column === 'person') {
    return (
      <td>
        <InlineEdit ariaLabel={`${person.name.display} name`} value={person.name.display} onSave={(value) => onSave('name', value)}>
          <div className="riseup-speaker-person unified-person-cell">
            <PersonAvatar person={person} />
            <span>
              <strong>{person.name.title ? `${person.name.title} ` : ''}{person.name.display}</strong>
              <small>{person.id} · #{String(index + 1).padStart(4, '0')}</small>
            </span>
          </div>
        </InlineEdit>
      </td>
    )
  }

  if (column === 'role') return <td><InlineEdit ariaLabel={`${person.name.display} role`} value={person.current_role.title ?? ''} onSave={(value) => onSave('role', value)}>{person.current_role.title || <span className="unified-empty">—</span>}</InlineEdit></td>

  if (column === 'organization') {
    return <td><InlineEdit ariaLabel={`${person.name.display} organization`} value={person.current_role.organization ?? ''} onSave={(value) => onSave('organization', value)}><strong className="riseup-speaker-organisation unified-organization">{person.current_role.organization || '—'}</strong></InlineEdit></td>
  }

  if (column === 'founder') {
    if (!person.founder) return <td><span className="unified-empty">—</span></td>
    return (
      <td>
        <div className="unified-founder-index">
          <div className="unified-founder-heading">
            <b>T{person.founder.tier}</b>
            <strong>{person.founder.tier_label}</strong>
            {person.founder.target && <em>Potential target ✓</em>}
          </div>
          <span>{person.founder.companies.join(' · ')}</span>
          <small>{person.founder.primary_market} · {person.founder.sector}</small>
          <details>
            <summary>Selection notes</summary>
            <p>{person.founder.why_selected}</p>
            <p><b>Influence:</b> {person.founder.influence_signal}</p>
          </details>
        </div>
      </td>
    )
  }

  if (column === 'market') {
    return (
      <td>
        <InlineEdit ariaLabel={`${person.name.display} country`} value={person.location.country ?? ''} onSave={(value) => onSave('country', value)}>
          {location
            ? <span className="unified-market">{person.location.country_code && <i>{person.location.country_code}</i>}{location}</span>
            : <span className="unified-empty">—</span>}
          {person.location.nationality && <small className="unified-cell-note">Nationality: {person.location.nationality}</small>}
        </InlineEdit>
      </td>
    )
  }

  if (column === 'lane') {
    return <td><InlineEdit ariaLabel={`${person.name.display} influence lane`} value={person.influence.lane ?? ''} onSave={(value) => onSave('lane', value)}>{person.influence.lane ? <div className="riseup-speaker-profile"><span>{person.influence.lane}</span></div> : <span className="unified-empty">—</span>}</InlineEdit></td>
  }

  if (column === 'fit') {
    const fitKey = `${person.id}:fit`
    return (
      <td>
        <div className="influencer-signal-editors unified-fit-editor">
          <label title="Fit"><input aria-label={`${person.name.display}: Fit`} type="checkbox" checked={person.influence.fit} disabled={savingSignals.has(fitKey)} onChange={(event) => void onSignalSave('fit', event.target.checked)} /></label>
        </div>
      </td>
    )
  }

  if (column === 'target') {
    const targetKey = `${person.id}:target`
    return (
      <td>
        <label title="Target">
          <input aria-label={`${person.name.display}: Target`} type="checkbox" checked={Boolean(person.influence.target)} disabled={savingSignals.has(targetKey)} onChange={(event) => void onSignalSave('target', event.target.checked)} />
        </label>
      </td>
    )
  }

  if (column === 'potential-target') {
    const potentialTargetKey = `${person.id}:potentialTarget`
    return (
      <td>
        <label title="Potential target">
          <input aria-label={`${person.name.display}: Potential target`} type="checkbox" checked={person.influence.potential_target} disabled={savingSignals.has(potentialTargetKey)} onChange={(event) => void onSignalSave('potentialTarget', event.target.checked)} />
        </label>
      </td>
    )
  }

  if (column === 'group') {
    const group = person.group ? groupOptions.find((option) => option.value === person.group) ?? null : null
    return (
      <td>
        <InlineEdit
          ariaLabel={`${person.name.display} newsletter group`}
          options={[{ value: '', label: 'Unassigned' }, ...groupOptions.map(({ label, value }) => ({ label, value }))]}
          value={person.group ?? ''}
          onSave={(value) => onSave('group', value)}
        >
          {group
            ? <span className={`unified-group-badge group-${group.value}`} title={group.description}><strong>{group.label}</strong><small>{group.description}</small></span>
            : <span className="unified-empty">Unassigned</span>}
        </InlineEdit>
      </td>
    )
  }

  if (column === 'linkedin') {
    return (
      <td>
        <InlineEdit ariaLabel={`${person.name.display} LinkedIn URL`} inputType="url" value={linkedIn?.url ?? ''} onSave={(value) => onSave('linkedinUrl', value)}>
          {linkedIn
            ? <div className="riseup-linkedin-profile"><a href={linkedIn.url} target="_blank" rel="noreferrer">LinkedIn ↗</a><small>{linkedIn.verification || 'LinkedIn'}</small></div>
            : <span className="riseup-linkedin-unresolved">Unresolved</span>}
        </InlineEdit>
      </td>
    )
  }

  if (column === 'followers') {
    return (
      <td>
        <InlineEdit ariaLabel={`${person.name.display} LinkedIn followers`} inputType="number" value={followers === null ? '' : String(followers)} onSave={(value) => onSave('followers', value.trim() ? Number(value) : null)}>
          {followers === null
            ? <span className="unified-empty">—</span>
            : <span className="unified-follower"><strong>{formatFollowers(followers)}</strong><small>{linkedIn?.followers?.precision ?? 'observed'}</small></span>}
        </InlineEdit>
      </td>
    )
  }

  if (column === 'profile') {
    return (
      <td>
        <InlineEdit ariaLabel={`${person.name.display} biography`} value={person.biography ?? ''} onSave={(value) => onSave('biography', value)}>
          {person.biography || person.specialties.length
            ? <details className="riseup-speaker-details unified-profile-notes"><summary>{person.specialties.join(' · ') || person.biography}</summary>{person.specialties.length > 0 && <strong>{person.specialties.join(' · ')}</strong>}{person.biography && <p>{person.biography}</p>}</details>
            : <span className="unified-empty">—</span>}
        </InlineEdit>
      </td>
    )
  }

  if (column === 'events') {
    return (
      <td>
        {person.event_appearances.length
          ? <div className="unified-events">{person.event_appearances.map((appearance, appearanceIndex) => <span key={`${person.id}-${appearance.event_id}-${appearance.speaker_id ?? appearance.profile_url ?? appearanceIndex}`}><b>{SOURCE_SHORT_LABELS[appearance.event_id]}</b>{appearance.profile_url ? <a href={appearance.profile_url} target="_blank" rel="noreferrer">Profile ↗</a> : <small>{appearance.speaker_id ? `Speaker ${appearance.speaker_id}` : 'Appearance'}</small>}</span>)}{sessions > 0 && <em>{sessions} {sessions === 1 ? 'session' : 'sessions'}</em>}</div>
          : <span className="unified-empty">—</span>}
      </td>
    )
  }

  if (column === 'signals') {
    const priorityKey = `${person.id}:priority`
    const middleEasternKey = `${person.id}:middleEastern`
    return (
      <td>
        <div className="influencer-signal-editors unified-signal-editors">
          <label title="Priority"><input type="checkbox" checked={Boolean(person.influence.priority)} disabled={savingSignals.has(priorityKey)} onChange={(event) => void onSignalSave('priority', event.target.checked)} /><span>Priority</span></label>
          <label title="Middle Eastern"><input type="checkbox" checked={Boolean(person.influence.middle_eastern.value)} disabled={savingSignals.has(middleEasternKey)} onChange={(event) => void onSignalSave('middleEastern', event.target.checked)} /><span>Middle Eastern</span></label>
        </div>
      </td>
    )
  }

  return (
    <td>
      <SourceBadges sourceIds={person.source_ids} />
      <small className="unified-cell-note">{person.source_records.length} source {person.source_records.length === 1 ? 'record' : 'records'}</small>
    </td>
  )
}

export function UnifiedPeople() {
  const [initialFilters] = useState(readPeopleFilters)
  const [data, setData] = useState<UnifiedPeopleFile | null>(null)
  const [error, setError] = useState('')
  const [cellSaveError, setCellSaveError] = useState('')
  const [savingSignals, setSavingSignals] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState(initialFilters.query)
  const [sources, setSources] = useState<SourceFilter[]>(initialFilters.sources)
  const [market, setMarket] = useState(initialFilters.market)
  const [coverage, setCoverage] = useState<CoverageFilter>(initialFilters.coverage)
  const [signals, setSignals] = useState<SignalFilter[]>(initialFilters.signals)
  const [visibleCount, setVisibleCount] = useState(LOAD_BATCH_SIZE)
  const [columnOrder, setColumnOrder] = useState<PeopleColumn[]>(restoreColumnOrder)
  const [draggingColumn, setDraggingColumn] = useState<PeopleColumn | null>(null)
  const [columnDrop, setColumnDrop] = useState<ColumnDrop | null>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const pointerDragCleanup = useRef<(() => void) | null>(null)
  const { setSortDirection, setSortField, sortDirection, sortField } = usePersistedSort<PeopleColumn>(
    ROW_SORT_STORAGE_KEY,
    DEFAULT_SORT,
    COLUMN_KEYS,
  )
  const { getResizeHandleProps, totalWidth, widths } = useResizableColumns({
    defaults: COLUMN_WIDTHS,
    storageKey: 'eign-unified-people.column-widths.v1',
  })
  const groupOptions = data
    ? newsletterTargetGroupOptions(data)
    : DEFAULT_NEWSLETTER_TARGET_GROUP_OPTIONS

  useEffect(() => {
    const previousTitle = document.title
    const controller = new AbortController()
    document.title = 'Unified people · EIGN Data Workspace'
    fetch(unifiedPeopleUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`The unified people file returned ${response.status}.`)
        return response.json() as Promise<UnifiedPeopleFile>
      })
      .then(setData)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Unable to load the unified people file.')
      })
    return () => {
      controller.abort()
      pointerDragCleanup.current?.()
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    writePeopleFilters({ query, sources, market, coverage, signals })
  }, [coverage, market, query, signals, sources])

  useEffect(() => {
    const restoreFiltersFromUrl = () => {
      const filters = readPeopleFilters()
      setQuery(filters.query)
      setSources(filters.sources)
      setMarket(filters.market)
      setCoverage(filters.coverage)
      setSignals(filters.signals)
    }
    window.addEventListener('popstate', restoreFiltersFromUrl)
    return () => window.removeEventListener('popstate', restoreFiltersFromUrl)
  }, [])

  const markets = useMemo(() => [...new Set(
    data?.people.map((person) => person.location.country).filter((value): value is string => Boolean(value)) ?? [],
  )].sort(), [data])

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return [...(data?.people ?? [])]
      .filter((person) => {
        if (sources.length === 0) return true
        return sources.some((source) => source === 'multi-source'
          ? person.source_ids.length > 1
          : person.source_ids.includes(source))
      })
      .filter((person) => market === 'all' || person.location.country === market)
      .filter((person) => {
        if (coverage === 'linkedin') return Boolean(linkedinProfile(person))
        if (coverage === 'no-linkedin') return !linkedinProfile(person)
        if (coverage === 'followers') return followerCount(person) !== null
        if (coverage === 'biography') return Boolean(person.biography)
        if (coverage === 'sessions') return sessionCount(person) > 0
        return true
      })
      .filter((person) => {
        const isFit = Boolean(person.influence.fit)
        const isPotentialTarget = Boolean(person.influence.potential_target)
        const isTarget = Boolean(person.influence.target)
        const hasPriority = Boolean(person.influence.priority)
        const isMiddleEastern = Boolean(person.influence.middle_eastern.value)
        if (signals.length === 0) return true
        return signals.some((signal) => {
          if (signal === 'any') return isFit || isPotentialTarget || isTarget || hasPriority || isMiddleEastern
          if (signal === 'fit') return isFit
          if (signal === 'potential-target') return isPotentialTarget
          if (signal === 'target') return isTarget
          if (signal === 'priority') return hasPriority
          if (signal === 'middle-eastern') return isMiddleEastern
          return !isFit && !isPotentialTarget && !isTarget && !hasPriority && !isMiddleEastern
        })
      })
      .filter((person) => {
        if (!normalizedQuery) return true
        return [
          person.name.display,
          person.name.passport,
          person.name.certificate,
          person.current_role.title,
          person.current_role.organization,
          person.location.country,
          person.location.city,
          person.location.nationality,
          person.biography,
          person.influence.lane,
          person.specialties.join(' '),
          linkedinProfile(person)?.url,
          person.founder?.companies.join(' '),
          person.founder?.primary_market,
          person.founder?.sector,
          person.founder?.tier_label,
          person.founder?.why_selected,
          person.founder?.influence_signal,
          ...person.event_appearances.flatMap((appearance) => [
            SOURCE_LABELS[appearance.event_id],
            ...appearance.sessions.flatMap((session) => [session.title, session.track, session.hall]),
          ]),
        ].filter(Boolean).join(' ').toLocaleLowerCase().includes(normalizedQuery)
      })
      .sort((left, right) => {
        const leftValue = sortValue(left, sortField)
        const rightValue = sortValue(right, sortField)
        const leftBlank = leftValue === '' || leftValue === -1
        const rightBlank = rightValue === '' || rightValue === -1
        if (leftBlank !== rightBlank) return leftBlank ? 1 : -1
        const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' })
        return comparison * (sortDirection === 'asc' ? 1 : -1)
          || left.name.display.localeCompare(right.name.display)
      })
  }, [coverage, data, market, query, signals, sortDirection, sortField, sources])

  // A saved cell can change the filtered/sorted rows. Keep the current viewport for edits;
  // only explicit view-control changes should restart the infinite-scroll result set.
  useEffect(() => {
    setVisibleCount(LOAD_BATCH_SIZE)
    tableScrollRef.current?.scrollTo({ top: 0 })
  }, [coverage, market, query, signals, sortDirection, sortField, sources])

  const visibleRows = rows.slice(0, visibleCount)
  const archive = useRowArchive({ tableId: 'people', visibleRowIds: visibleRows.map((person) => person.id) })
  const displayedRows = visibleRows.filter((person) => archive.showArchived === archive.isArchived(person.id))
  const hasMoreRows = visibleRows.length < rows.length
  const hasFilters = Boolean(query || sources.length > 0 || market !== 'all' || coverage !== 'all' || signals.length > 0)
  const tableStyle = {
    '--resizable-table-width': `${totalWidth(columnOrder, 42)}px`,
  } as CSSProperties

  useEffect(() => {
    const root = tableScrollRef.current
    const target = loadMoreRef.current
    if (!root || !target || !hasMoreRows) return

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      setVisibleCount((current) => Math.min(current + LOAD_BATCH_SIZE, rows.length))
    }, {
      root,
      rootMargin: '420px 0px',
      threshold: 0,
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreRows, rows.length, visibleRows.length])

  const sortBy = (field: PeopleColumn) => {
    if (field === sortField) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortField(field)
      setSortDirection(field === 'fit' || field === 'potential-target' || field === 'target' || field === 'followers' || field === 'events' || field === 'signals' || field === 'sources' ? 'desc' : 'asc')
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

  const handleColumnDragStart = (event: ReactDragEvent<HTMLTableCellElement>, column: PeopleColumn) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', column)
    setDraggingColumn(column)
  }

  const handlePointerColumnDragStart = (event: ReactPointerEvent<HTMLSpanElement>, sourceColumn: PeopleColumn) => {
    if (event.button !== 0) return
    event.preventDefault()
    pointerDragCleanup.current?.()
    setDraggingColumn(sourceColumn)

    const locateDrop = (clientX: number) => {
      const headers = Array.from(document.querySelectorAll<HTMLTableCellElement>('.unified-table th[data-column-key]'))
      const target = headers.find((header) => {
        const bounds = header.getBoundingClientRect()
        return clientX >= bounds.left && clientX <= bounds.right
      })
      const column = target?.dataset.columnKey
      if (!target || !isPeopleColumn(column) || column === sourceColumn) return null
      const bounds = target.getBoundingClientRect()
      return {
        column,
        position: clientX < bounds.left + bounds.width / 2 ? 'before' as const : 'after' as const,
      }
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextDrop = locateDrop(moveEvent.clientX)
      if (nextDrop) setColumnDrop(nextDrop)
    }
    const finishPointerDrag = (upEvent: PointerEvent) => {
      const nextDrop = locateDrop(upEvent.clientX)
      if (nextDrop) moveColumn(sourceColumn, nextDrop.column, nextDrop.position)
      cleanup()
      setDraggingColumn(null)
      setColumnDrop(null)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishPointerDrag)
      window.removeEventListener('pointercancel', finishPointerDrag)
      pointerDragCleanup.current = null
    }

    pointerDragCleanup.current = cleanup
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishPointerDrag)
    window.addEventListener('pointercancel', finishPointerDrag)
  }

  const handleColumnDragOver = (event: ReactDragEvent<HTMLTableCellElement>, column: PeopleColumn) => {
    if (!draggingColumn || draggingColumn === column) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const bounds = event.currentTarget.getBoundingClientRect()
    setColumnDrop({ column, position: event.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
  }

  const handleColumnDrop = (event: ReactDragEvent<HTMLTableCellElement>, column: PeopleColumn) => {
    event.preventDefault()
    const sourceColumn = event.dataTransfer.getData('text/plain') || draggingColumn
    const position = columnDrop?.column === column ? columnDrop.position : 'before'
    if (isPeopleColumn(sourceColumn)) moveColumn(sourceColumn, column, position)
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const finishColumnDrag = () => {
    setDraggingColumn(null)
    setColumnDrop(null)
  }

  const savePersonField = async (person: UnifiedPerson, field: PeopleEditableField, value: unknown) => {
    setCellSaveError('')
    const response = await fetch(`/api/people/${encodeURIComponent(person.id)}`, {
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
    setData((current) => current ? {
      ...current,
      generated_at: result.generatedAt ?? current.generated_at,
      people: current.people.map((candidate) => candidate.id === person.id ? result.person! : candidate),
    } : current)
  }

  const savePersonSignal = async (person: UnifiedPerson, field: PeopleSignalField, checked: boolean) => {
    const savingKey = `${person.id}:${field}`
    if (savingSignals.has(savingKey)) return
    setSavingSignals((current) => new Set(current).add(savingKey))
    try {
      await savePersonField(person, field, checked)
    } catch {
      // The shared error banner explains the failed write.
    } finally {
      setSavingSignals((current) => {
        const next = new Set(current)
        next.delete(savingKey)
        return next
      })
    }
  }

  const clearFilters = () => {
    setQuery('')
    setSources([])
    setMarket('all')
    setCoverage('all')
    setSignals([])
  }

  return (
    <div className="app-shell unified-people-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Unified people and source provenance</span></div>
        <WorkspaceNav active="people" />
      </header>

      <main className="riseup-speakers-main unified-people-main">
        <section className="influencer-directory riseup-speakers-directory unified-register" aria-labelledby="unified-people-title">
          <header className="influencer-directory__header riseup-speakers-header unified-people-header">
            <div>
              <h2 id="unified-people-title">Unified people</h2>
              <p>
                Combined source-backed people records
                {data ? ` · Generated ${formatDate(data.generated_at)} · ${data.schema_version}` : ' · Loading data…'}
              </p>
            </div>
            <div>
              <span>
                {data
                  ? `${data.stats.unique_people.toLocaleString()} people · ${data.stats.source_records.toLocaleString()} source records · ${data.stats.multi_source_people.toLocaleString()} multi-source`
                  : '— people'}
              </span>
              <nav className="unified-people-files" aria-label="Download combined people JSON">
                <a href={unifiedPeopleUrl} download>Unified JSON ↓</a>
              </nav>
            </div>
          </header>

          <div className="filter-bar riseup-speakers-filters unified-people-toolbar">
            <label className="search-field unified-people-search">
              <span className="sr-only">Search unified people</span>
              <SearchIcon />
              <input value={query} type="search" placeholder="Search people, organizations, sessions, profiles…" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <SourceMultiSelect value={sources} onChange={setSources} />
            <label><span className="sr-only">Market</span><select aria-label="Market" value={market} onChange={(event) => setMarket(event.target.value)}>
              <option value="all">All markets</option>
              {markets.map((value) => <option value={value} key={value}>{value}</option>)}
            </select></label>
            <label><span className="sr-only">Coverage</span><select aria-label="Coverage" value={coverage} onChange={(event) => setCoverage(event.target.value as CoverageFilter)}>
              <option value="all">Any coverage</option>
              <option value="linkedin">Has LinkedIn</option>
              <option value="no-linkedin">No LinkedIn</option>
              <option value="followers">Has followers</option>
              <option value="biography">Has biography</option>
              <option value="sessions">Has sessions</option>
            </select></label>
            <SignalMultiSelect value={signals} onChange={setSignals} />
            <button className="reset-button" type="button" disabled={!hasFilters} onClick={clearFilters}>Clear</button>
          </div>

          <div className="result-meta unified-register__meta" aria-live="polite">
            <span><strong>{rows.length.toLocaleString()}</strong> matching people · {displayedRows.length.toLocaleString()} visible · infinite scroll</span>
            <span>Pencil or double-click to edit · drag headers to reorder · click headers to sort · drag edges to resize</span>
          </div>

          {error && <div className="software-error" role="alert">{error}</div>}
          {cellSaveError && <div className="software-error" role="alert">Cell was not saved: {cellSaveError}</div>}
          <ArchiveToolbar archive={archive} noun="people" />
          {!data && !error && <div className="unified-people-loading"><span className="loading-spinner" /> Loading unified people…</div>}

          {data && (
            <div className="riseup-speakers-table-wrap unified-table-wrap" ref={tableScrollRef}>
              <table className="company-table riseup-speakers-table unified-table resizable-table" style={tableStyle}>
                <colgroup><col className="row-select-column" style={{ width: '42px' }} />{columnOrder.map((column) => <col key={column} style={{ width: `${widths[column]}px` }} />)}</colgroup>
                <thead>
                  <tr>
                    <th className="row-select-heading" scope="col"><RowSelectionHeader allSelected={archive.allVisibleSelected} onToggle={archive.toggleAllVisible} someSelected={archive.someVisibleSelected} /></th>
                    {columnOrder.map((columnKey) => {
                      const column = COLUMNS_BY_KEY.get(columnKey)!
                      const active = sortField === column.key
                      const dropClass = columnDrop?.column === column.key ? ` is-drop-${columnDrop.position}` : ''
                      return (
                        <th
                          key={column.key}
                          aria-sort={active ? sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'}
                          className={`influencer-draggable-header${draggingColumn === column.key ? ' is-dragging' : ''}${dropClass}`}
                          data-column-key={column.key}
                          draggable
                          onDragEnd={finishColumnDrag}
                          onDragOver={(event) => handleColumnDragOver(event, column.key)}
                          onDragStart={(event) => handleColumnDragStart(event, column.key)}
                          onDrop={(event) => handleColumnDrop(event, column.key)}
                          scope="col"
                        >
                          <span
                            aria-hidden="true"
                            className="riseup-column-drag-handle"
                            draggable
                            onPointerDown={(event) => handlePointerColumnDragStart(event, column.key)}
                            title={`Drag to move ${column.label}`}
                          >
                            ⋮⋮
                          </span>
                          <button
                            aria-label={`Sort ${column.label} ${active && sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                            className="influencer-sort-button unified-sort-button"
                            type="button"
                            onClick={() => sortBy(column.key)}
                          >
                            <span className="influencer-header-label">{column.label}</span>
                            <span className={`influencer-sort-arrow${active ? ' is-active' : ''}`} aria-hidden="true">{active ? sortDirection === 'asc' ? '↑' : '↓' : '↕'}</span>
                          </button>
                          <ColumnResizeHandle {...getResizeHandleProps(column.key, column.label)} />
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.map((person, index) => (
                    <tr key={person.id}>
                      <td className="row-select-cell"><RowSelectionCell checked={archive.selectedIds.has(person.id)} label={`Select ${person.name.display}`} onToggle={() => archive.toggleRow(person.id)} /></td>
                      {columnOrder.map((column) => (
                        <PersonCell
                          column={column}
                          groupOptions={groupOptions}
                          index={index}
                          key={column}
                          onSave={(field, value) => savePersonField(person, field, value)}
                          onSignalSave={(field, checked) => savePersonSignal(person, field, checked)}
                          person={person}
                          savingSignals={savingSignals}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!displayedRows.length && <div className="unified-people-empty"><strong>{archive.showArchived ? 'No archived people' : 'No matching people'}</strong><span>{archive.showArchived ? 'Archive people from the active register to see them here.' : 'Change the source or coverage filters, or search more broadly.'}</span>{!archive.showArchived && <button type="button" onClick={clearFilters}>Reset filters</button>}</div>}
              {visibleRows.length > 0 && <div className={`unified-infinite-status${hasMoreRows ? ' is-loading' : ' is-complete'}`} ref={loadMoreRef} aria-live="polite">
                {hasMoreRows
                  ? <><span className="loading-spinner" aria-hidden="true" /> Scroll to load more · {visibleRows.length.toLocaleString()} / {rows.length.toLocaleString()}</>
                  : <>End of register · all {rows.length.toLocaleString()} people loaded</>}
              </div>}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
