import type { Job } from '../db/schema/index.js'
import type { JobType } from './queue.js'
import { sendEmailJob } from './handlers/send-email.js'
import { exportJob } from './handlers/export.js'
import { refundSyncJob } from './handlers/refund-sync.js'

export type JobHandler = (job: Job) => Promise<void>

export const handlers: Record<JobType, JobHandler> = {
  'send-email': sendEmailJob,
  export: exportJob,
  'refund-sync': refundSyncJob,
}
