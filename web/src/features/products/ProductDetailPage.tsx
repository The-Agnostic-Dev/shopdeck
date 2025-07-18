import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { PageHeader } from '@/components/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/dates'
import { titleCase, initials } from '@/lib/format'
import { formatMoney } from '@/lib/money'
import { useArchiveProduct, useProduct, useSaveProduct } from './api'
import { ProductForm } from './ProductForm'
import { StockAdjustDialog } from './StockAdjustDialog'

export function ProductDetailPage() {
  const id = Number(useParams().id)
  const { can } = useAuth()
  const { data, isPending, isError, error } = useProduct(id)
  const save = useSaveProduct(id)
  const archive = useArchiveProduct(id)
  const [adjusting, setAdjusting] = useState(false)

  if (isPending) return <Skeleton className="h-96" />
  if (isError) return <Alert tone="error">{error.message}</Alert>
  const { product, movements } = data
  const low = product.stock <= product.lowStockThreshold

  return (
    <>
      <Link to="/products" className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft className="size-4" /> Products
      </Link>
      <PageHeader
        title={product.name}
        description={`${product.sku} · ${product.category ?? 'No category'}`}
        actions={
          <>
            {can('inventory:adjust') && <Button onClick={() => setAdjusting(true)}>Adjust stock</Button>}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            {can('products:write') ? (
              <ProductForm
                key={product.updatedAt}
                product={product}
                submitLabel="Save changes"
                onSubmit={async (input) => {
                  await save.mutateAsync(input)
                  toast.success('Product saved')
                }}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-[var(--muted)]">Price</dt>
                <dd>{formatMoney(product.priceKobo)}</dd>
                <dt className="text-[var(--muted)]">Barcode</dt>
                <dd>{product.barcode ?? '·'}</dd>
              </dl>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-4">
              <div className="flex size-16 items-center justify-center rounded-lg bg-brand-50 text-lg font-semibold text-brand-700">
                {initials(product.name)}
              </div>
              <div>
                <div className="text-3xl font-semibold tabular" data-testid="product-stock">
                  {product.stock}
                </div>
                <div className="text-sm text-[var(--muted)]">in stock · reorder at {product.lowStockThreshold}</div>
                {low && (
                  <Badge tone="amber" className="mt-1">
                    Low stock
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stock history</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {movements.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <div>
                      <div>
                        {titleCase(m.kind)}
                        {m.reason ? `: ${m.reason}` : ''}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {formatDateTime(m.createdAt)}
                        {m.staffName ? ` · ${m.staffName}` : ''}
                      </div>
                    </div>
                    <div className="text-right tabular">
                      <div className={m.quantity < 0 ? 'text-red-700' : 'text-emerald-700'}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{m.stockAfter}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      <StockAdjustDialog product={product} open={adjusting} onOpenChange={setAdjusting} />
    </>
  )
}
