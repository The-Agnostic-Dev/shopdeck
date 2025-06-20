import { useCallback, useMemo, useState } from 'react'
import { lagosToday, shiftDay } from '@/lib/dates'

export type DatePreset = '' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'

export interface OrderFilters {
  q: string
  status: string
  payment: string
  preset: DatePreset
  from: string
  to: string
}

const EMPTY: OrderFilters = { q: '', status: '', payment: '', preset: '', from: '', to: '' }

export function rangeForPreset(preset: DatePreset): { from: string; to: string } | null {
  const today = lagosToday()
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday':
      return { from: shiftDay(today, -1), to: shiftDay(today, -1) }
    case '7d':
      return { from: shiftDay(today, -6), to: today }
    case '30d':
      return { from: shiftDay(today, -29), to: today }
    default:
      return null
  }
}

export function useOrderFilters() {
  const [raw, setRaw] = useState<OrderFilters>(EMPTY)
  const [page, setPage] = useState(1)
  const [orderId, setOrderId] = useState<number | null>(null)

  const filters = useMemo<OrderFilters>(() => {
    const range = rangeForPreset(raw.preset)
    return range ? { ...raw, ...range } : raw
  }, [raw])

  const setFilters = useCallback((patch: Partial<OrderFilters>) => {
    setRaw((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }, [])

  const openOrder = useCallback((id: number | null) => setOrderId(id), [])

  const clear = useCallback(() => {
    setRaw(EMPTY)
    setPage(1)
  }, [])

  return { filters, page, orderId, setFilters, setPage, openOrder, clear }
}
