import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent, PointerEvent as ReactPointerEvent, ReactNode, ThHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { dateEditorValue, InlineEdit } from './editableCells'
import type { LeadBand, LeadEngagement, LeadEngagementChannel, LeadEngagementEvent, LeadEngagementEventKind, LeadLane, LeadResearchEvidence, LeadResearchResource, LeadResearchResponse, LeadResearchStrategyRecord, SaudiSoftwareLead } from './leadResearchTypes'
import { emptyLeadEngagement, LEAD_ENGAGEMENT_CHANNELS, LEAD_ENGAGEMENT_EVENT_KINDS, LEAD_ENGAGEMENT_STATUSES } from './leadEngagement'
import { isLeadResearchCandidate, leadCoreProductLabel, leadQualificationBlockers, leadResearchStatusLabel, matchesLeadStrategy, personaReviewLabel, readLeadStrategyFilter, setLeadStrategyFilter } from './leadResearchStrategy'
import type { LeadStrategyFilter } from './leadResearchStrategy'
import { ResizableDataTable } from './resizableColumns'
import type { BasicTableColumn } from './resizableColumns'
import { ArchiveToolbar, RowSelectionCell, useRowArchive } from './rowArchive'
import { usePersistedSort } from './tablePreferences'
import { WorkspaceNav } from './WorkspaceNav'
import './leadResearchReadability.css'

const LEAD_COLUMNS = [
  { key: 'band', label: 'Band', defaultWidth: 76 },
  { key: 'person', label: 'Founder / owner', defaultWidth: 220 },
  { key: 'followUp', label: 'Follow-up status', defaultWidth: 165 },
  { key: 'channel', label: 'Channel', defaultWidth: 110 },
  { key: 'lastContact', label: 'Last contact', defaultWidth: 125 },
  { key: 'nextFollowUp', label: 'Next follow-up', defaultWidth: 130 },
  { key: 'activity', label: 'Activity history', defaultWidth: 175 },
  { key: 'engagementNotes', label: 'Follow-up notes', defaultWidth: 280 },
  { key: 'strategy', label: 'Strategy', defaultWidth: 185 },
  { key: 'company', label: 'Company', defaultWidth: 210 },
  { key: 'lane', label: 'Research lane', defaultWidth: 155 },
  { key: 'stage', label: 'Product stage', defaultWidth: 115 },
  { key: 'product', label: 'Product / build signal', defaultWidth: 330 },
  { key: 'intent', label: 'Intent', defaultWidth: 86 },
  { key: 'outsourcing', label: 'Outsource', defaultWidth: 92 },
  { key: 'budget', label: 'Budget', defaultWidth: 86 },
  { key: 'timing', label: 'Timing', defaultWidth: 82 },
  { key: 'status', label: 'Research status', defaultWidth: 145 },
  { key: 'confidence', label: 'Confidence', defaultWidth: 110 },
  { key: 'nextReview', label: 'Next review', defaultWidth: 125 },
  { key: 'sources', label: 'Evidence', defaultWidth: 155 },
  { key: 'notes', label: 'Research notes', defaultWidth: 300 },
] as const

const RESOURCE_COLUMNS = [
  { key: 'resource', label: 'Resource', defaultWidth: 245 },
  { key: 'type', label: 'Type', defaultWidth: 165 },
  { key: 'priority', label: 'Priority', defaultWidth: 105 },
  { key: 'access', label: 'Access', defaultWidth: 110 },
  { key: 'cadence', label: 'Cadence', defaultWidth: 125 },
  { key: 'status', label: 'Status', defaultWidth: 105 },
  { key: 'yield', label: 'Yield', defaultWidth: 105 },
  { key: 'checked', label: 'Last checked', defaultWidth: 120 },
  { key: 'method', label: 'How to harvest', defaultWidth: 330 },
  { key: 'why', label: 'Why useful', defaultWidth: 330 },
  { key: 'evidence', label: 'Evidence', defaultWidth: 155 },
  { key: 'notes', label: 'Notes', defaultWidth: 270 },
] as const

const STRATEGY_COLUMNS = [
  { key: 'strategy', label: 'Strategy', defaultWidth: 300 },
  { key: 'created', label: 'Created', defaultWidth: 145 },
  { key: 'status', label: 'Status', defaultWidth: 120 },
  { key: 'priority', label: 'Priority', defaultWidth: 110 },
  { key: 'cadence', label: 'Cadence', defaultWidth: 135 },
  { key: 'runs', label: 'Runs', defaultWidth: 90 },
  { key: 'leads', label: 'Created leads', defaultWidth: 160 },
  { key: 'yield', label: 'Latest yield', defaultWidth: 190 },
  { key: 'worked', label: 'What worked', defaultWidth: 340 },
  { key: 'failed', label: 'Low-yield findings', defaultWidth: 340 },
  { key: 'improvements', label: 'Next improvements', defaultWidth: 340 },
  { key: 'review', label: 'Next review', defaultWidth: 130 },
  { key: 'notes', label: 'Research notes', defaultWidth: 300 },
] as const

type LeadColumn = (typeof LEAD_COLUMNS)[number]['key']
type ResourceColumn = (typeof RESOURCE_COLUMNS)[number]['key']
type StrategyColumn = (typeof STRATEGY_COLUMNS)[number]['key']
type View = 'persona' | 'leads' | 'resources' | 'strategies'
type Filters = { view: View; q: string; lane: 'all' | LeadLane; band: 'all' | LeadBand; status: string; resource: string; strategy: LeadStrategyFilter }
type ColumnDrop<Key extends string> = { column: Key; position: 'before' | 'after' }

const LEAD_STATUSES = [
  'new', 'identity-pending', 'researching', 'review-required', 'qualified', 'watchlist', 'rejected', 'needs-refresh',
] as const
const RESOURCE_STATUSES = ['active', 'monitor', 'unavailable', 'retired'] as const
const RESOURCE_PRIORITIES = ['high', 'medium', 'low'] as const
const RESOURCE_CADENCES = ['weekly', 'event-season', 'monthly', 'quarterly', 'half-yearly', 'yearly'] as const
const STRATEGY_STATUSES = ['active', 'testing', 'paused', 'retired'] as const
const STRATEGY_PRIORITIES = ['high', 'medium', 'low'] as const
const STRATEGY_CADENCES = ['twice-weekly', 'weekly', 'monthly', 'ad-hoc'] as const
const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const titleCase = (value: string) => value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const optionList = (values: readonly string[]) => values.map((value) => ({ label: titleCase(value), value }))
const engagementStatusLabel = (status: LeadEngagement['status']) => ({
  'not-contacted': 'Not contacted',
  'contacted-awaiting-reply': 'Contacted — awaiting reply',
  replied: 'Replied',
  'follow-up-due': 'Follow-up due',
  'meeting-scheduled': 'Meeting scheduled',
  'not-interested': 'Not interested',
  closed: 'Closed',
})[status]

const readFilters = (): Filters => {
  const params = new URLSearchParams(window.location.search)
  const requestedView = params.get('view')
  const requestedLane = params.get('lane')
  const requestedBand = params.get('band')
  return {
    band: requestedBand === 'A' || requestedBand === 'B' || requestedBand === 'C' || requestedBand === 'D' ? requestedBand : 'all',
    lane: requestedLane === 'new-founder' || requestedLane === 'stealth-or-precompany' || requestedLane === 'sme-digital-build' ? requestedLane : 'all',
    q: params.get('q') ?? '',
    resource: params.get('resource') ?? 'all',
    status: params.get('status') ?? 'all',
    strategy: readLeadStrategyFilter(params),
    view: window.location.pathname === '/lead-research/strategies' || requestedView === 'strategies' ? 'strategies' : requestedView === 'persona' || requestedView === 'resources' ? requestedView : 'leads',
  }
}

const useUrlFilters = () => {
  const [filters, setFilters] = useState<Filters>(readFilters)
  useEffect(() => {
    const handlePopState = () => setFilters(readFilters())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const setOrDelete = (key: string, value: string, defaultValue: string) => value === defaultValue ? params.delete(key) : params.set(key, value)
    if (filters.view === 'strategies') params.delete('view')
    else setOrDelete('view', filters.view, 'leads')
    setOrDelete('q', filters.q.trim(), '')
    setOrDelete('lane', filters.lane, 'all')
    setOrDelete('band', filters.band, 'all')
    setOrDelete('status', filters.status, 'all')
    setOrDelete('resource', filters.resource, 'all')
    setLeadStrategyFilter(params, filters.strategy)
    const search = params.toString()
    const pathname = filters.view === 'strategies' ? '/lead-research/strategies' : '/lead-research'
    window.history.replaceState(null, '', `${pathname}${search ? `?${search}` : ''}${window.location.hash}`)
  }, [filters])
  const update = useCallback((changes: Partial<Filters>) => setFilters((current) => ({ ...current, ...changes })), [])
  return { filters, setFilters, update }
}

