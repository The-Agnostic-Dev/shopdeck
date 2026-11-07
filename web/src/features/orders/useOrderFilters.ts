import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { lagosToday, shiftDay } from '@/lib/dates'
import { applyFilterPatch, type DatePreset, type OrderFilters } from './filterParams'

export type { DatePreset, OrderFilters }

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

/** Order list filters live in the URL so a filtered view can be shared or bookmarked. */
export function useOrderFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<OrderFilters>(() => {
    const preset = (params.get('preset') ?? '') as DatePreset
    const range = rangeForPreset(preset)
    return {
      q: params.get('q') ?? '',
      status: params.get('status') ?? '',
      payment: params.get('payment') ?? '',
      preset,
      from: range?.from ?? params.get('from') ?? '',
      to: range?.to ?? params.get('to') ?? '',
    }
  }, [params])

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const orderId = Number(params.get('order')) || null

  const setFilters = useCallback(
    (patch: Partial<OrderFilters>) => {
      setParams((prev) => applyFilterPatch(prev, patch))
    },
    [setParams],
  )

  const setPage = useCallback(
    (p: number) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (p > 1) next.set('page', String(p))
        else next.delete('page')
        return next
      }),
    [setParams],
  )

  const openOrder = useCallback(
    (id: number | null) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set('order', String(id))
        else next.delete('order')
        return next
      }),
    [setParams],
  )

  const clear = useCallback(() => setParams(new URLSearchParams()), [setParams])

  return { filters, page, orderId, setFilters, setPage, openOrder, clear }
}
