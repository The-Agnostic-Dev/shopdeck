import { Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { ExportButton } from '../exports/ExportButton'
import { useCustomers } from './api'

export function CustomersPage() {
  const [q, setQ] = useState('')
  const deferredQ = useDeferredValue(q.trim())
  const customers = useCustomers({ q: deferredQ || undefined })
  const rows = customers.data?.pages.flatMap((p) => p.items) ?? []
  const total = customers.data?.pages[0]?.total

  return (
    <>
      <PageHeader
        title="Customers"
        description={total !== undefined ? `${total.toLocaleString('en-NG')} customers` : 'Loading…'}
        actions={<ExportButton kind="customers" filters={{}} />}
      />
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-[var(--muted)]" />
            <Input
              aria-label="Search customers"
              className="pl-8"
              placeholder="Name, email or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        {customers.isSuccess && rows.length === 0 ? (
          <EmptyState title="No customers found" />
        ) : (
          <Table data-testid="customers-table">
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Lifetime spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} data-customer-id={c.id}>
                  <TableCell>
                    <Link to={`/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">{c.email || 'Contact hidden'}</div>
                  </TableCell>
                  <TableCell>{c.area}</TableCell>
                  <TableCell className="text-[var(--muted)]">{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="text-right tabular">{c.orderCount}</TableCell>
                  <TableCell className="text-right tabular">{formatMoney(c.lifetimeKobo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)]">
          <span data-testid="customers-shown">
            Showing {rows.length.toLocaleString('en-NG')}
            {total !== undefined ? ` of ${total.toLocaleString('en-NG')}` : ''}
          </span>
          {customers.hasNextPage && (
            <Button variant="outline" size="sm" disabled={customers.isFetchingNextPage} onClick={() => customers.fetchNextPage()}>
              {customers.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </div>
      </Card>
    </>
  )
}
