import { eq, sql } from 'drizzle-orm'
import type { Tx } from '../../db/client.js'
import { deliverySlots, orders, products, stockMovements, type Order, type OrderStatus } from '../../db/schema/index.js'
import { conflict } from '../../lib/http-errors.js'
import { record } from '../audit/service.js'
import { clearAlertsIfRestocked } from '../inventory/alerts.js'
import { notifyOrderCancelled, notifyOutForDelivery } from '../notifications/service.js'
import { itemsFor } from './repo.js'

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['picking', 'cancelled'],
  picking: ['packed', 'cancelled'],
  packed: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  picking: 'Picking',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return TRANSITIONS[from].includes(to)
}

interface TransitionContext {
  actorId: number
  reason?: string
}

const timestampFor: Partial<Record<OrderStatus, keyof Order>> = {
  confirmed: 'confirmedAt',
  packed: 'packedAt',
  delivered: 'deliveredAt',
  cancelled: 'cancelledAt',
}

async function restock(tx: Tx, order: Order, actorId: number) {
  const items = await itemsFor(tx, order.id)
  const touched: number[] = []
  for (const item of items) {
    if (!item.productId || item.status === 'unavailable') continue
    const [p] = await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: new Date() })
      .where(eq(products.id, item.productId))
      .returning({ stock: products.stock })
    if (!p) continue
    touched.push(item.productId)
    await tx.insert(stockMovements).values({
      productId: item.productId,
      kind: 'cancel',
      quantity: item.quantity,
      stockAfter: p.stock,
      reason: `Order ${order.number} cancelled`,
      staffId: actorId,
    })
  }
  await clearAlertsIfRestocked(tx, touched)
}

/**
 * Moves one order to a new status with every side effect that goes with it.
 * The caller holds a row lock on the order (see findOrdersForUpdate).
 */
export async function applyTransition(tx: Tx, order: Order, to: OrderStatus, ctx: TransitionContext): Promise<Order> {
  if (order.status === to) return order
  if (!canTransition(order.status, to)) {
    throw conflict(
      `Order ${order.number} is ${STATUS_LABELS[order.status].toLowerCase()} and cannot be moved to ${STATUS_LABELS[to].toLowerCase()}`,
    )
  }

  const now = new Date()
  const patch: Partial<Order> = { status: to, updatedAt: now }
  const stampField = timestampFor[to]
  if (stampField) Object.assign(patch, { [stampField]: now })

  if (to === 'cancelled') {
    patch.cancelReason = ctx.reason ?? null
    await restock(tx, order, ctx.actorId)
    if (order.slotId) {
      await tx
        .update(deliverySlots)
        .set({ booked: sql`greatest(${deliverySlots.booked} - 1, 0)` })
        .where(eq(deliverySlots.id, order.slotId))
    }
  }

  const [updated] = await tx.update(orders).set(patch).where(eq(orders.id, order.id)).returning()

  await record(tx, {
    actorId: ctx.actorId,
    entity: 'order',
    entityId: order.id,
    action: `status.${to}`,
    details: { from: order.status, to, ...(ctx.reason ? { reason: ctx.reason } : {}) },
  })

  if (to === 'cancelled') await notifyOrderCancelled(tx, updated)
  if (to === 'out_for_delivery') await notifyOutForDelivery(tx, updated)

  return updated
}
