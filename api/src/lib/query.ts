import { z } from 'zod'
import { isIsoDay } from './dates.js'

const DAY_MS = 86_400_000

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.string().max(40).optional(),
  dir: z.enum(['asc', 'desc']).default('desc'),
})

export type ListQuery = z.infer<typeof listQuerySchema>

export interface DateRange {
  from?: Date
  to?: Date
}

/**
 * `from` and `to` are calendar days ("2026-11-03"), both inclusive. Returns a
 * half-open instant range so callers can use `>= from` and `< to`.
 */
export function parseDateRange(input: { from?: string; to?: string }): DateRange {
  const range: DateRange = {}
  if (isIsoDay(input.from)) range.from = new Date(`${input.from}T00:00:00.000Z`)
  if (isIsoDay(input.to)) range.to = new Date(new Date(`${input.to}T00:00:00.000Z`).getTime() + DAY_MS)
  return range
}

export function offsetFor(page: number, perPage: number) {
  return (page - 1) * perPage
}

export function pageMeta(page: number, perPage: number, total: number) {
  return {
    page,
    perPage,
    total,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  }
}

/** Splits "a,b, c" into ["a","b","c"]; ignores blanks. */
export function csvParam(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}
