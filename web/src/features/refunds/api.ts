import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { orderKeys, refundKeys } from '@/lib/queryKeys'
import type { Paged, Refund, RefundStatus } from '@/lib/types'

export const REFUND_REASONS = [
  { value: 'damaged', label: 'Damaged item' },
  { value: 'missing_item', label: 'Missing item' },
  { value: 'substitution', label: 'Substitution not accepted' },
  { value: 'late_delivery', label: 'Late delivery' },
  { value: 'cancelled', label: 'Order cancelled' },
  { value: 'goodwill', label: 'Goodwill' },
  { value: 'other', label: 'Other' },
] as const

export type RefundReason = (typeof REFUND_REASONS)[number]['value']

export interface RefundListRow extends Refund {
  orderNumber: string
  customerName: string
  createdByName: string | null
}

export interface RefundList extends Paged<RefundListRow> {
  totals: { pendingKobo: number; succeededKobo: number; failedKobo: number; count: number }
}

export function useRefunds(params: { page: number; status?: RefundStatus | ''; from?: string; to?: string }) {
  return useQuery({
    queryKey: refundKeys.list(params),
    queryFn: () => api.get<RefundList>('/refunds', { ...params }),
    placeholderData: keepPreviousData,
  })
}

export interface CreateRefundVars {
  amountKobo: number
  reason: RefundReason
  note?: string
  idempotencyKey: string
}

export function useCreateRefund(orderId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idempotencyKey, ...body }: CreateRefundVars) =>
      api.post<{ refund: Refund; replayed: boolean }>(`/orders/${orderId}/refunds`, body, { 'Idempotency-Key': idempotencyKey }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
        queryClient.invalidateQueries({ queryKey: refundKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })
}
