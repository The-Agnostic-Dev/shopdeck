import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { StatCard } from '@/components/StatCard'
import { RefundStatusBadge } from '@/components/StatusBadge'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/dates'
import { formatNaira, titleCase } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import type { RefundStatus } from '@/lib/types'
import { useRefunds } from './api'

export function RefundsPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as RefundStatus | ''
  const page = Number(params.get('page') ?? 1)
  const refunds = useRefunds({ page, status: status || undefined })
  const totals = refunds.data?.totals

  return (
    <>
      <PageHeader title="Refunds" description="Every refund sent to Payfront, newest first." />
      {totals && (
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <StatCard testId="refunds-succeeded" label="Refunded" value={formatMoney(totals.succeededKobo)} />
          <StatCard testId="refunds-pending" label="Processing" value={formatMoney(totals.pendingKobo)} />
          <StatCard
            testId="refunds-failed"
            label="Failed"
            value={formatMoney(totals.failedKobo)}
            hint="Money went back to the merchant balance"
          />
        </div>
      )}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
          <Select aria-label="Refund status" value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})}>
            <option value="">All refunds</option>
            <option value="pending">Processing</option>
            <option value="succeeded">Refunded</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
        {refunds.data && !refunds.data.items.length ? (
          <EmptyState title="No refunds" />
        ) : (
          <Table data-testid="refunds-table">
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.data?.items.map((r) => (
                <TableRow key={r.id} data-refund-id={r.id} data-amount-kobo={r.amountKobo}>
                  <TableCell>
                    <Link to={`/orders?order=${r.orderId}`} className="text-brand-700 hover:underline">
                      {r.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customerName}</TableCell>
                  <TableCell>
                    {titleCase(r.reason)}
                    {r.note && <div className="text-xs text-[var(--muted)]">{r.note}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular" data-testid="refund-amount">
                    {formatNaira(r.amountKobo)}
                  </TableCell>
                  <TableCell>
                    <RefundStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-[var(--muted)]">
                    {formatDateTime(r.createdAt)}
                    {r.createdByName ? ` · ${r.createdByName}` : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {refunds.data && (
          <Pagination meta={refunds.data.meta} onPage={(p) => setParams({ ...(status ? { status } : {}), page: String(p) })} />
        )}
      </Card>
    </>
  )
}
