import { asc, eq } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { categories, products } from '../../db/schema/index.js'
import { toCsv } from '../../lib/csv.js'
import { lagosDay } from '../../lib/dates.js'
import { koboToNairaString } from '../../lib/money.js'
import { productFilters } from '../products/repo.js'
import { PRODUCT_EXPORT_COLUMNS } from './columns.js'

export async function buildProductsCsv(filters: Record<string, string>) {
  const rows = await db
    .select({
      sku: products.sku,
      name: products.name,
      brand: products.brand,
      category: categories.name,
      unit: products.unit,
      barcode: products.barcode,
      priceKobo: products.priceKobo,
      costKobo: products.costKobo,
      stock: products.stock,
      threshold: products.lowStockThreshold,
      status: products.status,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(
      productFilters({
        q: filters.q,
        category: filters.category,
        status: (filters.status as 'active' | 'archived' | 'all') ?? 'all',
        lowStock: filters.lowStock === 'true',
      }),
    )
    .orderBy(asc(products.sku))
    .limit(config.EXPORT_MAX_ROWS)

  const body = rows.map((p) => [
    p.sku,
    p.name,
    p.brand ?? '',
    p.category ?? '',
    p.unit ?? '',
    koboToNairaString(p.priceKobo),
    p.costKobo === null ? '' : koboToNairaString(p.costKobo),
    p.stock,
    p.threshold,
    p.status,
    lagosDay(p.updatedAt),
  ])
  return { csv: toCsv([...PRODUCT_EXPORT_COLUMNS], body), rows: rows.length }
}
