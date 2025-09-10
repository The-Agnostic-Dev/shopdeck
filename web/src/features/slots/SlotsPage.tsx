import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { PageHeader } from '@/components/PageHeader'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ApiError, api } from '@/lib/api'
import { weekdayShort } from '@/lib/dates'
import { slotKeys } from '@/lib/queryKeys'

interface Slot {
  id: number
  day: string
  startsAt: string
  endsAt: string
  capacity: number
  booked: number
  packed: number
  state: 'open' | 'filling' | 'full' | 'closed'
}

const tones: Record<Slot['state'], BadgeTone> = { open: 'green', filling: 'amber', full: 'red', closed: 'neutral' }
const labels: Record<Slot['state'], string> = { open: 'Open', filling: 'Filling up', full: 'Full', closed: 'Closed' }

function CapacityInput({ slot }: { slot: Slot }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(String(slot.capacity))
  const save = useMutation({
    mutationFn: (capacity: number) => api.patch(`/slots/${slot.id}`, { capacity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: slotKeys.all }),
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setValue(String(slot.capacity))
    },
  })
  return (
    <Input
      type="number"
      min={0}
      aria-label={`Capacity ${slot.day} ${slot.startsAt}`}
      className="h-7 w-16 px-1.5 text-xs"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => Number(value) !== slot.capacity && save.mutate(Number(value))}
    />
  )
}

export function SlotsPage() {
  const { can } = useAuth()
  const { data } = useQuery({ queryKey: slotKeys.all, queryFn: () => api.get<{ items: Slot[] }>('/slots') })
  const days = [...new Set(data?.items.map((s) => s.day))]

  return (
    <>
      <PageHeader title="Delivery slots" description="Next 7 days." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day) => (
          <Card key={day} className="p-3">
            <h3 className="mb-2 text-sm font-semibold">{weekdayShort(day)}</h3>
            <ul className="space-y-1.5">
              {data!.items
                .filter((s) => s.day === day)
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm" data-slot-id={s.id}>
                    <span className="tabular">
                      {s.startsAt}–{s.endsAt}
                    </span>
                    <span className="tabular text-xs text-[var(--muted)]">
                      {s.booked}/{s.capacity}
                    </span>
                    {can('slots:write') ? <CapacityInput slot={s} /> : null}
                    <Badge tone={tones[s.state]}>{labels[s.state]}</Badge>
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  )
}
