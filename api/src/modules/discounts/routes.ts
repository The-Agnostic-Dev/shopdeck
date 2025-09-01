import { Hono } from 'hono'
import { z } from 'zod'
import { requirePermission, type AppEnv } from '../../auth/middleware.js'
import { idParam, readJson } from '../../lib/validation.js'
import { createCode, getCode, listCodes, updateCode } from './service.js'

const optionalDate = z
  .string()
  .nullish()
  .transform((v) => (v ? new Date(v) : null))

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and dashes only'),
  description: z.string().trim().max(200).nullish(),
  kind: z.enum(['percent', 'fixed']),
  value: z.number().int().positive(),
  minOrderKobo: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().nullable().default(null),
  startsAt: optionalDate,
  endsAt: optionalDate,
  active: z.boolean().default(true),
})

export const discountRoutes = new Hono<AppEnv>()

discountRoutes.get('/', requirePermission('discounts:read'), async (c) => c.json({ items: await listCodes() }))

discountRoutes.get('/:id', requirePermission('discounts:read'), async (c) => c.json({ code: await getCode(idParam(c)) }))

discountRoutes.post('/', requirePermission('discounts:write'), async (c) => {
  const input = await readJson(c, codeSchema)
  return c.json({ code: await createCode(input) }, 201)
})

discountRoutes.patch('/:id', requirePermission('discounts:write'), async (c) => {
  const input = await readJson(c, codeSchema.partial())
  return c.json({ code: await updateCode(idParam(c), input) })
})
