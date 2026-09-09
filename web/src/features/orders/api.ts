import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { orderKeys } from '@/lib/queryKeys'
import type { OrderStatus, Paged, PaymentStatus, Refund } from '@/lib/types'

export interface OrderRow {
  id: number
  number: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: 'card' | 'transfer' | 'ussd'
  cardLast4: string | null
  totalKobo: number
  refundedKobo: number
  placedAt: string
  area: string | null
  customerId: number
  customerName: string
  discountCode: string | null
  slotDay: string | null
  slotStartsAt: string | null
  slotEndsAt: string | null
  itemCount: number
}

export interface OrderItem {
  id: number
  productId: number | null
  sku: string
  name: string
  unitPriceKobo: number
  quantity: number
  lineTotalKobo: number
  status: 'ok' | 'substituted' | 'unavailable'
  substituteName: string | null
  substitutePriceKobo: number | null
  note: string | null
}

export interface OrderDetail {
  order: OrderRow & {
    subtotalKobo: number
    discountKobo: number
    deliveryFeeKobo: number
    refundableKobo: number
    paymentReference: string
    statusLabel: string
    nextStatuses: OrderStatus[]
    deliveryAddress: string | null
    notes: string | null
    cancelReason: string | null
    pickerId: number | null
    pickerName: string | null
    slot: { day: string; startsAt: string; endsAt: string } | null
  }
  customer: { id: number; name: string; area: string | null; email: string | null; phone: string | null }
  items: OrderItem[]
  refunds: Refund[]
  history: { id: number; action: string; details: Record<string, unknown>; createdAt: string; actorName: string | null }[]
}

export interface OrderListParams {
  page: number
  perPage?: number
  status?: string
  payment?: string
  from?: string
  to?: string
  q?: string
}

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => api.get<Paged<OrderRow>>('/orders', { ...params }),
    placeholderData: keepPreviousData,
  })
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: orderKeys.detail(id ?? 0),
    queryFn: () => api.get<OrderDetail>(`/orders/${id}`),
    enabled: !!id,
  })
}

function useOrderMutation<TVars>(orderId: number, fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })
}

export function useChangeStatus(orderId: number) {
  return useOrderMutation(orderId, (status: OrderStatus) => api.post(`/orders/${orderId}/status`, { status }))
}

export function useCancelOrder(orderId: number) {
  return useOrderMutation(orderId, (reason: string) => api.post(`/orders/${orderId}/cancel`, { reason }))
}

export function useAssignPicker(orderId: number) {
  return useOrderMutation(orderId, (pickerId: number | null) => api.post(`/orders/${orderId}/picker`, { pickerId }))
}

export function useSubstitute(orderId: number) {
  return useOrderMutation(orderId, (vars: { itemId: number; substituteProductId: number | null; note?: string }) =>
    api.post(`/orders/${orderId}/items/${vars.itemId}/substitute`, { substituteProductId: vars.substituteProductId, note: vars.note }),
  )
}

export type BulkAction = 'confirm' | 'start_picking' | 'mark_packed' | 'cancel' | 'assign_picker'

export interface BulkResponse {
  results: { id: number; ok: boolean; error?: string }[]
  succeeded: number
  failed: number
}

export function useBulkAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { ids: number[]; action: BulkAction; reason?: string; pickerId?: number }) =>
      api.post<BulkResponse>('/orders/bulk', vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  })
}

export function usePickers(enabled: boolean) {
  return useQuery({
    queryKey: ['staff', 'pickers'],
    queryFn: () => api.get<{ items: { id: number; name: string }[] }>('/staff/pickers'),
    enabled,
    staleTime: 10 * 60_000,
  })
}
