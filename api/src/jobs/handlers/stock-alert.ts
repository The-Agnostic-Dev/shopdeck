import { and, inArray, isNull, lte } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { products, type Job } from '../../db/schema/index.js'
import { sendEmail } from '../../integrations/mail/client.js'
import { lowStockEmail } from '../../integrations/mail/templates.js'

/** Emails the ops inbox about products at or below their reorder level. */
export async function stockAlertJob(job: Job) {
  const ids = (job.payload.productIds as number[] | undefined) ?? []
  if (!ids.length) return
  const due = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      stock: products.stock,
      threshold: products.lowStockThreshold,
    })
    .from(products)
    .where(and(inArray(products.id, ids), lte(products.stock, products.lowStockThreshold), isNull(products.lowStockAlertedAt)))
  if (!due.length) return

  await sendEmail(lowStockEmail({ to: config.OPS_ALERT_EMAIL, products: due }))
  await db
    .update(products)
    .set({ lowStockAlertedAt: new Date() })
    .where(
      inArray(
        products.id,
        due.map((p) => p.id),
      ),
    )
}
