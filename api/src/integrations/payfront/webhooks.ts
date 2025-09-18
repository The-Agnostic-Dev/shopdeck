import { Hono } from 'hono'
import { logger } from '../../lib/logger.js'
import { applyProviderUpdate } from '../../modules/payments/service.js'
import { verifySignature } from './signature.js'
import type { PayfrontWebhook } from './types.js'

const log = logger.child({ component: 'payfront-webhooks' })

export const payfrontWebhookRoutes = new Hono()

payfrontWebhookRoutes.post('/', async (c) => {
  const event = (await c.req.json()) as PayfrontWebhook
  if (!verifySignature(JSON.stringify(event), c.req.header('x-payfront-signature'))) {
    log.warn('rejected webhook with a bad signature')
    return c.json({ error: 'invalid signature' }, 401)
  }
  if (event.event.startsWith('refund.')) {
    await applyProviderUpdate(event.data)
  }
  return c.json({ ok: true })
})
