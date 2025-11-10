import { Hono } from 'hono'
import { z } from 'zod'
import { currentUser, requirePermission, type AppEnv } from '../../auth/middleware.js'
import { AppError } from '../../lib/http-errors.js'
import { idParam, readJson } from '../../lib/validation.js'
import { exportFile, recentExports, requestExport } from './service.js'

const requestSchema = z.object({
  kind: z.enum(['orders', 'products', 'customers']),
  filters: z.record(z.string(), z.string()).default({}),
})

export const exportRoutes = new Hono<AppEnv>()

exportRoutes.get('/', requirePermission('exports:create'), async (c) => c.json({ items: await recentExports() }))

exportRoutes.post('/', requirePermission('exports:create'), async (c) => {
  const { kind, filters } = await readJson(c, requestSchema)
  const row = await requestExport(kind, filters, currentUser(c))
  return c.json({ export: { id: row.id, kind: row.kind, status: row.status } }, 202)
})

exportRoutes.get('/:id', requirePermission('exports:create'), async (c) => {
  const row = await exportFile(idParam(c))
  const { content: _content, ...meta } = row
  return c.json({ export: meta })
})

exportRoutes.get('/:id/download', requirePermission('exports:create'), async (c) => {
  const row = await exportFile(idParam(c))
  if (row.status !== 'ready' || row.content === null) throw new AppError(409, 'not_ready', 'This export is still being prepared')
  c.header('content-type', 'text/csv; charset=utf-8')
  c.header('content-disposition', `attachment; filename="${row.filename}"`)
  return c.body('\uFEFF' + row.content)
})
