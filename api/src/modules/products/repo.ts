import { and, asc, count, desc, eq, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { categories, products } from '../../db/schema/index.js'
import { offsetFor, pageMeta } from '../../lib/pagination.js'
import { productSearch } from './search.js'

export interface ProductListQuery {
  page: number
  perPage?: number
  q?: string
  category?: string
  status?: 'active' | 'archived' | 'all'
  lowStock?: boolean
  sort: 'name' | 'price' | 'stock' | 'updated'
  dir: 'asc' | 'desc'
}

const sortColumns = {
  name: products.name,
  price: products.priceKobo,
  stock: products.stock,
  updated: products.updatedAt,
}

export function productFilters(query: Omit<ProductListQuery, 'page' | 'sort' | 'dir'>): SQL | undefined {
  const where: SQL[] = []
  if (query.q) where.push(productSearch(query.q))
  if (query.category) where.push(eq(categories.slug, query.category))
  if (query.status !== 'all') where.push(eq(products.status, query.status ?? 'active'))
  if (query.lowStock) where.push(lte(products.stock, products.lowStockThreshold))
  return and(...where)
}

export const productColumns = {
  id: products.id,
  sku: products.sku,
  name: products.name,
  brand: products.brand,
  unit: products.unit,
  priceKobo: products.priceKobo,
  costKobo: products.costKobo,
  stock: products.stock,
  lowStockThreshold: products.lowStockThreshold,
  barcode: products.barcode,
  status: products.status,
  images: products.images,
  updatedAt: products.updatedAt,
  categoryId: products.categoryId,
  category: categories.name,
  categorySlug: categories.slug,
}

export async function listProducts(query: ProductListQuery) {
  const perPage = query.perPage ?? 25
  const where = productFilters(query)
  const order = query.dir === 'asc' ? asc(sortColumns[query.sort]) : desc(sortColumns[query.sort])
  const [items, [{ total }]] = await Promise.all([
    db
      .select(productColumns)
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(where)
      .orderBy(order, asc(products.id))
      .limit(perPage)
      .offset(offsetFor(query.page, perPage)),
    db.select({ total: count() }).from(products).leftJoin(categories, eq(categories.id, products.categoryId)).where(where),
  ])
  return { items, meta: pageMeta(query.page, perPage, total) }
}

export async function getProduct(id: number) {
  const [row] = await db
    .select(productColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.id, id))
  return row ?? null
}

export async function findBySku(sku: string) {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(sql`upper(${products.sku})`, sku.toUpperCase()))
  return row ?? null
}

export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      productCount: sql<number>`(select count(*) from products p where p.category_id = "categories"."id" and p.status = 'active')`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name))
}
