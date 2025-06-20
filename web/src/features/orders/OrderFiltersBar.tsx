import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ORDER_STATUS_LABELS } from '@/components/StatusBadge'
import type { DatePreset, OrderFilters } from './useOrderFilters'

interface Props {
  filters: OrderFilters
  onChange: (patch: Partial<OrderFilters>) => void
  onClear: () => void
}

export function OrderFiltersBar({ filters, onChange, onClear }: Props) {
  const [q, setQ] = useState(filters.q)

  const active = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-[var(--muted)]" />
        <Input
          aria-label="Search orders"
          placeholder="Order number, customer or phone"
          className="pl-8"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            onChange({ q: e.target.value })
          }}
        />
      </div>
      <Select aria-label="Status" value={filters.status} onChange={(e) => onChange({ status: e.target.value })}>
        <option value="">All statuses</option>
        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select aria-label="Payment" value={filters.payment} onChange={(e) => onChange({ payment: e.target.value })}>
        <option value="">Any payment</option>
        <option value="paid">Paid</option>
        <option value="partially_refunded">Partly refunded</option>
        <option value="refunded">Refunded</option>
      </Select>
      <Select
        aria-label="Date"
        value={filters.preset}
        onChange={(e) => {
          const preset = e.target.value as DatePreset
          onChange({ preset })
        }}
      >
        <option value="">Any date</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="custom">Custom range</option>
      </Select>
      {filters.preset === 'custom' && (
        <>
          <Input type="date" aria-label="From" className="w-36" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} />
          <Input type="date" aria-label="To" className="w-36" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} />
        </>
      )}
      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ('')
            onClear()
          }}
        >
          <X /> Clear
        </Button>
      )}
    </div>
  )
}
