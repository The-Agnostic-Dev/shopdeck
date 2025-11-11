import { FileDown } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { Button } from '@/components/ui/button'
import { useRequestExport, type ExportKind } from './api'

export function ExportButton({ kind, filters }: { kind: ExportKind; filters: Record<string, string> }) {
  const { can } = useAuth()
  const request = useRequestExport()
  const navigate = useNavigate()
  if (!can('exports:create')) return null
  return (
    <Button
      variant="outline"
      disabled={request.isPending}
      onClick={async () => {
        const { export: e } = await request.mutateAsync({ kind, filters })
        toast.success(`Export #${e.id} started`, {
          description: 'We will email you when it is ready.',
          action: { label: 'View exports', onClick: () => navigate('/exports') },
        })
      }}
    >
      <FileDown /> Export CSV
    </Button>
  )
}
