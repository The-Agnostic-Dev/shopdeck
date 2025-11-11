import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/dates'
import { titleCase } from '@/lib/format'
import { downloadUrl, useExports, useRequestExport, type ExportKind } from './api'

export function ExportsPage() {
  const exportsQuery = useExports()
  const request = useRequestExport()
  const [kind, setKind] = useState<ExportKind>('orders')

  return (
    <>
      <PageHeader
        title="Exports"
        description="CSV files for finance and stock takes. Large exports are prepared in the background."
        actions={
          <>
            <Select aria-label="Export type" value={kind} onChange={(e) => setKind(e.target.value as ExportKind)}>
              <option value="orders">All orders</option>
              <option value="products">All products</option>
              <option value="customers">All customers</option>
            </Select>
            <Button disabled={request.isPending} onClick={() => request.mutate({ kind, filters: {} })}>
              New export
            </Button>
          </>
        }
      />
      <Card>
        {!exportsQuery.data?.items.length ? (
          <EmptyState title="No exports yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {exportsQuery.data.items.map((e) => (
                <TableRow key={e.id} data-export-id={e.id}>
                  <TableCell>{e.id}</TableCell>
                  <TableCell>
                    {titleCase(e.kind)}
                    {Object.keys(e.filters).length > 0 && (
                      <span className="ml-1 text-xs text-[var(--muted)]">
                        (
                        {Object.entries(e.filters)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                        )
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-[var(--muted)]">
                    {formatDateTime(e.createdAt)}
                    {e.requestedByName ? ` · ${e.requestedByName}` : ''}
                  </TableCell>
                  <TableCell className="tabular">{e.rowCount ?? '·'}</TableCell>
                  <TableCell>
                    <Badge tone={e.status === 'ready' ? 'green' : e.status === 'failed' ? 'red' : 'amber'}>{titleCase(e.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === 'ready' && (
                      <Button asChild size="sm" variant="outline">
                        <a href={downloadUrl(e.id)}>Download</a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
