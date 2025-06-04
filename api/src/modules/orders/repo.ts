import { and, asc, count, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import { config } from '../../config.js'
import { db, type DbOrTx } from '../../db/client.js'
import {
  customers,
  deliverySlots,
  discountCodes,
  orderItems,
  orders,
  refunds,
  staffUsers,
  type OrderStatus,
} from '../../db/schema/index.js'
import { csvParam, offsetFor, pageMeta } from '../../lib/pagination.js'
import type { OrderListQuery } from './schemas.js'

function filtersFor(query: OrderListQuery): SQL[] {
  const where: SQL[] = []
  const statuses = csvParam(query.status) as OrderStatus[]
  if (statuses.length) where.push(inArray(orders.status, statuses))
  if (query.payment) where.push(eq(orders.paymentStatus, query.payment))
  if (query.from) where.push(gte(orders.placedAt, new Date(`${query.from}T00:00:00Z`)))
  if (query.to) where.push(lt(orders.placedAt, new Date(new Date(`${query.to}T00:00:00Z`).getTime() + 86_400_000)))
  if (query.area) where.push(eq(orders.area, query.area))
  if (query.customerId) where.push(eq(orders.customerId, query.customerId))
  if (query.code) where.push(eq(discountCodes.code, query.code.toUpperCase()))
  if (query.slotDay) where.push(eq(deliverySlots.day, query.slotDay))
  if (query.q) {
    const term = `%${query.q}%`
    where.push(or(ilike(orders.number, term), ilike(customers.name, term), ilike(customers.phone, term))!)
  }
  return where
}

const sortColumns = {
  placedAt: orders.placedAt,
  total: orders.totalKobo,
  number: orders.number,
  status: orders.status,
}

const itemCount = sql<number>`(select coalesce(sum(${orderItems.quantity}), 0) from ${orderItems} where ${orderItems.orderId} = ${orders.id})`

export async function listOrders(query: OrderListQuery) {
  const perPage = query.perPage ?? config.ORDERS_PAGE_SIZE
  const where = and(...filtersFor(query))
  const order = query.dir === 'asc' ? asc(sortColumns[query.sort]) : desc(sortColumns[query.sort])

  const base = db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      cardLast4: orders.cardLast4,
      totalKobo: orders.totalKobo,
      refundedKobo: orders.refundedKobo,
      placedAt: orders.placedAt,
      area: orders.area,
      customerId: customers.id,
      customerName: customers.name,
      discountCode: discountCodes.code,
      slotDay: deliverySlots.day,
      slotStartsAt: deliverySlots.startsAt,
      slotEndsAt: deliverySlots.endsAt,
      itemCount,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(discountCodes, eq(discountCodes.id, orders.discountCodeId))
    .leftJoin(deliverySlots, eq(deliverySlots.id, orders.slotId))
    .where(where)

  const [items, [{ total }]] = await Promise.all([
    base.orderBy(order, desc(orders.id)).limit(perPage).offset(offsetFor(query.page, perPage)),
    db
      .select({ total: count() })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(discountCodes, eq(discountCodes.id, orders.discountCodeId))
      .leftJoin(deliverySlots, eq(deliverySlots.id, orders.slotId))
      .where(where),
  ])
  return { items, meta: pageMeta(query.page, perPage, total) }
}

export async function findOrder(tx: DbOrTx, id: number) {
  const [row] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1)
  return row ?? null
}

export async function findOrdersForUpdate(tx: DbOrTx, ids: number[]) {
  return tx.select().from(orders).where(inArray(orders.id, ids)).orderBy(asc(orders.id)).for('update')
}

export async function itemsFor(tx: DbOrTx, orderId: number) {
  return tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.id))
}

export async function orderDetail(id: number) {
  const [row] = await db
    .select({
      order: orders,
      customer: {
        id: customers.id,
        name: customers.name,
        email: customers.email,
        phone: customers.phone,
        area: customers.area,
      },
      discountCode: discountCodes.code,
      slot: deliverySlots,
      pickerName: staffUsers.name,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(discountCodes, eq(discountCodes.id, orders.discountCodeId))
    .leftJoin(deliverySlots, eq(deliverySlots.id, orders.slotId))
    .leftJoin(staffUsers, eq(staffUsers.id, orders.pickerId))
    .where(eq(orders.id, id))
    .limit(1)
  if (!row) return null
  const [items, refundRows] = await Promise.all([
    itemsFor(db, id),
    db.select().from(refunds).where(eq(refunds.orderId, id)).orderBy(desc(refunds.createdAt)),
  ])
  return { ...row, items, refunds: refundRows }
}
