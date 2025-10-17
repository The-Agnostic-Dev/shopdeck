import { config } from '../config.js'
import { logger } from '../lib/logger.js'
import { claimDueJobs, markDone, markFailed } from './queue.js'
import { handlers } from './registry.js'
import type { JobType } from './queue.js'

const log = logger.child({ component: 'worker' })

let running = false
let timer: NodeJS.Timeout | undefined
let inFlight = 0

async function tick() {
  if (!running) return
  const free = Math.max(0, config.WORKER_CONCURRENCY - inFlight)
  if (free > 0) {
    try {
      const due = await claimDueJobs(free)
      for (const job of due) {
        inFlight++
        void runOne(job).finally(() => inFlight--)
      }
    } catch (err) {
      log.error('could not claim jobs', { err: String(err) })
    }
  }
  timer = setTimeout(tick, config.WORKER_POLL_MS)
}

async function runOne(job: Awaited<ReturnType<typeof claimDueJobs>>[number]) {
  const handler = handlers[job.type as JobType]
  if (!handler) {
    await markFailed(job.id, `no handler for job type ${job.type}`)
    return
  }
  const started = Date.now()
  try {
    await handler(job)
    await markDone(job.id)
    log.info('job done', { id: job.id, type: job.type, attempt: job.attempts, ms: Date.now() - started })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await markFailed(job.id, message)
    log.warn('job failed', { id: job.id, type: job.type, err: message })
  }
}

export function startWorker() {
  if (running) return
  running = true
  log.info('worker started', { pollMs: config.WORKER_POLL_MS, concurrency: config.WORKER_CONCURRENCY })
  void tick()
}

export async function stopWorker() {
  running = false
  if (timer) clearTimeout(timer)
  while (inFlight > 0) await new Promise((r) => setTimeout(r, 50))
}
