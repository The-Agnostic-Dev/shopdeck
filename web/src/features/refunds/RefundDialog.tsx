import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldError } from '@/components/FieldError'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, api } from '@/lib/api'
import { formatMoney, koboToInput, parseMoneyInput } from '@/lib/money'
import { orderKeys } from '@/lib/queryKeys'
import type { OrderDetail } from '../orders/api'
import { REFUND_REASONS, useCreateRefund, type RefundReason } from './api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  orderNumber: string
  refundableKobo: number
}

const reasonValues = REFUND_REASONS.map((r) => r.value) as [RefundReason, ...RefundReason[]]

export function RefundDialog({ open, onOpenChange, orderId, orderNumber, refundableKobo }: Props) {
  const refund = useCreateRefund(orderId)
  const queryClient = useQueryClient()
  const schema = z.object({
    amount: z
      .string()
      .refine((v) => parseMoneyInput(v) !== null, 'Enter an amount like 2500 or 2,500.00')
      .refine((v) => (parseMoneyInput(v) ?? 0) > 0, 'Amount must be more than ₦0')
      .refine((v) => (parseMoneyInput(v) ?? 0) <= refundableKobo, `At most ${formatMoney(refundableKobo)} can be refunded`),
    reason: z.enum(reasonValues),
    note: z.string().max(500).optional(),
  })
  type Values = z.infer<typeof schema>

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', reason: 'damaged', note: '' },
  })

  useEffect(() => {
    if (open) form.reset({ amount: '', reason: 'damaged', note: '' })
  }, [open, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const amountKobo = parseMoneyInput(values.amount)!
      // Someone else may have refunded this order since the panel was opened.
      const latest = await queryClient.fetchQuery({
        queryKey: orderKeys.detail(orderId),
        queryFn: () => api.get<OrderDetail>(`/orders/${orderId}`),
        staleTime: 0,
      })
      if (amountKobo > latest.order.refundableKobo) {
        form.setError('amount', { message: `Only ${formatMoney(latest.order.refundableKobo)} is left to refund on this order` })
        return
      }
      await refund.mutateAsync({
        amountKobo,
        reason: values.reason,
        note: values.note || undefined,
        idempotencyKey: crypto.randomUUID(),
      })
      toast.success(`Refund of ${formatMoney(amountKobo)} sent to Payfront`, { description: `Order ${orderNumber}` })
      onOpenChange(false)
    } catch (err) {
      form.setError('root', { message: err instanceof ApiError ? err.message : 'Refund failed. Nothing was charged; try again.' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue refund</DialogTitle>
          <DialogDescription>
            {orderNumber}: up to {formatMoney(refundableKobo)} can go back to the customer&apos;s original payment method.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" id="refund-form">
          {form.formState.errors.root && <Alert tone="error">{form.formState.errors.root.message}</Alert>}
          <div>
            <Label htmlFor="refund-amount">Amount (₦)</Label>
            <div className="mt-1.5 flex gap-2">
              <Input id="refund-amount" inputMode="decimal" placeholder="0.00" {...form.register('amount')} />
              <Button
                type="button"
                variant="outline"
                onClick={() => form.setValue('amount', koboToInput(refundableKobo), { shouldValidate: true })}
              >
                Full
              </Button>
            </div>
            <FieldError message={form.formState.errors.amount?.message} />
          </div>
          <div>
            <Label htmlFor="refund-reason">Reason</Label>
            <Select id="refund-reason" className="mt-1.5 w-full" {...form.register('reason')}>
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="refund-note">Note for the record</Label>
            <Textarea id="refund-note" className="mt-1.5" {...form.register('note')} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button type="submit" form="refund-form" disabled={refund.isPending}>
            {refund.isPending ? 'Sending…' : 'Issue refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
