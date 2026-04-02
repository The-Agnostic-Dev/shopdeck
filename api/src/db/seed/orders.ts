import { db } from '../client.js'
import {
  deliverySlots,
  orderItems,
  orders,
  type Customer,
  type DeliverySlot,
  type DiscountCode,
  type OrderStatus,
  type Product,
  type StaffUser,
} from '../schema/index.js'
import { addDays, lagosDay, startOfLagosDay } from '../../lib/dates.js'
import { discountFor, isUsable } from '../../modules/discounts/service.js'
import { CANCEL_REASONS, ORDER_NOTES } from './data/people.js'
import type { Rng } from './random.js'

const MIN = 60_000
const HOUR = 60 * MIN
const DAYS = 90
const WINDOWS = [
  ['08:00', '10:00'],
  ['10:00', '12:00'],
  ['12:00', '14:00'],
  ['14:00', '16:00'],
  ['16:00', '18:00'],
  ['18:00', '20:00'],
] as const

// Most recent orders are still moving through the warehouse.
const PIPELINE: [OrderStatus, number][] = [
  ['pending', 48],
  ['confirmed', 26],
  ['picking', 18],
  ['packed', 14],
  ['out_for_delivery', 14],
]

export interface SeedContext {
  now: Date
  products: Product[]
  customers: Customer[]
  codes: DiscountCode[]
  pickers: StaffUser[]
}

function placementTimes(rng: Rng, now: Date): Date[] {
  const today = lagosDay(now)
  const times: Date[] = []
  for (let back = DAYS - 1; back >= 0; back--) {
    const day = addDays(today, -back)
    const start = startOfLagosDay(day).getTime()
    const growth = (DAYS - back) / DAYS
    const daytime = Math.round(8 + growth * 9 + rng.int(-2, 3))
    // A few people always shop just after midnight.
    const lateNight = back === 1 ? 3 : rng.int(0, 2)
    for (let i = 0; i < lateNight; i++) times.push(new Date(start + rng.int(4, 56) * MIN + rng.int(0, 59) * 1000))
    for (let i = 0; i < daytime; i++) {
      const hour = rng.pick([7, 8, 9, 10, 10, 11, 12, 12, 13, 14, 15, 16, 17, 18, 18, 19, 19, 20, 21, 22])
      times.push(new Date(start + hour * HOUR + rng.int(0, 59) * MIN + rng.int(0, 59) * 1000))
    }
  }
  return times.filter((t) => t.getTime() < now.getTime() - 3 * MIN).sort((a, b) => a.getTime() - b.getTime())
}

export async function seedSlots(now: Date) {
  const today = lagosDay(now)
  const rows: (typeof deliverySlots.$inferInsert)[] = []
  for (let d = -30; d <= 7; d++) {
    const day = addDays(today, d)
    const sunday = new Date(`${day}T12:00:00Z`).getUTCDay() === 0
    for (const [startsAt, endsAt] of WINDOWS) {
      rows.push({ day, startsAt, endsAt, capacity: sunday && startsAt === '08:00' ? 0 : 18, booked: 0 })
    }
  }
  return db.insert(deliverySlots).values(rows).returning()
}

function lagosHour(at: Date) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', hourCycle: 'h23' }).format(at))
}

function chooseSlot(rng: Rng, placedAt: Date, slots: Map<string, DeliverySlot[]>) {
  const hour = lagosHour(placedAt)
  const sameDay = hour < 15
  const day = sameDay ? lagosDay(placedAt) : addDays(lagosDay(placedAt), 1)
  const options = (slots.get(day) ?? []).filter((s) => s.capacity > 0 && (!sameDay || Number(s.startsAt.slice(0, 2)) >= hour + 2))
  return options.length ? rng.pick(options) : null
}

