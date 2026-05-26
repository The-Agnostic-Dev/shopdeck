import { and, count, eq, gte, lt, lte, ne, sql } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { deliverySlots, orders, products, refunds } from '../../db/schema/index.js'
import { addDays, lagosDayRange } from '../../lib/dates.js'

const lagosDate = sql<string>`to_char(${orders.placedAt} at time zone ${sql.raw(`'${config.BUSINESS_TZ.replace(/'/g, '')}'`)}, 'YYYY-MM-DD')`

/** Net sales: order totals less delivery fees and refunds, cancelled orders excluded. */
const netSales = sql<number>`coalesce(sum(${orders.totalKobo} - ${orders.deliveryFeeKobo} - ${orders.refundedKobo}), 0)`

export async function dailySeries(endDay: string, days: number) {
  const startDay = addDays(endDay, -(days - 1))
  const { start } = lagosDayRange(startDay)
  const { end } = lagosDayRange(endDay)
  const rows = await db
    .select({ day: lagosDate, orders: count(), netSalesKobo: netSales })
    .from(orders)
    .where(and(gte(orders.placedAt, start), lt(orders.placedAt, end), ne(orders.status, 'cancelled')))
    .groupBy(lagosDate)
  const byDay = new Map(rows.map((r) => [r.day, r]))
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(startDay, i)
    const r = byDay.get(day)
    return { day, orders: r?.orders ?? 0, netSalesKobo: r?.netSalesKobo ?? 0 }
  })
}

export async function summaryFor(day: string) {
  const { start, end } = lagosDayRange(day)
  const placedThatDay = and(gte(orders.placedAt, start), lt(orders.placedAt, end))

  const [[sales], [cancelled], [packing], [lowStock], [pendingRefunds], [awaiting]] = await Promise.all([
    db
      .select({ orders: count(), netSalesKobo: netSales })
      .from(orders)
      .where(and(placedThatDay, ne(orders.status, 'cancelled'))),
    db
      .select({ n: count() })
      .from(orders)
      .where(and(placedThatDay, eq(orders.status, 'cancelled'))),
    db
      .select({
        due: count(),
        packed: sql<number>`count(*) filter (where ${orders.status} in ('packed', 'out_for_delivery', 'delivered'))`,
      })
      .from(orders)
      .innerJoin(deliverySlots, eq(deliverySlots.id, orders.slotId))
      .where(and(eq(deliverySlots.day, day), ne(orders.status, 'cancelled'))),
    db
      .select({ n: count() })
      .from(products)
      .where(and(eq(products.status, 'active'), lte(products.stock, products.lowStockThreshold))),
    db.select({ n: count() }).from(refunds).where(eq(refunds.status, 'pending')),
    db.select({ n: count() }).from(orders).where(eq(orders.status, 'pending')),
  ])

  return {
    day,
    orders: sales.orders,
    netSalesKobo: sales.netSalesKobo,
    averageBasketKobo: sales.orders ? Math.round(sales.netSalesKobo / sales.orders) : 0,
    cancelled: cancelled.n,
    packing: {
      due: packing.due,
      packed: packing.packed,
      percent: packing.due ? Math.round((packing.packed / packing.due) * 100) : 0,
    },
    lowStock: lowStock.n,
    pendingRefunds: pendingRefunds.n,
    awaitingConfirmation: awaiting.n,
  }
}
