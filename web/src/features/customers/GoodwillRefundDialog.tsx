import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import { formatMoney, parseMoneyInput } from '@/lib/money'
import { useGoodwillRefund, type CustomerOrder } from './api'

export function GoodwillRefundDialog({
  customerId,
  order,
  onClose,
}: {
  customerId: number
  order: CustomerOrder | null
  onClose: () => void
}) {
  const refund = useGoodwillRefund(customerId)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('goodwill')
  const [error, setError] = useState<string | null>(null)
  const max = order ? order.totalKobo - order.refundedKobo : 0

  const submit = async () => {
    if (!order) return
    const kobo = parseMoneyInput(amount)
    if (!kobo || kobo > max) return setError(`Enter an amount up to ${formatMoney(max)}`)
    try {
      await refund.mutateAsync({ orderId: order.id, amountKobo: kobo, reason, idempotencyKey: crypto.randomUUID() })
      toast.success(`Refund of ${formatMoney(kobo)} started for ${order.number}`)
      setAmount('')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refund failed')
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund {order?.number}</DialogTitle>
          <DialogDescription>For late deliveries and complaints. Up to {formatMoney(max)}.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="goodwill-amount">Amount (₦)</Label>
          <Input id="goodwill-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goodwill-reason">Reason</Label>
          <Select id="goodwill-reason" className="w-full" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="goodwill">Goodwill</option>
            <option value="late_delivery">Late delivery</option>
            <option value="damaged">Damaged item</option>
            <option value="missing_item">Missing item</option>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button onClick={submit} disabled={refund.isPending}>
            Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
