import { and, count, desc, eq, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { requirePermission, type AppEnv } from '../../auth/middleware.js'
import { db } from '../../db/client.js'
import { jobs } from '../../db/schema/index.js'
import { readQuery } from '../../lib/validation.js'

const querySchema = z.object({
  status: z.enum(['queued', 'running', 'done', 'failed']).optional(),
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const jobRoutes = new Hono<AppEnv>()

jobRoutes.get('/', requirePermission('jobs:read'), async (c) => {
  const { status, type, limit } = readQuery(c, querySchema)
  const where: SQL[] = []
  if (status) where.push(eq(jobs.status, status))
  if (type) where.push(eq(jobs.type, type))
  const [items, counts] = await Promise.all([
    db
      .select()
      .from(jobs)
      .where(and(...where))
      .orderBy(desc(jobs.id))
      .limit(limit),
    db.select({ status: jobs.status, n: count() }).from(jobs).groupBy(jobs.status),
  ])
  return c.json({ items, counts: Object.fromEntries(counts.map((r) => [r.status, r.n])) })
})
