export const formatMoney = (value?: number | null, compact = true) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (value === 0) return '$0'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value)
}

export const formatNumber = (value?: number | null) =>
  new Intl.NumberFormat('en-US').format(value ?? 0)

export const formatDate = (value?: string | null, style: 'short' | 'long' = 'short') => {
  if (!value) return 'Undated'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Undated'

  return new Intl.DateTimeFormat('en-US', {
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

export const displayList = (value?: string | string[] | null) => {
  if (!value) return null
  return Array.isArray(value) ? value.join(', ') : value
}

export const truncateLabel = (value: string, length = 28) =>
  value.length > length ? `${value.slice(0, length - 1)}…` : value