const restoreColumnOrder = <Key extends string>(storageKey: string, keys: readonly Key[]) => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as unknown
    if (!Array.isArray(stored)) return [...keys]
    const seen = new Set<Key>()
    const valid = stored.flatMap((entry) => typeof entry === 'string' && keys.includes(entry as Key) && !seen.has(entry as Key)
      ? (seen.add(entry as Key), [entry as Key])
      : [])
    const merged = [...valid]
    keys.forEach((key, keyIndex) => {
      if (seen.has(key)) return
      const previous = [...keys.slice(0, keyIndex)].reverse().find((candidate) => merged.includes(candidate))
      const next = keys.slice(keyIndex + 1).find((candidate) => merged.includes(candidate))
      if (previous) merged.splice(merged.indexOf(previous) + 1, 0, key)
      else if (next) merged.splice(merged.indexOf(next), 0, key)
      else merged.push(key)
      seen.add(key)
    })
    return merged
  } catch {
    return [...keys]
  }
}

function useOrderedColumns<Key extends string>(
  tableId: string,
  definitions: readonly BasicTableColumn<Key>[],
  sortField: Key,
  sortDirection: 'asc' | 'desc',
  sortBy: (field: Key) => void,
) {
  const storageKey = `eign-${tableId}.column-order.v1`
  const keys = useMemo(() => definitions.map((column) => column.key), [definitions])
  const byKey = useMemo(() => new Map(definitions.map((column) => [column.key, column])), [definitions])
  const [order, setOrder] = useState<Key[]>(() => restoreColumnOrder(storageKey, keys))
  const [dragging, setDragging] = useState<Key | null>(null)
  const [drop, setDrop] = useState<ColumnDrop<Key> | null>(null)
  const dropRef = useRef<ColumnDrop<Key> | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanupRef.current?.(), [])

  const ordered = useMemo(() => order.map((key) => byKey.get(key)).filter((column): column is BasicTableColumn<Key> => Boolean(column)), [byKey, order])
  const setDropTarget = (next: ColumnDrop<Key> | null) => {
    dropRef.current = next
    setDrop(next)
  }
  const moveColumn = (source: Key, target: Key, position: ColumnDrop<Key>['position']) => {
    if (source === target) return
    setOrder((current) => {
      const next = current.filter((key) => key !== source)
      const index = next.indexOf(target)
      if (index < 0) return current
      next.splice(index + (position === 'after' ? 1 : 0), 0, source)
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Current-session ordering still works. */ }
      return next
    })
  }
  const startDrag = (event: ReactPointerEvent<HTMLSpanElement>, source: Key) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    cleanupRef.current?.()
    const pointerId = event.pointerId
    setDragging(source)
    setDropTarget(null)
    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLTableCellElement>(`.lead-research-column-header[data-table="${tableId}"]`)
      const targetKey = target?.dataset.column as Key | undefined
      if (!target || !targetKey || targetKey === source || !byKey.has(targetKey)) return setDropTarget(null)
      const bounds = target.getBoundingClientRect()
      setDropTarget({ column: targetKey, position: moveEvent.clientX < bounds.left + bounds.width / 2 ? 'before' : 'after' })
    }
    function removeListeners() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      cleanupRef.current = null
    }
    const finish = (commit: boolean) => {
      removeListeners()
      const destination = dropRef.current
      if (commit && destination) moveColumn(source, destination.column, destination.position)
      setDragging(null)
      setDropTarget(null)
    }
    const handleUp = (upEvent: PointerEvent) => { if (upEvent.pointerId === pointerId) finish(true) }
    const handleCancel = (cancelEvent: PointerEvent) => { if (cancelEvent.pointerId === pointerId) finish(false) }
    cleanupRef.current = removeListeners
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
  }
  const getHeaderProps = (column: BasicTableColumn<Key>): ThHTMLAttributes<HTMLTableCellElement> => ({
    'aria-sort': sortField === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none',
    className: ['vc-column-header', 'lead-research-column-header', dragging === column.key ? 'is-dragging' : '', drop?.column === column.key ? `is-drop-${drop.position}` : ''].filter(Boolean).join(' '),
    'data-column': column.key,
    'data-table': tableId,
    title: `${column.label} · Drag to reorder, click to sort, or use the right edge to resize`,
  } as ThHTMLAttributes<HTMLTableCellElement>)
  const renderHeader = (column: BasicTableColumn<Key>) => (
    <>
      <span aria-hidden="true" className="vc-column-grip" onPointerDown={(event) => startDrag(event, column.key)} title={`Drag ${column.label} column`}>⠿</span>
      <button aria-label={`Sort by ${column.label}`} className="vc-column-sort" onClick={() => sortBy(column.key)} type="button">
        <span>{column.label}</span>
        {sortField === column.key ? <b aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</b> : null}
      </button>
    </>
  )
  return { getHeaderProps, ordered, renderHeader }
}

const evidenceFreshness = (publishedAt: string | null) => {
  if (!publishedAt) return null
  const ageDays = Math.max(0, Math.floor((Date.now() - Date.parse(`${publishedAt}T00:00:00Z`)) / 86_400_000))
  const band = ageDays <= 7 ? 'hot' : ageDays <= 30 ? 'fresh' : ageDays <= 90 ? 'recent' : ageDays <= 183 ? 'aging' : 'stale'
  const label = ageDays === 0 ? 'Today' : `${ageDays}d ${band}`
  return { ageDays, band, label }
}

const publicationStatusLabel = (evidence: LeadResearchEvidence) => evidence.publication_date_status === 'not-applicable'
  ? 'Living page · no publication date'
  : evidence.publication_date_status === 'unavailable'
    ? 'Exact date unavailable'
    : titleCase(evidence.publication_date_status ?? 'not audited')

