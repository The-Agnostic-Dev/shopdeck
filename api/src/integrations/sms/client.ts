import { config } from '../../config.js'
import { requestJson, UpstreamError } from '../../lib/http-client.js'

interface TextngResponse {
  message_id?: string
  status?: string
  balance?: number
  error?: string
}

/** Nigerian numbers in the 234XXXXXXXXXX form Textng expects. */
export function toMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return '234' + digits.slice(1)
  return digits
}

export async function sendSms(to: string, message: string): Promise<{ messageId: string }> {
  const { status, body } = await requestJson<TextngResponse>('textng', `${config.TEXTNG_BASE_URL}/api/v2/messages`, {
    method: 'POST',
    timeoutMs: 8_000,
    body: {
      api_key: config.TEXTNG_API_KEY,
      to: toMsisdn(to),
      from: config.SMS_SENDER_ID,
      sms: message,
      type: 'plain',
      channel: 'dnd',
    },
  })
  if (status !== 200 || !body?.message_id) {
    throw new UpstreamError('textng', status, `Textng did not accept the SMS: ${body?.error ?? `HTTP ${status}`}`, body)
  }
  return { messageId: body.message_id }
}
