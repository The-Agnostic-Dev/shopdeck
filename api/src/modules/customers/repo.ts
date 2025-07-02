import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { customers, orders } from '../../db/schema/index.js'

export interface CustomerListQuery {
  q?: string
  area?: string
  cursor?: string
  limit: number
}

function filters(query: CustomerListQuery): SQL[] {
  const where: SQL[] = []
  if (query.q) {
    const term = `%${query.q.trim()}%`
    where.push(or(ilike(customers.name, term), ilike(customers.email, term), ilike(customers.phone, term))!)
  }
  if (query.area) where.push(eq(customers.area, query.area))
  return where
}

const orderStats = {
  orderCount: sql<number>`(select count(*) from ${orders} where ${orders.customerId} = ${customers.id})`,
  lifetimeKobo: sql<number>`(select coalesce(sum(${orders.totalKobo} - ${orders.refundedKobo}), 0) from ${orders} where ${orders.customerId} = ${customers.id} and ${orders.status} <> 'cancelled')`,
  lastOrderAt: sql<string | null>`(select max(${orders.placedAt}) from ${orders} where ${orders.customerId} = ${customers.id})`,
}

/** Newest customers first, in pages for the infinite list. */
export async function listCustomers(query: CustomerListQuery) {
  const where = filters(query)
  const offset = Math.max(0, Number(query.cursor ?? 0) || 0)

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        area: customers.area,
        source: customers.source,
        createdAt: customers.createdAt,
        ...orderStats,
      })
      .from(customers)
      .where(and(...where))
      .orderBy(desc(customers.createdAt))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(customers)
      .where(and(...where)),
  ])

  const hasMore = items.length === query.limit
  return {
    items,
    total,
    nextCursor: hasMore ? String(offset + items.length) : null,
  }
}

export async function getCustomer(id: number) {
  const [row] = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      area: customers.area,
      address: customers.address,
      notes: customers.notes,
      marketingOptIn: customers.marketingOptIn,
      source: customers.source,
      createdAt: customers.createdAt,
      ...orderStats,
    })
    .from(customers)
    .where(eq(customers.id, id))
  return row ?? null
}

export async function customerOrders(customerId: number, limit = 50) {
  return db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      totalKobo: orders.totalKobo,
      refundedKobo: orders.refundedKobo,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.placedAt))
    .limit(limit)
}

export async function areaCounts() {
  return db.select({ area: customers.area, count: count() }).from(customers).groupBy(customers.area).orderBy(desc(count()))
}
