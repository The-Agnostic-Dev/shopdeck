import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { deliverySlots } from '../../db/schema/index.js'
import { addDays, lagosDay } from '../../lib/dates.js'
import { notFound, unprocessable } from '../../lib/http-errors.js'

export function slotState(slot: { capacity: number; booked: number }) {
  if (slot.booked >= slot.capacity) return 'full' as const
  if (slot.booked >= slot.capacity * 0.8) return 'filling' as const
  return 'open' as const
}

export async function slotsBetween(fromDay: string, toDay: string) {
  const rows = await db
    .select({
      id: deliverySlots.id,
      day: deliverySlots.day,
      startsAt: deliverySlots.startsAt,
      endsAt: deliverySlots.endsAt,
      capacity: deliverySlots.capacity,
      booked: deliverySlots.booked,
      packed: sql<number>`(select count(*) from orders o where o.slot_id = "delivery_slots"."id" and o.status in ('packed', 'out_for_delivery', 'delivered'))`,
    })
    .from(deliverySlots)
    .where(and(gte(deliverySlots.day, fromDay), lte(deliverySlots.day, toDay)))
    .orderBy(asc(deliverySlots.day), asc(deliverySlots.startsAt))
  return rows.map((r) => ({ ...r, state: slotState(r) }))
}

export async function upcomingSlots(days = 7) {
  const today = lagosDay()
  return slotsBetween(today, addDays(today, days - 1))
}

export async function updateCapacity(id: number, capacity: number) {
  const [slot] = await db.select().from(deliverySlots).where(eq(deliverySlots.id, id))
  if (!slot) throw notFound('Delivery slot')
  if (capacity < slot.booked && capacity !== 0) {
    throw unprocessable(`${slot.booked} orders are already booked in this slot`, { fields: { capacity: `At least ${slot.booked}` } })
  }
  const [row] = await db.update(deliverySlots).set({ capacity }).where(eq(deliverySlots.id, id)).returning()
  return { ...row, state: slotState(row) }
}
