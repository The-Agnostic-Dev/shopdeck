import { boolean, date, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { products } from './catalog.js'
import { customers } from './customers.js'
import { staffUsers } from './staff.js'

export const ORDER_STATUSES = ['pending', 'confirmed', 'picking', 'packed', 'out_for_delivery', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ['paid', 'partially_refunded', 'refunded'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

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
