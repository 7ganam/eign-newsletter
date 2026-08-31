import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export type SortDirection = 'asc' | 'desc'

type SortState<Field extends string> = {
  field: Field
  direction: SortDirection
}

const readStoredValue = (storageKey: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? 'null') as unknown
  } catch {
    return null
  }
}

const writeStoredValue = (storageKey: string, value: unknown) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Table preferences remain available for the current session.
  }
}

export const restoreStoredChoice = <Choice extends string>(
  storageKey: string,
  defaultChoice: Choice,
  allowedChoices: readonly Choice[],
) => {
  const savedChoice = readStoredValue(storageKey)
  return typeof savedChoice === 'string' && allowedChoices.includes(savedChoice as Choice)
    ? savedChoice as Choice
    : defaultChoice
}

export const saveStoredChoice = (storageKey: string, choice: string) => {
  writeStoredValue(storageKey, choice)
}

const restoreSort = <Field extends string>(
  storageKey: string,
  defaultSort: SortState<Field>,
  allowedFields?: readonly Field[],
): SortState<Field> => {
  const savedSort = readStoredValue(storageKey)
  if (!savedSort || typeof savedSort !== 'object' || Array.isArray(savedSort)) return defaultSort

  const { direction, field } = savedSort as Record<string, unknown>
  if (typeof field !== 'string' || (direction !== 'asc' && direction !== 'desc')) return defaultSort
  if (allowedFields && !allowedFields.includes(field as Field)) return defaultSort
  return { field: field as Field, direction }
}

export function usePersistedSort<Field extends string>(
  storageKey: string,
  defaultSort: SortState<Field>,
  allowedFields?: readonly Field[],
) {
  const [sort, setSort] = useState<SortState<Field>>(() => restoreSort(storageKey, defaultSort, allowedFields))

  useEffect(() => {
    writeStoredValue(storageKey, sort)
  }, [sort, storageKey])

  const setSortField = useCallback<Dispatch<SetStateAction<Field>>>((value) => {
    setSort((current) => ({
      ...current,
      field: typeof value === 'function' ? value(current.field) : value,
    }))
  }, [])

  const setSortDirection = useCallback<Dispatch<SetStateAction<SortDirection>>>((value) => {
    setSort((current) => ({
      ...current,
      direction: typeof value === 'function' ? value(current.direction) : value,
    }))
  }, [])

  const resetSort = useCallback(() => {
    setSort(defaultSort)
  }, [defaultSort])

  return {
    resetSort,
    setSortDirection,
    setSortField,
    sortDirection: sort.direction,
    sortField: sort.field,
  }
}
