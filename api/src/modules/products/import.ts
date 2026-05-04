import { eq, inArray } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { categories, products, type StaffUser } from '../../db/schema/index.js'
import { parseCsv } from '../../lib/csv.js'
import { unprocessable } from '../../lib/http-errors.js'
import { parseNairaToKobo } from '../../lib/money.js'
import { record } from '../audit/service.js'
import { queueAlertsFor } from '../inventory/alerts.js'
import { normaliseSku } from './service.js'

// Product import from a spreadsheet. Matches on SKU: existing products are
// updated, unknown SKUs are created. Stock is never changed by an import;
// use a stock adjustment for that.

const REQUIRED = ['sku', 'name', 'category', 'price'] as const
const HEADER_ALIASES: Record<string, string> = {
  'price (ngn)': 'price',
  'price naira': 'price',
  'low stock at': 'threshold',
  'reorder level': 'threshold',
  ean: 'barcode',
}

export interface ImportRow {
  line: number
  sku: string
  name: string
  brand: string | null
  unit: string | null
  category: string
  priceKobo: number
  threshold: number
  barcode: string | null
}

export interface ImportPreview {
  rows: ImportRow[]
  errors: { line: number; message: string }[]
  creates: number
  updates: number
}

function headerKey(h: string) {
  const k = h.trim().toLowerCase()
  return HEADER_ALIASES[k] ?? k
}

export async function previewImport(csvText: string): Promise<ImportPreview> {
  const table = parseCsv(csvText)
  if (table.length < 2) throw unprocessable('The file has no product rows')
  if (table.length - 1 > config.IMPORT_MAX_ROWS) throw unprocessable(`Import at most ${config.IMPORT_MAX_ROWS} rows at a time`)
  const header = table[0].map(headerKey)
  const missing = REQUIRED.filter((r) => !header.includes(r))
  if (missing.length) throw unprocessable(`Missing columns: ${missing.join(', ')}`)

  const cats = await db.select().from(categories)
  const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c]))
  const rows: ImportRow[] = []
  const errors: ImportPreview['errors'] = []
  const seen = new Set<string>()

  table.slice(1).forEach((cells, i) => {
    const line = i + 2
    const get = (k: string) => (cells[header.indexOf(k)] ?? '').trim()
    const sku = normaliseSku(get('sku'))
    const priceKobo = parseNairaToKobo(get('price'))
    const threshold = get('threshold') === '' ? config.LOW_STOCK_DEFAULT_THRESHOLD : Number(get('threshold'))
    if (!/^[A-Z]{3}-\d{3,5}$/.test(sku)) return errors.push({ line, message: `SKU "${get('sku')}" is not in the AAA-0000 format` })
    if (seen.has(sku)) return errors.push({ line, message: `${sku} appears more than once` })
    if (!get('name')) return errors.push({ line, message: `${sku} has no name` })
    if (!catByName.has(get('category').toLowerCase())) return errors.push({ line, message: `Unknown category "${get('category')}"` })
    if (priceKobo === null || priceKobo <= 0) return errors.push({ line, message: `${sku} has an invalid price "${get('price')}"` })
    if (!Number.isInteger(threshold) || threshold < 0) return errors.push({ line, message: `${sku} has an invalid reorder level` })
    seen.add(sku)
    rows.push({
      line,
      sku,
      name: get('name'),
      brand: get('brand') || null,
      unit: get('unit') || null,
      category: get('category'),
      priceKobo,
      threshold,
      barcode: get('barcode') || null,
    })
  })

  const existing = rows.length
    ? await db
        .select({ sku: products.sku })
        .from(products)
        .where(
          inArray(
            products.sku,
            rows.map((r) => r.sku),
          ),
        )
    : []
  const existingSkus = new Set(existing.map((e) => e.sku))
  return {
    rows,
    errors,
    creates: rows.filter((r) => !existingSkus.has(r.sku)).length,
    updates: rows.filter((r) => existingSkus.has(r.sku)).length,
  }
}

export async function commitImport(csvText: string, actor: StaffUser) {
  const preview = await previewImport(csvText)
  if (preview.errors.length) throw unprocessable('Fix the errors in the file first', { errors: preview.errors })
  const cats = await db.select().from(categories)
  const catId = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))

  return db.transaction(async (tx) => {
    const touched: number[] = []
    for (const r of preview.rows) {
      const values = {
        name: r.name,
        brand: r.brand,
        unit: r.unit,
        categoryId: catId.get(r.category.toLowerCase()) ?? null,
        priceKobo: r.priceKobo,
        lowStockThreshold: r.threshold,
        barcode: r.barcode,
        updatedAt: new Date(),
      }
      const [row] = await tx
        .insert(products)
        .values({ sku: r.sku, stock: 0, ...values })
        .onConflictDoUpdate({ target: products.sku, set: values })
        .returning({ id: products.id })
      touched.push(row.id)
    }
    await queueAlertsFor(tx, touched)
    await record(tx, {
      actorId: actor.id,
      entity: 'product',
      entityId: touched[0] ?? 0,
      action: 'product.imported',
      details: { creates: preview.creates, updates: preview.updates },
    })
    return { creates: preview.creates, updates: preview.updates }
  })
}

export async function categoryIdBySlug(slug: string) {
  const [c] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug))
  return c?.id ?? null
}
