import { config } from '../../config.js'
import { requestJson, UpstreamError } from '../../lib/http-client.js'

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
  category?: string
}

/**
 * Sends one email through Sendbox. In development the sandbox provider in
 * `./fake.ts` accepts the message and writes it to the dev outbox instead.
 */
export async function sendEmail(message: EmailMessage): Promise<{ messageId: string | null }> {
  const { status, body } = await requestJson<{ message?: string; id?: string; error?: string } | null>(
    'sendbox',
    `${config.SENDBOX_BASE_URL}/v2/send`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${config.SENDBOX_API_KEY}` },
      timeoutMs: 10_000,
      body: {
        from: config.MAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        tag: message.category,
      },
    },
  )
  if (status !== 200) {
    throw new UpstreamError('sendbox', status, `Sendbox rejected the message: ${body?.error ?? `HTTP ${status}`}`, body)
  }
  return { messageId: body?.id ?? null }
}
