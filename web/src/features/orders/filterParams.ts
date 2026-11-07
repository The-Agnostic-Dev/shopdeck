export type DatePreset = '' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'

export interface OrderFilters {
  q: string
  status: string
  payment: string
  preset: DatePreset
  from: string
  to: string
}

export const KEYS: (keyof OrderFilters)[] = ['q', 'status', 'payment', 'preset', 'from', 'to']

/** Apply a filter patch to a copy of the URL params and restart the list at page 1. */
export function applyFilterPatch(prev: URLSearchParams, patch: Partial<OrderFilters>): URLSearchParams {
  const next = new URLSearchParams(prev)
  for (const key of KEYS) {
    if (!(key in patch)) continue
    const value = patch[key]
    if (value) next.set(key, value)
    else next.delete(key)
  }
  next.delete('page')
  return next
}
