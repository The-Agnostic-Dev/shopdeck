import { eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { products, type StaffUser } from '../../db/schema/index.js'
import { conflict, notFound } from '../../lib/http-errors.js'
import { record } from '../audit/service.js'
import { findBySku, getProduct } from './repo.js'

export interface ProductInput {
  sku: string
  name: string
  brand?: string | null
  unit?: string | null
  categoryId: number | null
  priceKobo: number
  costKobo?: number | null
  lowStockThreshold: number
  images?: string[]
}

export function normaliseSku(sku: string) {
  return sku.trim().toUpperCase()
}

export async function createProduct(input: ProductInput, actor: StaffUser) {
  const sku = normaliseSku(input.sku)
  if (await findBySku(sku)) throw conflict(`SKU ${sku} is already used`, { fields: { sku: 'Already used' } })
  const [row] = await db
    .insert(products)
    .values({ ...input, sku, stock: 0, images: input.images ?? [] })
    .returning()
  await record(db, { actorId: actor.id, entity: 'product', entityId: row.id, action: 'product.created', details: { sku } })
  return row
}

export async function updateProduct(id: number, input: Partial<ProductInput>, actor: StaffUser) {
  const existing = await getProduct(id)
  if (!existing) throw notFound('Product')
  const patch = { ...input, updatedAt: new Date() }
  if (patch.sku) {
    patch.sku = normaliseSku(patch.sku)
    const clash = await findBySku(patch.sku)
    if (clash && clash.id !== id) throw conflict(`SKU ${patch.sku} is already used`, { fields: { sku: 'Already used' } })
  }
  return db.transaction(async (tx) => {
    const [row] = await tx.update(products).set(patch).where(eq(products.id, id)).returning()
    const changed = Object.keys(input).filter((k) => k !== 'images')
    await record(tx, { actorId: actor.id, entity: 'product', entityId: id, action: 'product.updated', details: { changed } })
    return row
  })
}

export async function setArchived(id: number, archived: boolean, actor: StaffUser) {
  const [row] = await db
    .update(products)
    .set({ status: archived ? 'archived' : 'active', updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()
  if (!row) throw notFound('Product')
  await record(db, { actorId: actor.id, entity: 'product', entityId: id, action: archived ? 'product.archived' : 'product.restored' })
  return row
}
