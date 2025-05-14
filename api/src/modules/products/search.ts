import { ilike, or, type SQL } from 'drizzle-orm'
import { products } from '../../db/schema/index.js'

/** Where clause for the product search box. */
export function productSearch(raw: string): SQL {
  const term = raw.trim()
  const like = `%${term.replace(/[%_]/g, (m) => '\\' + m)}%`
  return or(ilike(products.name, like), ilike(products.brand, like), ilike(products.sku, like))!
}
