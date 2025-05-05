import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Native select styled like the other inputs. Works well on phones. */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 rounded-md border border-[var(--border)] bg-white px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
