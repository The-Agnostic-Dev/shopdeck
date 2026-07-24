import { ilike, or, sql, type SQL } from 'drizzle-orm'
import { products } from '../../db/schema/index.js'

// SKUs look like "GRA-0142": a three letter aisle code and a number.
export const SKU_PATTERN = /^[a-z]{3}-\d{3,5}$/i

/** Where clause for the product search box. */
export function productSearch(raw: string): SQL {
  const term = raw.trim()
  if (SKU_PATTERN.test(term)) {
    // A full SKU should find that product only, not GRA-01420 and friends.
    return sql`${products.sku} = ${term}`
  }
  const like = `%${term.replace(/[%_]/g, (m) => '\\' + m)}%`
  return or(ilike(products.name, like), ilike(products.brand, like), ilike(products.sku, like), ilike(products.barcode, like))!
}
