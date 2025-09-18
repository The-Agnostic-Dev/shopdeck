import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '../../config.js'

/** Payfront signs the raw request body with HMAC-SHA512 using the secret key. */
export function signPayload(rawBody: string, secret = config.PAYFRONT_SECRET_KEY): string {
  return createHmac('sha512', secret).update(rawBody).digest('hex')
}

export function verifySignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false
  const expected = Buffer.from(signPayload(rawBody), 'hex')
  const given = Buffer.from(signature, 'hex')
  return expected.length === given.length && timingSafeEqual(expected, given)
}
