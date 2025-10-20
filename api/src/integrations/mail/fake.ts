import { Hono } from 'hono'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { devOutbox } from '../../db/schema/index.js'
import { shortRef } from '../../lib/ids.js'

// Local stand-in for Sendbox's v2 API. Accepts a message, stores it in the dev
// outbox and answers like the real service.

let failNext = 0

export function simulateSendboxOutage(count: number) {
  failNext = Math.max(0, count)
}

export const sendboxFake = new Hono()

sendboxFake.post('/v2/send', async (c) => {
  if (c.req.header('authorization') !== `Bearer ${config.SENDBOX_API_KEY}`) {
    return c.json({ error: 'Invalid API key' }, 401)
  }
  if (failNext > 0) {
    failNext--
    return c.json({ error: 'Service temporarily unavailable' }, 503)
  }
  const body = (await c.req.json()) as { to?: string; subject?: string; text?: string }
  if (!body.to || !body.subject || !body.text) return c.json({ error: 'to, subject and text are required' }, 400)
  const id = shortRef('sbx', 16)
  await db.insert(devOutbox).values({
    channel: 'email',
    provider: 'sendbox',
    providerId: id,
    recipient: body.to,
    subject: body.subject,
    body: body.text,
  })
  return c.json({ message: 'success', id })
})
