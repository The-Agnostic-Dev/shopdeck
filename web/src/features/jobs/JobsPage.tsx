import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'
import { jobKeys } from '@/lib/queryKeys'

interface Job {
  id: number
  type: string
  status: 'queued' | 'running' | 'done' | 'failed'
  attempts: number
  maxAttempts: number
  runAt: string
  lastError: string | null
  createdAt: string
}

const tones: Record<Job['status'], BadgeTone> = { queued: 'amber', running: 'blue', done: 'green', failed: 'red' }
type Filter = 'all' | Job['status']

export function JobsPage() {
  const [status, setStatus] = useState<Filter>('all')
  const { data } = useQuery({
    queryKey: [...jobKeys.all, status],
    queryFn: () => api.get<{ items: Job[]; counts: Record<string, number> }>('/jobs', status === 'all' ? {} : { status }),
    refetchInterval: 5000,
  })
  const counts = data?.counts ?? {}

  return (
    <>
      <PageHeader
        title="Background jobs"
        description="Emails, SMS, exports and stock alerts are sent by the worker. Failed jobs are retried with a growing delay."
      />
      <Tabs<Filter>
        className="mb-3"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: 'All' },
          { value: 'queued', label: 'Queued', count: counts.queued ?? 0 },
          { value: 'running', label: 'Running', count: counts.running ?? 0 },
          { value: 'failed', label: 'Failed', count: counts.failed ?? 0 },
          { value: 'done', label: 'Done', count: counts.done ?? 0 },
        ]}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((j) => (
              <TableRow key={j.id}>
                <TableCell>{j.id}</TableCell>
                <TableCell className="font-mono text-xs">{j.type}</TableCell>
                <TableCell>
                  <Badge tone={tones[j.status]}>{j.status}</Badge>
                </TableCell>
                <TableCell className="tabular">
                  {j.attempts}/{j.maxAttempts}
                </TableCell>
                <TableCell className="text-[var(--muted)]">{formatDateTime(j.createdAt)}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-red-700" title={j.lastError ?? ''}>
                  {j.lastError}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
