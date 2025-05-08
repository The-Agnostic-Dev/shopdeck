import { cn } from '@/lib/utils'

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; count?: number }[]
  className?: string
}

export function Tabs<T extends string>({ value, onChange, options, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('inline-flex gap-1 rounded-lg bg-neutral-100 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm',
            o.value === value ? 'bg-white font-medium shadow-xs' : 'text-[var(--muted)] hover:text-[var(--foreground)]',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-xs text-[var(--muted)]">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
