import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, closeDb } from './client.js'
import { logger } from '../lib/logger.js'

const here = path.dirname(fileURLToPath(import.meta.url))
export const migrationsFolder = path.resolve(here, '../../drizzle')

export async function runMigrations() {
  await migrate(db, { migrationsFolder })
  logger.info('migrations applied', { folder: migrationsFolder })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(closeDb)
    .catch((err) => {
      logger.error('migration failed', { err: String(err) })
      process.exit(1)
    })
}
