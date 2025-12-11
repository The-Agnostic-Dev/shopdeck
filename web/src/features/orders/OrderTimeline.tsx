import { formatDateTime } from '@/lib/dates'
import { titleCase } from '@/lib/format'
import type { OrderDetail } from './api'

function describe(action: string, details: Record<string, unknown>) {
  if (action === 'order.placed') return 'Order placed on the storefront'
  if (action.startsWith('status.')) return `Status changed to ${titleCase(action.slice(7))}${details.reason ? `: ${details.reason}` : ''}`
  if (action === 'refund.created') return 'Refund started'
  if (action === 'refund.succeeded') return 'Refund completed by Payfront'
  if (action === 'refund.failed') return 'Refund failed at Payfront'
  if (action === 'picker.assigned') return 'Picker assigned'
  if (action === 'item.substituted') return `Substituted ${details.sku ?? 'an item'}`
  if (action === 'item.unavailable') return `Marked ${details.sku ?? 'an item'} unavailable`
  return titleCase(action.replace('.', ' '))
}

export function OrderTimeline({ history }: { history: OrderDetail['history'] }) {
  if (!history.length) return null
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">History</h3>
      <ol className="space-y-2 border-l border-[var(--border)] pl-4">
        {history.map((h) => (
          <li key={h.id} className="relative text-sm">
            <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-brand-500" />
            <div>{describe(h.action, h.details)}</div>
            <div className="text-xs text-[var(--muted)]">
              {formatDateTime(h.createdAt)}
              {h.actorName ? ` · ${h.actorName}` : ''}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
