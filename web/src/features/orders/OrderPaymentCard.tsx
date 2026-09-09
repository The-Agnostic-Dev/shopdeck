import { useState } from 'react'
import { useAuth } from '@/auth/context'
import { PaymentBadge, RefundStatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/dates'
import { titleCase } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import { RefundDialog } from '../refunds/RefundDialog'
import type { OrderDetail } from './api'

export function OrderPaymentCard({ detail }: { detail: OrderDetail }) {
  const { can } = useAuth()
  const [refunding, setRefunding] = useState(false)
  const { order, refunds } = detail

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Payment</h3>
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">Method</dt>
          <dd>{order.paymentMethod === 'card' ? `Card •••• ${order.cardLast4}` : titleCase(order.paymentMethod)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">Payfront reference</dt>
          <dd className="font-mono text-xs">{order.paymentReference}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">Refunded</dt>
          <dd className="tabular" data-testid="order-refunded">
            {formatMoney(order.refundedKobo)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">Can still refund</dt>
          <dd className="tabular" data-testid="order-refundable">
            {formatMoney(order.refundableKobo)}
          </dd>
        </div>
      </dl>

      {refunds.length > 0 && (
        <ul className="mt-3 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]" data-testid="order-refunds">
          {refunds.map((r) => (
            <li key={r.id} className="px-3 py-2 text-sm" data-refund-id={r.id}>
              <div className="flex items-center justify-between">
                <span className="tabular font-medium">{formatMoney(r.amountKobo)}</span>
                <RefundStatusBadge status={r.status} />
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">
                {titleCase(r.reason)} · {formatDateTime(r.createdAt)}
                {r.providerStatusText && r.status === 'pending' ? ` · ${r.providerStatusText}` : ''}
              </div>
              {r.failureReason && <div className="mt-0.5 text-xs text-red-700">{r.failureReason}</div>}
            </li>
          ))}
        </ul>
      )}

      {can('refunds:create') && order.refundableKobo > 0 && order.status !== 'pending' && (
        <Button variant="outline" className="mt-3 w-full" onClick={() => setRefunding(true)}>
          Issue refund
        </Button>
      )}
      <RefundDialog
        open={refunding}
        onOpenChange={setRefunding}
        orderId={order.id}
        orderNumber={order.number}
        refundableKobo={order.refundableKobo}
      />
    </section>
  )
}
