import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ApiError, api } from '@/lib/api'
import { formatMoney } from '@/lib/money'
import { productKeys } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'
import { useSubstitute, type OrderItem } from './api'

interface ProductHit {
  id: number
  sku: string
  name: string
  priceKobo: number
  stock: number
}

export function SubstituteDialog({ orderId, item, onClose }: { orderId: number; item: OrderItem | null; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [chosen, setChosen] = useState<ProductHit | null>(null)
  const substitute = useSubstitute(orderId)
  const search = useQuery({
    queryKey: productKeys.list({ q, perPage: 8, purpose: 'substitute' }),
    queryFn: () => api.get<{ items: ProductHit[] }>('/products', { q, perPage: 8 }),
    enabled: q.trim().length >= 2,
  })

  const save = async (substituteProductId: number | null) => {
    if (!item) return
    try {
      await substitute.mutateAsync({ itemId: item.id, substituteProductId })
      toast.success(substituteProductId ? 'Substitute saved' : 'Marked unavailable')
      setQ('')
      setChosen(null)
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Substitute {item?.name}</DialogTitle>
          <DialogDescription>
            {item?.quantity} × {formatMoney(item?.unitPriceKobo)}. The customer is charged the original price.
          </DialogDescription>
        </DialogHeader>
        <Input autoFocus placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="max-h-64 divide-y overflow-y-auto rounded-md border border-[var(--border)]">
          {search.data?.items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setChosen(p)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50',
                  chosen?.id === p.id && 'bg-brand-50',
                )}
              >
                <span>
                  {p.name} <span className="text-xs text-[var(--muted)]">{p.sku}</span>
                </span>
                <span className="tabular text-xs">
                  {formatMoney(p.priceKobo)} · {p.stock} left
                </span>
              </button>
            </li>
          ))}
          {q.length >= 2 && search.data?.items.length === 0 && <li className="px-3 py-2 text-sm text-[var(--muted)]">No matches</li>}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => save(null)} disabled={substitute.isPending}>
            Mark unavailable
          </Button>
          <Button onClick={() => chosen && save(chosen.id)} disabled={!chosen || substitute.isPending}>
            Use substitute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
