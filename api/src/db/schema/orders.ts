import { boolean, date, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { products } from './catalog.js'
import { customers } from './customers.js'
import { staffUsers } from './staff.js'

export const ORDER_STATUSES = ['pending', 'confirmed', 'picking', 'packed', 'out_for_delivery', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ['paid', 'partially_refunded', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const discountCodes = pgTable('discount_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description'),
  kind: text('kind', { enum: ['percent', 'fixed'] }).notNull(),
  value: integer('value').notNull(),
  minOrderKobo: integer('min_order_kobo').notNull().default(0),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  active: boolean('active').notNull().default(true),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const deliverySlots = pgTable(
  'delivery_slots',
  {
    id: serial('id').primaryKey(),
    day: date('day').notNull(),
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at').notNull(),
    capacity: integer('capacity').notNull(),
    booked: integer('booked').notNull().default(0),
  },
  (t) => [index('delivery_slots_day_idx').on(t.day)],
)

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    number: text('number').notNull().unique(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    status: text('status', { enum: ORDER_STATUSES }).notNull().default('pending'),
    paymentStatus: text('payment_status', { enum: PAYMENT_STATUSES }).notNull().default('paid'),
    paymentMethod: text('payment_method', { enum: ['card', 'transfer', 'ussd'] }).notNull(),
    paymentReference: text('payment_reference').notNull(),
    cardLast4: text('card_last4'),
    subtotalKobo: integer('subtotal_kobo').notNull(),
    discountKobo: integer('discount_kobo').notNull().default(0),
    deliveryFeeKobo: integer('delivery_fee_kobo').notNull().default(0),
    totalKobo: integer('total_kobo').notNull(),
    refundedKobo: integer('refunded_kobo').notNull().default(0),
    discountCodeId: integer('discount_code_id').references(() => discountCodes.id),
    slotId: integer('slot_id').references(() => deliverySlots.id),
    area: text('area'),
    deliveryAddress: text('delivery_address'),
    notes: text('notes'),
    pickerId: integer('picker_id').references(() => staffUsers.id),
    cancelReason: text('cancel_reason'),
    placedAt: timestamp('placed_at', { withTimezone: true }).notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    packedAt: timestamp('packed_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('orders_placed_idx').on(t.placedAt),
    index('orders_status_idx').on(t.status),
    index('orders_customer_idx').on(t.customerId),
  ],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    unitPriceKobo: integer('unit_price_kobo').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalKobo: integer('line_total_kobo').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
)

export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export type DiscountCode = typeof discountCodes.$inferSelect
export type DeliverySlot = typeof deliverySlots.$inferSelect
