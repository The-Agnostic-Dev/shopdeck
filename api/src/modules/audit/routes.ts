import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../../auth/middleware.js'
import { requirePermission } from '../../auth/middleware.js'
import { readQuery } from '../../lib/validation.js'
import { historyFor } from './service.js'

const querySchema = z.object({
  entity: z.enum(['order', 'product', 'customer', 'discount', 'refund', 'staff', 'slot']),
  id: z.coerce.number().int().positive(),
})

export const auditRoutes = new Hono<AppEnv>()

auditRoutes.get('/', requirePermission('orders:read'), async (c) => {
  const { entity, id } = readQuery(c, querySchema)
  return c.json({ items: await historyFor(entity, id) })
})
