import { Hono } from 'hono'
import { z } from 'zod'
import { currentUser, requirePermission, type AppEnv } from '../../auth/middleware.js'
import { REFUND_STATUSES } from '../../db/schema/index.js'
import { idParam, readJson, readQuery } from '../../lib/validation.js'
import { listRefunds, refundTotals } from './repo.js'
import { createRefund, refundInputSchema } from './service.js'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(REFUND_STATUSES).optional(),
  reason: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const refundRoutes = new Hono<AppEnv>()

refundRoutes.get('/', requirePermission('refunds:read'), async (c) => {
  const query = readQuery(c, listSchema)
  const [list, totals] = await Promise.all([listRefunds(query), refundTotals(query)])
  return c.json({ ...list, totals })
})

/** Mounted under /api/orders/:id/refunds */
export const orderRefundRoutes = new Hono<AppEnv>()

orderRefundRoutes.post('/', requirePermission('refunds:create'), async (c) => {
  const input = await readJson(c, refundInputSchema)
  const result = await createRefund(idParam(c), input, currentUser(c))
  return c.json(result, 201)
})
