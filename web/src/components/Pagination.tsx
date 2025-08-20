import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PageMeta } from '@/lib/types'

export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.perPage + 1
  const last = Math.min(meta.total, meta.page * meta.perPage)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-2 text-sm">
      <span className="text-[var(--muted)]" data-testid="page-summary">
        {meta.total === 0 ? 'No results' : `${first}–${last} of ${meta.total.toLocaleString('en-NG')}`}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="px-2 tabular" data-testid="page-indicator">
          Page {meta.page} of {meta.pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.pageCount}
          onClick={() => onPage(meta.page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
