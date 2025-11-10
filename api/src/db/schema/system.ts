import { bigserial, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { staffUsers } from './staff.js'

export const jobs = pgTable(
  'jobs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    status: text('status', { enum: ['queued', 'running', 'done', 'failed'] })
      .notNull()
      .default('queued'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(1),
    runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('jobs_pick_idx').on(t.status, t.runAt)],
)

export const exportsTable = pgTable('exports', {
  id: serial('id').primaryKey(),
  kind: text('kind', { enum: ['orders', 'products', 'customers'] }).notNull(),
  filters: jsonb('filters').$type<Record<string, string>>().notNull().default({}),
  status: text('status', { enum: ['queued', 'ready', 'failed'] })
    .notNull()
    .default('queued'),
  filename: text('filename'),
  content: text('content'),
  rowCount: integer('row_count'),
  requestedBy: integer('requested_by').references(() => staffUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const devOutbox = pgTable('dev_outbox', {
  id: serial('id').primaryKey(),
  channel: text('channel', { enum: ['email', 'sms'] }).notNull(),
  provider: text('provider').notNull(),
  providerId: text('provider_id').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Job = typeof jobs.$inferSelect
export type ExportRow = typeof exportsTable.$inferSelect