export async function seedOrders(rng: Rng, ctx: SeedContext) {
  const slots = await seedSlots(ctx.now)
  const slotsByDay = new Map<string, DeliverySlot[]>()
  for (const s of slots) slotsByDay.set(s.day, [...(slotsByDay.get(s.day) ?? []), s])

  const active = ctx.products.filter((p) => p.status === 'active')
  const times = placementTimes(rng, ctx.now)
  const statusByRank = new Map<number, OrderStatus>()
  let rank = 0
  for (const [status, n] of PIPELINE) for (let i = 0; i < n; i++) statusByRank.set(rank++, status)

  const orderRows: (typeof orders.$inferInsert)[] = []
  const itemRows: Omit<typeof orderItems.$inferInsert, 'orderId'>[][] = []

  times.forEach((placedAt, index) => {
    const fromNewest = times.length - 1 - index
    const status: OrderStatus = statusByRank.get(fromNewest) ?? (rng.chance(0.07) ? 'cancelled' : 'delivered')
    const eligible = ctx.customers.filter((c) => c.createdAt < placedAt)
    const customer = rng.pick(eligible.length ? eligible : ctx.customers)

    const lines = rng.sample(active, rng.int(2, 7)).map((p) => {
      const quantity = p.priceKobo < 150_000 ? rng.int(1, 6) : rng.int(1, 3)
      return { productId: p.id, sku: p.sku, name: p.name, unitPriceKobo: p.priceKobo, quantity, lineTotalKobo: p.priceKobo * quantity }
    })
    const subtotalKobo = lines.reduce((s, l) => s + l.lineTotalKobo, 0)

    let discountCodeId: number | null = null
    let discountKobo = 0
    if (rng.chance(0.3)) {
      const usable = ctx.codes.filter((c) => isUsable({ ...c, usedCount: 0 }, placedAt).ok && subtotalKobo >= c.minOrderKobo)
      if (usable.length) {
        const code = rng.pick(usable)
        discountCodeId = code.id
        discountKobo = discountFor(code, subtotalKobo)
      }
    }
    const deliveryFeeKobo = subtotalKobo - discountKobo >= 5_000_000 ? 0 : 150_000
    const paymentMethod = rng.weighted([
      { weight: 64, v: 'card' as const },
      { weight: 26, v: 'transfer' as const },
      { weight: 10, v: 'ussd' as const },
    ])
    const card = paymentMethod.v === 'card'
    const slot = chooseSlot(rng, placedAt, slotsByDay)
    const confirmedAt = status === 'pending' ? null : new Date(placedAt.getTime() + rng.int(6, 40) * MIN)
    const packedAt = ['packed', 'out_for_delivery', 'delivered'].includes(status)
      ? new Date(placedAt.getTime() + rng.int(60, 180) * MIN)
      : null
    const deliveredAt = status === 'delivered' ? new Date(placedAt.getTime() + rng.int(4, 26) * HOUR) : null

    orderRows.push({
      number: `OJF-${104_000 + index}`,
      customerId: customer.id,
      status,
      paymentStatus: 'paid',
      paymentMethod: paymentMethod.v,
      paymentReference: `PFT_${rng.alnum(14)}`,
      cardLast4: card ? (rng.chance(0.05) ? '6666' : String(rng.int(1000, 9999))) : null,
      subtotalKobo,
      discountKobo,
      deliveryFeeKobo,
      totalKobo: subtotalKobo - discountKobo + deliveryFeeKobo,
      discountCodeId,
      slotId: slot?.id ?? null,
      area: customer.area,
      deliveryAddress: customer.address,
      notes: rng.chance(0.18) ? rng.pick(ORDER_NOTES) : null,
      pickerId: ['picking', 'packed', 'out_for_delivery', 'delivered'].includes(status) ? rng.pick(ctx.pickers).id : null,
      cancelReason: status === 'cancelled' ? rng.pick(CANCEL_REASONS) : null,
      placedAt,
      confirmedAt,
      packedAt,
      deliveredAt: deliveredAt && deliveredAt > ctx.now ? new Date(ctx.now.getTime() - 5 * MIN) : deliveredAt,
      cancelledAt: status === 'cancelled' ? new Date(placedAt.getTime() + rng.int(10, 300) * MIN) : null,
      updatedAt: placedAt,
    })
    itemRows.push(lines)
  })

  const inserted: (typeof orders.$inferSelect)[] = []
  for (let i = 0; i < orderRows.length; i += 400) {
    inserted.push(
      ...(await db
        .insert(orders)
        .values(orderRows.slice(i, i + 400))
        .returning()),
    )
  }
  const flatItems = inserted.flatMap((o, i) => itemRows[i].map((l) => ({ ...l, orderId: o.id })))
  for (let i = 0; i < flatItems.length; i += 1000) await db.insert(orderItems).values(flatItems.slice(i, i + 1000))

  return { orders: inserted, slots }
}
