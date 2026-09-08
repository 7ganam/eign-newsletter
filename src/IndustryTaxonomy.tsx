import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { WorkspaceNav } from './WorkspaceNav'
import './IndustryTaxonomy.css'

type SampleCompany = {
  crunchbaseUrl: string
  headquarters: string
  industries: string[]
  name: string
  shortDescription: string
  totalRaisedUsd: number
  website: string
}

type IndustryLabel = {
  companyCount: number
  name: string
  sampleCompanies: SampleCompany[]
}

type IndustryGroup = {
  createdAt: string
  id: string
  labels: string[]
  name: string
  updatedAt: string
}

type TaxonomyResponse = {
  groups: IndustryGroup[]
  industries: IndustryLabel[]
  source: {
    chartFile: string
    companyFile: string
    groupsFile: string
    provider: string
    updatedAt: string
  }
  summary: {
    assigned: number
    companies: number
    groups: number
    industries: number
    unassigned: number
  }
}

type GroupMutationResponse = {
  group?: IndustryGroup
  groups: IndustryGroup[]
  updatedAt: string
}

type LabelFilter = 'all' | 'assigned' | 'unassigned' | `group:${string}`
type LabelSort = 'alphabetical' | 'company-count'

const formatUsd = (amount: number) => amount > 0 ? new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 1,
  notation: 'compact',
  style: 'currency',
}).format(amount) : 'Funding undisclosed'

const snapshotLabel = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown snapshot' : new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const initials = (name: string) => name
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toLocaleUpperCase()

