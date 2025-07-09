import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { config } from './config.js'
import { closeDb } from './db/client.js'
import { runMigrations } from './db/migrate.js'
import { seed } from './db/seed/index.js'
import { logger } from './lib/logger.js'

async function main() {
  if (config.RUN_MIGRATIONS) await runMigrations()
  if (config.SEED_ON_START) await seed()

  const app = createApp()
  const server = serve({ fetch: app.fetch, port: config.PORT, hostname: config.HOST }, (info) => {
    logger.info('shopdeck api listening', { port: info.port, url: config.APP_URL })
  })

  const shutdown = async (signal: string) => {
    logger.info('shutting down', { signal })
    server.close()
    await closeDb()
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  logger.error('failed to start', { err: err instanceof Error ? err.stack : String(err) })
  process.exit(1)
})