function EvidenceList({ evidence }: { evidence: LeadResearchEvidence[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const titleId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const latestPublishedAt = evidence.map((item) => item.published_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null
  const latestFreshness = evidenceFreshness(latestPublishedAt)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [isOpen])

  return (
    <>
      <span className="lead-evidence-control">
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="lead-evidence-trigger"
          disabled={!evidence.length}
          onClick={() => setIsOpen(true)}
          ref={triggerRef}
          type="button"
        >
          {evidence.length} {evidence.length === 1 ? 'source' : 'sources'}
        </button>
        {latestFreshness ? <small className={`is-${latestFreshness.band}`} title={`Newest published evidence: ${latestPublishedAt}`}>{latestFreshness.label}</small> : <small className="is-undated">Undated sources</small>}
      </span>
      {isOpen ? createPortal(
        <div
          className="lead-evidence-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false) }}
        >
          <section aria-labelledby={titleId} aria-modal="true" className="lead-evidence-modal" ref={modalRef} role="dialog">
            <header>
              <div>
                <span>Source-backed research</span>
                <h2 id={titleId}>Evidence</h2>
                <p>{evidence.length} {evidence.length === 1 ? 'source supports' : 'sources support'} this record.</p>
              </div>
              <button aria-label="Close evidence" className="lead-evidence-close" onClick={() => setIsOpen(false)} ref={closeRef} type="button">×</button>
            </header>
            <div className="lead-evidence-list">
              {evidence.map((item, index) => (
                <article key={item.id}>
                  <div className="lead-evidence-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
                  <div className="lead-evidence-content">
                    <div className="lead-evidence-source-heading">
                      <strong>{item.source_title}</strong>
                      <span className={`is-${item.source_quality}`}>{titleCase(item.source_quality)}</span>
                    </div>
                    <p>{item.summary}</p>
                    <dl>
                      <div><dt>Claim</dt><dd>{titleCase(item.claim_key)}</dd></div>
                      <div><dt>Source type</dt><dd>{titleCase(item.source_type)}</dd></div>
                      {item.publisher_id ? <div><dt>Publisher</dt><dd>{item.publisher_id}</dd></div> : null}
                      <div><dt>Confidence</dt><dd>{titleCase(item.confidence)}</dd></div>
                      <div><dt>Observed</dt><dd>{item.observed_at}</dd></div>
                      {item.published_at ? <div><dt>Published</dt><dd>{item.published_at}</dd></div> : null}
                      {item.published_at ? <div><dt>Freshness</dt><dd>{evidenceFreshness(item.published_at)?.label}</dd></div> : null}
                      <div><dt>Date audit</dt><dd title={item.publication_date_basis}>{publicationStatusLabel(item)}</dd></div>
                    </dl>
                    <a href={item.source_url} rel="noreferrer" target="_blank">Open source <span aria-hidden="true">↗</span></a>
                  </div>
                </article>
              ))}
            </div>
            <footer><span>Evidence and provenance are read-only.</span><button onClick={() => setIsOpen(false)} type="button">Done</button></footer>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  )
}

const scoreCell = (score: number, maximum: number, summary: string) => <span className="lead-score" title={summary}>{score}<small>/{maximum}</small></span>

const engagementEventKindLabel = (kind: LeadEngagementEventKind) => ({
  contacted: 'Contacted',
  'reply-received': 'Reply received',
  'follow-up-sent': 'Follow-up sent',
  'meeting-scheduled': 'Meeting scheduled',
  note: 'Note',
})[kind]

function EngagementActivity({ engagement, lead, onAdd }: { engagement: LeadEngagement; lead: SaudiSoftwareLead; onAdd: (input: Omit<LeadEngagementEvent, 'id'>) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false)
  const [kind, setKind] = useState<LeadEngagementEventKind>('contacted')
  const [channel, setChannel] = useState<LeadEngagementChannel>(engagement.primary_channel ?? 'whatsapp')
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const titleId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const latest = engagement.events.at(-1)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) { event.preventDefault(); setIsOpen(false); return }
      if (event.key !== 'Tab') return
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
      if (!focusable.length) return
      const [first] = focusable
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [isOpen, saving])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      await onAdd({ occurred_on: occurredOn, kind, channel, summary })
      setSummary('')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The activity could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <button aria-expanded={isOpen} aria-haspopup="dialog" className="lead-evidence-trigger lead-activity-trigger" onClick={() => setIsOpen(true)} ref={triggerRef} type="button">{engagement.events.length} {engagement.events.length === 1 ? 'activity' : 'activities'}</button>
    {latest ? <small className="lead-activity-latest" title={latest.summary}>{latest.occurred_on} · {engagementEventKindLabel(latest.kind)}</small> : null}
    {isOpen ? createPortal(<div className="lead-evidence-backdrop" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) setIsOpen(false) }}>
      <section aria-labelledby={titleId} aria-modal="true" className="lead-evidence-modal lead-engagement-modal" ref={modalRef} role="dialog">
        <header><div><span>Local follow-up history</span><h2 id={titleId}>{lead.identity.display_name}</h2><p>{engagementStatusLabel(engagement.status)} · {engagement.events.length} dated {engagement.events.length === 1 ? 'activity' : 'activities'}</p></div><button aria-label="Close activity history" className="lead-evidence-close" disabled={saving} onClick={() => setIsOpen(false)} ref={closeRef} type="button">×</button></header>
        <div className="lead-engagement-content">
          <form className="lead-engagement-form" onSubmit={submit}>
            <label><span>Activity</span><select onChange={(event) => setKind(event.target.value as LeadEngagementEventKind)} value={kind}>{LEAD_ENGAGEMENT_EVENT_KINDS.map((value) => <option key={value} value={value}>{engagementEventKindLabel(value)}</option>)}</select></label>
            <label><span>Channel</span><select onChange={(event) => setChannel(event.target.value as LeadEngagementChannel)} value={channel}>{LEAD_ENGAGEMENT_CHANNELS.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
            <label><span>Date</span><input onChange={(event) => setOccurredOn(event.target.value)} required type="date" value={occurredOn} /></label>
            <label className="lead-engagement-summary"><span>Activity note</span><textarea maxLength={2000} onChange={(event) => setSummary(event.target.value)} placeholder="Example: Sent the introduction over WhatsApp; awaiting a response." required value={summary} /></label>
            <p>Store a short interaction summary only. Do not enter phone numbers, email addresses, or contact details.</p>
            {saveError ? <div className="founder-save-error" role="alert">{saveError}</div> : null}
            <button disabled={saving} type="submit">{saving ? 'Saving…' : 'Add activity'}</button>
          </form>
          <section className="lead-engagement-history" aria-label="Activity history">
            <header><h3>History</h3><span>Newest first</span></header>
            {engagement.events.length ? [...engagement.events].reverse().map((item) => <article key={item.id}><div><strong>{engagementEventKindLabel(item.kind)}</strong><span>{titleCase(item.channel)} · {item.occurred_on}</span></div><p>{item.summary}</p></article>) : <p className="lead-engagement-empty">No activity recorded yet.</p>}
          </section>
        </div>
        <footer><span>Engagement history is separate from research qualification.</span><button disabled={saving} onClick={() => setIsOpen(false)} type="button">Done</button></footer>
      </section>
    </div>, document.body) : null}
  </>
}

const leadSortValue = (lead: SaudiSoftwareLead, engagement: LeadEngagement, column: LeadColumn): string | number => {
  if (column === 'followUp') return engagement.status
  if (column === 'channel') return engagement.primary_channel ?? ''
  if (column === 'lastContact') return engagement.last_contact_at ?? ''
  if (column === 'nextFollowUp') return engagement.next_follow_up_at ?? ''
  if (column === 'activity') return engagement.events.at(-1)?.occurred_on ?? ''
  if (column === 'engagementNotes') return engagement.notes ?? ''
  if (column === 'strategy') return lead.discovery.strategy?.label ?? ''
  if (isLeadResearchCandidate(lead) && ['band', 'intent', 'outsourcing', 'budget', 'timing'].includes(column)) return -1
  if (column === 'band') return lead.qualification.total_score
  if (column === 'person') return lead.identity.display_name
  if (column === 'company') return lead.company.name ?? ''
  if (column === 'lane') return lead.discovery.lane
  if (column === 'stage') return leadCoreProductLabel(lead) ?? lead.company.lifecycle_stage
  if (column === 'product') return lead.company.product_summary
  if (column === 'intent') return lead.qualification.product_intent.score
  if (column === 'outsourcing') return lead.qualification.outsourcing_likelihood.score
  if (column === 'budget') return lead.qualification.budget_readiness.score
  if (column === 'timing') return lead.qualification.timing.score
  if (column === 'status') return leadResearchStatusLabel(lead)
  if (column === 'confidence') return personaReviewLabel(lead) ?? lead.qualification.qualification_confidence
  if (column === 'nextReview') return lead.research.next_review_at ?? ''
  if (column === 'sources') return lead.evidence.length
  return lead.research.notes ?? ''
}