const parseResponse = async <T,>(response: Response): Promise<T> => {
  const result = await response.json().catch(() => null) as (T & { error?: string }) | null
  if (!response.ok) throw new Error(result?.error || `The data service returned ${response.status}.`)
  if (!result) throw new Error('The data service returned an empty response.')
  return result
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="8.2" cy="8.2" fill="none" r="5.3" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.1 12.1 4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IndustryTaxonomy() {
  const [data, setData] = useState<TaxonomyResponse | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LabelFilter>('unassigned')
  const [sort, setSort] = useState<LabelSort>('alphabetical')
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(() => new Set())
  const [focusedLabel, setFocusedLabel] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [targetGroupId, setTargetGroupId] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [groupNameDraft, setGroupNameDraft] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [groupQuery, setGroupQuery] = useState('')
  const [moveLabelName, setMoveLabelName] = useState('')
  const [moveGroupQuery, setMoveGroupQuery] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Industry groups · EIGN Data Workspace'
    fetch('/api/yc-industry-taxonomy')
      .then((response) => parseResponse<TaxonomyResponse>(response))
      .then((result) => {
        setData(result)
        setFocusedLabel(result.industries.find((industry) => industry.name === 'E-Commerce')?.name ?? result.industries[0]?.name ?? '')
        if (result.groups[0]) {
          setSelectedGroupId(result.groups[0].id)
          setTargetGroupId(result.groups[0].id)
          setGroupNameDraft(result.groups[0].name)
        }
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the industry grouping workspace.'))
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    if (!moveLabelName) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setMoveLabelName('')
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [moveLabelName, saving])

  const assignmentByLabel = useMemo(() => new Map(
    data?.groups.flatMap((group) => group.labels.map((label) => [label, group] as const)) ?? [],
  ), [data?.groups])

  const selectedGroup = data?.groups.find((group) => group.id === selectedGroupId)
  const focusedIndustry = data?.industries.find((industry) => industry.name === focusedLabel)
  const movingIndustry = data?.industries.find((industry) => industry.name === moveLabelName)
  const movingFromGroup = assignmentByLabel.get(moveLabelName)

  const updateGroups = (groups: IndustryGroup[]) => {
    setData((current) => {
      if (!current) return current
      const assigned = new Set(groups.flatMap((group) => group.labels)).size
      return {
        ...current,
        groups,
        summary: {
          ...current.summary,
          assigned,
          groups: groups.length,
          unassigned: current.industries.length - assigned,
        },
      }
    })
  }

  const visibleIndustries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const industries = (data?.industries ?? []).filter((industry) => {
      if (normalizedQuery && !industry.name.toLocaleLowerCase().includes(normalizedQuery)) return false
      const group = assignmentByLabel.get(industry.name)
      if (filter === 'assigned' && !group) return false
      if (filter === 'unassigned' && group) return false
      if (filter.startsWith('group:') && group?.id !== filter.slice(6)) return false
      return true
    })
    return [...industries].sort((left, right) => sort === 'company-count'
      ? right.companyCount - left.companyCount || left.name.localeCompare(right.name)
      : left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
  }, [assignmentByLabel, data?.industries, filter, query, sort])

  const ungroupedIndustries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return (data?.industries ?? [])
      .filter((industry) => !assignmentByLabel.has(industry.name))
      .filter((industry) => !normalizedQuery || industry.name.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
  }, [assignmentByLabel, data?.industries, query])

  const visibleGroups = useMemo(() => {
    const normalizedQuery = groupQuery.trim().toLocaleLowerCase()
    if (!normalizedQuery) return data?.groups ?? []
    return (data?.groups ?? []).filter((group) => group.name.toLocaleLowerCase().includes(normalizedQuery)
      || group.labels.some((label) => label.toLocaleLowerCase().includes(normalizedQuery)))
  }, [data?.groups, groupQuery])

  const moveGroupOptions = useMemo(() => {
    const normalizedQuery = moveGroupQuery.trim().toLocaleLowerCase()
    return [...(data?.groups ?? [])]
      .filter((group) => !normalizedQuery || group.name.toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
  }, [data?.groups, moveGroupQuery])

  const groupCompanyExamples = useMemo(() => {
    const industriesByName = new Map((data?.industries ?? []).map((industry) => [industry.name, industry]))
    return new Map((data?.groups ?? []).map((group) => {
      const uniqueCompanies = new Map<string, SampleCompany>()
      group.labels.forEach((label) => {
        industriesByName.get(label)?.sampleCompanies.forEach((company) => {
          if (!uniqueCompanies.has(company.crunchbaseUrl)) uniqueCompanies.set(company.crunchbaseUrl, company)
        })
      })
      const examples = [...uniqueCompanies.values()]
        .sort((left, right) => right.totalRaisedUsd - left.totalRaisedUsd || left.name.localeCompare(right.name))
        .slice(0, 5)
      return [group.id, examples] as const
    }))
  }, [data?.groups, data?.industries])

  const mutateGroup = async (groupId: string, body: { labels?: string[]; name?: string }) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await fetch(`/api/yc-industry-taxonomy/groups/${encodeURIComponent(groupId)}`, {
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      }).then((response) => parseResponse<GroupMutationResponse>(response))
      updateGroups(result.groups)
      return result
    } finally {
      setSaving(false)
    }
  }

  const createGroup = async (event: FormEvent) => {
    event.preventDefault()
    if (!newGroupName.trim() || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await fetch('/api/yc-industry-taxonomy/groups', {
        body: JSON.stringify({ name: newGroupName }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      }).then((response) => parseResponse<GroupMutationResponse>(response))
      updateGroups(result.groups)
      if (result.group) {
        setSelectedGroupId(result.group.id)
        setTargetGroupId(result.group.id)
        setGroupNameDraft(result.group.name)
        setFilter('unassigned')
      }
      setNewGroupName('')
      setShowCreate(false)
      setNotice(`Created “${result.group?.name ?? 'group'}”. Select labels to add to it.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create the group.')
    } finally {
      setSaving(false)
    }
  }

  const addSelectedToGroup = async () => {
    const target = data?.groups.find((group) => group.id === targetGroupId) ?? selectedGroup
    if (!target || !selectedLabels.size || saving) return
    try {
      await mutateGroup(target.id, { labels: [...new Set([...target.labels, ...selectedLabels])] })
      setNotice(`Moved ${selectedLabels.size.toLocaleString()} label${selectedLabels.size === 1 ? '' : 's'} into “${target.name}”.`)
      setSelectedLabels(new Set())
      setSelectedGroupId(target.id)
      setGroupNameDraft(target.name)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add the labels to the group.')
    }
  }

  const renameSelectedGroup = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedGroup || groupNameDraft.trim() === selectedGroup.name || saving) return
    try {
      const result = await mutateGroup(selectedGroup.id, { name: groupNameDraft })
      const name = result.group?.name ?? groupNameDraft.trim()
      setGroupNameDraft(name)
      setShowRename(false)
      setNotice(`Renamed the group to “${name}”.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to rename the group.')
    }
  }

  const removeLabelFromGroup = async (group: IndustryGroup, label: string) => {
    try {
      await mutateGroup(group.id, { labels: group.labels.filter((candidate) => candidate !== label) })
      setNotice(`Removed “${label}” from “${group.name}”.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove the label from the group.')
    }
  }

  const moveLabel = async (destinationGroupId: string) => {
    const label = moveLabelName
    const fromGroup = assignmentByLabel.get(label)
    const destination = data?.groups.find((group) => group.id === destinationGroupId)
    if (!label || !destination || destination.id === fromGroup?.id || saving) return
    try {
      await mutateGroup(destination.id, { labels: [...new Set([...destination.labels, label])] })
      setNotice(fromGroup
        ? `Moved “${label}” from “${fromGroup.name}” to “${destination.name}”.`
        : `Added “${label}” to “${destination.name}”.`)
      setMoveLabelName('')
      setMoveGroupQuery('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to move the label.')
    }
  }

  const ungroupLabel = async () => {
    const label = moveLabelName
    const fromGroup = assignmentByLabel.get(label)
    if (!label || !fromGroup || saving) return
    try {
      await mutateGroup(fromGroup.id, { labels: fromGroup.labels.filter((candidate) => candidate !== label) })
      setNotice(`Moved “${label}” back to Ungrouped.`)
      setMoveLabelName('')
      setMoveGroupQuery('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to ungroup the label.')
    }
  }

  const openGroupPicker = (label: string) => {
    setMoveLabelName(label)
    setMoveGroupQuery('')
  }

  const toggleLabel = (label: string) => {
    setSelectedLabels((current) => {
      const next = new Set(current)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const selectGroup = (group: IndustryGroup) => {
    setSelectedGroupId(group.id)
    setTargetGroupId(group.id)
    setGroupNameDraft(group.name)
    setSelectedLabels(new Set())
  }

  return (
    <div className="app-shell taxonomy-page">
      <header className="workspace-header">
        <a className="workspace-brand" href="/">EI</a>
        <div className="workspace-title"><strong>EIGN data workspace</strong><span>Companies, capital, and ecosystem directories</span></div>
        <WorkspaceNav active="posts" />
      </header>

      <main className="taxonomy-main">
        <div className="taxonomy-breadcrumbs">
          <a href="/posts/industry-funding-by-year">← Funding by industry</a>
          <span>Chart preparation / taxonomy</span>
        </div>

        <section className="taxonomy-hero">
          <div>
            <span className="taxonomy-kicker">Industry label workshop</span>
            <h1>Turn a noisy vocabulary into a useful map.</h1>
            <p>Create a named group, inspect the companies behind any label, then collect overlapping labels into one chart category.</p>
          </div>
          <aside>
            <span className="taxonomy-lock">Source locked</span>
            <strong>Crunchbase stays untouched.</strong>
            <p>Every decision is saved only in the chart-group overlay.</p>
          </aside>
        </section>

        <section className="taxonomy-stats" aria-label="Industry grouping progress">
          <div><span>Source labels</span><strong>{data?.summary.industries.toLocaleString() ?? '—'}</strong></div>
          <div><span>Named groups</span><strong>{data?.summary.groups.toLocaleString() ?? '—'}</strong></div>
          <div><span>Grouped labels</span><strong>{data?.summary.assigned.toLocaleString() ?? '—'}</strong></div>
          <div><span>Still ungrouped</span><strong>{data?.summary.unassigned.toLocaleString() ?? '—'}</strong></div>
          <div><span>Companies indexed</span><strong>{data?.summary.companies.toLocaleString() ?? '—'}</strong></div>
        </section>

        {error && <div className="taxonomy-alert taxonomy-alert--error" role="alert"><strong>Couldn’t save that change.</strong><span>{error}</span><button onClick={() => setError('')} type="button">Dismiss</button></div>}
        {notice && <div className="taxonomy-alert" role="status"><span>{notice}</span><button onClick={() => setNotice('')} type="button">Dismiss</button></div>}

        {!data && !error ? <div className="taxonomy-loading"><span /> Getting the labels ready…</div> : data && (
          <>
          <section className="taxonomy-board">
            <header className="taxonomy-board-intro">
              <div>
                <p>Industry label sorter</p>
                <h1>Move the loose labels into boxes.</h1>
                <span>Tick labels on the left. Pick a box on the right. You can move them again whenever you want.</span>
              </div>
              <aside><strong>{data.summary.unassigned}</strong><span>labels still loose</span><small>{data.summary.assigned} already grouped</small></aside>
            </header>

            <div className="taxonomy-board-columns">
              <section className="taxonomy-loose-labels" aria-label="Ungrouped industry labels">
                <header>
                  <div><span>Left side</span><h2>Ungrouped labels</h2><p>Pick as many as you want.</p></div>
                  <b>{data.summary.unassigned}</b>
                </header>

                <label className="taxonomy-board-search">
                  <SearchIcon />
                  <input aria-label="Search ungrouped labels" onChange={(event) => setQuery(event.target.value)} placeholder="Find a loose label…" type="search" value={query} />
                </label>

                <div className="taxonomy-board-bulk">
                  <div><strong>{selectedLabels.size}</strong><span>picked</span></div>
                  <select aria-label="Choose the group for selected labels" onChange={(event) => {
                    const group = data.groups.find((candidate) => candidate.id === event.target.value)
                    setTargetGroupId(event.target.value)
                    if (group) {
                      setSelectedGroupId(group.id)
                      setGroupNameDraft(group.name)
                    }
                  }} value={targetGroupId}>
                    <option value="">Choose a box…</option>
                    {data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                  <button disabled={!selectedLabels.size || !targetGroupId || saving} onClick={() => void addSelectedToGroup()} type="button">{saving ? 'Moving…' : `Move ${selectedLabels.size || ''} to box`}</button>
                </div>

                <div className="taxonomy-board-list-tools">
                  <span>{ungroupedIndustries.length} shown</span>
                  <button disabled={!ungroupedIndustries.length} onClick={() => setSelectedLabels(new Set(ungroupedIndustries.map((industry) => industry.name)))} type="button">Pick all shown</button>
                  <button disabled={!selectedLabels.size} onClick={() => setSelectedLabels(new Set())} type="button">Clear</button>
                </div>

                <div className="taxonomy-board-loose-list">
                  {ungroupedIndustries.map((industry) => {
                    const examples = industry.sampleCompanies.slice(0, 3).map((company) => company.name).join(' · ')
                    return (
                      <article className={selectedLabels.has(industry.name) ? 'is-selected' : ''} key={industry.name}>
                        <label className="taxonomy-board-loose-check">
                          <input aria-label={`Pick ${industry.name}`} checked={selectedLabels.has(industry.name)} onChange={() => toggleLabel(industry.name)} type="checkbox" />
                          <span aria-hidden="true">✓</span>
                        </label>
                        <button className="taxonomy-board-loose-name" onClick={() => openGroupPicker(industry.name)} type="button">
                          <span><strong>{industry.name}</strong><small>{examples || 'No company examples found'}</small></span>
                          <b>Choose group</b>
                        </button>
                        <button className="taxonomy-board-loose-examples" onClick={() => { setFocusedLabel(industry.name); setDetailsOpen(true) }} type="button">Examples</button>
                      </article>
                    )
                  })}
                  {!ungroupedIndustries.length && <div className="taxonomy-board-empty"><strong>No loose labels here.</strong><span>Try a different search.</span></div>}
                </div>
              </section>

              <section className="taxonomy-group-boxes" aria-label="Industry group boxes">
                <header>
                  <div><span>Right side</span><h2>Group boxes</h2><p>Click a box to make it the destination.</p></div>
                  <button onClick={() => { setShowCreate((value) => !value); setShowRename(false) }} type="button">+ New box</button>
                </header>

                {showCreate && (
                  <form className="taxonomy-board-inline-form" onSubmit={(event) => void createGroup(event)}>
                    <label htmlFor="board-new-group">Name the new box</label>
                    <div><input autoFocus id="board-new-group" maxLength={80} onChange={(event) => setNewGroupName(event.target.value)} placeholder="New group name…" value={newGroupName} /><button disabled={!newGroupName.trim() || saving} type="submit">Create box</button></div>
                  </form>
                )}

                {showRename && selectedGroup && (
                  <form className="taxonomy-board-inline-form" onSubmit={(event) => void renameSelectedGroup(event)}>
                    <label htmlFor="board-group-name">Rename “{selectedGroup.name}”</label>
                    <div><input autoFocus id="board-group-name" maxLength={80} onChange={(event) => setGroupNameDraft(event.target.value)} value={groupNameDraft} /><button disabled={!groupNameDraft.trim() || groupNameDraft.trim() === selectedGroup.name || saving} type="submit">Save name</button></div>
                  </form>
                )}

                <label className="taxonomy-board-search taxonomy-board-search--groups">
                  <SearchIcon />
                  <input aria-label="Search groups and grouped labels" onChange={(event) => setGroupQuery(event.target.value)} placeholder="Find a box or grouped label…" type="search" value={groupQuery} />
                </label>

                <div className="taxonomy-group-box-grid">
                  {visibleGroups.map((group) => (
                    <article className={targetGroupId === group.id ? 'is-target' : ''} key={group.id}>
                      <header>
                        <button className="taxonomy-group-box-target" onClick={() => {
                          setTargetGroupId(group.id)
                          setSelectedGroupId(group.id)
                          setGroupNameDraft(group.name)
                        }} type="button">
                          <span>{targetGroupId === group.id ? '✓ Destination box' : 'Use this box'}</span>
                          <strong>{group.name}</strong>
                          <small>{group.labels.length} label{group.labels.length === 1 ? '' : 's'}</small>
                        </button>
                        <button aria-label={`Rename ${group.name}`} className="taxonomy-group-box-rename" onClick={() => {
                          setSelectedGroupId(group.id)
                          setTargetGroupId(group.id)
                          setGroupNameDraft(group.name)
                          setShowRename(true)
                          setShowCreate(false)
                        }} type="button">Rename</button>
                      </header>
                      <div className="taxonomy-group-box-labels">
                        {group.labels.map((label) => (
                          <button onClick={() => openGroupPicker(label)} title={`Choose a group for ${label}`} type="button" key={label}>
                            <span>{label}</span><b aria-hidden="true">⌄</b>
                          </button>
                        ))}
                        {!group.labels.length && <p>This box is empty.</p>}
                      </div>
                      {!!groupCompanyExamples.get(group.id)?.length && (
                        <footer className="taxonomy-group-company-examples">
                          <span>Example companies</span>
                          <div>
                            {groupCompanyExamples.get(group.id)?.map((company) => (
                              <a href={company.crunchbaseUrl} key={company.crunchbaseUrl} rel="noreferrer" target="_blank" title={`${company.name} · ${formatUsd(company.totalRaisedUsd)}`}>
                                <i>{initials(company.name)}</i><strong>{company.name}</strong>
                              </a>
                            ))}
                          </div>
                        </footer>
                      )}
                    </article>
                  ))}
                  {!visibleGroups.length && <div className="taxonomy-board-empty"><strong>No boxes found.</strong><span>Try another search.</span></div>}
                </div>
              </section>
            </div>
          </section>

          <section className="taxonomy-simple taxonomy-simple--old">
            <header className="taxonomy-simple-intro">
              <div className="taxonomy-simple-progress">
                <span>{data.summary.assigned.toLocaleString()} sorted</span>
                <span>{data.summary.unassigned.toLocaleString()} left</span>
              </div>
              <p className="taxonomy-simple-kicker">Industry sorting game</p>
              <h1>Put matching labels in the same box.</h1>
              <p>Pick a group. Tick the labels that belong together. Press the big green button.</p>
              <small>Crunchbase stays safe. You are only changing the chart groups.</small>
            </header>

            <section className="taxonomy-simple-step taxonomy-simple-destination">
              <div className="taxonomy-simple-number">1</div>
              <div className="taxonomy-simple-step-copy">
                <h2>Pick a group</h2>
                <p>Where should the labels go?</p>
              </div>
              <select
                aria-label="Choose a group"
                onChange={(event) => {
                  const group = data.groups.find((candidate) => candidate.id === event.target.value)
                  if (group) selectGroup(group)
                }}
                value={selectedGroupId}
              >
                {!data.groups.length && <option value="">Make a group first</option>}
                {data.groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.labels.length})</option>)}
              </select>
              <div className="taxonomy-simple-group-actions">
                <button onClick={() => { setShowCreate((value) => !value); setShowRename(false) }} type="button">+ New group</button>
                <button disabled={!selectedGroup} onClick={() => { setShowRename((value) => !value); setShowCreate(false) }} type="button">Rename</button>
              </div>
              {showCreate && (
                <form className="taxonomy-simple-inline-form" onSubmit={(event) => void createGroup(event)}>
                  <label htmlFor="simple-new-group">What should the new group be called?</label>
                  <div><input autoFocus id="simple-new-group" maxLength={80} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Type a name…" value={newGroupName} /><button disabled={!newGroupName.trim() || saving} type="submit">Create it</button></div>
                </form>
              )}
              {showRename && selectedGroup && (
                <form className="taxonomy-simple-inline-form" onSubmit={(event) => void renameSelectedGroup(event)}>
                  <label htmlFor="simple-group-name">Give this group a new name</label>
                  <div><input autoFocus id="simple-group-name" maxLength={80} onChange={(event) => setGroupNameDraft(event.target.value)} value={groupNameDraft} /><button disabled={!groupNameDraft.trim() || groupNameDraft.trim() === selectedGroup.name || saving} type="submit">Save name</button></div>
                </form>
              )}
            </section>

            <section className="taxonomy-simple-step taxonomy-simple-labels">
              <div className="taxonomy-simple-step-heading">
                <div className="taxonomy-simple-number">2</div>
                <div className="taxonomy-simple-step-copy"><h2>Pick matching labels</h2><p>You can choose more than one.</p></div>
              </div>

              <label className="taxonomy-simple-search">
                <SearchIcon />
                <input aria-label="Search labels" onChange={(event) => setQuery(event.target.value)} placeholder="Find a label…" type="search" value={query} />
              </label>

              <div className="taxonomy-simple-tabs" aria-label="Which labels to show">
                <button className={filter === 'unassigned' ? 'is-active' : ''} onClick={() => { setFilter('unassigned'); setSelectedLabels(new Set()) }} type="button">Need a group <b>{data.summary.unassigned}</b></button>
                <button className={selectedGroup && filter === `group:${selectedGroup.id}` ? 'is-active' : ''} disabled={!selectedGroup} onClick={() => { if (selectedGroup) setFilter(`group:${selectedGroup.id}`); setSelectedLabels(new Set()) }} type="button">In this group <b>{selectedGroup?.labels.length ?? 0}</b></button>
                <button className={filter === 'all' ? 'is-active' : ''} onClick={() => { setFilter('all'); setSelectedLabels(new Set()) }} type="button">All labels <b>{data.summary.industries}</b></button>
              </div>

              <div className="taxonomy-simple-action">
                <div className="taxonomy-simple-number">3</div>
                <div><strong>{selectedLabels.size ? `${selectedLabels.size} picked` : 'Tick some labels'}</strong><span>{selectedGroup ? `They will go into “${selectedGroup.name}”` : 'Make a group first'}</span></div>
                <button disabled={!selectedLabels.size || !selectedGroup || saving} onClick={() => void addSelectedToGroup()} type="button">
                  {saving ? 'Saving…' : selectedLabels.size ? `Put ${selectedLabels.size} in ${selectedGroup?.name}` : 'Put them in the group'}
                </button>
              </div>

              <div className="taxonomy-simple-list">
                {visibleIndustries.map((industry) => {
                  const group = assignmentByLabel.get(industry.name)
                  const isInSelectedGroup = group?.id === selectedGroup?.id
                  const examples = industry.sampleCompanies.slice(0, 3).map((company) => company.name).join(' · ')
                  return (
                    <article className={`${selectedLabels.has(industry.name) ? 'is-selected' : ''}${isInSelectedGroup ? ' is-home' : ''}`} key={industry.name}>
                      {isInSelectedGroup ? <span className="taxonomy-simple-check taxonomy-simple-check--done">✓</span> : (
                        <label className="taxonomy-simple-check">
                          <input aria-label={`Pick ${industry.name}`} checked={selectedLabels.has(industry.name)} onChange={() => toggleLabel(industry.name)} type="checkbox" />
                          <span aria-hidden="true">✓</span>
                        </label>
                      )}
                      <div className="taxonomy-simple-label-copy">
                        <strong>{industry.name}</strong>
                        <span>{examples ? `Examples: ${examples}` : 'No company examples found'}</span>
                        {group && !isInSelectedGroup && <small>Now inside “{group.name}”</small>}
                        {group && isInSelectedGroup && <small>Inside “{group.name}”</small>}
                      </div>
                      <div className="taxonomy-simple-label-actions">
                        <button onClick={() => { setFocusedLabel(industry.name); setDetailsOpen(true) }} type="button">See companies</button>
                        {group && isInSelectedGroup && <button className="taxonomy-simple-remove" disabled={saving} onClick={() => void removeLabelFromGroup(group, industry.name)} type="button">Remove</button>}
                      </div>
                    </article>
                  )
                })}
                {!visibleIndustries.length && <div className="taxonomy-simple-empty"><strong>Nothing here.</strong><span>Try another button or a different search.</span></div>}
              </div>
            </section>
          </section>

          <div className="taxonomy-workbench taxonomy-workbench--legacy">
            <aside className="taxonomy-groups" aria-label="Industry groups">
              <header>
                <span>01 / Define</span>
                <h2>Groups</h2>
                <p>Create the clean categories that will replace overlapping source labels in charts.</p>
              </header>

              <form className="taxonomy-create-group" onSubmit={(event) => void createGroup(event)}>
                <label htmlFor="new-industry-group">New group name</label>
                <div>
                  <input id="new-industry-group" maxLength={80} onChange={(event) => setNewGroupName(event.target.value)} placeholder="e.g. E-Commerce" value={newGroupName} />
                  <button disabled={!newGroupName.trim() || saving} type="submit">Create</button>
                </div>
              </form>

              <button className={`taxonomy-all-groups${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')} type="button">
                <span>All source labels</span><b>{data.summary.industries}</b>
              </button>
              <button className={`taxonomy-all-groups${filter === 'unassigned' ? ' is-active' : ''}`} onClick={() => setFilter('unassigned')} type="button">
                <span>Ungrouped</span><b>{data.summary.unassigned}</b>
              </button>

              <div className="taxonomy-group-list">
                {data.groups.map((group, index) => (
                  <button className={selectedGroupId === group.id ? 'is-active' : ''} key={group.id} onClick={() => selectGroup(group)} type="button">
                    <i>{String(index + 1).padStart(2, '0')}</i>
                    <span><strong>{group.name}</strong><small>{group.labels.length} label{group.labels.length === 1 ? '' : 's'}</small></span>
                    <b aria-hidden="true">→</b>
                  </button>
                ))}
                {!data.groups.length && <div className="taxonomy-groups-empty"><b>No groups yet.</b><span>Name the first clean category above.</span></div>}
              </div>

              {selectedGroup && <section className="taxonomy-group-editor">
                <form onSubmit={(event) => void renameSelectedGroup(event)}>
                  <label htmlFor="industry-group-name">Selected group</label>
                  <div><input id="industry-group-name" maxLength={80} onChange={(event) => setGroupNameDraft(event.target.value)} value={groupNameDraft} /><button disabled={!groupNameDraft.trim() || groupNameDraft.trim() === selectedGroup.name || saving} type="submit">Rename</button></div>
                </form>
                <div className="taxonomy-group-labels">
                  {selectedGroup.labels.map((label) => <span key={label}><button onClick={() => setFocusedLabel(label)} type="button">{label}</button><button aria-label={`Remove ${label} from ${selectedGroup.name}`} disabled={saving} onClick={() => void removeLabelFromGroup(selectedGroup, label)} type="button">×</button></span>)}
                  {!selectedGroup.labels.length && <p>This group is empty. Select labels in the catalogue, then add them here.</p>}
                </div>
              </section>}
            </aside>

            <section className="taxonomy-catalogue" aria-label="Industry label catalogue">
              <header>
                <div><span>02 / Select</span><h2>Label catalogue</h2></div>
                <strong>{visibleIndustries.length.toLocaleString()} shown</strong>
              </header>

              <div className="taxonomy-toolbar">
                <label className="taxonomy-search"><SearchIcon /><input aria-label="Search industry labels" onChange={(event) => setQuery(event.target.value)} placeholder="Search all 598 labels…" type="search" value={query} /></label>
                <label><span>Show</span><select aria-label="Filter labels" onChange={(event) => setFilter(event.target.value as LabelFilter)} value={filter}><option value="all">All labels</option><option value="unassigned">Ungrouped only</option><option value="assigned">Grouped only</option>{data.groups.map((group) => <option key={group.id} value={`group:${group.id}`}>{group.name}</option>)}</select></label>
                <label><span>Sort</span><select aria-label="Sort labels" onChange={(event) => setSort(event.target.value as LabelSort)} value={sort}><option value="alphabetical">A–Z</option><option value="company-count">Most companies</option></select></label>
              </div>

              <div className="taxonomy-selection-tools">
                <div><strong>{selectedLabels.size.toLocaleString()}</strong><span>selected</span></div>
                <button onClick={() => setSelectedLabels(new Set(visibleIndustries.map((industry) => industry.name)))} type="button">Select shown</button>
                <button disabled={!selectedLabels.size} onClick={() => setSelectedLabels(new Set())} type="button">Clear</button>
                <label><span>Add to</span><select disabled={!data.groups.length} onChange={(event) => setTargetGroupId(event.target.value)} value={targetGroupId}><option value="">Choose a group</option>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <button className="taxonomy-add-selected" disabled={!selectedLabels.size || !targetGroupId || saving} onClick={() => void addSelectedToGroup()} type="button">{saving ? 'Saving…' : `Add ${selectedLabels.size || ''} to group`}</button>
              </div>

              <div className="taxonomy-label-list">
                {visibleIndustries.map((industry) => {
                  const group = assignmentByLabel.get(industry.name)
                  return (
                    <article className={`${focusedLabel === industry.name ? 'is-focused' : ''}${selectedLabels.has(industry.name) ? ' is-selected' : ''}`} key={industry.name}>
                      <label>
                        <input aria-label={`Select ${industry.name}`} checked={selectedLabels.has(industry.name)} onChange={() => toggleLabel(industry.name)} type="checkbox" />
                        <span aria-hidden="true" />
                      </label>
                      <button onClick={() => setFocusedLabel(industry.name)} type="button">
                        <span><strong>{industry.name}</strong>{group ? <small>{group.name}</small> : <small>Ungrouped</small>}</span>
                        <b>{industry.companyCount.toLocaleString()} <small>companies</small></b>
                      </button>
                    </article>
                  )
                })}
                {!visibleIndustries.length && <div className="taxonomy-no-labels"><strong>No labels found.</strong><span>Try a broader search or a different group filter.</span></div>}
              </div>
            </section>

            <aside className="taxonomy-evidence" aria-label="Companies using the selected industry label">
              <header>
                <span>03 / Understand</span>
                <h2>Company evidence</h2>
                <p>Representative YC-linked Crunchbase profiles carrying the exact selected label.</p>
              </header>

              {focusedIndustry ? <>
                <section className="taxonomy-label-focus">
                  <span>Exact Crunchbase label</span>
                  <h3>{focusedIndustry.name}</h3>
                  <div><strong>{focusedIndustry.companyCount.toLocaleString()}</strong><span>companies carry this label</span></div>
                  {assignmentByLabel.get(focusedIndustry.name) ? <p>Grouped under <b>{assignmentByLabel.get(focusedIndustry.name)?.name}</b></p> : <p>Not assigned to a chart group yet.</p>}
                </section>
                <div className="taxonomy-company-list">
                  {focusedIndustry.sampleCompanies.map((company) => (
                    <article key={company.crunchbaseUrl}>
                      <div className="taxonomy-company-heading"><span>{initials(company.name)}</span><div><a href={company.crunchbaseUrl} rel="noreferrer" target="_blank">{company.name} ↗</a><small>{company.headquarters || 'Location unavailable'} · {formatUsd(company.totalRaisedUsd)}</small></div></div>
                      <p>{company.shortDescription || 'No short description in the pulled profile.'}</p>
                      <div className="taxonomy-company-tags">{company.industries.slice(0, 6).map((label) => <button className={label === focusedIndustry.name ? 'is-current' : ''} key={label} onClick={() => data.industries.some((industry) => industry.name === label) && setFocusedLabel(label)} type="button">{label}</button>)}</div>
                    </article>
                  ))}
                  {!focusedIndustry.sampleCompanies.length && <div className="taxonomy-no-companies"><strong>No company examples found.</strong><span>The label exists in the chart export but is not present in the compact company snapshot.</span></div>}
                </div>
              </> : <div className="taxonomy-no-companies"><strong>Select a label.</strong><span>Its representative companies will appear here.</span></div>}
            </aside>
          </div>

          {moveLabelName && (
            <div className="taxonomy-move-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setMoveLabelName('') }} role="presentation">
              <section aria-labelledby="taxonomy-move-label-title" aria-modal="true" role="dialog">
                <header>
                  <div><span>Choose a group for</span><h2 id="taxonomy-move-label-title">{moveLabelName}</h2></div>
                  <button aria-label="Close move label dialog" onClick={() => setMoveLabelName('')} type="button">×</button>
                </header>
                <p>{movingFromGroup ? <>It is now inside <strong>{movingFromGroup.name}</strong>. Pick another group to move it.</> : 'Pick a group below to add this label.'}</p>
                {movingIndustry?.sampleCompanies.length ? <small>Examples: {movingIndustry.sampleCompanies.slice(0, 4).map((company) => company.name).join(' · ')}</small> : null}
                <div className="taxonomy-group-picker">
                  <label htmlFor="taxonomy-group-search">Search all groups</label>
                  <div className="taxonomy-group-picker-search">
                    <SearchIcon />
                    <input autoComplete="off" autoFocus id="taxonomy-group-search" onChange={(event) => setMoveGroupQuery(event.target.value)} placeholder="Type a group name…" type="search" value={moveGroupQuery} />
                  </div>
                  <div aria-label="Available industry groups" className="taxonomy-group-picker-options" role="listbox">
                    {moveGroupOptions.map((group) => {
                      const isCurrent = group.id === movingFromGroup?.id
                      return (
                        <button aria-selected={isCurrent} disabled={isCurrent || saving} key={group.id} onClick={() => void moveLabel(group.id)} role="option" type="button">
                          <span><strong>{group.name}</strong><small>{group.labels.length} label{group.labels.length === 1 ? '' : 's'}</small></span>
                          <b>{isCurrent ? 'Current group' : saving ? 'Saving…' : 'Choose'}</b>
                        </button>
                      )
                    })}
                    {!moveGroupOptions.length && <div className="taxonomy-group-picker-empty"><strong>No group found.</strong><span>Try a different search.</span></div>}
                  </div>
                </div>
                {movingFromGroup && <button className="taxonomy-move-ungroup" disabled={saving} onClick={() => void ungroupLabel()} type="button">Remove from this group</button>}
              </section>
            </div>
          )}

          {detailsOpen && focusedIndustry && (
            <div className="taxonomy-simple-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailsOpen(false) }} role="presentation">
              <section aria-labelledby="taxonomy-label-details" aria-modal="true" role="dialog">
                <header>
                  <div><span>What does this label mean?</span><h2 id="taxonomy-label-details">{focusedIndustry.name}</h2></div>
                  <button aria-label="Close company examples" onClick={() => setDetailsOpen(false)} type="button">Done</button>
                </header>
                <p className="taxonomy-simple-modal-summary"><strong>{focusedIndustry.companyCount.toLocaleString()}</strong> companies use this label. Here are some examples:</p>
                <div className="taxonomy-simple-companies">
                  {focusedIndustry.sampleCompanies.map((company) => (
                    <article key={company.crunchbaseUrl}>
                      <span>{initials(company.name)}</span>
                      <div><a href={company.crunchbaseUrl} rel="noreferrer" target="_blank">{company.name} ↗</a><p>{company.shortDescription || 'No description in Crunchbase.'}</p><small>{company.headquarters || 'Location unavailable'} · {formatUsd(company.totalRaisedUsd)}</small></div>
                    </article>
                  ))}
                  {!focusedIndustry.sampleCompanies.length && <p>No company examples were found for this label.</p>}
                </div>
              </section>
            </div>
          )}
          </>
        )}

        {data && <footer className="taxonomy-source-note">
          <span>Overlay: {data.source.groupsFile}</span>
          <span>Labels: {data.source.chartFile}</span>
          <span>Examples: {data.source.companyFile}</span>
          <span>{data.source.provider} snapshot · {snapshotLabel(data.source.updatedAt)}</span>
        </footer>}
      </main>
    </div>
  )
}
