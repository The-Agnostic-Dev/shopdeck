import { Link } from 'react-router'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/context'
import { formatDate, lagosToday } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useSearchParams } from 'react-router'
import { useDashboard } from './api'
import { SalesChart } from './SalesChart'

export function DashboardPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const day = params.get('day') ?? lagosToday()
  const { data, isPending, isError, error } = useDashboard(day)
  const isToday = day === lagosToday()

  return (
    <>
      <PageHeader
        title={`Good day, ${user?.name.split(' ')[0] ?? ''}`}
        description={isToday ? 'Here is how today is going.' : `Figures for ${formatDate(day)}.`}
        actions={
          <Input
            type="date"
            aria-label="Day"
            className="w-40"
            value={day}
            max={lagosToday()}
            onChange={(e) => setParams(e.target.value && e.target.value !== lagosToday() ? { day: e.target.value } : {})}
          />
        }
      />
      {isError && <Alert tone="error">{error.message}</Alert>}
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              testId="stat-net-sales"
              label="Net sales"
              value={formatMoney(data.summary.netSalesKobo)}
            />
            <StatCard testId="stat-orders" label="Orders" value={data.summary.orders} hint={`${data.summary.cancelled} cancelled`} />
            <StatCard testId="stat-basket" label="Average basket" value={formatMoney(data.summary.averageBasketKobo)} />
            <StatCard
              testId="stat-packing"
              label="Packing completion"
              value={`${data.summary.packing.percent}%`}
              hint={`${data.summary.packing.packed} of ${data.summary.packing.due} orders for this day's delivery slots are packed or later`}
            />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Net sales, last {data.series.length} days</CardTitle>
                <CardDescription>By the day the order was placed, Lagos time.</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesChart series={data.series} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Needs attention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Link to="/orders?status=pending" className="flex justify-between hover:underline">
                  <span>Orders awaiting confirmation</span>
                  <span className="font-semibold tabular">{data.summary.awaitingConfirmation}</span>
                </Link>
                <Link to="/inventory/low-stock" className="flex justify-between hover:underline">
                  <span>Products at or below reorder level</span>
                  <span className="font-semibold tabular">{data.summary.lowStock}</span>
                </Link>
                <Link to="/refunds?status=pending" className="flex justify-between hover:underline">
                  <span>Refunds still processing</span>
                  <span className="font-semibold tabular">{data.summary.pendingRefunds}</span>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </>
  )
}
