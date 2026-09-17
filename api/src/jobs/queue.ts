import { sql } from 'drizzle-orm'
import { config } from '../config.js'
import { db, type DbOrTx } from '../db/client.js'
import { jobs, type Job } from '../db/schema/index.js'

export type JobType = 'send-email' | 'send-sms' | 'stock-alert' | 'export' | 'refund-sync'

export interface EnqueueOptions {
  runAt?: Date
  maxAttempts?: number
  tx?: DbOrTx
}

export async function enqueue(type: JobType, payload: Record<string, unknown>, opts: EnqueueOptions = {}) {
  const [job] = await (opts.tx ?? db)
    .insert(jobs)
    .values({
      type,
      payload,
      runAt: opts.runAt ?? new Date(),
      maxAttempts: opts.maxAttempts ?? config.JOB_MAX_ATTEMPTS,
    })
    .returning({ id: jobs.id })
  return job.id
}

/** Claims up to `limit` due jobs. SKIP LOCKED lets several workers share the table. */
export async function claimDueJobs(limit: number): Promise<Job[]> {
  const result = await db.execute<Job>(sql`
    update jobs set status = 'running', locked_at = now(), attempts = attempts + 1, updated_at = now()
    where id in (
      select id from jobs
      where status = 'queued' and run_at <= now()
      order by run_at, id
      limit ${limit}
      for update skip locked
    )
    returning id, type, payload, status, attempts, max_attempts as "maxAttempts", run_at as "runAt",
      locked_at as "lockedAt", last_error as "lastError", created_at as "createdAt", updated_at as "updatedAt"
  `)
  return result.rows
}

export async function markDone(id: number) {
  await db.execute(sql`update jobs set status = 'done', locked_at = null, last_error = null, updated_at = now() where id = ${id}`)
}

export async function markFailed(job: Job, error: string, backoffMs: number) {
  if (job.attempts < job.maxAttempts) {
    const delay = backoffMs * 2 ** (job.attempts - 1)
    await db.execute(sql`
      update jobs set status = 'queued', locked_at = null, last_error = ${error},
        run_at = now() + (${delay} || ' milliseconds')::interval, updated_at = now()
      where id = ${job.id}
    `)
    return 'retrying' as const
  }
  await db.execute(sql`update jobs set status = 'failed', locked_at = null, last_error = ${error}, updated_at = now() where id = ${job.id}`)
  return 'failed' as const
}

/** Puts jobs whose worker died back in the queue. */
export async function requeueStuckJobs(olderThanMinutes = 5) {
  const result = await db.execute(sql`
    update jobs set status = 'queued', locked_at = null, updated_at = now()
    where status = 'running' and locked_at < now() - (${olderThanMinutes} || ' minutes')::interval
  `)
  return result.rowCount ?? 0
}
