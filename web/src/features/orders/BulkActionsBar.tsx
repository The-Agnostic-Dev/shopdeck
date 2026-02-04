import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { pluralise } from '@/lib/utils'
import { useBulkAction, usePickers, type BulkAction } from '@/lib/queries/orders'

const LABELS: Record<Exclude<BulkAction, 'assign_picker'>, string> = {
  confirm: 'Confirm',
  start_picking: 'Start picking',
  mark_packed: 'Mark packed',
  cancel: 'Cancel orders',
}

export function BulkActionsBar({ ids, onDone }: { ids: number[]; onDone: () => void }) {
  const { can } = useAuth()
  const bulk = useBulkAction()
  const [pending, setPending] = useState<BulkAction | null>(null)
  const [reason, setReason] = useState('')
  const [pickerId, setPickerId] = useState('')
  const pickers = usePickers(can('orders:update_status'))

  if (!ids.length) return null

  const run = async (action: BulkAction) => {
    const res = await bulk.mutateAsync({
      ids,
      action,
      reason: action === 'cancel' ? reason : undefined,
      pickerId: action === 'assign_picker' ? Number(pickerId) : undefined,
    })
    toast.success(`${pluralise(res.succeeded, 'order')} updated`)
    setReason('')
    onDone()
  }

  return (
    <div
      className="sticky bottom-3 z-10 mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-100 bg-brand-900 px-3 py-2 text-sm text-white shadow-lg"
      data-testid="bulk-bar"
    >
      <span className="mr-2 font-medium" data-testid="bulk-count">
        {pluralise(ids.length, 'order')} selected
      </span>
      {can('orders:update_status') &&
        (['confirm', 'start_picking', 'mark_packed'] as const).map((a) => (
          <Button key={a} size="sm" variant="secondary" disabled={bulk.isPending} onClick={() => setPending(a)}>
            {LABELS[a]}
          </Button>
        ))}
      {can('orders:update_status') && (
        <div className="flex items-center gap-1">
          <Select aria-label="Picker" className="h-8 text-black" value={pickerId} onChange={(e) => setPickerId(e.target.value)}>
            <option value="">Assign picker…</option>
            {pickers.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="secondary" disabled={!pickerId || bulk.isPending} onClick={() => run('assign_picker')}>
            Assign
          </Button>
        </div>
      )}
      {can('orders:cancel') && (
        <Button size="sm" variant="destructive" disabled={bulk.isPending} onClick={() => setPending('cancel')}>
          {LABELS.cancel}
        </Button>
      )}
      <Button size="sm" variant="ghost" className="ml-auto text-white hover:bg-white/10" onClick={onDone}>
        Clear selection
      </Button>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending ? `${pending === 'cancel' ? 'Cancel' : LABELS[pending as keyof typeof LABELS]} ${pluralise(ids.length, 'order')}?` : ''
        }
        description={
          pending === 'cancel'
            ? 'Customers get an email and paid amounts are refunded by finance.'
            : 'Orders that cannot move to this status are skipped.'
        }
        destructive={pending === 'cancel'}
        confirmLabel={pending === 'cancel' ? 'Cancel orders' : 'Apply'}
        onConfirm={() => (pending ? run(pending) : undefined)}
      >
        {pending === 'cancel' && (
          <div className="space-y-1.5">
            <Label htmlFor="bulk-reason">Reason</Label>
            <Input
              id="bulk-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer asked to cancel"
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
