import { and, asc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { customers, discountCodes, orders, type OrderStatus } from '../../db/schema/index.js'
import { toCsv } from '../../lib/csv.js'
import { koboToNairaString } from '../../lib/money.js'
import { lagosDayRange } from '../../lib/dates.js'
import { csvParam } from '../../lib/pagination.js'
import { STATUS_LABELS } from '../orders/service.js'
import { ORDER_EXPORT_COLUMNS } from './columns.js'

const lagosStamp = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: config.BUSINESS_TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)

export async function buildOrdersCsv(filters: Record<string, string>) {
  const where: SQL[] = []
  const statuses = csvParam(filters.status) as OrderStatus[]
  if (statuses.length) where.push(inArray(orders.status, statuses))
  if (filters.from) where.push(gte(orders.placedAt, lagosDayRange(filters.from).start))
  if (filters.to) where.push(lt(orders.placedAt, lagosDayRange(filters.to).end))

  const rows = await db
    .select({
      number: orders.number,
      placedAt: orders.placedAt,
      customer: customers.name,
      area: orders.area,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      method: orders.paymentMethod,
      subtotal: orders.subtotalKobo,
      discount: orders.discountKobo,
      code: discountCodes.code,
      fee: orders.deliveryFeeKobo,
      total: orders.totalKobo,
      refunded: orders.refundedKobo,
      items: sql<number>`(select coalesce(sum(oi.quantity), 0) from order_items oi where oi.order_id = "orders"."id")`,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(discountCodes, eq(discountCodes.id, orders.discountCodeId))
    .where(and(...where))
    .orderBy(asc(orders.placedAt))
    .limit(config.EXPORT_MAX_ROWS)

  const body = rows.map((r) => [
    r.number,
    lagosStamp(r.placedAt),
    r.customer,
    r.area,
    STATUS_LABELS[r.status],
    r.paymentStatus.replace('_', ' '),
    r.method,
    koboToNairaString(r.subtotal),
    koboToNairaString(r.discount),
    r.code ?? '',
    koboToNairaString(r.fee),
    koboToNairaString(r.total),
    koboToNairaString(r.refunded),
    r.items,
  ])
  return { csv: toCsv([...ORDER_EXPORT_COLUMNS], body), rows: rows.length }
}
