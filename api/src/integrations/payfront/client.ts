import { config } from '../../config.js'
import { requestJson, UpstreamError } from '../../lib/http-client.js'
import type { PayfrontEnvelope, PayfrontRefund } from './types.js'

const headers = () => ({ authorization: `Bearer ${config.PAYFRONT_SECRET_KEY}` })

function unwrap<T>(status: number, body: PayfrontEnvelope<T> | string | null, action: string): T {
  if (status >= 200 && status < 300 && body && typeof body === 'object' && body.status) return body.data
  const message = body && typeof body === 'object' ? body.message : `HTTP ${status}`
  throw new UpstreamError('payfront', status, `Payfront could not ${action}: ${message}`, body)
}

export async function createRefund(input: {
  transactionReference: string
  amountKobo: number
  merchantNote?: string
  customerNote?: string
}): Promise<PayfrontRefund> {
  const { status, body } = await requestJson<PayfrontEnvelope<PayfrontRefund>>('payfront', `${config.PAYFRONT_BASE_URL}/refund`, {
    method: 'POST',
    headers: headers(),
    timeoutMs: config.PAYFRONT_TIMEOUT_MS,
    body: {
      transaction: input.transactionReference,
      amount: input.amountKobo,
      currency: 'NGN',
      merchant_note: input.merchantNote,
      customer_note: input.customerNote,
    },
  })
  return unwrap(status, body, 'create the refund')
}

export async function fetchRefund(id: string | number): Promise<PayfrontRefund> {
  const { status, body } = await requestJson<PayfrontEnvelope<PayfrontRefund>>('payfront', `${config.PAYFRONT_BASE_URL}/refund/${id}`, {
    headers: headers(),
    timeoutMs: config.PAYFRONT_TIMEOUT_MS,
  })
  return unwrap(status, body, 'fetch the refund')
}
