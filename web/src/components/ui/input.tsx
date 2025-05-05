import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-[var(--border)] bg-white px-3 py-1 text-sm shadow-xs placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500',
        className,
      )}
      {...props}
    />
  )
}
