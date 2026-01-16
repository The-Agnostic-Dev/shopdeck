import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../../db/client.js'
import { payfrontEvents } from '../../db/schema/index.js'
import { logger } from '../../lib/logger.js'
import { applyProviderUpdate } from '../../modules/refunds/service.js'
import { verifySignature } from './signature.js'
import type { PayfrontWebhook } from './types.js'

const log = logger.child({ component: 'payfront-webhooks' })

export const payfrontWebhookRoutes = new Hono()

payfrontWebhookRoutes.post('/', async (c) => {
  const raw = await c.req.text()
  if (!verifySignature(raw, c.req.header('x-payfront-signature'))) {
    log.warn('rejected webhook with a bad signature')
    return c.json({ error: 'invalid signature' }, 401)
  }
  const event = JSON.parse(raw) as PayfrontWebhook

  const inserted = await db
    .insert(payfrontEvents)
    .values({ eventId: event.id, event: event.event, payload: event })
    .onConflictDoNothing()
    .returning({ id: payfrontEvents.id })
  if (!inserted.length) return c.json({ ok: true, duplicate: true })

  try {
    if (event.event.startsWith('refund.')) {
      await applyProviderUpdate(event.data)
    }
    await db.update(payfrontEvents).set({ processedAt: new Date() }).where(eq(payfrontEvents.id, inserted[0].id))
  } catch (err) {
    log.error('webhook processing failed', { eventId: event.id, err: String(err) })
    await db
      .update(payfrontEvents)
      .set({ error: String(err) })
      .where(eq(payfrontEvents.id, inserted[0].id))
  }
  // Always 200 once stored: Payfront retries anything else for 72 hours.
  return c.json({ ok: true })
})
