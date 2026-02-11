import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { config } from '../../config.js'
import { can } from '../../auth/permissions.js'
import { currentUser, requirePermission, type AppEnv } from '../../auth/middleware.js'
import { db } from '../../db/client.js'
import { customers } from '../../db/schema/index.js'
import { notFound } from '../../lib/http-errors.js'
import { idParam, readJson, readQuery } from '../../lib/validation.js'
import { record } from '../audit/service.js'
import { createRefund, refundInputSchema } from '../refunds/service.js'
import { areaCounts, customerOrders, getCustomer, listCustomers } from './repo.js'

const listSchema = z.object({
  q: z.string().trim().max(80).optional(),
  area: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(config.CUSTOMERS_PAGE_SIZE),
})

const updateSchema = z.object({
  notes: z.string().trim().max(1000).nullable().optional(),
  area: z.string().trim().max(60).optional(),
  address: z.string().trim().max(300).optional(),
  marketingOptIn: z.boolean().optional(),
})

export const customerRoutes = new Hono<AppEnv>()

function redact<T extends { email: string; phone: string }>(row: T, show: boolean): T {
  return show ? row : { ...row, email: '', phone: '' }
}

customerRoutes.get('/', requirePermission('customers:read'), async (c) => {
  const result = await listCustomers(readQuery(c, listSchema))
  const show = can(currentUser(c).role, 'customers:contact')
  return c.json({ ...result, items: result.items.map((r) => redact(r, show)) })
})

customerRoutes.get('/areas', requirePermission('customers:read'), async (c) => c.json({ items: await areaCounts() }))

customerRoutes.get('/:id', requirePermission('customers:read'), async (c) => {
  const id = idParam(c)
  const customer = await getCustomer(id)
  if (!customer) throw notFound('Customer')
  const show = can(currentUser(c).role, 'customers:contact')
  return c.json({ customer: redact(customer, show), orders: await customerOrders(id) })
})

customerRoutes.patch('/:id', requirePermission('customers:write'), async (c) => {
  const id = idParam(c)
  const input = await readJson(c, updateSchema)
  const [row] = await db.update(customers).set(input).where(eq(customers.id, id)).returning()
  if (!row) throw notFound('Customer')
  await record(db, {
    actorId: currentUser(c).id,
    entity: 'customer',
    entityId: id,
    action: 'customer.updated',
    details: { fields: Object.keys(input) },
  })
  return c.json({ customer: row })
})

// Goodwill refunds raised from the customer page (late delivery, damaged items).
customerRoutes.post('/:id/orders/:orderId/refund', requirePermission('customers:write'), async (c) => {
  const input = await readJson(c, refundInputSchema)
  const result = await createRefund(idParam(c, 'orderId'), input, currentUser(c), idParam(c))
  return c.json(result, 201)
})
