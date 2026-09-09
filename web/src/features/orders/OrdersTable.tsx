import { flexRender, getCoreRowModel, useReactTable, type OnChangeFn, type RowSelectionState } from '@tanstack/react-table'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { OrderRow } from './api'
import { orderColumns } from './columns'

interface Props {
  rows: OrderRow[]
  loading: boolean
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onOpen: (id: number) => void
}

export function OrdersTable({ rows, loading, rowSelection, onRowSelectionChange, onOpen }: Props) {
  const table = useReactTable({
    data: rows,
    columns: orderColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    state: { rowSelection },
    onRowSelectionChange,
    enableRowSelection: true,
  })

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return <EmptyState title="No orders match these filters">Try a different status or date range.</EmptyState>
  }

  return (
    <Table data-testid="orders-table">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id} className={header.column.id === 'totalKobo' ? 'text-right' : undefined}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            data-order-id={row.original.id}
            data-order-number={row.original.number}
            data-state={row.getIsSelected() ? 'selected' : undefined}
            className="cursor-pointer"
            onClick={() => onOpen(row.original.id)}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
