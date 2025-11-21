import { and, count, desc, eq, gte, lt, type SQL } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { customers, orders, refunds, staffUsers, type RefundStatus } from '../../db/schema/index.js'
import { lagosDayRange } from '../../lib/dates.js'
import { offsetFor, pageMeta } from '../../lib/pagination.js'

export interface RefundListQuery {
  page: number
  perPage: number
  status?: RefundStatus
  reason?: string
  from?: string
  to?: string
}

export async function listRefunds(query: RefundListQuery) {
  const where: SQL[] = []
  if (query.status) where.push(eq(refunds.status, query.status))
  if (query.reason) where.push(eq(refunds.reason, query.reason))
  if (query.from) where.push(gte(refunds.createdAt, lagosDayRange(query.from).start))
  if (query.to) where.push(lt(refunds.createdAt, lagosDayRange(query.to).end))
  const cond = and(...where)

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: refunds.id,
        amountKobo: refunds.amountKobo,
        reason: refunds.reason,
        note: refunds.note,
        status: refunds.status,
        providerRef: refunds.providerRef,
        providerStatus: refunds.providerStatus,
        failureReason: refunds.failureReason,
        createdAt: refunds.createdAt,
        processedAt: refunds.processedAt,
        orderId: orders.id,
        orderNumber: orders.number,
        customerName: customers.name,
        createdByName: staffUsers.name,
      })
      .from(refunds)
      .innerJoin(orders, eq(orders.id, refunds.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(staffUsers, eq(staffUsers.id, refunds.createdBy))
      .where(cond)
      .orderBy(desc(refunds.createdAt), desc(refunds.id))
      .limit(query.perPage)
      .offset(offsetFor(query.page, query.perPage)),
    db.select({ total: count() }).from(refunds).where(cond),
  ])
  return { items, meta: pageMeta(query.page, query.perPage, total) }
}

export async function refundTotals(query: Pick<RefundListQuery, 'from' | 'to'>) {
  const where: SQL[] = []
  if (query.from) where.push(gte(refunds.createdAt, lagosDayRange(query.from).start))
  if (query.to) where.push(lt(refunds.createdAt, lagosDayRange(query.to).end))
  const rows = await db
    .select({ status: refunds.status, amountKobo: refunds.amountKobo })
    .from(refunds)
    .where(and(...where))
  const totals = { pendingKobo: 0, succeededKobo: 0, failedKobo: 0, count: rows.length }
  for (const r of rows) totals[`${r.status}Kobo`] += r.amountKobo
  return totals
}
