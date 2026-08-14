import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { relativeTime } from '@/lib/dates'
import { productKeys } from '@/lib/queryKeys'
import { ExportButton } from '../exports/ExportButton'

interface LowStockRow {
  id: number
  sku: string
  name: string
  stock: number
  lowStockThreshold: number
  category: string | null
  alertedAt: string | null
  shortfall: number
}

export function LowStockPage() {
  const { data } = useQuery({ queryKey: productKeys.lowStock, queryFn: () => api.get<{ items: LowStockRow[] }>('/inventory/low-stock') })
  return (
    <>
      <PageHeader
        title="Low stock"
        description="Active products at or below their reorder level. Ops is emailed once when a product drops to its reorder level."
        actions={<ExportButton kind="products" filters={{ lowStock: 'true' }} />}
      />
      <Card>
        {data && !data.items.length ? (
          <EmptyState title="Nothing is running low" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">In stock</TableHead>
                <TableHead className="text-right">Reorder level</TableHead>
                <TableHead>Ops alerted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link to={`/products/${p.id}`} className="text-brand-700 hover:underline">
                      {p.name}
                    </Link>
                    <div className="font-mono text-xs text-[var(--muted)]">{p.sku}</div>
                  </TableCell>
                  <TableCell className="text-[var(--muted)]">{p.category}</TableCell>
                  <TableCell className="text-right">
                    <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular">{p.lowStockThreshold}</TableCell>
                  <TableCell className="text-[var(--muted)]">{p.alertedAt ? relativeTime(p.alertedAt) : 'Not yet'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
