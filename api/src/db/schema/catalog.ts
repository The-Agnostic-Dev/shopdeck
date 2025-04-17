import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('products_category_idx').on(t.categoryId), index('products_name_idx').on(t.name)],
)

export type Product = typeof products.$inferSelect
export type Category = typeof categories.$inferSelect