function LeadCell({ column, engagement, lead, onAddEngagement, onSave, onSaveEngagement }: { column: LeadColumn; engagement: LeadEngagement; lead: SaudiSoftwareLead; onAddEngagement: (input: Omit<LeadEngagementEvent, 'id'>) => Promise<void>; onSave: (field: string, value: string) => Promise<void>; onSaveEngagement: (field: string, value: string) => Promise<void> }) {
  const strategy = lead.discovery.strategy
  const review = lead.qualification.persona_review
  const fitLabel = personaReviewLabel(lead)
  const fitDescription = [review?.summary, ...(review?.missing_checks ?? [])].filter(Boolean).join(' · ')
  const researchCandidate = isLeadResearchCandidate(lead)
  if (column === 'band' && researchCandidate) return <span className="lead-pill" style={{ whiteSpace: 'normal' }} title="Research status is separate from the legacy score; this candidate has not been qualified.">{fitLabel === 'Not a fit' ? fitLabel : 'Research candidate'}</span>
  if (column === 'band') return <span className={`lead-band is-${lead.qualification.band.toLowerCase()}`}>{lead.qualification.band}<small>{lead.qualification.total_score}/20</small></span>
  if (column === 'person') return <div className="lead-person"><span>{initials(lead.identity.display_name)}</span><div>{lead.identity.linkedin_url ? <a href={lead.identity.linkedin_url} rel="noreferrer" target="_blank">{lead.identity.display_name}</a> : <strong>{lead.identity.display_name}</strong>}<small>{lead.identity.current_title ?? 'Role not recorded'}</small>{strategy ? <a className="lead-pill" href={`/lead-research?view=strategies&q=${encodeURIComponent(strategy.label)}`} title={`Open research strategy · ${strategy.batch_id}`}>{strategy.label}</a> : null}{fitLabel ? <small title={`Persona fit · read-only · ${fitDescription}`}>{fitLabel}</small> : null}</div></div>
  if (column === 'followUp') return <InlineEdit ariaLabel={`${lead.identity.display_name} follow-up status`} onSave={(value) => onSaveEngagement('status', value)} options={LEAD_ENGAGEMENT_STATUSES.map((status) => ({ label: engagementStatusLabel(status), value: status }))} value={engagement.status}><span className={`lead-engagement-status is-${engagement.status}`}>{engagementStatusLabel(engagement.status)}</span></InlineEdit>
  if (column === 'channel') return <InlineEdit ariaLabel={`${lead.identity.display_name} engagement channel`} onSave={(value) => onSaveEngagement('primary_channel', value)} options={[{ label: 'Not set', value: '' }, ...optionList(LEAD_ENGAGEMENT_CHANNELS)]} value={engagement.primary_channel ?? ''}><span className="lead-pill">{engagement.primary_channel ? titleCase(engagement.primary_channel) : 'Not set'}</span></InlineEdit>
  if (column === 'lastContact') return <InlineEdit ariaLabel={`${lead.identity.display_name} last contact`} inputType="date" onSave={(value) => onSaveEngagement('last_contact_at', value)} value={dateEditorValue(engagement.last_contact_at)}><time>{engagement.last_contact_at ?? 'Not contacted'}</time></InlineEdit>
  if (column === 'nextFollowUp') return <InlineEdit ariaLabel={`${lead.identity.display_name} next follow-up`} inputType="date" onSave={(value) => onSaveEngagement('next_follow_up_at', value)} value={dateEditorValue(engagement.next_follow_up_at)}><time>{engagement.next_follow_up_at ?? 'Not scheduled'}</time></InlineEdit>
  if (column === 'activity') return <EngagementActivity engagement={engagement} lead={lead} onAdd={onAddEngagement} />
  if (column === 'engagementNotes') return <InlineEdit ariaLabel={`${lead.identity.display_name} follow-up notes`} onSave={(value) => onSaveEngagement('notes', value)} value={engagement.notes ?? ''}><span className="lead-notes">{engagement.notes || 'Add follow-up note'}</span></InlineEdit>
  if (column === 'strategy') {
    const methodLabel = strategy ? {
      'direct-request': 'Direct project request',
      'current-cohort': 'Current program cohort',
      'official-program': 'Official program and cohort sources',
      'event-financing-signal': 'Event, funding, and portfolio signals',
      'community-signal': 'LinkedIn and ecosystem signals',
    }[strategy.method] : null
    return strategy ? <div className="lead-narrative"><a className="lead-pill" href={`/lead-research?view=strategies&q=${encodeURIComponent(strategy.label)}`} title="Open research strategy">{strategy.label}</a><small>{methodLabel}</small>{fitLabel ? <small title={fitDescription}>{fitLabel}</small> : null}</div> : <span aria-label="No research strategy recorded">—</span>
  }
  if (column === 'company') return <div className="lead-company">{lead.company.website_url ? <a href={lead.company.website_url} rel="noreferrer" target="_blank">{lead.company.name ?? 'Company'}</a> : <strong>{lead.company.name ?? 'Pre-company'}</strong>}<small>{lead.company.city ?? titleCase(lead.company.saudi_basis)} · {lead.company.linkedin_employee_band ?? 'team unknown'}</small></div>
  if (column === 'lane') return <span className="lead-pill">{titleCase(lead.discovery.lane)}</span>
  if (column === 'stage' && review) return <div className="lead-narrative"><span className="lead-pill is-stage" style={{ whiteSpace: 'normal' }}>{leadCoreProductLabel(lead)}</span>{lead.company.lifecycle_stage !== 'unknown' ? <small>Business: {titleCase(lead.company.lifecycle_stage)}</small> : null}</div>
  if (column === 'stage') return <span className="lead-pill is-stage">{titleCase(lead.company.lifecycle_stage)}</span>
  if (column === 'product') return <div className="lead-narrative"><strong>{lead.company.product_types.map(titleCase).join(' · ') || (strategy ? 'Product type unknown' : 'Software fit')}</strong><span>{lead.company.product_summary}</span>{lead.discovery.behavioral_summary ? <small>Observed: {lead.discovery.behavioral_summary}</small> : null}</div>
  if (researchCandidate && ['intent', 'outsourcing', 'budget', 'timing'].includes(column)) return <span className="lead-notes" title="Scoring is pending persona verification.">Pending</span>
  if (column === 'intent') return scoreCell(lead.qualification.product_intent.score, 6, lead.qualification.product_intent.summary)
  if (column === 'outsourcing') return scoreCell(lead.qualification.outsourcing_likelihood.score, 5, lead.qualification.outsourcing_likelihood.summary)
  if (column === 'budget') return scoreCell(lead.qualification.budget_readiness.score, 5, lead.qualification.budget_readiness.summary)
  if (column === 'timing') return scoreCell(lead.qualification.timing.score, 4, lead.qualification.timing.summary)
  if (column === 'status') return <InlineEdit ariaLabel={`${lead.identity.display_name} research status`} onSave={(value) => onSave('research.status', value)} options={LEAD_STATUSES.filter((status) => status !== 'qualified' || !leadQualificationBlockers(lead).length).map((status) => ({ value: status, label: strategy && status === 'review-required' ? 'Needs verification' : titleCase(status) }))} value={lead.research.status}><span className={`lead-status is-${lead.research.status}`}>{leadResearchStatusLabel(lead)}</span></InlineEdit>
  if (column === 'confidence' && fitLabel) return <span className="lead-pill" title={`Persona fit · read-only · ${fitDescription}`}>{fitLabel}</span>
  if (column === 'confidence') return <span className={`lead-confidence is-${lead.qualification.qualification_confidence}`}>{titleCase(lead.qualification.qualification_confidence)}</span>
  if (column === 'nextReview') return <InlineEdit ariaLabel={`${lead.identity.display_name} next review`} inputType="date" onSave={(value) => onSave('research.next_review_at', value)} value={dateEditorValue(lead.research.next_review_at)}><time>{lead.research.next_review_at ?? 'Not scheduled'}</time></InlineEdit>
  if (column === 'sources') return <EvidenceList evidence={lead.evidence} />
  return <InlineEdit ariaLabel={`${lead.identity.display_name} research notes`} onSave={(value) => onSave('research.notes', value)} value={lead.research.notes ?? ''}><span className="lead-notes">{lead.research.notes || 'Add note'}</span></InlineEdit>
}

const resourceSortValue = (resource: LeadResearchResource, column: ResourceColumn): string | number => {
  if (column === 'resource') return resource.name
  if (column === 'type') return resource.resource_type
  if (column === 'priority') return resource.priority
  if (column === 'access') return resource.access_level
  if (column === 'cadence') return resource.refresh_cadence
  if (column === 'status') return resource.status
  if (column === 'yield') return resource.accepted_leads
  if (column === 'checked') return resource.last_checked_at
  if (column === 'method') return resource.discovery_method
  if (column === 'why') return resource.why_useful
  if (column === 'evidence') return resource.evidence.length
  return resource.notes ?? ''
}

