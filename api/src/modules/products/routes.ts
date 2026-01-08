import { Hono } from 'hono'
import { z } from 'zod'
import { currentUser, requirePermission, type AppEnv } from '../../auth/middleware.js'
import { notFound } from '../../lib/http-errors.js'
import { idParam, readJson, readQuery } from '../../lib/validation.js'
import { movementsFor } from '../inventory/service.js'
import { commitImport, previewImport } from './import.js'
import { getProduct, listCategories, listProducts } from './repo.js'
import { createProduct, setArchived, updateProduct } from './service.js'

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).optional(),
  q: z.string().trim().max(80).optional(),
  category: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sort: z.enum(['name', 'price', 'stock', 'updated']).default('name'),
  dir: z.enum(['asc', 'desc']).default('asc'),
})

const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}-\d{3,5}$/, 'Use the AAA-0000 format'),
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(60).nullish(),
  unit: z.string().trim().max(30).nullish(),
  categoryId: z.number().int().positive().nullable(),
  priceKobo: z.number().int().positive(),
  costKobo: z.number().int().nonnegative().nullish(),
  lowStockThreshold: z.number().int().nonnegative().max(10_000),
  images: z.array(z.string().url()).max(8).optional(),
})

export const productRoutes = new Hono<AppEnv>()

productRoutes.get('/', requirePermission('products:read'), async (c) => c.json(await listProducts(readQuery(c, listSchema))))

productRoutes.get('/categories', requirePermission('products:read'), async (c) => c.json({ items: await listCategories() }))

productRoutes.get('/:id', requirePermission('products:read'), async (c) => {
  const id = idParam(c)
  const product = await getProduct(id)
  if (!product) throw notFound('Product')
  return c.json({ product, movements: await movementsFor(id, 15) })
})

productRoutes.post('/', requirePermission('products:write'), async (c) => {
  const input = await readJson(c, productSchema)
  return c.json({ product: await createProduct(input, currentUser(c)) }, 201)
})

productRoutes.patch('/:id', requirePermission('products:write'), async (c) => {
  const input = await readJson(c, productSchema.partial())
  return c.json({ product: await updateProduct(idParam(c), input, currentUser(c)) })
})

productRoutes.post('/:id/archive', requirePermission('products:write'), async (c) => {
  const { archived } = await readJson(c, z.object({ archived: z.boolean() }))
  return c.json({ product: await setArchived(idParam(c), archived, currentUser(c)) })
})

const importSchema = z.object({ csv: z.string().min(1).max(2_000_000) })

productRoutes.post('/import/preview', requirePermission('products:write'), async (c) => {
  const { csv } = await readJson(c, importSchema)
  return c.json(await previewImport(csv))
})

productRoutes.post('/import', requirePermission('products:write'), async (c) => {
  const { csv } = await readJson(c, importSchema)
  return c.json(await commitImport(csv, currentUser(c)))
})
