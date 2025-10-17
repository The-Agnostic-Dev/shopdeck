import { closeDb } from './db/client.js'
import { startCron, stopCron } from './jobs/cron.js'
import { startWorker, stopWorker } from './jobs/runner.js'
import { logger } from './lib/logger.js'

// Standalone worker for deployments that run jobs outside the API process.
// The API applies migrations and seeds; the worker only processes the queue.

startWorker()
startCron()
logger.info('shopdeck worker running')

const shutdown = async () => {
  stopCron()
  await stopWorker()
  await closeDb()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
