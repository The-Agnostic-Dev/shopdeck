import type { Job } from '../../db/schema/index.js'
import { sendSms } from '../../integrations/sms/client.js'

export async function sendSmsJob(job: Job) {
  const { to, message } = job.payload as { to?: string; message?: string }
  if (!to || !message) throw new Error('send-sms job without a number or message')
  await sendSms(to, message)
}
