import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { exportKeys } from '@/lib/queryKeys'

export type ExportKind = 'orders' | 'products' | 'customers'

export interface ExportRow {
  id: number
  kind: ExportKind
  filters: Record<string, string>
  status: 'queued' | 'ready' | 'failed'
  filename: string | null
  rowCount: number | null
  createdAt: string
  completedAt: string | null
  requestedByName: string | null
}

export function useExports() {
  return useQuery({
    queryKey: exportKeys.all,
    queryFn: () => api.get<{ items: ExportRow[] }>('/exports'),
    // Exports are built in the background; poll while any is still queued.
    refetchInterval: (q) => (q.state.data?.items.some((e) => e.status === 'queued') ? 2000 : false),
  })
}

export function useRequestExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { kind: ExportKind; filters: Record<string, string> }) =>
      api.post<{ export: { id: number } }>('/exports', {
        kind: vars.kind,
        filters: Object.fromEntries(Object.entries(vars.filters).filter(([, v]) => v)),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exportKeys.all }),
  })
}

export const downloadUrl = (id: number) => `/api/exports/${id}/download`
