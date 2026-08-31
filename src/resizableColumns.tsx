import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

const DEFAULT_MIN_WIDTH = 48
const DEFAULT_MAX_WIDTH = 720

const clampWidth = (width: number, minWidth: number, maxWidth: number) =>
  Math.round(Math.max(minWidth, Math.min(maxWidth, width)))

const restoreWidths = (storageKey: string, minWidth: number, maxWidth: number) => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as unknown
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
    return Object.fromEntries(Object.entries(stored).flatMap(([key, value]) => (
      typeof value === 'number' && Number.isFinite(value)
        ? [[key, clampWidth(value, minWidth, maxWidth)]]
        : []
    )))
  } catch {
    return {}
  }
}

type ResizeHandleProps = {
  active: boolean
  label: string
  maxWidth: number
  minWidth: number
  onDoubleClick: (event: React.MouseEvent<HTMLSpanElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => void
  onPointerDown: (event: ReactPointerEvent<HTMLSpanElement>) => void
  width: number
}

export function ColumnResizeHandle({ active, label, maxWidth, minWidth, onDoubleClick, onKeyDown, onPointerDown, width }: ResizeHandleProps) {
  return (
    <span
      aria-label={`Resize ${label} column`}
      aria-orientation="vertical"
      aria-valuemax={maxWidth}
      aria-valuemin={minWidth}
      aria-valuenow={width}
      className={`column-resize-handle${active ? ' is-active' : ''}`}
      draggable={false}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={onDoubleClick}
      onDragStart={(event) => event.preventDefault()}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      role="separator"
      tabIndex={0}
      title={`Drag to resize ${label}. Double-click to reset.`}
    />
  )
}

type UseResizableColumnsOptions<Key extends string> = {
  defaults: Record<Key, number>
  maxWidth?: number
  minWidth?: number
  storageKey: string
}

export function useResizableColumns<Key extends string>({
  defaults,
  maxWidth = DEFAULT_MAX_WIDTH,
  minWidth = DEFAULT_MIN_WIDTH,
  storageKey,
}: UseResizableColumnsOptions<Key>) {
  const [savedWidths, setSavedWidths] = useState<Record<string, number>>(() => restoreWidths(storageKey, minWidth, maxWidth))
  const [activeColumn, setActiveColumn] = useState<Key | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const widths = useMemo(() => Object.fromEntries(
    Object.entries(defaults).map(([key, defaultWidth]) => [
      key,
      clampWidth(savedWidths[key] ?? defaultWidth, minWidth, maxWidth),
    ]),
  ) as Record<Key, number>, [defaults, maxWidth, minWidth, savedWidths])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedWidths))
    } catch {
      // Column resizing remains available for the current session.
    }
  }, [savedWidths, storageKey])

  useEffect(() => () => cleanupRef.current?.(), [])

  const setWidth = useCallback((key: Key, width: number) => {
    setSavedWidths((current) => ({ ...current, [key]: clampWidth(width, minWidth, maxWidth) }))
  }, [maxWidth, minWidth])

  const resetWidth = useCallback((key: Key) => {
    setSavedWidths((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }, [])

  const getResizeHandleProps = useCallback((key: Key, label: string): ResizeHandleProps => ({
    active: activeColumn === key,
    label,
    maxWidth,
    minWidth,
    onDoubleClick: (event) => {
      event.preventDefault()
      event.stopPropagation()
      resetWidth(key)
    },
    onKeyDown: (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      event.stopPropagation()
      const step = event.shiftKey ? 25 : 10
      setWidth(key, widths[key] + (event.key === 'ArrowRight' ? step : -step))
    },
    onPointerDown: (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      cleanupRef.current?.()

      const startX = event.clientX
      const startWidth = widths[key]
      setActiveColumn(key)
      document.body.classList.add('is-resizing-column')

      const handlePointerMove = (moveEvent: PointerEvent) => {
        setWidth(key, startWidth + moveEvent.clientX - startX)
      }
      const finishResize = () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', finishResize)
        window.removeEventListener('pointercancel', finishResize)
        document.body.classList.remove('is-resizing-column')
        setActiveColumn(null)
        cleanupRef.current = null
      }

      cleanupRef.current = finishResize
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', finishResize)
      window.addEventListener('pointercancel', finishResize)
    },
    width: widths[key],
  }), [activeColumn, maxWidth, minWidth, resetWidth, setWidth, widths])

  const totalWidth = useCallback((keys: readonly Key[], leadingWidth = 0) =>
    leadingWidth + keys.reduce((sum, key) => sum + widths[key], 0), [widths])

  return { activeColumn, getResizeHandleProps, totalWidth, widths }
}

export type BasicTableColumn<Key extends string = string> = {
  defaultWidth: number
  key: Key
  label: string
}

type ResizableDataTableProps<Key extends string> = {
  children: ReactNode
  className: string
  columns: readonly BasicTableColumn<Key>[]
  storageKey: string
}

export function ResizableDataTable<Key extends string>({ children, className, columns, storageKey }: ResizableDataTableProps<Key>) {
  const defaults = useMemo(() => Object.fromEntries(
    columns.map((column) => [column.key, column.defaultWidth]),
  ) as Record<Key, number>, [columns])
  const { getResizeHandleProps, totalWidth, widths } = useResizableColumns({ defaults, storageKey })
  const keys = useMemo(() => columns.map((column) => column.key), [columns])
  const style = { '--resizable-table-width': `${totalWidth(keys)}px` } as CSSProperties

  return (
    <table className={`${className} resizable-table`} style={style}>
      <colgroup>
        {columns.map((column) => <col key={column.key} style={{ width: `${widths[column.key]}px` }} />)}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>
              <span className="resizable-table-header-label">{column.label}</span>
              <ColumnResizeHandle {...getResizeHandleProps(column.key, column.label)} />
            </th>
          ))}
        </tr>
      </thead>
      {children}
    </table>
  )
}
