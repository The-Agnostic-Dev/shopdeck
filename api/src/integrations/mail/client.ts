import { config } from '../../config.js'
import { requestJson, UpstreamError } from '../../lib/http-client.js'

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
  category?: string
}

function parseFrom(from: string) {
  const m = from.match(/^(.*)<(.+)>$/)
  return m ? { name: m[1].trim(), email: m[2].trim() } : { email: from }
}

/**
 * Sends one email through Sendbox (v3 send endpoint). In development the
 * sandbox provider in `./fake.ts` accepts the message and writes it to the
 * dev outbox instead.
 */
export async function sendEmail(message: EmailMessage): Promise<{ messageId: string | null }> {
  const { status, body } = await requestJson<{ errors?: { message: string }[] } | null>(
    'sendbox',
    `${config.SENDBOX_BASE_URL}/v3/mail/send`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${config.SENDBOX_API_KEY}` },
      timeoutMs: 10_000,
      body: {
        personalizations: [{ to: [{ email: message.to }] }],
        from: parseFrom(config.MAIL_FROM),
        subject: message.subject,
        content: [{ type: 'text/plain', value: message.text }, ...(message.html ? [{ type: 'text/html', value: message.html }] : [])],
        categories: message.category ? [message.category] : undefined,
      },
    },
  )
  if (status !== 200) {
    const reason = body?.errors?.map((e) => e.message).join('; ') || `HTTP ${status}`
    throw new UpstreamError('sendbox', status, `Sendbox rejected the message: ${reason}`, body)
  }
  return { messageId: null }
}
