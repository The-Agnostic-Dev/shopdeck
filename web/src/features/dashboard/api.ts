import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { dashboardKeys } from '@/lib/queryKeys'

export interface DashboardData {
  summary: {
    day: string
    orders: number
    netSalesKobo: number
    averageBasketKobo: number
    cancelled: number
    packing: { due: number; packed: number; percent: number }
    lowStock: number
    pendingRefunds: number
    awaitingConfirmation: number
  }
  series: { day: string; orders: number; netSalesKobo: number }[]
}

export function useDashboard(day: string) {
  return useQuery({
    queryKey: dashboardKeys.day(day),
    queryFn: () => api.get<DashboardData>('/dashboard', { day }),
    refetchInterval: 60_000,
  })
}
