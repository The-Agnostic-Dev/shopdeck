import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Alert({ className, tone = 'info', ...props }: ComponentProps<'div'> & { tone?: 'info' | 'error' | 'warning' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'error' && 'border-red-200 bg-red-50 text-red-800',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
        tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900',
        className,
      )}
      {...props}
    />
  )
}
