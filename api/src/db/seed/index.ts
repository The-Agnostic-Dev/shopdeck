import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { config } from '../../config.js'
import { logger } from '../../lib/logger.js'
import { closeDb, db } from '../client.js'
import { settings } from '../schema/index.js'
import { seedCatalog } from './catalog.js'
import { seedCustomers } from './customers.js'
import { seedDiscountCodes } from './discounts.js'
import { seedAudit, seedRefunds, seedSubstitutions, syncCounters } from './history.js'
import { seedOrders } from './orders.js'
import { Rng } from './random.js'
import { seedStaff } from './staff.js'

const TABLES = [
  'audit_log',
  'dev_outbox',
  'jobs',
  'exports',
  'payfront_events',
  'refunds',
  'order_items',
  'orders',
  'delivery_slots',
  'discount_codes',
  'stock_movements',
  'products',
  'categories',
  'customers',
  'sessions',
  'staff_users',
  'settings',
]

/** Wipes the database and loads the Ọjà Fresh demo data, relative to today. */
export async function seed() {
  const started = Date.now()
  const now = new Date()
  const rng = new Rng(config.SEED_RANDOM_SEED)

  await db.execute(sql.raw(`truncate table ${TABLES.join(', ')} restart identity cascade`))

  const staff = await seedStaff()
  const codes = await seedDiscountCodes(now)
  const products = await seedCatalog(rng, { now, adminId: staff.admin.id })
  const customers = await seedCustomers(rng, now)
  const { orders } = await seedOrders(rng, { now, products, customers, codes, pickers: staff.pickers })
  await seedRefunds(rng, orders, staff.finance, now)
  await seedSubstitutions(rng, orders, products)
  await seedAudit(orders, staff, now)
  await syncCounters()
  await db.insert(settings).values([
    { key: 'store', value: { name: 'Ọjà Fresh', city: 'Lagos', supportPhone: '0201 330 4400' } },
    { key: 'delivery', value: { feeKobo: config.DELIVERY_FEE_KOBO, freeOverKobo: 5_000_000 } },
  ])

  logger.info('seeded demo data', {
    products: products.length,
    customers: customers.length,
    orders: orders.length,
    ms: Date.now() - started,
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then(closeDb)
    .catch((err) => {
      logger.error('seed failed', { err: String(err) })
      process.exit(1)
    })
}
