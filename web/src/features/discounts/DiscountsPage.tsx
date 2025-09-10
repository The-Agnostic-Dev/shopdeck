import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/auth/context'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useDiscountCodes, useSaveDiscount, type DiscountCode } from './api'
import { DiscountFormDialog } from './DiscountFormDialog'

const stateLabel: Record<string, string> = {
  inactive: 'Switched off',
  not_started: 'Not started',
  expired: 'Expired',
  limit_reached: 'Limit reached',
}

function ToggleActive({ code }: { code: DiscountCode }) {
  const save = useSaveDiscount(code.id)
  return (
    <Button size="sm" variant="outline" disabled={save.isPending} onClick={() => save.mutate({ active: !code.active })}>
      {code.active ? 'Switch off' : 'Switch on'}
    </Button>
  )
}

export function DiscountsPage() {
  const { can } = useAuth()
  const { data } = useDiscountCodes()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <PageHeader
        title="Discount codes"
        description="Codes customers enter at checkout."
        actions={
          can('discounts:write') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> New code
            </Button>
          )
        }
      />
      <Card>
        <Table data-testid="discounts-table">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Minimum order</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Status</TableHead>
              {can('discounts:write') && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((c) => (
              <TableRow key={c.id} data-code={c.code} data-used={c.usedCount}>
                <TableCell>
                  <div className="font-mono font-medium">{c.code}</div>
                  <div className="text-xs text-[var(--muted)]">{c.description}</div>
                </TableCell>
                <TableCell>{c.kind === 'percent' ? `${c.value}% off` : `${formatMoney(c.value)} off`}</TableCell>
                <TableCell className="tabular">{c.minOrderKobo ? formatMoney(c.minOrderKobo) : 'None'}</TableCell>
                <TableCell className="text-right tabular" data-testid="code-used">
                  {c.usedCount}
                  {c.maxUses ? ` / ${c.maxUses}` : ''}
                </TableCell>
                <TableCell className="text-[var(--muted)]">{c.endsAt ? formatDate(c.endsAt) : 'No end date'}</TableCell>
                <TableCell>
                  {c.usable.ok ? <Badge tone="green">Live</Badge> : <Badge>{stateLabel[c.usable.reason ?? 'inactive']}</Badge>}
                </TableCell>
                {can('discounts:write') && (
                  <TableCell className="text-right">
                    <ToggleActive code={c} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <DiscountFormDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}
