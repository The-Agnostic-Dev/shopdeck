import { config } from '../config.js'
import { purgeExpiredSessions } from '../auth/sessions.js'
import { logger } from '../lib/logger.js'
import { queueLowStockSweep } from '../modules/inventory/alerts.js'
import { enqueue, requeueStuckJobs } from './queue.js'

const log = logger.child({ component: 'cron' })

interface Schedule {
  name: string
  everyMs: number
  run: () => Promise<unknown>
}

const schedules: Schedule[] = [
  {
    name: 'low-stock-sweep',
    everyMs: config.LOW_STOCK_SWEEP_MINUTES * 60_000,
    run: queueLowStockSweep,
  },
  {
    name: 'refund-sync',
    everyMs: config.REFUND_SYNC_INTERVAL_SECONDS * 1000,
    run: () => enqueue('refund-sync', {}, { maxAttempts: 1 }),
  },
  { name: 'requeue-stuck-jobs', everyMs: 60_000, run: () => requeueStuckJobs(5) },
  { name: 'purge-sessions', everyMs: 60 * 60_000, run: purgeExpiredSessions },
]

const timers: NodeJS.Timeout[] = []

export function startCron() {
  if (!config.CRON_ENABLED) return
  for (const s of schedules) {
    const t = setInterval(() => {
      s.run().catch((err) => log.error('scheduled task failed', { name: s.name, err: String(err) }))
    }, s.everyMs)
    t.unref()
    timers.push(t)
  }
  log.info('cron started', { schedules: schedules.map((s) => `${s.name}@${s.everyMs}ms`) })
}

export function stopCron() {
  while (timers.length) clearInterval(timers.pop())
}
