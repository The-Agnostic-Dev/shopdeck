import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { orderItems, orders, products, staffUsers, type OrderStatus, type StaffUser } from '../../db/schema/index.js'
import { conflict, notFound, unprocessable } from '../../lib/http-errors.js'
import { record } from '../audit/service.js'
import { findOrdersForUpdate } from './repo.js'
import { applyTransition } from './transitions.js'

export async function changeStatus(orderId: number, to: OrderStatus, actor: StaffUser, reason?: string) {
  return db.transaction(async (tx) => {
    const [order] = await findOrdersForUpdate(tx, [orderId])
    if (!order) throw notFound('Order')
    return applyTransition(tx, order, to, { actorId: actor.id, reason })
  })
}

export async function cancelOrder(orderId: number, reason: string, actor: StaffUser) {
  return changeStatus(orderId, 'cancelled', actor, reason)
}

export async function assignPicker(orderId: number, pickerId: number | null, actor: StaffUser) {
  if (pickerId !== null) {
    const [picker] = await db
      .select({ id: staffUsers.id })
      .from(staffUsers)
      .where(and(eq(staffUsers.id, pickerId), eq(staffUsers.role, 'picker'), eq(staffUsers.active, true)))
    if (!picker) throw unprocessable('Choose an active picker')
  }
  return db.transaction(async (tx) => {
    const [order] = await findOrdersForUpdate(tx, [orderId])
    if (!order) throw notFound('Order')
    if (order.status === 'cancelled' || order.status === 'delivered') {
      throw conflict(`Order ${order.number} is already ${order.status}`)
    }
    const [updated] = await tx.update(orders).set({ pickerId, updatedAt: new Date() }).where(eq(orders.id, orderId)).returning()
    await record(tx, { actorId: actor.id, entity: 'order', entityId: orderId, action: 'picker.assigned', details: { pickerId } })
    return updated
  })
}

export async function substituteItem(
  orderId: number,
  itemId: number,
  input: { substituteProductId: number | null; note?: string },
  actor: StaffUser,
) {
  return db.transaction(async (tx) => {
    const [order] = await findOrdersForUpdate(tx, [orderId])
    if (!order) throw notFound('Order')
    if (!['confirmed', 'picking'].includes(order.status)) {
      throw conflict('Items can only be substituted while the order is being picked')
    }
    const [item] = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
    if (!item) throw notFound('Item')

    if (input.substituteProductId === null) {
      await tx
        .update(orderItems)
        .set({
          status: 'unavailable',
          substituteProductId: null,
          substituteName: null,
          substitutePriceKobo: null,
          note: input.note ?? null,
        })
        .where(eq(orderItems.id, itemId))
    } else {
      const [sub] = await tx.select().from(products).where(eq(products.id, input.substituteProductId))
      if (!sub || sub.status !== 'active') throw unprocessable('Choose an active product as the substitute')
      if (sub.stock < item.quantity) throw unprocessable(`Only ${sub.stock} of ${sub.name} in stock`)
      await tx
        .update(orderItems)
        .set({
          status: 'substituted',
          substituteProductId: sub.id,
          substituteName: sub.name,
          substitutePriceKobo: sub.priceKobo,
          note: input.note ?? null,
        })
        .where(eq(orderItems.id, itemId))
    }
    await record(tx, {
      actorId: actor.id,
      entity: 'order',
      entityId: orderId,
      action: input.substituteProductId === null ? 'item.unavailable' : 'item.substituted',
      details: { itemId, sku: item.sku, substituteProductId: input.substituteProductId },
    })
    return tx
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, [orderId]))
  })
}
