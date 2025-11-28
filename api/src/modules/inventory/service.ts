import { and, desc, eq, lte, sql } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { categories, products, staffUsers, stockMovements, type StaffUser } from '../../db/schema/index.js'
import { notFound, unprocessable } from '../../lib/http-errors.js'
import { record } from '../audit/service.js'

export type AdjustmentKind = 'receive' | 'damage' | 'correction' | 'return'

export interface AdjustmentInput {
  kind: AdjustmentKind
  /** For receive, damage and return: how many units. For correction: the counted stock. */
  quantity: number
  reason?: string
}

export async function adjustStock(productId: number, input: AdjustmentInput, actor: StaffUser) {
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, productId)).for('update')
    if (!product) throw notFound('Product')

    let delta: number
    switch (input.kind) {
      case 'receive':
      case 'return':
        delta = input.quantity
        break
      case 'damage':
        delta = -input.quantity
        break
      case 'correction':
        delta = input.quantity - product.stock
        break
    }
    const stockAfter = product.stock + delta
    if (stockAfter < 0) throw unprocessable(`Only ${product.stock} in stock`, { fields: { quantity: 'More than in stock' } })
    if (input.kind === 'damage' && !input.reason) {
      throw unprocessable('Say what happened to the damaged stock', { fields: { reason: 'Required for damage' } })
    }

    const [updated] = await tx
      .update(products)
      .set({ stock: stockAfter, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning()
    await tx.insert(stockMovements).values({
      productId,
      kind: input.kind,
      quantity: delta,
      stockAfter,
      reason: input.reason ?? null,
      staffId: actor.id,
    })
    await record(tx, {
      actorId: actor.id,
      entity: 'product',
      entityId: productId,
      action: `stock.${input.kind}`,
      details: { delta, stockAfter },
    })

    return updated
  })
}

export async function movementsFor(productId: number, limit = 30) {
  return db
    .select({
      id: stockMovements.id,
      kind: stockMovements.kind,
      quantity: stockMovements.quantity,
      stockAfter: stockMovements.stockAfter,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt,
      staffName: staffUsers.name,
    })
    .from(stockMovements)
    .leftJoin(staffUsers, eq(staffUsers.id, stockMovements.staffId))
    .where(eq(stockMovements.productId, productId))
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
    .limit(limit)
}

export async function lowStockList() {
  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      category: categories.name,
      alertedAt: products.lowStockAlertedAt,
      shortfall: sql<number>`${products.lowStockThreshold} - ${products.stock}`,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.status, 'active'), lte(products.stock, products.lowStockThreshold)))
    .orderBy(products.stock, products.name)
}
