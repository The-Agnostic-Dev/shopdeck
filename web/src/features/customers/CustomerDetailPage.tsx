import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { PageHeader } from '@/components/PageHeader'
import { OrderStatusBadge, PaymentBadge } from '@/components/StatusBadge'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatDateTime } from '@/lib/dates'
import { formatPhone } from './phone'
import { formatMoney } from '@/lib/money'
import { useCustomer, useUpdateCustomer, type CustomerOrder } from './api'
import { GoodwillRefundDialog } from './GoodwillRefundDialog'

export function CustomerDetailPage() {
  const id = Number(useParams().id)
  const { can } = useAuth()
  const { data, isPending, isError, error } = useCustomer(id)
  const update = useUpdateCustomer(id)
  const [notes, setNotes] = useState<string | null>(null)
  const [refunding, setRefunding] = useState<CustomerOrder | null>(null)

  if (isPending) return <Skeleton className="h-96" />
  if (isError) return <Alert tone="error">{error.message}</Alert>
  const { customer, orders } = data
  const canRefund = can('customers:write')

  return (
    <>
      <Link to="/customers" className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <PageHeader title={customer.name} description={`Customer since ${formatDate(customer.createdAt)} · ${customer.area ?? ''}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {customer.phone ? (
              <>
                <div>{formatPhone(customer.phone)}</div>
                <div className="text-[var(--muted)]">{customer.email}</div>
              </>
            ) : (
              <div className="text-[var(--muted)]">Contact details hidden for your role</div>
            )}
            <div className="pt-2">{customer.address}</div>
            <div className="pt-2 text-[var(--muted)]">
              {customer.orderCount} orders · {formatMoney(customer.lifetimeKobo)} lifetime
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notes for the team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={notes ?? customer.notes ?? ''}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!can('customers:write')}
              placeholder="Allergies, delivery preferences, complaints…"
            />
            {can('customers:write') && notes !== null && (
              <Button
                size="sm"
                onClick={async () => {
                  await update.mutateAsync({ notes: notes || null })
                  toast.success('Notes saved')
                  setNotes(null)
                }}
              >
                Save notes
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <Table data-testid="customer-orders">
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} data-order-id={o.id}>
                <TableCell>
                  <Link to={`/orders?order=${o.id}`} className="text-brand-700 hover:underline">
                    {o.number}
                  </Link>
                </TableCell>
                <TableCell className="text-[var(--muted)]">{formatDateTime(o.placedAt)}</TableCell>
                <TableCell className="text-right tabular">{formatMoney(o.totalKobo)}</TableCell>
                <TableCell>
                  <PaymentBadge status={o.paymentStatus} />
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={o.status} />
                </TableCell>
                <TableCell className="text-right">
                  {canRefund && o.status === 'delivered' && o.paymentStatus !== 'refunded' && (
                    <Button size="sm" variant="outline" onClick={() => setRefunding(o)}>
                      Refund
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <GoodwillRefundDialog customerId={customer.id} order={refunding} onClose={() => setRefunding(null)} />
    </>
  )
}
