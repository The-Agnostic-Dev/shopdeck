import { db } from '../client.js'
import { categories, products, stockMovements } from '../schema/index.js'
import { CATEGORIES } from './data/catalog.js'
import type { Rng } from './random.js'

const SIZE_STEP: Record<number, number> = { 0: 1, 1: 1.85, 2: 4.2 }
const PER_CATEGORY = 50
const MULTIPACKS = [
  { label: 'Twin Pack', factor: 1.95 },
  { label: 'Value Pack (x3)', factor: 2.8 },
]

/** Bigger packs cost more, a little less per unit. Rounded to the nearest ₦50. */
function priceFor(baseNaira: number, sizeIndex: number) {
  const naira = Math.round((baseNaira * (SIZE_STEP[sizeIndex] ?? sizeIndex * 1.7)) / 50) * 50
  return naira * 100
}

function ean13(rng: Rng) {
  const digits = [6, 1, 5, ...Array.from({ length: 9 }, () => rng.int(0, 9))]
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 ? 3 : 1), 0)
  return digits.join('') + String((10 - (sum % 10)) % 10)
}

export async function seedCatalog(rng: Rng, opts: { now: Date; adminId: number }) {
  const cats = await db
    .insert(categories)
    .values(CATEGORIES.map((c, i) => ({ name: c.name, slug: c.slug, sortOrder: i })))
    .returning()

  const rows: (typeof products.$inferInsert)[] = []
  CATEGORIES.forEach((cat, ci) => {
    let n = 0
    // Fill each aisle to PER_CATEGORY with multipacks of the best sellers.
    const variants = cat.lines.flatMap((line) => {
      const [brand, name, sizes, price] = line.split('|')
      return sizes.split(',').map((size, si) => ({ brand, name, size, price: Number(price), si }))
    })
    for (let i = 0; variants.length < PER_CATEGORY && i < cat.lines.length * 2; i++) {
      const [brand, name, sizes, price] = cat.lines[i % cat.lines.length].split('|')
      const pack = MULTIPACKS[Math.floor(i / cat.lines.length)]
      variants.push({ brand, name, size: `${sizes.split(',')[0]} ${pack.label}`, price: Number(price) * pack.factor, si: 0 })
    }
    for (const { brand, name, size, price, si } of variants.slice(0, PER_CATEGORY)) {
      {
        n++
        const threshold = rng.pick([5, 10, 10, 10, 15, 20, 24])
        const low = rng.chance(0.045)
        const ageDays = rng.int(20, 420)
        rows.push({
          sku: `${cat.prefix}-${String(100 + n).padStart(4, '0')}`,
          name: `${brand === 'Ọjà Farms' || brand.startsWith('Ọjà') ? name : `${brand} ${name}`} ${size}`.trim(),
          brand,
          unit: size,
          categoryId: cats[ci].id,
          priceKobo: priceFor(price, si),
          costKobo: Math.round((priceFor(price, si) * rng.int(68, 84)) / 100 / 100) * 100,
          stock: low ? rng.int(0, threshold) : rng.int(threshold + 8, threshold + 260),
          lowStockThreshold: threshold,
          status: rng.chance(0.03) ? 'archived' : 'active',
          images: rng.chance(0.8) ? [`/media/products/${cat.prefix.toLowerCase()}-${n}.jpg`] : [],
          lowStockAlertedAt: low ? new Date(opts.now.getTime() - rng.int(1, 72) * 3_600_000) : null,
          createdAt: new Date(opts.now.getTime() - ageDays * 86_400_000),
          updatedAt: new Date(opts.now.getTime() - rng.int(0, Math.min(ageDays, 30)) * 86_400_000),
        })
      }
    }
  })

  const inserted = []
  for (let i = 0; i < rows.length; i += 300) {
    inserted.push(
      ...(await db
        .insert(products)
        .values(rows.slice(i, i + 300))
        .returning()),
    )
  }
  await db.insert(stockMovements).values(
    inserted.map((p) => ({
      productId: p.id,
      kind: 'receive' as const,
      quantity: p.stock,
      stockAfter: p.stock,
      reason: 'Opening stock count',
      staffId: opts.adminId,
      createdAt: p.createdAt,
    })),
  )
  return inserted
}
