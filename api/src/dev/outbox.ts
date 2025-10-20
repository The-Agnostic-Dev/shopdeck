import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { html, raw } from 'hono/html'
import { db } from '../db/client.js'
import { devOutbox } from '../db/schema/index.js'
import { simulateSendboxOutage } from '../integrations/mail/fake.js'

// Everything the sandbox providers "sent". Development and staging only.

export const outboxRoutes = new Hono()

async function messages(channel?: string, q?: string, limit = 200) {
  const where: SQL[] = []
  if (channel === 'email' || channel === 'sms') where.push(eq(devOutbox.channel, channel))
  if (q) {
    const term = `%${q}%`
    where.push(or(ilike(devOutbox.recipient, term), ilike(devOutbox.subject, term), ilike(devOutbox.body, term))!)
  }
  return db
    .select()
    .from(devOutbox)
    .where(and(...where))
    .orderBy(desc(devOutbox.id))
    .limit(limit)
}

outboxRoutes.get('/outbox.json', async (c) => {
  const items = await messages(c.req.query('channel'), c.req.query('q'), Number(c.req.query('limit') ?? 500))
  return c.json({ items })
})

outboxRoutes.post('/outbox/simulate', async (c) => {
  const { provider, failNext } = (await c.req.json()) as { provider: 'sendbox' | 'textng'; failNext: number }
  if (provider === 'sendbox') simulateSendboxOutage(failNext)
  else return c.json({ error: 'provider must be sendbox or textng' }, 400)
  return c.json({ ok: true, provider, failNext })
})

outboxRoutes.post('/outbox/clear', async (c) => {
  await db.delete(devOutbox)
  return c.redirect('/_dev/outbox')
})

outboxRoutes.get('/outbox', async (c) => {
  const channel = c.req.query('channel')
  const q = c.req.query('q') ?? ''
  const rows = await messages(channel, q)
  const tab = (value: string, label: string) =>
    html`<a class="${(channel ?? '') === value ? 'on' : ''}" href="?channel=${value}">${label}</a>`
  return c.html(
    html`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Dev outbox · Shopdeck</title>
          <style>
            body {
              font:
                14px/1.5 system-ui,
                sans-serif;
              margin: 2rem;
              color: #1c2b22;
            }
            nav a {
              margin-right: 1rem;
              color: #2f6b45;
            }
            nav a.on {
              font-weight: 700;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-top: 1rem;
            }
            td,
            th {
              border-bottom: 1px solid #e3e8e4;
              padding: 0.5rem;
              text-align: left;
              vertical-align: top;
            }
            pre {
              white-space: pre-wrap;
              margin: 0;
              font: inherit;
            }
            .muted {
              color: #6b7a70;
            }
            form {
              display: inline;
            }
          </style>
        </head>
        <body>
          <h1>Dev outbox</h1>
          <p class="muted">
            Emails and SMS accepted by the sandbox providers (Sendbox, Textng). Nothing here reached a real inbox or phone.
          </p>
          <nav>${tab('', 'All')} ${tab('email', 'Email')} ${tab('sms', 'SMS')}</nav>
          <form method="get">
            <input type="hidden" name="channel" value="${channel ?? ''}" /><input name="q" value="${q}" placeholder="Search" />
            <button>Search</button>
          </form>
          <form method="post" action="/_dev/outbox/clear"><button>Clear outbox</button></form>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>When</th>
                <th>Channel</th>
                <th>To</th>
                <th>Subject / sender</th>
                <th>Body</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(
                (m) =>
                  html`<tr data-outbox-id="${m.id}" data-channel="${m.channel}">
                    <td>${m.id}</td>
                    <td class="muted">${m.createdAt.toISOString().replace('T', ' ').slice(0, 19)}Z</td>
                    <td>${m.channel}</td>
                    <td>${m.recipient}</td>
                    <td>${m.subject ?? ''}</td>
                    <td><pre>${m.body}</pre></td>
                  </tr>`,
              )}
              ${rows.length ? '' : raw('<tr><td colspan="6" class="muted">Nothing sent yet.</td></tr>')}
            </tbody>
          </table>
        </body>
      </html>`,
  )
})
