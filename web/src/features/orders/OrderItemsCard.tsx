import { Repeat } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/auth/context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/money'
import type { OrderDetail, OrderItem } from '@/lib/queries/orders'
import { SubstituteDialog } from './SubstituteDialog'

export function OrderItemsCard({ detail }: { detail: OrderDetail }) {
  const { can } = useAuth()
  const [substituting, setSubstituting] = useState<OrderItem | null>(null)
  const { order, items } = detail
  const canSubstitute = can('orders:substitute') && ['confirmed', 'picking'].includes(order.status)

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Items</h3>
      <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]" data-testid="order-items">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <div className={item.status === 'unavailable' ? 'line-through text-[var(--muted)]' : ''}>
                {item.quantity} × {item.name}
              </div>
              <div className="text-xs text-[var(--muted)]">{item.sku}</div>
              {item.status === 'substituted' && (
                <div className="mt-1 text-xs">
                  <Badge tone="violet">Substituted</Badge> {item.substituteName}
                </div>
              )}
              {item.status === 'unavailable' && (
                <Badge tone="red" className="mt-1">
                  Unavailable
                </Badge>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="tabular">{formatMoney(item.lineTotalKobo)}</span>
              {canSubstitute && (
                <Button variant="ghost" size="icon" aria-label={`Substitute ${item.name}`} onClick={() => setSubstituting(item)}>
                  <Repeat />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">Subtotal</dt>
          <dd className="tabular">{formatMoney(order.subtotalKobo)}</dd>
        </div>
        {order.discountKobo > 0 && (
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Discount {order.discountCode && `(${order.discountCode})`}</dt>
            <dd className="tabular">−{formatMoney(order.discountKobo)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">Delivery</dt>
          <dd className="tabular">{order.deliveryFeeKobo ? formatMoney(order.deliveryFeeKobo) : 'Free'}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total paid</dt>
          <dd className="tabular" data-testid="order-total">
            {formatMoney(order.totalKobo)}
          </dd>
        </div>
      </dl>
      <SubstituteDialog orderId={order.id} item={substituting} onClose={() => setSubstituting(null)} />
    </section>
  )
}
