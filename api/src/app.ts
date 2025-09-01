import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { authRoutes } from './auth/routes.js'
import { requireAuth, type AppEnv } from './auth/middleware.js'
import { config } from './config.js'
import { handleError } from './lib/http-errors.js'
import { logger } from './lib/logger.js'
import { customerRoutes } from './modules/customers/routes.js'
import { dashboardRoutes } from './modules/dashboard/routes.js'
import { discountRoutes } from './modules/discounts/routes.js'
import { orderRoutes } from './modules/orders/routes.js'
import { productRoutes } from './modules/products/routes.js'
import { staffRoutes } from './modules/staff/routes.js'
import { mountWebApp } from './static.js'

export function createApp() {
  const app = new Hono()
  app.onError(handleError)
  app.use('*', requestId())
  app.use('/api/*', cors({ origin: config.CORS_ORIGIN, credentials: true }))
  app.use('/api/*', async (c, next) => {
    const started = Date.now()
    await next()
    logger.debug('request', { method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - started })
  })

  app.get('/healthz', (c) => c.json({ ok: true }))

  app.route('/api/auth', authRoutes)

  const api = new Hono<AppEnv>()
  api.use('*', requireAuth)
  api.route('/dashboard', dashboardRoutes)
  api.route('/orders', orderRoutes)
  api.route('/products', productRoutes)
  api.route('/customers', customerRoutes)
  api.route('/staff', staffRoutes)
  app.route('/api', api)
  app.all('/api/*', (c) => c.json({ error: { code: 'not_found', message: 'No such endpoint' } }, 404))

  mountWebApp(app)
  return app
}
