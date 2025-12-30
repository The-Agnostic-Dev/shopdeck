import { and, inArray, isNull, lte, sql, eq } from 'drizzle-orm'
import { db, type DbOrTx } from '../../db/client.js'
import { products } from '../../db/schema/index.js'
import { enqueue } from '../../jobs/queue.js'

/**
 * Queues one low-stock alert for products that are now at or below their
 * reorder level and have not been alerted since they were last restocked.
 */
export async function queueAlertsFor(tx: DbOrTx, productIds: number[]) {
  if (!productIds.length) return
  const due = await tx
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        inArray(products.id, productIds),
        lte(products.stock, products.lowStockThreshold),
        isNull(products.lowStockAlertedAt),
        eq(products.status, 'active'),
      ),
    )
  if (due.length) await enqueue('stock-alert', { productIds: due.map((d) => d.id) }, { tx })
}

/** A product that is back above its reorder level can alert again next time. */
export async function clearAlertsIfRestocked(tx: DbOrTx, productIds: number[]) {
  if (!productIds.length) return
  await tx
    .update(products)
    .set({ lowStockAlertedAt: null })
    .where(and(inArray(products.id, productIds), sql`${products.stock} > ${products.lowStockThreshold}`))
}

/** Hourly safety net for stock changes that bypass adjustments (imports, SQL fixes). */
export async function queueLowStockSweep() {
  const due = await db
    .select({ id: products.id })
    .from(products)
    .where(and(lte(products.stock, products.lowStockThreshold), isNull(products.lowStockAlertedAt), eq(products.status, 'active')))
    .limit(200)
  if (due.length) await enqueue('stock-alert', { productIds: due.map((d) => d.id) })
  return due.length
}
