import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/context'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError, api } from '@/lib/api'
import { relativeTime } from '@/lib/dates'
import { staffKeys } from '@/lib/queryKeys'
import type { SessionUser } from '@/lib/types'

interface StaffRow {
  id: number
  name: string
  email: string
  role: SessionUser['role']
  roleLabel: string
  active: boolean
  lastLoginAt: string | null
}

const ROLES: { value: SessionUser['role']; label: string; help: string }[] = [
  { value: 'admin', label: 'Admin', help: 'Everything, including staff and discount codes' },
  { value: 'ops_lead', label: 'Ops lead', help: 'Orders, stock, products, slots and exports' },
  { value: 'picker', label: 'Picker', help: 'Picking, packing and substitutions' },
  { value: 'customer_care', label: 'Customer care', help: 'Customers, notes and cancellations' },
  { value: 'finance', label: 'Finance', help: 'Refunds and exports' },
]

export function StaffPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: staffKeys.all, queryFn: () => api.get<{ items: StaffRow[] }>('/staff') })
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', email: '', role: 'picker' as SessionUser['role'], password: '' })

  const update = useMutation({
    mutationFn: (vars: { id: number; role?: SessionUser['role']; active?: boolean }) => api.patch(`/staff/${vars.id}`, vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update'),
  })
  const create = useMutation({
    mutationFn: () => api.post('/staff', draft),
    onSuccess: () => {
      toast.success(`${draft.name} added`)
      setAdding(false)
      setDraft({ name: '', email: '', role: 'picker', password: '' })
      return queryClient.invalidateQueries({ queryKey: staffKeys.all })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add'),
  })

  return (
    <>
      <PageHeader
        title="Staff & roles"
        description="Who can sign in to Shopdeck and what they can do."
        actions={<Button onClick={() => setAdding(true)}>Add staff</Button>}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last sign in</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-[var(--muted)]">{s.email}</div>
                </TableCell>
                <TableCell>
                  <Select
                    value={s.role}
                    disabled={s.id === user?.id}
                    onChange={(e) => update.mutate({ id: s.id, role: e.target.value as SessionUser['role'] })}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </TableCell>
                <TableCell className="text-[var(--muted)]">{s.lastLoginAt ? relativeTime(s.lastLoginAt) : 'Never'}</TableCell>
                <TableCell className="text-right">
                  {!s.active && <Badge className="mr-2">Deactivated</Badge>}
                  {s.id !== user?.id && (
                    <Button size="sm" variant="outline" onClick={() => update.mutate({ id: s.id, active: !s.active })}>
                      {s.active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(['name', 'email', 'password'] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`staff-${field}`}>
                  {field === 'password' ? 'Temporary password' : field[0].toUpperCase() + field.slice(1)}
                </Label>
                <Input
                  id={`staff-${field}`}
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={draft[field]}
                  onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                />
              </div>
            ))}
            <Select
              aria-label="Role"
              className="w-full"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as SessionUser['role'] })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
