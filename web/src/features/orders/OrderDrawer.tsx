import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { OrderStatusBadge } from '@/components/StatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api'
import { formatDateTime, weekdayShort } from '@/lib/dates'
import type { OrderStatus } from '@/lib/types'
import { useAssignPicker, useChangeStatus, useOrder, usePickers } from './api'
import { CancelOrderDialog } from './CancelOrderDialog'
import { OrderItemsCard } from './OrderItemsCard'
import { OrderPaymentCard } from './OrderPaymentCard'
import { OrderTimeline } from './OrderTimeline'

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Confirm order',
  picking: 'Start picking',
  packed: 'Mark as packed',
  out_for_delivery: 'Send out for delivery',
  delivered: 'Mark delivered',
}

export function OrderDrawer({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  return (
    <Sheet open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent aria-describedby={undefined}>{orderId ? <DrawerBody orderId={orderId} /> : null}</SheetContent>
    </Sheet>
  )
}

function DrawerBody({ orderId }: { orderId: number }) {
  const { can } = useAuth()
  const { data, isPending, isError, error } = useOrder(orderId)
  const changeStatus = useChangeStatus(orderId)
  const assign = useAssignPicker(orderId)
  const pickers = usePickers(can('orders:update_status'))
  const [cancelling, setCancelling] = useState(false)

  if (isPending) {
    return (
      <div className="space-y-3 p-5">
        <SheetTitle className="sr-only">Loading order</SheetTitle>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (isError) {
    return (
      <div className="p-5">
        <SheetTitle className="sr-only">Order</SheetTitle>
        <Alert tone="error">{error.message}</Alert>
      </div>
    )
  }

  const { order, customer } = data
  const forward = order.nextStatuses.filter((s) => s !== 'cancelled')

  const move = async (status: OrderStatus) => {
    try {
      await changeStatus.mutateAsync(status)
      toast.success(`${order.number}: ${ACTION_LABELS[status]?.toLowerCase() ?? status} done`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update the order')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-5 pb-10" data-testid="order-drawer" data-order-id={order.id}>
      <header className="pr-8">
        <div className="flex items-center gap-2">
          <SheetTitle className="text-lg font-semibold">{order.number}</SheetTitle>
          <OrderStatusBadge status={order.status} />
        </div>
        <SheetDescription className="text-sm text-[var(--muted)]">Placed {formatDateTime(order.placedAt)}</SheetDescription>
        {order.cancelReason && <p className="mt-1 text-sm text-red-700">Cancelled: {order.cancelReason}</p>}
      </header>

      {(forward.length > 0 || order.nextStatuses.includes('cancelled')) && (
        <div className="flex flex-wrap gap-2">
          {can('orders:update_status') &&
            forward.map((s) => (
              <Button key={s} size="sm" disabled={changeStatus.isPending} onClick={() => move(s)}>
                {ACTION_LABELS[s]}
              </Button>
            ))}
          {can('orders:cancel') && order.nextStatuses.includes('cancelled') && (
            <Button size="sm" variant="outline" onClick={() => setCancelling(true)}>
              Cancel order
            </Button>
          )}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-semibold">Customer</h3>
          <Link to={`/customers/${customer.id}`} className="text-sm text-brand-700 hover:underline">
            {customer.name}
          </Link>
          {customer.phone ? (
            <div className="text-sm">{customer.phone}</div>
          ) : (
            <div className="text-xs text-[var(--muted)]">Contact details hidden for your role</div>
          )}
          {customer.email && <div className="text-sm text-[var(--muted)]">{customer.email}</div>}
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">Delivery</h3>
          <div className="text-sm">{order.deliveryAddress}</div>
          {order.slot && (
            <div className="text-sm text-[var(--muted)]">
              {weekdayShort(order.slot.day)}, {order.slot.startsAt}–{order.slot.endsAt}
            </div>
          )}
          {order.notes && <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">“{order.notes}”</div>}
        </div>
      </section>

      {can('orders:update_status') && !['delivered', 'cancelled'].includes(order.status) && (
        <section className="flex items-center gap-2 text-sm">
          <label htmlFor="picker" className="font-semibold">
            Picker
          </label>
          <Select
            id="picker"
            value={order.pickerId ?? ''}
            onChange={(e) => assign.mutate(e.target.value ? Number(e.target.value) : null)}
            disabled={assign.isPending}
          >
            <option value="">Not assigned</option>
            {pickers.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </section>
      )}

      <OrderItemsCard detail={data} />
      <OrderPaymentCard detail={data} />
      <OrderTimeline history={data.history} />

      <CancelOrderDialog open={cancelling} onOpenChange={setCancelling} orderId={order.id} orderNumber={order.number} />
    </div>
  )
}
