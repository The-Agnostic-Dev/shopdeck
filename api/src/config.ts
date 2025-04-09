import { z } from 'zod'

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0', 'yes', 'no'])
    .optional()
    .transform((v) => (v === undefined ? fallback : ['true', '1', 'yes'].includes(v)))

const int = (fallback: number) => z.coerce.number().int().nonnegative().default(fallback)

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: int(5126),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.string().url().default('http://localhost:5126'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5326'),
  WEB_DIST_DIR: z.string().default('../web/dist'),
  BUSINESS_TZ: z.string().default('Africa/Lagos'),

  DATABASE_URL: z.string().default('postgres://shopdeck@localhost:55426/shopdeck'),
  DB_POOL_MAX: int(10),
  RUN_MIGRATIONS: bool(true),
  SEED_ON_START: bool(true),
  SEED_RANDOM_SEED: int(20260),

  SESSION_COOKIE: z.string().default('sd_session'),
  SESSION_TTL_HOURS: int(12),
  SESSION_SECURE_COOKIE: bool(false),

  DELIVERY_FEE_KOBO: int(150000),
  LOW_STOCK_DEFAULT_THRESHOLD: int(10),
  ORDERS_PAGE_SIZE: int(25),
  CUSTOMERS_PAGE_SIZE: int(50),
  IMPORT_MAX_ROWS: int(2000),
})

export type Config = z.infer<typeof schema>

function load(): Config {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ')
    throw new Error(`Invalid environment:\n  ${issues}`)
  }
  return parsed.data
}

export const config = load()

export const isProduction = config.NODE_ENV === 'production'
