import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import { useCancelOrder } from '@/lib/queries/orders'

const REASONS = ['Customer asked to cancel', 'Items out of stock', 'Duplicate order', 'Out of delivery area', 'Payment reversed by bank']

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  orderId: number
  orderNumber: string
}) {
  const cancel = useCancelOrder(orderId)
  const [reason, setReason] = useState(REASONS[0])
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Cancel ${orderNumber}?`}
      description="The customer is emailed and stock goes back on the shelf. Refunds are issued separately by finance."
      destructive
      confirmLabel="Cancel order"
      onConfirm={async () => {
        try {
          await cancel.mutateAsync(reason)
          toast.success(`${orderNumber} cancelled`)
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : 'Could not cancel the order')
          throw err
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="cancel-reason">Reason</Label>
        <Select id="cancel-reason" className="w-full" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </div>
    </ConfirmDialog>
  )
}
