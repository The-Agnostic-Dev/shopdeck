import { Badge, type BadgeTone } from '@/components/ui/badge'
import type { OrderStatus, PaymentStatus, RefundStatus } from '@/lib/types'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  picking: 'Picking',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const orderTones: Record<OrderStatus, BadgeTone> = {
  pending: 'amber',
  confirmed: 'blue',
  picking: 'blue',
  packed: 'violet',
  out_for_delivery: 'blue',
  delivered: 'green',
  cancelled: 'neutral',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={orderTones[status]} data-status={status}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  )
}

const paymentLabels: Record<PaymentStatus, string> = {
  paid: 'Paid',
  partially_refunded: 'Partly refunded',
  refunded: 'Refunded',
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone: BadgeTone = status === 'paid' ? 'green' : status === 'refunded' ? 'neutral' : 'amber'
  return (
    <Badge tone={tone} data-payment={status}>
      {paymentLabels[status]}
    </Badge>
  )
}

const refundLabels: Record<RefundStatus, string> = { pending: 'Processing', succeeded: 'Refunded', failed: 'Failed' }

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const tone: BadgeTone = status === 'succeeded' ? 'green' : status === 'failed' ? 'red' : 'amber'
  return (
    <Badge tone={tone} data-refund-status={status}>
      {refundLabels[status]}
    </Badge>
  )
}
