import type { ReactNode } from 'react'

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-[var(--muted)]">{children}</div>}
    </div>
  )
}
