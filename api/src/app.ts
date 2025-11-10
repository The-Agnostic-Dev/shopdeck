import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { authRoutes } from './auth/routes.js'
import { requireAuth, type AppEnv } from './auth/middleware.js'
import { config } from './config.js'
import { outboxRoutes } from './dev/outbox.js'
import { sendboxFake } from './integrations/mail/fake.js'
import { payfrontFake } from './integrations/payfront/fake/server.js'
import { payfrontWebhookRoutes } from './integrations/payfront/webhooks.js'
import { handleError } from './lib/http-errors.js'
import { logger } from './lib/logger.js'
import { customerRoutes } from './modules/customers/routes.js'
import { dashboardRoutes } from './modules/dashboard/routes.js'
import { discountRoutes } from './modules/discounts/routes.js'
import { exportRoutes } from './modules/exports/routes.js'
import { jobRoutes } from './modules/jobs-admin/routes.js'
import { orderRoutes } from './modules/orders/routes.js'
import { productRoutes } from './modules/products/routes.js'
import { orderRefundRoutes, refundRoutes } from './modules/refunds/routes.js'
import { slotRoutes } from './modules/slots/routes.js'
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
  app.route('/api/webhooks/payfront', payfrontWebhookRoutes)

  const api = new Hono<AppEnv>()
  api.use('*', requireAuth)
  api.route('/dashboard', dashboardRoutes)
  api.route('/orders/:id/refunds', orderRefundRoutes)
  api.route('/orders', orderRoutes)
  api.route('/refunds', refundRoutes)
  api.route('/products', productRoutes)
  api.route('/customers', customerRoutes)
  api.route('/discounts', discountRoutes)
  api.route('/slots', slotRoutes)
  api.route('/exports', exportRoutes)
  api.route('/staff', staffRoutes)
  api.route('/jobs', jobRoutes)
  app.route('/api', api)
  app.all('/api/*', (c) => c.json({ error: { code: 'not_found', message: 'No such endpoint' } }, 404))

  if (config.ENABLE_FAKES) {
    app.route('/_fake/payfront', payfrontFake)
    app.route('/_fake/sendbox', sendboxFake)
  }
  if (config.ENABLE_DEV_ROUTES) app.route('/_dev', outboxRoutes)

  mountWebApp(app)
  return app
}
