import { boolean, index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    area: text('area'),
    address: text('address'),
    notes: text('notes'),
    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
    source: text('source', { enum: ['web', 'app', 'legacy_import'] })
      .notNull()
      .default('web'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('customers_created_idx').on(t.createdAt), index('customers_email_idx').on(t.email)],
)

export type Customer = typeof customers.$inferSelect
