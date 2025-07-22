import { Hono } from 'hono'
import { z } from 'zod'
import { requirePermission, type AppEnv } from '../../auth/middleware.js'
import { isIsoDay, lagosDay } from '../../lib/dates.js'
import { readQuery } from '../../lib/validation.js'
import { dailySeries, summaryFor } from './service.js'

const querySchema = z.object({
  day: z.string().refine(isIsoDay, 'Use YYYY-MM-DD').optional(),
  days: z.coerce.number().int().min(7).max(90).default(14),
})

export const dashboardRoutes = new Hono<AppEnv>()

dashboardRoutes.get('/', requirePermission('dashboard:read'), async (c) => {
  const { day = lagosDay(), days } = readQuery(c, querySchema)
  const [summary, series] = await Promise.all([summaryFor(day), dailySeries(day, days)])
  return c.json({ summary, series })
})