function ResourceCell({ column, onSave, resource }: { column: ResourceColumn; onSave: (field: string, value: string) => Promise<void>; resource: LeadResearchResource }) {
  if (column === 'resource') return <div className="lead-resource-name"><a href={resource.url} rel="noreferrer" target="_blank">{resource.name}</a>{resource.linkedin_url ? <a className="lead-secondary-link" href={resource.linkedin_url} rel="noreferrer" target="_blank">LinkedIn ↗</a> : null}<small>{resource.classification}</small></div>
  if (column === 'type') return <span className="lead-pill">{titleCase(resource.resource_type)}</span>
  if (column === 'priority') return <InlineEdit ariaLabel={`${resource.name} priority`} onSave={(value) => onSave('priority', value)} options={optionList(RESOURCE_PRIORITIES)} value={resource.priority}><span className={`lead-priority is-${resource.priority}`}>{titleCase(resource.priority)}</span></InlineEdit>
  if (column === 'access') return <span className="lead-pill">{titleCase(resource.access_level)}</span>
  if (column === 'cadence') return <InlineEdit ariaLabel={`${resource.name} cadence`} onSave={(value) => onSave('refresh_cadence', value)} options={optionList(RESOURCE_CADENCES)} value={resource.refresh_cadence}>{titleCase(resource.refresh_cadence)}</InlineEdit>
  if (column === 'status') return <InlineEdit ariaLabel={`${resource.name} status`} onSave={(value) => onSave('status', value)} options={optionList(RESOURCE_STATUSES)} value={resource.status}><span className={`lead-status is-${resource.status}`}>{titleCase(resource.status)}</span></InlineEdit>
  if (column === 'yield') return <span className="lead-yield"><strong>{resource.accepted_leads}</strong><small>{resource.candidates_found} found</small></span>
  if (column === 'checked') return <InlineEdit ariaLabel={`${resource.name} last checked`} inputType="date" onSave={(value) => onSave('last_checked_at', value)} value={dateEditorValue(resource.last_checked_at)}><time>{resource.last_checked_at}</time></InlineEdit>
  if (column === 'method') return <span className="lead-text-cell">{resource.discovery_method}</span>
  if (column === 'why') return <span className="lead-text-cell">{resource.why_useful}</span>
  if (column === 'evidence') return <EvidenceList evidence={resource.evidence} />
  return <InlineEdit ariaLabel={`${resource.name} notes`} onSave={(value) => onSave('notes', value)} value={resource.notes ?? ''}><span className="lead-notes">{resource.notes || 'Add note'}</span></InlineEdit>
}

const strategyLeadIds = (strategy: LeadResearchStrategyRecord) => [...new Set(strategy.runs.flatMap((run) => run.lead_ids))]
const latestStrategyRun = (strategy: LeadResearchStrategyRecord) => [...strategy.runs].sort((left, right) => right.created_at.localeCompare(left.created_at))[0]

function StrategyLeadsModal({ leads, strategy }: { leads: SaudiSoftwareLead[]; strategy: LeadResearchStrategyRecord }) {
  const [isOpen, setIsOpen] = useState(false)
  const titleId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads])
  const leadIds = strategyLeadIds(strategy)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false); return }
      if (event.key !== 'Tab') return
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
      if (!focusable.length) return
      const [first] = focusable
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [isOpen])

  return <>
    <button aria-expanded={isOpen} aria-haspopup="dialog" className="lead-evidence-trigger lead-strategy-leads-trigger" onClick={() => setIsOpen(true)} ref={triggerRef} type="button">{leadIds.length} leads</button>
    {isOpen ? createPortal(<div className="lead-evidence-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false) }}>
      <section aria-labelledby={titleId} aria-modal="true" className="lead-evidence-modal lead-strategy-leads-modal" ref={modalRef} role="dialog">
        <header><div><span>Dated strategy provenance</span><h2 id={titleId}>{strategy.label}</h2><p>{leadIds.length} unique leads across {strategy.runs.length} {strategy.runs.length === 1 ? 'run' : 'runs'}.</p></div><button aria-label="Close strategy leads" className="lead-evidence-close" onClick={() => setIsOpen(false)} ref={closeRef} type="button">×</button></header>
        <div className="lead-strategy-runs">
          {[...strategy.runs].sort((left, right) => right.created_at.localeCompare(left.created_at)).map((run) => <article key={run.id}>
            <header><div><strong>{run.observed_on}</strong><span>{run.id}</span></div><div><b>{run.lead_ids.length}</b> leads · <b>{run.metrics.new_candidates}</b> new · <b>{run.metrics.confirmed_fits}</b> confirmed</div></header>
            <p>{run.summary}</p>
            <div className="lead-strategy-linked-leads">{run.lead_ids.map((leadId) => {
              const lead = leadsById.get(leadId)
              return <div key={leadId}><div>{lead ? <a href={`/lead-research?strategy=${encodeURIComponent(strategy.id)}&q=${encodeURIComponent(lead.identity.display_name)}`}>{lead.identity.display_name}</a> : <strong>Unresolved lead</strong>}<span>{lead?.company.name ?? leadId}</span></div><time dateTime={lead?.research.discovered_at ?? run.observed_on}>Created {lead?.research.discovered_at ?? run.observed_on}</time></div>
            })}</div>
          </article>)}
        </div>
        <footer><span>Strategy, run IDs, lead links, and creation dates are read-only.</span><div><a className="lead-modal-link" href={`/lead-research?strategy=${encodeURIComponent(strategy.id)}`}>Open all leads</a><button onClick={() => setIsOpen(false)} type="button">Done</button></div></footer>
      </section>
    </div>, document.body) : null}
  </>
}

const strategySortValue = (strategy: LeadResearchStrategyRecord, column: StrategyColumn): string | number => {
  const latest = latestStrategyRun(strategy)
  if (column === 'strategy') return strategy.label
  if (column === 'created') return strategy.created_at
  if (column === 'status') return strategy.status
  if (column === 'priority') return strategy.priority
  if (column === 'cadence') return strategy.cadence
  if (column === 'runs') return strategy.runs.length
  if (column === 'leads') return strategyLeadIds(strategy).length
  if (column === 'yield') return latest?.metrics.new_candidates ?? 0
  if (column === 'worked') return strategy.insights.what_worked.join(' ')
  if (column === 'failed') return strategy.insights.what_did_not_work.join(' ')
  if (column === 'improvements') return strategy.insights.improvements.join(' ')
  if (column === 'review') return strategy.next_review_at ?? ''
  return strategy.notes ?? ''
}

const StrategyInsightList = ({ items }: { items: string[] }) => <ul className="lead-strategy-insight-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>

function StrategyCell({ column, leads, onSave, strategy }: { column: StrategyColumn; leads: SaudiSoftwareLead[]; onSave: (field: string, value: string) => Promise<void>; strategy: LeadResearchStrategyRecord }) {
  const latest = latestStrategyRun(strategy)
  if (column === 'strategy') return <div className="lead-narrative lead-strategy-name"><strong>{strategy.label}</strong><span>{strategy.objective}</span><small>v{strategy.version} · {strategy.persona_summary}</small><small className="lead-local-path">assets/lead-research/saudi-lead-strategies.json</small></div>
  if (column === 'created') return <div className="lead-narrative"><time dateTime={strategy.created_at}>{strategy.created_at.slice(0, 10)}</time><small>Updated {strategy.updated_at.slice(0, 10)}</small></div>
  if (column === 'status') return <InlineEdit ariaLabel={`${strategy.label} status`} onSave={(value) => onSave('status', value)} options={optionList(STRATEGY_STATUSES)} value={strategy.status}><span className={`lead-status is-${strategy.status}`}>{titleCase(strategy.status)}</span></InlineEdit>
  if (column === 'priority') return <InlineEdit ariaLabel={`${strategy.label} priority`} onSave={(value) => onSave('priority', value)} options={optionList(STRATEGY_PRIORITIES)} value={strategy.priority}><span className={`lead-priority is-${strategy.priority}`}>{titleCase(strategy.priority)}</span></InlineEdit>
  if (column === 'cadence') return <InlineEdit ariaLabel={`${strategy.label} cadence`} onSave={(value) => onSave('cadence', value)} options={optionList(STRATEGY_CADENCES)} value={strategy.cadence}>{titleCase(strategy.cadence)}</InlineEdit>
  if (column === 'runs') return <span className="lead-yield"><strong>{strategy.runs.length}</strong><small>dated</small></span>
  if (column === 'leads') return <StrategyLeadsModal leads={leads} strategy={strategy} />
  if (column === 'yield') return latest ? <div className="lead-narrative"><strong>{latest.metrics.new_candidates} new · {latest.metrics.carried_candidates} carried</strong><span>{latest.metrics.queries} queries · {latest.metrics.search_passes} passes · {latest.metrics.post_impressions} impressions</span><small>{latest.observed_on} · {latest.metrics.confirmed_fits} confirmed fits</small></div> : <span>—</span>
  if (column === 'worked') return <StrategyInsightList items={strategy.insights.what_worked} />
  if (column === 'failed') return <StrategyInsightList items={strategy.insights.what_did_not_work} />
  if (column === 'improvements') return <StrategyInsightList items={strategy.insights.improvements} />
  if (column === 'review') return <InlineEdit ariaLabel={`${strategy.label} next review`} inputType="date" onSave={(value) => onSave('next_review_at', value)} value={dateEditorValue(strategy.next_review_at)}><time>{strategy.next_review_at ?? 'Not scheduled'}</time></InlineEdit>
  return <InlineEdit ariaLabel={`${strategy.label} research notes`} onSave={(value) => onSave('notes', value)} value={strategy.notes ?? ''}><span className="lead-notes">{strategy.notes || 'Add note'}</span></InlineEdit>
}

