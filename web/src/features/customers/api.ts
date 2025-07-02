import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { customerKeys, orderKeys } from '@/lib/queryKeys'
import type { OrderStatus, PaymentStatus } from '@/lib/types'

export interface CustomerRow {
  id: number
  name: string
  email: string
  phone: string
  area: string | null
  source: 'web' | 'app' | 'legacy_import'
  createdAt: string
  orderCount: number
  lifetimeKobo: number
  lastOrderAt: string | null
}

export interface CustomerPage {
  items: CustomerRow[]
  total: number
  nextCursor: string | null
}

export function useCustomers(params: { q?: string; area?: string }) {
  return useInfiniteQuery({
    queryKey: customerKeys.list(params),
    queryFn: ({ pageParam }) => api.get<CustomerPage>('/customers', { ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export interface CustomerOrder {
  id: number
  number: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  totalKobo: number
  refundedKobo: number
  placedAt: string
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () =>
      api.get<{
        customer: CustomerRow & { address: string | null; notes: string | null; marketingOptIn: boolean }
        orders: CustomerOrder[]
      }>(`/customers/${id}`),
  })
}

export function useUpdateCustomer(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { notes?: string | null; marketingOptIn?: boolean }) => api.patch(`/customers/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) }),
  })
}

export function useGoodwillRefund(customerId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { orderId: number; amountKobo: number; reason: string; note?: string }) =>
      api.post(`/customers/${customerId}/orders/${vars.orderId}/refund`, { amountKobo: vars.amountKobo, reason: vars.reason, note: vars.note }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      ]),
  })
}
