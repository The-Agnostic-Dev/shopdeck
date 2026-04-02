import { eq, sql } from 'drizzle-orm'
import { db } from '../client.js'
import {
  auditLog,
  deliverySlots,
  discountCodes,
  orderItems,
  orders,
  refunds,
  type Order,
  type Product,
  type StaffUser,
} from '../schema/index.js'
import { REFUND_NOTES } from './data/people.js'
import type { Rng } from './random.js'

const HOUR = 3_600_000

/** Recomputes counters that the storefront normally keeps up to date. */
export async function syncCounters() {
  await db.execute(sql`
    update ${deliverySlots} s set booked = sub.n, capacity = greatest(s.capacity, sub.n)
    from (select slot_id, count(*)::int as n from orders where status <> 'cancelled' and slot_id is not null group by slot_id) sub
    where s.id = sub.slot_id and s.capacity > 0
  `)
  await db.execute(sql`
    update ${discountCodes} d set used_count = coalesce(sub.n, 0)
    from (select dc.id, (select count(*)::int from orders o where o.discount_code_id = dc.id and o.status <> 'cancelled') as n from discount_codes dc) sub
    where d.id = sub.id
  `)
}

export async function seedRefunds(rng: Rng, allOrders: Order[], finance: StaffUser, now: Date) {
  const delivered = allOrders.filter((o) => o.status === 'delivered' && o.deliveredAt && o.deliveredAt.getTime() < now.getTime() - 6 * HOUR)
  const chosen = rng.sample(delivered, 74)
  const reasons = Object.keys(REFUND_NOTES)
  let seq = 8_800_000
  for (const [i, order] of chosen.entries()) {
    const reason = i < 6 ? 'damaged' : rng.pick(reasons)
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
    const full = rng.chance(0.08)
    const line = rng.pick(items)
    const amountKobo = full ? order.totalKobo : reason === 'late_delivery' ? order.deliveryFeeKobo || 100_000 : line.unitPriceKobo
    const failed = i % 25 === 7
    const createdAt = new Date(order.deliveredAt!.getTime() + rng.int(1, 30) * HOUR)
    if (createdAt > now) continue
    await db.insert(refunds).values({
      orderId: order.id,
      amountKobo,
      reason,
      note: rng.pick(REFUND_NOTES[reason]),
      status: failed ? 'failed' : 'succeeded',
      providerRef: String(seq++),
      providerStatus: failed ? 'failed' : 'processed',
      failureReason: failed ? 'Customer account could not be credited' : null,
      createdBy: finance.id,
      createdAt,
      processedAt: new Date(createdAt.getTime() + rng.int(1, 20) * 60_000),
    })
    if (!failed) {
      await db
        .update(orders)
        .set({ refundedKobo: amountKobo, paymentStatus: amountKobo >= order.totalKobo ? 'refunded' : 'partially_refunded' })
        .where(eq(orders.id, order.id))
    }
  }
}

export async function seedSubstitutions(rng: Rng, allOrders: Order[], products: Product[]) {
  const delivered = rng.sample(
    allOrders.filter((o) => o.status === 'delivered'),
    60,
  )
  const active = products.filter((p) => p.status === 'active')
  for (const order of delivered) {
    const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).limit(1)
    if (!item) continue
    const original = products.find((p) => p.id === item.productId)
    const sameAisle = active.filter((p) => p.categoryId === original?.categoryId && p.id !== item.productId)
    if (rng.chance(0.2) || !sameAisle.length) {
      await db.update(orderItems).set({ status: 'unavailable', note: 'Out of stock at picking' }).where(eq(orderItems.id, item.id))
      continue
    }
    const sub = rng.pick(sameAisle)
    await db
      .update(orderItems)
      .set({
        status: 'substituted',
        substituteProductId: sub.id,
        substituteName: sub.name,
        substitutePriceKobo: sub.priceKobo,
        note: 'Closest match, customer agreed by phone',
      })
      .where(eq(orderItems.id, item.id))
  }
}

export async function seedAudit(allOrders: Order[], staff: { admin: StaffUser; pickers: StaffUser[] }, now: Date) {
  const recent = allOrders.filter((o) => o.placedAt.getTime() > now.getTime() - 7 * 24 * HOUR)
  const rows: (typeof auditLog.$inferInsert)[] = []
  for (const o of recent) {
    const at = (d: Date | null) => d ?? o.placedAt
    rows.push({
      actorId: null,
      entity: 'order',
      entityId: o.id,
      action: 'order.placed',
      details: { channel: 'storefront' },
      createdAt: o.placedAt,
    })
    if (o.confirmedAt)
      rows.push({
        actorId: staff.admin.id,
        entity: 'order',
        entityId: o.id,
        action: 'status.confirmed',
        details: { from: 'pending', to: 'confirmed' },
        createdAt: o.confirmedAt,
      })
    if (o.packedAt)
      rows.push({
        actorId: o.pickerId,
        entity: 'order',
        entityId: o.id,
        action: 'status.packed',
        details: { from: 'picking', to: 'packed' },
        createdAt: o.packedAt,
      })
    if (o.deliveredAt)
      rows.push({
        actorId: null,
        entity: 'order',
        entityId: o.id,
        action: 'status.delivered',
        details: { from: 'out_for_delivery', to: 'delivered', by: 'rider app' },
        createdAt: at(o.deliveredAt),
      })
    if (o.cancelledAt)
      rows.push({
        actorId: staff.admin.id,
        entity: 'order',
        entityId: o.id,
        action: 'status.cancelled',
        details: { reason: o.cancelReason },
        createdAt: o.cancelledAt,
      })
  }
  for (let i = 0; i < rows.length; i += 1000) await db.insert(auditLog).values(rows.slice(i, i + 1000))
}
