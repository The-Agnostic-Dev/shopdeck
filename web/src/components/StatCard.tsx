import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

export function StatCard({ label, value, hint, testId }: { label: string; value: ReactNode; hint?: ReactNode; testId?: string }) {
  return (
    <Card className="p-4" data-testid={testId}>
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular" data-value>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>}
    </Card>
  )
}
