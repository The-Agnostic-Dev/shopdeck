import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { discountKeys } from '@/lib/queryKeys'

export interface DiscountCode {
  id: number
  code: string
  description: string | null
  kind: 'percent' | 'fixed'
  value: number
  minOrderKobo: number
  maxUses: number | null
  usedCount: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
  orderCount: number
  usable: { ok: boolean; reason?: 'inactive' | 'not_started' | 'expired' | 'limit_reached' }
}

export function useDiscountCodes() {
  return useQuery({ queryKey: discountKeys.all, queryFn: () => api.get<{ items: DiscountCode[] }>('/discounts') })
}

export function useSaveDiscount(id?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => (id ? api.patch(`/discounts/${id}`, input) : api.post('/discounts', input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: discountKeys.all }),
  })
}
