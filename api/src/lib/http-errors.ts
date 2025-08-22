import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { logger } from './logger.js'

export class AppError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 422 | 502 | 503,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message)
  }
}

export const notFound = (what: string) => new AppError(404, 'not_found', `${what} not found`)
export const forbidden = (message = 'You do not have permission to do that') => new AppError(403, 'forbidden', message)
export const conflict = (message: string, details?: Record<string, unknown>) => new AppError(409, 'conflict', message, details)
export const unprocessable = (message: string, details?: Record<string, unknown>) => new AppError(422, 'unprocessable', message, details)

export function handleError(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message, ...err.details } }, err.status)
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of err.issues) fields[issue.path.join('.') || '_'] = issue.message
    return c.json({ error: { code: 'validation', message: 'Some fields are not valid', fields } }, 422)
  }
  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'http', message: err.message } }, err.status)
  }
  logger.error('unhandled error', { path: c.req.path, err: err.stack ?? String(err) })
  return c.json({ error: { code: 'internal', message: 'Something went wrong on our side' } }, 500)
}
