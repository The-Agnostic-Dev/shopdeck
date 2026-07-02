// Opaque cursors for keyset pagination. Clients treat them as strings.

export interface CreatedCursor {
  createdAt: string
}

export function encodeCursor(value: CreatedCursor): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function decodeCursor(raw: string | undefined): CreatedCursor | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (typeof parsed?.createdAt !== 'string' || Number.isNaN(Date.parse(parsed.createdAt))) return null
    return { createdAt: parsed.createdAt }
  } catch {
    return null
  }
}
