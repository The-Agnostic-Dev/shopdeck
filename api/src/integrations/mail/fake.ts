import { Hono } from 'hono'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { devOutbox } from '../../db/schema/index.js'
import { shortRef } from '../../lib/ids.js'

// Local stand-in for Sendbox's v3 API. Accepts a message, stores it in the dev
// outbox and answers like the real service: 202 Accepted, empty body, the
// message id in X-Message-Id.

interface SendBody {
  personalizations?: { to?: { email: string }[] }[]
  subject?: string
  content?: { type: string; value: string }[]
}

let failNext = 0

export function simulateSendboxOutage(count: number) {
  failNext = Math.max(0, count)
}

export const sendboxFake = new Hono()

sendboxFake.post('/v3/mail/send', async (c) => {
  if (c.req.header('authorization') !== `Bearer ${config.SENDBOX_API_KEY}`) {
    return c.json({ errors: [{ message: 'The provided authorization grant is invalid, expired, or revoked' }] }, 401)
  }
  if (failNext > 0) {
    failNext--
    return c.json({ errors: [{ message: 'Service temporarily unavailable' }] }, 503)
  }
  const body = (await c.req.json()) as SendBody
  const to = body.personalizations?.[0]?.to?.[0]?.email
  const text = body.content?.find((p) => p.type === 'text/plain')?.value
  if (!to || !body.subject || !text) {
    return c.json({ errors: [{ message: 'personalizations, subject and content are required' }] }, 400)
  }
  const id = shortRef('sbx', 16)
  await db.insert(devOutbox).values({
    channel: 'email',
    provider: 'sendbox',
    providerId: id,
    recipient: to,
    subject: body.subject,
    body: text,
  })
  c.header('X-Message-Id', id)
  return c.body(null, 202)
})
