import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { config } from '../config.js'
import * as schema from './schema/index.js'

// Postgres returns BIGINT (count(*), sums) as strings by default. Every amount we
// store is an integer number of kobo that fits comfortably in a JS number.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v))

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
})

export const db = drizzle(pool, { schema })

export type Db = typeof db
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbOrTx = Db | Tx

export async function closeDb() {
  await pool.end()
}
