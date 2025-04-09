import type { Context } from 'hono'
import type { z } from 'zod'
import { AppError } from './http-errors.js'

export async function readJson<S extends z.ZodType>(c: Context, schema: S): Promise<z.infer<S>> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new AppError(400, 'bad_json', 'Request body must be JSON')
  }
  return schema.parse(body)
}

export function readQuery<S extends z.ZodType>(c: Context, schema: S): z.infer<S> {
  return schema.parse(c.req.query())
}

export function idParam(c: Context, name = 'id'): number {
  const id = Number(c.req.param(name))
  if (!Number.isInteger(id) || id <= 0) throw new AppError(404, 'not_found', 'Not found')
  return id
}
