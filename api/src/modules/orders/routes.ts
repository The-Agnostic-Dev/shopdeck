import { Hono } from 'hono'
import { can } from '../../auth/permissions.js'
import { currentUser, requirePermission, type AppEnv } from '../../auth/middleware.js'
import { forbidden, notFound } from '../../lib/http-errors.js'
import { idParam, readJson, readQuery } from '../../lib/validation.js'
import { historyFor } from '../audit/service.js'
import { listOrders, orderDetail } from './repo.js'
import { bulkSchema, cancelSchema, orderListQuerySchema, pickerSchema, statusChangeSchema, substituteSchema } from './schemas.js'
import { assignPicker, cancelOrder, changeStatus, substituteItem } from './service.js'
import { serializeOrderDetail } from './serialize.js'

export const orderRoutes = new Hono<AppEnv>()

orderRoutes.get('/', requirePermission('orders:read'), async (c) => {
  return c.json(await listOrders(readQuery(c, orderListQuerySchema)))
})

orderRoutes.get('/:id', requirePermission('orders:read'), async (c) => {
  const id = idParam(c)
  const detail = await orderDetail(id)
  if (!detail) throw notFound('Order')
  const history = await historyFor('order', id, 30)
  return c.json(serializeOrderDetail(detail, history, currentUser(c)))
})

orderRoutes.post('/:id/status', requirePermission('orders:update_status'), async (c) => {
  const { status, reason } = await readJson(c, statusChangeSchema)
  const user = currentUser(c)
  if (status === 'cancelled' && !can(user.role, 'orders:cancel')) throw forbidden()
  const order = await changeStatus(idParam(c), status, user, reason)
  return c.json({ order })
})

orderRoutes.post('/:id/cancel', requirePermission('orders:cancel'), async (c) => {
  const { reason } = await readJson(c, cancelSchema)
  const order = await cancelOrder(idParam(c), reason, currentUser(c))
  return c.json({ order })
})

orderRoutes.post('/:id/picker', requirePermission('orders:update_status'), async (c) => {
  const { pickerId } = await readJson(c, pickerSchema)
  return c.json({ order: await assignPicker(idParam(c), pickerId, currentUser(c)) })
})

orderRoutes.post('/:id/items/:itemId/substitute', requirePermission('orders:substitute'), async (c) => {
  const input = await readJson(c, substituteSchema)
  const items = await substituteItem(idParam(c), idParam(c, 'itemId'), input, currentUser(c))
  return c.json({ items })
})
