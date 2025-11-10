import { asc, eq, sql } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { customers } from '../../db/schema/index.js'
import { toCsv } from '../../lib/csv.js'
import { lagosDay } from '../../lib/dates.js'
import { koboToNairaString } from '../../lib/money.js'
import { CUSTOMER_EXPORT_COLUMNS } from './columns.js'

export async function buildCustomersCsv(filters: Record<string, string>) {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      area: customers.area,
      createdAt: customers.createdAt,
      optIn: customers.marketingOptIn,
      orders: sql<number>`(select count(*) from orders o where o.customer_id = "customers"."id")`,
      spend: sql<number>`(select coalesce(sum(o.total_kobo - o.refunded_kobo), 0) from orders o where o.customer_id = "customers"."id" and o.status <> 'cancelled')`,
    })
    .from(customers)
    .where(filters.area ? eq(customers.area, filters.area) : undefined)
    .orderBy(asc(customers.id))
    .limit(config.EXPORT_MAX_ROWS)

  const body = rows.map((c) => [
    c.id,
    c.name,
    c.email,
    c.phone,
    c.area ?? '',
    lagosDay(c.createdAt),
    c.orders,
    koboToNairaString(c.spend),
    c.optIn ? 'yes' : 'no',
  ])
  return { csv: toCsv([...CUSTOMER_EXPORT_COLUMNS], body), rows: rows.length }
}
