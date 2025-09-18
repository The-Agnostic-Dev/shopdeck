import { logger } from './logger.js'

export class UpstreamError extends Error {
  constructor(
    public service: string,
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
}

/**
 * JSON request to a partner service with a timeout. Returns the raw response
 * and parsed body; callers decide what counts as success for their provider.
 */
export async function requestJson<T = unknown>(
  service: string,
  url: string,
  { method = 'GET', headers = {}, body, timeoutMs = 10_000 }: RequestOptions = {},
): Promise<{ status: number; body: T }> {
  const started = Date.now()
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    logger.warn('upstream request failed', { service, url, err: String(err) })
    throw new UpstreamError(service, 0, `${service} is not reachable`)
  }
  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // Some providers answer with plain text on errors.
  }
  logger.debug('upstream request', { service, method, url, status: res.status, ms: Date.now() - started })
  return { status: res.status, body: parsed as T }
}
