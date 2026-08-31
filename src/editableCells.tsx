import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'

type EditOption = { label: string; value: string }

type InlineEditProps = {
  ariaLabel: string
  children: ReactNode
  className?: string
  disabled?: boolean
  inputType?: 'date' | 'number' | 'text' | 'url'
  onSave: (value: string) => Promise<void>
  options?: EditOption[]
  selected?: boolean
  value: string
}

export function InlineEdit({
  ariaLabel,
  children,
  className = '',
  disabled = false,
  inputType = 'text',
  onSave,
  options,
  selected = false,
  value,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [editing, value])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    if (inputRef.current instanceof HTMLInputElement) inputRef.current.select()
  }, [editing])

  const open = () => {
    if (disabled || saving) return
    setDraft(value)
    setError('')
    setEditing(true)
  }

  const cancel = () => {
    if (saving) return
    setDraft(value)
    setError('')
    setEditing(false)
  }

  const save = async () => {
    if (saving) return
    if (draft === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(draft)
      setEditing(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The cell could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      void save()
    }
  }

  if (disabled) return <div className={`inline-edit inline-edit--readonly ${className}`.trim()}>{children}</div>

  return (
    <div
      className={`inline-edit${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}${saving ? ' is-saving' : ''}${error ? ' has-error' : ''} ${className}`.trim()}
      onClick={(event) => {
        if (editing) {
          event.stopPropagation()
          return
        }
        const target = event.target as Element
        if (selected && !target.closest('a, button, input, select')) {
          event.preventDefault()
          event.stopPropagation()
          open()
        }
      }}
      onDoubleClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        open()
      }}
      title={error || (editing ? undefined : selected ? `Click again to edit ${ariaLabel}` : `Edit ${ariaLabel}`)}
    >
      {editing ? (
        <div className="inline-edit__editor">
          {options ? (
            <select
              aria-label={ariaLabel}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef as RefObject<HTMLSelectElement>}
              value={draft}
            >
              {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input
              aria-label={ariaLabel}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              ref={inputRef as RefObject<HTMLInputElement>}
              step={inputType === 'number' ? 'any' : undefined}
              type={inputType}
              value={draft}
            />
          )}
          <button aria-label={`Save ${ariaLabel}`} disabled={saving} onClick={() => void save()} type="button">✓</button>
          <button aria-label={`Cancel editing ${ariaLabel}`} disabled={saving} onClick={cancel} type="button">×</button>
        </div>
      ) : (
        <>
          <div className="inline-edit__value">{children}</div>
          <button
            aria-label={`Edit ${ariaLabel}`}
            className="inline-edit__button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              open()
            }}
            type="button"
          >
            <span aria-hidden="true">✎</span>
          </button>
        </>
      )}
    </div>
  )
}

export const dateEditorValue = (value: unknown) => {
  if (!value) return ''
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export const parseJsonEditorValue = (value: string) => {
  try {
    return JSON.parse(value) as unknown
  } catch {
    throw new Error('Enter valid JSON for this cell.')
  }
}
