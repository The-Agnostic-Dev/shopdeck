import { Hono } from 'hono'
import { z } from 'zod'
import { currentUser, requirePermission, type AppEnv } from '../../auth/middleware.js'
import { db } from '../../db/client.js'
import { isIsoDay } from '../../lib/dates.js'
import { idParam, readJson, readQuery } from '../../lib/validation.js'
import { record } from '../audit/service.js'
import { slotsBetween, updateCapacity, upcomingSlots } from './service.js'

const rangeSchema = z.object({
  from: z.string().refine(isIsoDay).optional(),
  to: z.string().refine(isIsoDay).optional(),
})

export const slotRoutes = new Hono<AppEnv>()

slotRoutes.get('/', requirePermission('slots:read'), async (c) => {
  const { from, to } = readQuery(c, rangeSchema)
  const items = from && to ? await slotsBetween(from, to) : await upcomingSlots()
  return c.json({ items })
})

slotRoutes.patch('/:id', requirePermission('slots:write'), async (c) => {
  const id = idParam(c)
  const { capacity } = await readJson(c, z.object({ capacity: z.number().int().min(0).max(500) }))
  const slot = await updateCapacity(id, capacity)
  await record(db, { actorId: currentUser(c).id, entity: 'slot', entityId: id, action: 'slot.capacity', details: { capacity } })
  return c.json({ slot })
})
