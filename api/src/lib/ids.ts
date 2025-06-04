import { randomBytes, randomUUID } from 'node:crypto'

export function token(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function uuid(): string {
  return randomUUID()
}

/** Short provider-style reference: "re_7Kq2Vx9mPz". */
export function shortRef(prefix: string, length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = randomBytes(length)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return `${prefix}_${out}`
}
