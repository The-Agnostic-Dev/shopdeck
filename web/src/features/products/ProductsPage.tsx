import { Search, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/context'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/money'
import { ExportButton } from '../exports/ExportButton'
import { useCategories, useProducts } from './api'
import { ImportDialog } from './ImportDialog'
import { NewProductDialog } from './NewProductDialog'

export function ProductsPage() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [importing, setImporting] = useState(false)
  const category = params.get('category') ?? ''
  const lowStock = params.get('lowStock') === 'true'
  const page = Number(params.get('page') ?? 1)
  const categories = useCategories()

  const update = (patch: Record<string, string>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if (!('page' in patch)) next.delete('page')
      return next
    })

  useEffect(() => {
    if (q === (params.get('q') ?? '')) return
    const t = setTimeout(() => update({ q }), 300)
    return () => clearTimeout(t)
  }, [q])

  const products = useProducts({ page, q: params.get('q') || undefined, category: category || undefined, lowStock: lowStock || undefined })

  return (
    <>
      <PageHeader
        title="Products"
        description="Catalogue, prices and stock levels."
        actions={
          <>
            <ExportButton kind="products" filters={{ q: params.get('q') ?? '', category, lowStock: lowStock ? 'true' : '' }} />
            {can('products:write') && (
              <>
                <Button variant="outline" onClick={() => setImporting(true)}>
                  <Upload /> Import CSV
                </Button>
                <NewProductDialog />
              </>
            )}
          </>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-[var(--muted)]" />
            <Input
              aria-label="Search products"
              className="pl-8"
              placeholder="Name, brand or SKU"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select aria-label="Category" value={category} onChange={(e) => update({ category: e.target.value })}>
            <option value="">All categories</option>
            {categories.data?.items.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.productCount})
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={lowStock} onChange={(e) => update({ lowStock: e.target.checked ? 'true' : '' })} />
            Low stock only
          </label>
        </div>
        {products.isPending ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !products.data?.items.length ? (
          <EmptyState title="No products found" />
        ) : (
          <Table data-testid="products-table">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data.items.map((p) => (
                <TableRow key={p.id} data-product-id={p.id} data-sku={p.sku}>
                  <TableCell>
                    <Link to={`/products/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {p.name}
                    </Link>
                    {p.status === 'archived' && <Badge className="ml-2">Archived</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="text-[var(--muted)]">{p.category}</TableCell>
                  <TableCell className="text-right tabular">{formatMoney(p.priceKobo)}</TableCell>
                  <TableCell className="text-right tabular">
                    {p.stock <= p.lowStockThreshold ? <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock}</Badge> : p.stock}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {products.data && <Pagination meta={products.data.meta} onPage={(p) => update({ page: String(p) })} />}
      </Card>
      <ImportDialog open={importing} onOpenChange={setImporting} />
    </>
  )
}
