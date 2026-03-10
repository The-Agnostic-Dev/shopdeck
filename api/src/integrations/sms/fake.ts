import { Hono } from 'hono'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { devOutbox } from '../../db/schema/index.js'
import { shortRef } from '../../lib/ids.js'

// Local stand-in for the Textng messaging API (v2). Created messages answer
// 201 with the message id and the remaining unit balance, like the real one.

let balance = 25_000
let failNext = 0

export function simulateTextngOutage(count: number) {
  failNext = Math.max(0, count)
}

export const textngFake = new Hono()

textngFake.post('/api/v2/messages', async (c) => {
  const body = (await c.req.json()) as { api_key?: string; to?: string; from?: string; sms?: string }
  if (body.api_key !== config.TEXTNG_API_KEY) return c.json({ error: 'Invalid api key' }, 401)
  if (failNext > 0) {
    failNext--
    return c.json({ error: 'Gateway timeout from network operator' }, 504)
  }
  if (!body.to || !/^234\d{10}$/.test(body.to)) return c.json({ error: 'Invalid destination number' }, 422)
  if (!body.sms) return c.json({ error: 'Message body is required' }, 422)
  const id = shortRef('tng', 14)
  const units = Math.ceil(body.sms.length / 160)
  balance -= units
  await db.insert(devOutbox).values({
    channel: 'sms',
    provider: 'textng',
    providerId: id,
    recipient: '+' + body.to,
    subject: body.from ?? null,
    body: body.sms,
  })
  return c.json({ message_id: id, status: 'queued', units, balance }, 201)
})

textngFake.get('/api/v2/balance', (c) => c.json({ balance, currency: 'units' }))
