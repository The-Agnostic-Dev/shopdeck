import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { orders } from './orders.js'
import { staffUsers } from './staff.js'

export const REFUND_STATUSES = ['pending', 'succeeded', 'failed'] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const refunds = pgTable(
  'refunds',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id),
    amountKobo: integer('amount_kobo').notNull(),
    reason: text('reason').notNull(),
    note: text('note'),
    status: text('status', { enum: REFUND_STATUSES }).notNull().default('pending'),
    providerRef: text('provider_ref'),
    providerStatus: text('provider_status'),
    failureReason: text('failure_reason'),
    createdBy: integer('created_by').references(() => staffUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [
    index('refunds_order_idx').on(t.orderId),
    index('refunds_provider_ref_idx').on(t.providerRef),
  ],
)

export const payfrontEvents = pgTable('payfront_events', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  event: text('event').notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),
})

export type Refund = typeof refunds.$inferSelect
