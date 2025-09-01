import { desc, eq, sql } from 'drizzle-orm'
import { db, type DbOrTx } from '../../db/client.js'
import { discountCodes, type DiscountCode } from '../../db/schema/index.js'
import { conflict, notFound, unprocessable } from '../../lib/http-errors.js'
import { percentOf } from '../../lib/money.js'

export function normaliseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

export function discountFor(code: DiscountCode, subtotalKobo: number): number {
  if (subtotalKobo < code.minOrderKobo) return 0
  const raw = code.kind === 'percent' ? percentOf(subtotalKobo, code.value) : code.value
  return Math.min(raw, subtotalKobo)
}

export function isUsable(code: DiscountCode, now = new Date()) {
  if (!code.active) return { ok: false, reason: 'inactive' } as const
  if (code.startsAt && code.startsAt > now) return { ok: false, reason: 'not_started' } as const
  if (code.endsAt && code.endsAt <= now) return { ok: false, reason: 'expired' } as const
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return { ok: false, reason: 'limit_reached' } as const
  return { ok: true } as const
}

export async function listCodes() {
  const rows = await db
    .select({
      code: discountCodes,
      orderCount: sql<number>`(select count(*) from orders o where o.discount_code_id = "discount_codes"."id")`,
    })
    .from(discountCodes)
    .orderBy(desc(discountCodes.active), desc(discountCodes.createdAt))
  return rows.map(({ code, orderCount }) => ({ ...code, orderCount, usable: isUsable(code) }))
}

export async function getCode(id: number) {
  const [code] = await db.select().from(discountCodes).where(eq(discountCodes.id, id))
  if (!code) throw notFound('Discount code')
  return code
}

export interface CodeInput {
  code: string
  description?: string | null
  kind: 'percent' | 'fixed'
  value: number
  minOrderKobo: number
  maxUses: number | null
  startsAt: Date | null
  endsAt: Date | null
  active: boolean
}

export async function createCode(input: CodeInput) {
  const code = normaliseCode(input.code)
  if (input.kind === 'percent' && (input.value < 1 || input.value > 90)) {
    throw unprocessable('A percentage discount must be between 1 and 90', { fields: { value: 'Between 1 and 90' } })
  }
  const [existing] = await db.select({ id: discountCodes.id }).from(discountCodes).where(eq(discountCodes.code, code))
  if (existing) throw conflict(`${code} already exists`)
  const [row] = await db
    .insert(discountCodes)
    .values({ ...input, code })
    .returning()
  return row
}

export async function updateCode(id: number, input: Partial<CodeInput>) {
  await getCode(id)
  const patch = { ...input }
  if (patch.code) patch.code = normaliseCode(patch.code)
  const [row] = await db.update(discountCodes).set(patch).where(eq(discountCodes.id, id)).returning()
  return row
}

/** Counts one use. Storefront checkout calls this through the shared package. */
export async function claimUsage(tx: DbOrTx, codeId: number) {
  const [row] = await tx
    .update(discountCodes)
    .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
    .where(eq(discountCodes.id, codeId))
    .returning({ usedCount: discountCodes.usedCount })
  return row?.usedCount ?? null
}

/** Gives a use back, for example when the order that used the code is cancelled. */
export async function releaseUsage(tx: DbOrTx, codeId: number) {
  await tx
    .update(discountCodes)
    .set({ usedCount: sql`greatest(${discountCodes.usedCount} - 1, 0)` })
    .where(eq(discountCodes.id, codeId))
}
