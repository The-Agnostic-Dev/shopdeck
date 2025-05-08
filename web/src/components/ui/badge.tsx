import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-neutral-100 text-neutral-700',
      green: 'bg-emerald-100 text-emerald-800',
      amber: 'bg-amber-100 text-amber-800',
      red: 'bg-red-100 text-red-700',
      blue: 'bg-sky-100 text-sky-800',
      violet: 'bg-violet-100 text-violet-800',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export function Badge({ className, tone, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
