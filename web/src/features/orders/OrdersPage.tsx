import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { useOrders } from './api'
import { BulkActionsBar } from './BulkActionsBar'
import { OrderDrawer } from './OrderDrawer'
import { OrderFiltersBar } from './OrderFiltersBar'
import { OrdersTable } from './OrdersTable'
import { useOrderFilters } from './useOrderFilters'

export function OrdersPage() {
  const { filters, page, orderId, setFilters, setPage, openOrder, clear } = useOrderFilters()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  useEffect(() => {
    setRowSelection({})
  }, [filters.q, filters.status, filters.payment, filters.preset, filters.from, filters.to])

  const orders = useOrders({
    page,
    q: filters.q || undefined,
    status: filters.status || undefined,
    payment: filters.payment || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  })

  const selectedIds = Object.keys(rowSelection)
    .filter((id) => rowSelection[id])
    .map(Number)

  return (
    <>
      <PageHeader
        title="Orders"
        description={orders.data ? `${orders.data.meta.total.toLocaleString('en-NG')} orders` : 'Loading orders…'}
      />
      <Card className="overflow-hidden">
        <OrderFiltersBar filters={filters} onChange={setFilters} onClear={clear} />
        {orders.isError && (
          <Alert tone="error" className="m-3">
            Could not load orders. {orders.error.message}
          </Alert>
        )}
        <OrdersTable
          rows={orders.data?.items ?? []}
          loading={orders.isPending}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onOpen={openOrder}
        />
        {orders.data && <Pagination meta={orders.data.meta} onPage={setPage} />}
        <BulkActionsBar ids={selectedIds} onDone={() => setRowSelection({})} />
      </Card>
      <OrderDrawer orderId={orderId} onClose={() => openOrder(null)} />
    </>
  )
}
