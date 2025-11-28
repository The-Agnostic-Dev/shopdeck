import { Hono } from 'hono'
import { z } from 'zod'
import { currentUser, requirePermission, type AppEnv } from '../../auth/middleware.js'
import { idParam, readJson } from '../../lib/validation.js'
import { adjustStock, lowStockList, movementsFor } from './service.js'

const adjustSchema = z.object({
  kind: z.enum(['receive', 'damage', 'correction', 'return']),
  quantity: z.number().int().nonnegative().max(100_000),
  reason: z.string().trim().max(300).optional(),
})

export const inventoryRoutes = new Hono<AppEnv>()

inventoryRoutes.get('/low-stock', requirePermission('products:read'), async (c) => c.json({ items: await lowStockList() }))

inventoryRoutes.get('/products/:id/movements', requirePermission('products:read'), async (c) =>
  c.json({ items: await movementsFor(idParam(c)) }),
)

inventoryRoutes.post('/products/:id/adjust', requirePermission('inventory:adjust'), async (c) => {
  const input = await readJson(c, adjustSchema)
  const product = await adjustStock(idParam(c), input, currentUser(c))
  return c.json({ product })
})
