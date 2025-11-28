import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import { useAdjustStock, type Product } from './api'

type Kind = 'receive' | 'damage' | 'correction' | 'return'

const HELP: Record<Kind, string> = {
  receive: 'Units delivered by a supplier.',
  damage: 'Units thrown away or spoilt. Say what happened.',
  correction: 'Enter the number you counted on the shelf. Shopdeck works out the difference.',
  return: 'Units a customer brought back in sellable condition.',
}

export function StockAdjustDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const adjust = useAdjustStock(product.id)
  const [kind, setKind] = useState<Kind>('receive')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const n = Number(quantity)
    if (!Number.isInteger(n) || n < 0) return setError('Enter a whole number')
    try {
      const { product: updated } = await adjust.mutateAsync({ kind, quantity: n, reason: reason || undefined })
      toast.success(`${product.name}: stock is now ${updated.stock}`)
      setQuantity('')
      setReason('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the adjustment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product.name}: {product.stock} in stock now, reorder level {product.lowStockThreshold}.
          </DialogDescription>
        </DialogHeader>
        <form id="adjust-form" onSubmit={submit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <Label htmlFor="adjust-kind">Type</Label>
            <Select id="adjust-kind" className="mt-1.5 w-full" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              <option value="receive">Received from supplier</option>
              <option value="damage">Damaged or expired</option>
              <option value="correction">Stock count correction</option>
              <option value="return">Customer return</option>
            </Select>
            <p className="mt-1 text-xs text-[var(--muted)]">{HELP[kind]}</p>
          </div>
          <div>
            <Label htmlFor="adjust-quantity">{kind === 'correction' ? 'Counted stock' : 'Quantity'}</Label>
            <Input
              id="adjust-quantity"
              type="number"
              min={0}
              className="mt-1.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adjust-reason">Reason</Label>
            <Input id="adjust-reason" className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button type="submit" form="adjust-form" disabled={adjust.isPending}>
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