function PersonaView({ data }: { data: LeadResearchResponse }) {
  const persona = data.persona
  return (
    <div className="lead-persona-view">
      <section className="lead-persona-definition">
        <span>Ideal customer profile</span>
        <h2>{persona.title}</h2>
        <p>{persona.target_definition}</p>
        <small>{persona.geography_rule}</small>
      </section>
      <section className="lead-persona-grid">
        {persona.lanes.map((lane) => <article key={lane.id}><span>{lane.target_count} target records</span><h3>{lane.label}</h3><p>{lane.definition}</p></article>)}
      </section>
      <section className="lead-persona-section">
        <header><h3>Qualification gates</h3><span>Every active lead must pass all four</span></header>
        <div className="lead-rule-grid">{persona.required_gates.map((gate) => <article key={gate.id}><strong>{gate.label}</strong><p>{gate.rule}</p></article>)}</div>
      </section>
      <section className="lead-persona-section">
        <header><h3>Scoring model</h3><span>Source-backed values only · 20 points maximum</span></header>
        <div className="lead-score-grid">{persona.dimensions.map((dimension) => <article key={dimension.id}><h4>{dimension.label}<b>{dimension.maximum}</b></h4>{dimension.levels.map((level) => <p key={level.score}><strong>{level.score}</strong><span>{level.rule}</span></p>)}</article>)}</div>
      </section>
      <section className="lead-persona-section">
        <header><h3>Evidence policy</h3><span>Read-only research contract</span></header>
        <ul>{persona.evidence_policy.map((rule) => <li key={rule}>{rule}</li>)}</ul>
      </section>
      <section className="lead-reference-customer">
        <span>Reference customer · excluded from prospects</span>
        {persona.reference_customers.map((customer) => <article key={customer.id}><a href={customer.linkedin_url} rel="noreferrer" target="_blank">{customer.display_name}</a><p>{customer.evidence_basis}</p><small>{customer.discovery_signals.join(' · ')}</small></article>)}
      </section>
    </div>
  )
}

