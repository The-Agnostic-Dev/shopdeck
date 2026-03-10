import type { Job } from '../db/schema/index.js'
import type { JobType } from './queue.js'
import { sendEmailJob } from './handlers/send-email.js'
import { sendSmsJob } from './handlers/send-sms.js'
import { stockAlertJob } from './handlers/stock-alert.js'
import { exportJob } from './handlers/export.js'
import { refundSyncJob } from './handlers/refund-sync.js'

export type JobHandler = (job: Job) => Promise<void>

export const handlers: Record<JobType, JobHandler> = {
  'send-email': sendEmailJob,
  'send-sms': sendSmsJob,
  'stock-alert': stockAlertJob,
  export: exportJob,
  'refund-sync': refundSyncJob,
}
