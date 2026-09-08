import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type ArchiveResponse = {
  archivedIds: string[]
  tableId: string
  updatedAt: string | null
}

type UseRowArchiveOptions = {
  tableId: string
  visibleRowIds: readonly string[]
}

const ARCHIVE_EVENT = 'eign:table-archive-updated'

const normaliseIds = (ids: readonly string[]) => [...new Set(ids.filter(Boolean))]

export function useRowArchive({ tableId, visibleRowIds }: UseRowArchiveOptions) {
  const [archivedIds, setArchivedIds] = useState<Set<string>>(() => new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [showArchived, setShowArchived] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const applyArchiveResponse = useCallback((response: ArchiveResponse) => {
    if (response.tableId !== tableId) return
    setArchivedIds(new Set(response.archivedIds))
    setSelectedIds((current) => new Set([...current].filter((id) => (
      showArchived ? response.archivedIds.includes(id) : !response.archivedIds.includes(id)
    ))))
  }, [showArchived, tableId])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/table-archives/${encodeURIComponent(tableId)}`)
      .then(async (response) => {
        const result = await response.json().catch(() => null) as ArchiveResponse | { error?: string } | null
        if (!response.ok) throw new Error(result && 'error' in result ? result.error : `The data service returned ${response.status}.`)
        return result as ArchiveResponse
      })
      .then((response) => {
        if (!cancelled) applyArchiveResponse(response)
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load archived rows.')
      })

    const handleArchiveUpdate = (event: Event) => {
      const detail = (event as CustomEvent<ArchiveResponse>).detail
      if (detail) applyArchiveResponse(detail)
    }
    window.addEventListener(ARCHIVE_EVENT, handleArchiveUpdate)
    return () => {
      cancelled = true
      window.removeEventListener(ARCHIVE_EVENT, handleArchiveUpdate)
    }
  }, [applyArchiveResponse, tableId])

  useEffect(() => {
    setSelectedIds((current) => new Set([...current].filter((id) => (
      showArchived ? archivedIds.has(id) : !archivedIds.has(id)
    ))))
  }, [archivedIds, showArchived])

  const eligibleVisibleIds = useMemo(() => normaliseIds(visibleRowIds).filter((id) => (
    showArchived ? archivedIds.has(id) : !archivedIds.has(id)
  )), [archivedIds, showArchived, visibleRowIds])
  const selectedCount = selectedIds.size
  const allVisibleSelected = eligibleVisibleIds.length > 0 && eligibleVisibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = eligibleVisibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected

  const toggleRow = useCallback((rowId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }, [])

  const toggleAllVisible = useCallback(() => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (eligibleVisibleIds.every((id) => next.has(id))) eligibleVisibleIds.forEach((id) => next.delete(id))
      else eligibleVisibleIds.forEach((id) => next.add(id))
      return next
    })
  }, [eligibleVisibleIds])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const setArchivedForSelected = useCallback(async () => {
    const rowIds = [...selectedIds]
    if (!rowIds.length || isSaving) return
    setIsSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/table-archives/${encodeURIComponent(tableId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ archived: !showArchived, rowIds }),
      })
      const result = await response.json().catch(() => null) as ArchiveResponse | { error?: string } | null
      if (!response.ok) throw new Error(result && 'error' in result ? result.error : `The data service returned ${response.status}.`)
      const archiveResponse = result as ArchiveResponse
      applyArchiveResponse(archiveResponse)
      clearSelection()
      window.dispatchEvent(new CustomEvent<ArchiveResponse>(ARCHIVE_EVENT, { detail: archiveResponse }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update archived rows.')
    } finally {
      setIsSaving(false)
    }
  }, [applyArchiveResponse, clearSelection, isSaving, selectedIds, showArchived, tableId])

  const toggleArchivedView = useCallback(() => {
    clearSelection()
    setShowArchived((current) => !current)
  }, [clearSelection])

  return {
    allVisibleSelected,
    archivedCount: archivedIds.size,
    clearSelection,
    error,
    isArchived: (rowId: string) => archivedIds.has(rowId),
    isSaving,
    selectedCount,
    selectedIds,
    setArchivedForSelected,
    showArchived,
    someVisibleSelected,
    toggleAllVisible,
    toggleArchivedView,
    toggleRow,
  }
}

type RowSelectionHeaderProps = {
  allSelected: boolean
  label?: string
  onToggle: () => void
  someSelected: boolean
}

export function RowSelectionHeader({ allSelected, label = 'Select all visible rows', onToggle, someSelected }: RowSelectionHeaderProps) {
  const checkboxRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = someSelected
  }, [someSelected])

  return (
    <label className="row-select-control" title={label}>
      <input ref={checkboxRef} type="checkbox" checked={allSelected} aria-label={label} onChange={onToggle} />
      <span aria-hidden="true" />
    </label>
  )
}

type RowSelectionCellProps = {
  checked: boolean
  label: string
  onToggle: () => void
}

export function RowSelectionCell({ checked, label, onToggle }: RowSelectionCellProps) {
  return (
    <label className="row-select-control" title={label} onClick={(event) => event.stopPropagation()}>
      <input type="checkbox" checked={checked} aria-label={label} onChange={onToggle} />
      <span aria-hidden="true" />
    </label>
  )
}

type ArchiveToolbarProps = {
  archive: ReturnType<typeof useRowArchive>
  noun?: string
}

export function ArchiveToolbar({ archive, noun = 'entries' }: ArchiveToolbarProps) {
  return (
    <div className="row-archive-toolbar" aria-label={`Archive ${noun}`}>
      <button
        className={`row-archive-view${archive.showArchived ? ' is-active' : ''}`}
        onClick={archive.toggleArchivedView}
        type="button"
      >
        {archive.showArchived ? 'Active' : `Archived${archive.archivedCount ? ` ${archive.archivedCount}` : ''}`}
      </button>
      {archive.selectedCount > 0 && (
        <>
          <span>{archive.selectedCount.toLocaleString()} selected</span>
          <button className="row-archive-action" disabled={archive.isSaving} onClick={() => void archive.setArchivedForSelected()} type="button">
            {archive.isSaving ? 'Saving…' : archive.showArchived ? 'Restore' : 'Archive'}
          </button>
          <button className="row-archive-clear" onClick={archive.clearSelection} type="button">Clear</button>
        </>
      )}
      {archive.error && <span className="row-archive-error" role="alert">{archive.error}</span>}
    </div>
  )
}
