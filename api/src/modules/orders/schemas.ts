import { z } from 'zod'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../db/schema/index.js'
import { listQuerySchema } from '../../lib/query.js'

export const orderListQuerySchema = listQuerySchema.extend({
  status: z.string().optional(),
  payment: z.enum(PAYMENT_STATUSES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  area: z.string().optional(),
  slotDay: z.string().optional(),
  code: z.string().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  sort: z.enum(['placedAt', 'total', 'number', 'status']).default('placedAt'),
})

export type OrderListQuery = z.infer<typeof orderListQuerySchema>

export const statusChangeSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  reason: z.string().trim().max(300).optional(),
})

export const cancelSchema = z.object({
  reason: z.string().trim().min(3, 'Say why the order is cancelled').max(300),
})

export const BULK_ACTIONS = ['confirm', 'start_picking', 'mark_packed', 'cancel', 'assign_picker'] as const
export type BulkAction = (typeof BULK_ACTIONS)[number]

export const bulkSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  action: z.enum(BULK_ACTIONS),
  reason: z.string().trim().max(300).optional(),
  pickerId: z.number().int().positive().optional(),
})

export const substituteSchema = z.object({
  substituteProductId: z.number().int().positive().nullable(),
  note: z.string().trim().max(300).optional(),
})

export const pickerSchema = z.object({
  pickerId: z.number().int().positive().nullable(),
})
