import type { ColumnDef } from '@tanstack/react-table'
import { OrderStatusBadge, PaymentBadge } from '@/components/StatusBadge'
import { formatDateTime, weekdayShort } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { OrderRow } from '@/lib/queries/orders'

const methodLabel = (o: OrderRow) =>
  o.paymentMethod === 'card' ? `Card •••• ${o.cardLast4 ?? '????'}` : o.paymentMethod === 'transfer' ? 'Bank transfer' : 'USSD'

export const orderColumns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: 'number',
    header: 'Order',
    cell: ({ row }) => <span className="font-medium text-brand-700">{row.original.number}</span>,
  },
  {
    accessorKey: 'placedAt',
    header: 'Placed',
    cell: ({ getValue }) => <span className="whitespace-nowrap text-[var(--muted)]">{formatDateTime(getValue<string>())}</span>,
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ row }) => (
      <div>
        <div>{row.original.customerName}</div>
        <div className="text-xs text-[var(--muted)]">{row.original.area}</div>
      </div>
    ),
  },
  {
    id: 'slot',
    header: 'Delivery slot',
    cell: ({ row }) =>
      row.original.slotDay ? (
        <span className="whitespace-nowrap text-xs">
          {weekdayShort(row.original.slotDay)}, {row.original.slotStartsAt}–{row.original.slotEndsAt}
        </span>
      ) : (
        <span className="text-xs text-[var(--muted)]">·</span>
      ),
  },
  { accessorKey: 'itemCount', header: 'Items', cell: ({ getValue }) => <span className="tabular">{getValue<number>()}</span> },
  {
    accessorKey: 'totalKobo',
    header: 'Total',
    cell: ({ row }) => (
      <div className="text-right">
        <div className="tabular font-medium">{formatMoney(row.original.totalKobo)}</div>
        <div className="text-xs text-[var(--muted)]">{methodLabel(row.original)}</div>
      </div>
    ),
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Payment',
    cell: ({ row }) => <PaymentBadge status={row.original.paymentStatus} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
  },
]
