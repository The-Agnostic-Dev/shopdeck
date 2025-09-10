import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import { parseMoneyInput } from '@/lib/money'
import { useSaveDiscount } from './api'

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'At least 3 characters'),
  description: z.string().optional(),
  kind: z.enum(['percent', 'fixed']),
  value: z.string().min(1, 'Required'),
  minOrder: z.string(),
  maxUses: z.string(),
  endsAt: z.string(),
})

type Values = z.infer<typeof schema>

export function DiscountFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveDiscount()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', description: '', kind: 'percent', value: '', minOrder: '', maxUses: '', endsAt: '' },
  })
  const kind = form.watch('kind')

  const submit = form.handleSubmit(async (v) => {
    const value = v.kind === 'percent' ? Number(v.value) : parseMoneyInput(v.value)
    if (!value || value <= 0) return form.setError('value', { message: 'Enter a positive amount' })
    try {
      await save.mutateAsync({
        code: v.code,
        description: v.description || null,
        kind: v.kind,
        value,
        minOrderKobo: v.minOrder ? (parseMoneyInput(v.minOrder) ?? 0) : 0,
        maxUses: v.maxUses ? Number(v.maxUses) : null,
        endsAt: v.endsAt ? new Date(`${v.endsAt}T23:59:59+01:00`).toISOString() : null,
      })
      toast.success(`${v.code.toUpperCase()} created`)
      form.reset()
      onOpenChange(false)
    } catch (err) {
      form.setError('root', { message: err instanceof ApiError ? err.message : 'Could not save' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New discount code</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {form.formState.errors.root && <p className="text-sm text-red-600 sm:col-span-2">{form.formState.errors.root.message}</p>}
          <div className="sm:col-span-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" className="mt-1.5 uppercase" {...form.register('code')} />
            <FieldError message={form.formState.errors.code?.message} />
          </div>
          <div>
            <Label htmlFor="kind">Type</Label>
            <Select id="kind" className="mt-1.5 w-full" {...form.register('kind')}>
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="value">{kind === 'percent' ? 'Percent' : 'Amount (₦)'}</Label>
            <Input id="value" inputMode="decimal" className="mt-1.5" {...form.register('value')} />
            <FieldError message={form.formState.errors.value?.message} />
          </div>
          <div>
            <Label htmlFor="minOrder">Minimum order (₦)</Label>
            <Input id="minOrder" inputMode="decimal" className="mt-1.5" {...form.register('minOrder')} />
          </div>
          <div>
            <Label htmlFor="maxUses">Use limit</Label>
            <Input id="maxUses" type="number" min={1} className="mt-1.5" placeholder="No limit" {...form.register('maxUses')} />
          </div>
          <div>
            <Label htmlFor="endsAt">Ends on</Label>
            <Input id="endsAt" type="date" className="mt-1.5" {...form.register('endsAt')} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" className="mt-1.5" {...form.register('description')} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Create code
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
