import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { staffUsers } from './staff.js'

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    sku: text('sku').notNull().unique(),
    name: text('name').notNull(),
    brand: text('brand'),
    unit: text('unit'),
    categoryId: integer('category_id').references(() => categories.id),
    priceKobo: integer('price_kobo').notNull(),
    costKobo: integer('cost_kobo'),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(10),
    status: text('status', { enum: ['active', 'archived'] })
      .notNull()
      .default('active'),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    lowStockAlertedAt: timestamp('low_stock_alerted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('products_category_idx').on(t.categoryId), index('products_name_idx').on(t.name)],
)

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['receive', 'damage', 'correction', 'sale', 'cancel', 'return'] }).notNull(),
    quantity: integer('quantity').notNull(),
    stockAfter: integer('stock_after').notNull(),
    reason: text('reason'),
    staffId: integer('staff_id').references(() => staffUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('stock_movements_product_idx').on(t.productId, t.createdAt)],
)

export type Product = typeof products.$inferSelect
export type Category = typeof categories.$inferSelect
export type StockMovement = typeof stockMovements.$inferSelect