export function LeadResearch() {
  const [data, setData] = useState<LeadResearchResponse | null>(null)
  const [error, setError] = useState('')
  const { filters, setFilters, update } = useUrlFilters()
  const hasStrategyLeads = Boolean(data?.leads.some((lead) => lead.discovery.strategy))
  const hasUnattributedLeads = Boolean(data?.leads.some((lead) => !lead.discovery.strategy))
  const { setSortDirection: setLeadSortDirection, setSortField: setLeadSortField, sortDirection: leadSortDirection, sortField: leadSortField } = usePersistedSort<LeadColumn>('eign-lead-research-leads.row-sort.v1', { field: 'band', direction: 'desc' }, LEAD_COLUMNS.map((column) => column.key))
  const { setSortDirection: setResourceSortDirection, setSortField: setResourceSortField, sortDirection: resourceSortDirection, sortField: resourceSortField } = usePersistedSort<ResourceColumn>('eign-lead-research-resources.row-sort.v1', { field: 'priority', direction: 'asc' }, RESOURCE_COLUMNS.map((column) => column.key))
  const { setSortDirection: setStrategySortDirection, setSortField: setStrategySortField, sortDirection: strategySortDirection, sortField: strategySortField } = usePersistedSort<StrategyColumn>('eign-lead-research-strategies.row-sort.v1', { field: 'created', direction: 'desc' }, STRATEGY_COLUMNS.map((column) => column.key))
  const sortLeadsBy = (field: LeadColumn) => { if (field === leadSortField) setLeadSortDirection((value) => value === 'asc' ? 'desc' : 'asc'); else { setLeadSortField(field); setLeadSortDirection('asc') } }
  const sortResourcesBy = (field: ResourceColumn) => { if (field === resourceSortField) setResourceSortDirection((value) => value === 'asc' ? 'desc' : 'asc'); else { setResourceSortField(field); setResourceSortDirection('asc') } }
  const sortStrategiesBy = (field: StrategyColumn) => { if (field === strategySortField) setStrategySortDirection((value) => value === 'asc' ? 'desc' : 'asc'); else { setStrategySortField(field); setStrategySortDirection('asc') } }
  const leadColumns = useOrderedColumns('lead-research-leads', LEAD_COLUMNS, leadSortField, leadSortDirection, sortLeadsBy)
  const displayedLeadColumns = leadColumns.ordered.filter((column) => hasStrategyLeads || column.key !== 'strategy')
  const resourceColumns = useOrderedColumns('lead-research-resources', RESOURCE_COLUMNS, resourceSortField, resourceSortDirection, sortResourcesBy)
  const strategyColumns = useOrderedColumns('lead-research-strategies', STRATEGY_COLUMNS, strategySortField, strategySortDirection, sortStrategiesBy)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Saudi lead research · EIGN Data Workspace'
    let cancelled = false
    void fetch('/api/lead-research').then(async (response) => {
      const result = await response.json().catch(() => null) as LeadResearchResponse | { error?: string } | null
      if (!response.ok || !result || !('leads' in result)) throw new Error(result && 'error' in result ? result.error : `The data service returned ${response.status}.`)
      if (!cancelled) setData(result)
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load lead research.') })
    return () => { cancelled = true; document.title = previousTitle }
  }, [])

  const patchRow = async <Row extends SaudiSoftwareLead | LeadResearchResource | LeadResearchStrategyRecord>(kind: 'leads' | 'resources' | 'strategies', id: string, field: string, value: string) => {
    setError('')
    const response = await fetch(`/api/lead-research/${kind}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ field, value }) })
    const result = await response.json().catch(() => null) as { error?: string; lead?: SaudiSoftwareLead; resource?: LeadResearchResource; strategy?: LeadResearchStrategyRecord; stats?: LeadResearchResponse['stats'] } | null
    const row = (kind === 'leads' ? result?.lead : kind === 'resources' ? result?.resource : result?.strategy) as Row | undefined
    if (!response.ok || !row) { const message = result?.error || `The data service returned ${response.status}.`; setError(message); throw new Error(message) }
    setData((current) => current ? { ...current, stats: result?.stats ?? current.stats, [kind]: current[kind].map((candidate) => candidate.id === id ? row : candidate) } as LeadResearchResponse : current)
  }

  const patchEngagement = async (leadId: string, field: string, value: string) => {
    setError('')
    const response = await fetch(`/api/lead-research/engagements/${encodeURIComponent(leadId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ field, value }) })
    const result = await response.json().catch(() => null) as { engagement?: LeadEngagement; error?: string; stats?: LeadResearchResponse['stats'] } | null
    if (!response.ok || !result?.engagement) { const message = result?.error || `The data service returned ${response.status}.`; setError(message); throw new Error(message) }
    setData((current) => current ? { ...current, stats: result.stats ?? current.stats, engagements: current.engagements.map((engagement) => engagement.lead_id === leadId ? result.engagement! : engagement) } : current)
  }

  const addEngagementEvent = async (leadId: string, input: Omit<LeadEngagementEvent, 'id'>) => {
    setError('')
    const response = await fetch(`/api/lead-research/engagements/${encodeURIComponent(leadId)}/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
    const result = await response.json().catch(() => null) as { engagement?: LeadEngagement; error?: string; stats?: LeadResearchResponse['stats'] } | null
    if (!response.ok || !result?.engagement) { const message = result?.error || `The data service returned ${response.status}.`; setError(message); throw new Error(message) }
    setData((current) => current ? { ...current, stats: result.stats ?? current.stats, engagements: current.engagements.map((engagement) => engagement.lead_id === leadId ? result.engagement! : engagement) } : current)
  }

  const normalizedQuery = filters.q.trim().toLowerCase()
  const engagementsByLeadId = useMemo(() => new Map((data?.engagements ?? []).map((engagement) => [engagement.lead_id, engagement])), [data?.engagements])
  const leads = useMemo(() => (data?.leads ?? []).filter((lead) => {
    const engagement = engagementsByLeadId.get(lead.id) ?? emptyLeadEngagement(lead.id)
    if (!matchesLeadStrategy(lead, filters.strategy)) return false
    if (filters.lane !== 'all' && lead.discovery.lane !== filters.lane) return false
    if (filters.band !== 'all' && (isLeadResearchCandidate(lead) || lead.qualification.band !== filters.band)) return false
    if (filters.status !== 'all' && lead.research.status !== filters.status) return false
    if (filters.resource !== 'all' && !lead.discovery.resource_ids.includes(filters.resource)) return false
    if (!normalizedQuery) return true
    return [lead.identity.display_name, lead.identity.current_title, lead.company.name, lead.company.city, lead.company.sector, lead.company.product_summary, lead.discovery.behavioral_summary, lead.discovery.strategy?.label, lead.qualification.persona_review?.summary, lead.research.notes, engagementStatusLabel(engagement.status), engagement.primary_channel, engagement.notes, ...engagement.events.map((event) => event.summary)].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery)
  }).sort((left, right) => {
    const leftValue = leadSortValue(left, engagementsByLeadId.get(left.id) ?? emptyLeadEngagement(left.id), leadSortField); const rightValue = leadSortValue(right, engagementsByLeadId.get(right.id) ?? emptyLeadEngagement(right.id), leadSortField)
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : textCollator.compare(String(leftValue), String(rightValue))
    return comparison ? comparison * (leadSortDirection === 'asc' ? 1 : -1) : textCollator.compare(left.identity.display_name, right.identity.display_name)
  }), [data?.leads, engagementsByLeadId, filters.band, filters.lane, filters.resource, filters.status, filters.strategy, leadSortDirection, leadSortField, normalizedQuery])
  const resources = useMemo(() => (data?.resources ?? []).filter((resource) => {
    if (filters.status !== 'all' && resource.status !== filters.status) return false
    if (filters.resource !== 'all' && resource.resource_type !== filters.resource) return false
    if (!normalizedQuery) return true
    return [resource.name, resource.resource_type, resource.discovery_method, resource.why_useful, resource.notes].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery)
  }).sort((left, right) => {
    const leftValue = resourceSortValue(left, resourceSortField); const rightValue = resourceSortValue(right, resourceSortField)
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : textCollator.compare(String(leftValue), String(rightValue))
    return comparison ? comparison * (resourceSortDirection === 'asc' ? 1 : -1) : textCollator.compare(left.name, right.name)
  }), [data?.resources, filters.resource, filters.status, normalizedQuery, resourceSortDirection, resourceSortField])
  const strategies = useMemo(() => (data?.strategies ?? []).filter((strategy) => {
    if (filters.status !== 'all' && strategy.status !== filters.status) return false
    if (!normalizedQuery) return true
    return [strategy.label, strategy.objective, strategy.persona_summary, strategy.notes, ...strategy.proven_queries, ...strategy.low_yield_queries, ...strategy.next_queries_to_test, ...strategy.insights.what_worked, ...strategy.insights.what_did_not_work, ...strategy.insights.improvements].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery)
  }).sort((left, right) => {
    const leftValue = strategySortValue(left, strategySortField); const rightValue = strategySortValue(right, strategySortField)
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number' ? leftValue - rightValue : textCollator.compare(String(leftValue), String(rightValue))
    return comparison ? comparison * (strategySortDirection === 'asc' ? 1 : -1) : textCollator.compare(left.label, right.label)
  }), [data?.strategies, filters.status, normalizedQuery, strategySortDirection, strategySortField])
  const leadArchive = useRowArchive({ tableId: 'lead-research-leads', visibleRowIds: leads.map((lead) => lead.id) })
  const resourceArchive = useRowArchive({ tableId: 'lead-research-resources', visibleRowIds: resources.map((resource) => resource.id) })
  const strategyArchive = useRowArchive({ tableId: 'lead-research-strategies', visibleRowIds: strategies.map((strategy) => strategy.id) })
  const displayedLeads = leads.filter((lead) => leadArchive.showArchived === leadArchive.isArchived(lead.id))
  const displayedResources = resources.filter((resource) => resourceArchive.showArchived === resourceArchive.isArchived(resource.id))
  const displayedStrategies = strategies.filter((strategy) => strategyArchive.showArchived === strategyArchive.isArchived(strategy.id))
  const today = new Date().toISOString().slice(0, 10)
  const matchingEngagements = leads.map((lead) => engagementsByLeadId.get(lead.id) ?? emptyLeadEngagement(lead.id))
  const awaitingReplyCount = matchingEngagements.filter((engagement) => engagement.status === 'contacted-awaiting-reply').length
  const repliedCount = matchingEngagements.filter((engagement) => engagement.status === 'replied').length
  const meetingCount = matchingEngagements.filter((engagement) => engagement.status === 'meeting-scheduled').length
  const followUpDueCount = matchingEngagements.filter((engagement) => engagement.status === 'follow-up-due'
    || Boolean(engagement.next_follow_up_at && engagement.next_follow_up_at <= today && !['closed', 'not-interested'].includes(engagement.status))).length

  if (!data && !error) return <main className="loading-view"><span className="loading-spinner" /> Loading Saudi lead research…</main>
  if (!data) return <main className="error-view"><h1>Saudi lead research unavailable</h1><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></main>
  const statusValues = filters.view === 'resources' ? RESOURCE_STATUSES : filters.view === 'strategies' ? STRATEGY_STATUSES : LEAD_STATUSES

  return (
    <div className={`app-shell lead-research-page ${filters.view === 'leads' ? 'is-compact-leads' : ''}`}>
      <header className="workspace-header"><a className="workspace-brand" href="/">EI</a><div className="workspace-title"><strong>EIGN data workspace</strong><span>Source-backed Saudi software opportunities</span></div><WorkspaceNav active="lead-research" /></header>
      <main className="lead-research-main">
        <section className="lead-research-directory">
          {filters.view !== 'leads' ? <header className="lead-research-heading"><div><span>Research only · no outreach</span><h1>Saudi lead research</h1><p>Founders and operating businesses building mobile-first software products</p></div><div className="lead-research-stats"><span><b>{data.stats.leads}</b> {hasStrategyLeads ? 'records' : 'leads'}</span><span><b>{data.stats.acceptedResources}</b> accepted resources</span><span><b>{data.stats.strategies}</b> strategies</span><span><b>{data.stats.strategyRuns}</b> runs</span></div></header> : null}
          <nav aria-label="Lead research views" className="lead-research-tabs">{(['leads', 'resources', 'strategies', 'persona'] as const).map((view) => <button className={filters.view === view ? 'is-active' : ''} key={view} onClick={() => update({ view, status: 'all', resource: 'all' })} type="button">{titleCase(view)}{view === 'leads' ? ` ${data.stats.leads}` : view === 'resources' ? ` ${data.stats.resources}` : view === 'strategies' ? ` ${data.stats.strategies}` : ''}</button>)}</nav>
          {filters.view === 'strategies' ? <aside className="vc-method-note" aria-label="Strategy data file"><strong>Local strategy registry</strong><span>Saved in <code>assets/lead-research/saudi-lead-strategies.json</code>. Strategy methods, insights, dated runs, and lead relationships are versioned and read-only; status, priority, cadence, review date, and notes stay editable.</span></aside> : null}
          {filters.view === 'leads' ? <div className="lead-research-breakdown" aria-label="Lead research and follow-up summary"><span>Matching <b>{leads.length}</b></span><span>Needs verification <b>{leads.filter(isLeadResearchCandidate).length}</b></span><span>Qualified <b>{leads.filter((lead) => lead.research.status === 'qualified').length}</b></span><span>Awaiting reply <b>{awaitingReplyCount}</b></span><span>Replied <b>{repliedCount}</b></span><span>Follow-up due <b>{followUpDueCount}</b></span><span>Meetings <b>{meetingCount}</b></span></div> : filters.view === 'resources' ? <div className="lead-research-breakdown" aria-label="Resource research summary">{Object.entries(data.stats.resourceTypes).map(([type, count]) => <span key={type}>{titleCase(type)} <b>{count}</b></span>)}<span>Attributed accepted leads <b>{Object.values(data.stats.acceptedLeadYieldBySource).reduce((total, count) => total + count, 0)}</b></span></div> : filters.view === 'strategies' ? <div className="lead-research-breakdown" aria-label="Strategy research summary"><span>Strategies <b>{data.stats.strategies}</b></span><span>Dated runs <b>{data.stats.strategyRuns}</b></span><span>Connected leads <b>{data.stats.strategyLinkedLeads}</b></span><span>Confirmed fits <b>{data.stats.confirmedStrategyFits ?? 0}</b></span></div> : null}
          {filters.view !== 'persona' ? <div className="lead-research-toolbar">
            <label className="lead-research-search"><span>Search</span><input aria-label="Search lead research" onChange={(event) => update({ q: event.target.value })} placeholder={filters.view === 'leads' ? 'Founder, company, product, sector, or note' : filters.view === 'resources' ? 'Resource, method, purpose, or note' : 'Strategy, query, insight, improvement, or note'} type="search" value={filters.q} /></label>
            {filters.view === 'leads' && (hasStrategyLeads || filters.strategy !== 'all') ? <label><span>Strategy</span><select aria-label="Filter by research strategy" onChange={(event) => update({ strategy: event.target.value as LeadStrategyFilter })} value={filters.strategy}><option value="all">All strategies</option>{data.strategies.map((strategy) => <option key={strategy.id} value={strategy.id}>{strategy.label}</option>)}{hasUnattributedLeads || filters.strategy === 'legacy' ? <option value="legacy">Unattributed / legacy</option> : null}</select></label> : null}
            {filters.view === 'leads' ? <><label><span>Lane</span><select aria-label="Filter by lead lane" onChange={(event) => update({ lane: event.target.value as Filters['lane'] })} value={filters.lane}><option value="all">All lanes</option><option value="new-founder">New founder</option><option value="stealth-or-precompany">Stealth / pre-company</option><option value="sme-digital-build">SME digital build</option></select></label><label><span>Band</span><select aria-label="Filter by lead band" onChange={(event) => update({ band: event.target.value as Filters['band'] })} value={filters.band}><option value="all">All bands</option>{(['A', 'B', 'C', 'D'] as const).map((band) => <option key={band} value={band}>Band {band}</option>)}</select></label></> : null}
            <label><span>Status</span><select aria-label="Filter by research status" onChange={(event) => update({ status: event.target.value })} value={filters.status}><option value="all">All statuses</option>{statusValues.map((status) => <option key={status} value={status}>{filters.view === 'leads' && hasStrategyLeads && status === 'review-required' ? 'Needs verification / Review required' : titleCase(status)}</option>)}</select></label>
            {filters.view !== 'strategies' ? <label><span>{filters.view === 'leads' ? 'Source' : 'Resource type'}</span><select aria-label="Filter by resource" onChange={(event) => update({ resource: event.target.value })} value={filters.resource}><option value="all">All resources</option>{filters.view === 'leads' ? data.resources.filter((resource) => resource.classification === 'accepted').map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>) : Object.keys(data.stats.resourceTypes).map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></label> : null}
            <button className="lead-clear" onClick={() => setFilters({ band: 'all', lane: 'all', q: '', resource: 'all', status: 'all', strategy: 'all', view: filters.view })} type="button">Clear</button>
          </div> : null}
          {error ? <div className="founder-save-error" role="alert">{error}</div> : null}
          {filters.view === 'persona' ? <PersonaView data={data} /> : filters.view === 'leads' ? <>
            <ArchiveToolbar archive={leadArchive} noun="leads" />
            <div className="vc-table-wrap lead-research-table-wrap"><ResizableDataTable className="company-table vc-table lead-research-table" columns={displayedLeadColumns} getHeaderProps={leadColumns.getHeaderProps} renderHeader={leadColumns.renderHeader} selection={{ allSelected: leadArchive.allVisibleSelected, onToggle: leadArchive.toggleAllVisible, someSelected: leadArchive.someVisibleSelected }} storageKey="eign-lead-research-leads.column-widths.v1"><tbody>{displayedLeads.map((lead) => {
              const engagement = engagementsByLeadId.get(lead.id) ?? emptyLeadEngagement(lead.id)
              return <tr key={lead.id}><td className="row-select-cell"><RowSelectionCell checked={leadArchive.selectedIds.has(lead.id)} label={`Select ${lead.identity.display_name}`} onToggle={() => leadArchive.toggleRow(lead.id)} /></td>{displayedLeadColumns.map((column) => <td className={['activity', 'engagementNotes', 'product', 'notes'].includes(column.key) ? 'lead-wide-cell' : undefined} key={column.key}><LeadCell column={column.key} engagement={engagement} lead={lead} onAddEngagement={(input) => addEngagementEvent(lead.id, input)} onSave={(field, value) => patchRow('leads', lead.id, field, value)} onSaveEngagement={(field, value) => patchEngagement(lead.id, field, value)} /></td>)}</tr>
            })}</tbody></ResizableDataTable></div>
          </> : filters.view === 'strategies' ? <>
            <ArchiveToolbar archive={strategyArchive} noun="strategies" />
            <div className="result-meta"><span>{displayedStrategies.length} visible of {data.strategies.length} · {data.stats.strategyRuns} dated runs · {data.stats.strategyLinkedLeads} connected leads</span><strong>Runs, lead relationships, creation dates, methods, and insights are read-only</strong></div>
            <div className="vc-table-wrap lead-research-table-wrap"><ResizableDataTable className="company-table vc-table lead-research-table lead-strategy-table" columns={strategyColumns.ordered} getHeaderProps={strategyColumns.getHeaderProps} renderHeader={strategyColumns.renderHeader} selection={{ allSelected: strategyArchive.allVisibleSelected, onToggle: strategyArchive.toggleAllVisible, someSelected: strategyArchive.someVisibleSelected }} storageKey="eign-lead-research-strategies.column-widths.v1"><tbody>{displayedStrategies.map((strategy) => <tr key={strategy.id}><td className="row-select-cell"><RowSelectionCell checked={strategyArchive.selectedIds.has(strategy.id)} label={`Select ${strategy.label}`} onToggle={() => strategyArchive.toggleRow(strategy.id)} /></td>{strategyColumns.ordered.map((column) => <td className={['strategy', 'yield', 'worked', 'failed', 'improvements', 'notes'].includes(column.key) ? 'lead-wide-cell' : undefined} key={column.key}><StrategyCell column={column.key} leads={data.leads} onSave={(field, value) => patchRow('strategies', strategy.id, field, value)} strategy={strategy} /></td>)}</tr>)}</tbody></ResizableDataTable></div>
          </> : <>
            <ArchiveToolbar archive={resourceArchive} noun="resources" />
            <div className="result-meta"><span>{displayedResources.length} visible of {data.resources.length} · {data.stats.acceptedResources} accepted</span><strong>Priority, cadence, status, last checked, and notes are editable</strong></div>
            <div className="vc-table-wrap lead-research-table-wrap"><ResizableDataTable className="company-table vc-table lead-research-table" columns={resourceColumns.ordered} getHeaderProps={resourceColumns.getHeaderProps} renderHeader={resourceColumns.renderHeader} selection={{ allSelected: resourceArchive.allVisibleSelected, onToggle: resourceArchive.toggleAllVisible, someSelected: resourceArchive.someVisibleSelected }} storageKey="eign-lead-research-resources.column-widths.v1"><tbody>{displayedResources.map((resource) => <tr key={resource.id}><td className="row-select-cell"><RowSelectionCell checked={resourceArchive.selectedIds.has(resource.id)} label={`Select ${resource.name}`} onToggle={() => resourceArchive.toggleRow(resource.id)} /></td>{resourceColumns.ordered.map((column) => <td className={['method', 'why', 'notes'].includes(column.key) ? 'lead-wide-cell' : undefined} key={column.key}><ResourceCell column={column.key} onSave={(field, value) => patchRow('resources', resource.id, field, value)} resource={resource} /></td>)}</tr>)}</tbody></ResizableDataTable></div>
          </>}
          {filters.view !== 'leads' ? <footer className="vc-method-note"><strong>Method</strong><span>Public professional information only. Identity, Saudi-market relevance, authority, software fit, scores, and provenance remain source-backed and read-only. Inspirational follows and likes are discovery tags, never qualification evidence.</span></footer> : null}
        </section>
      </main>
    </div>
  )
}
