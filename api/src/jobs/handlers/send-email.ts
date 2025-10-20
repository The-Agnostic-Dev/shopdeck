import type { Job } from '../../db/schema/index.js'
import { sendEmail, type EmailMessage } from '../../integrations/mail/client.js'

export async function sendEmailJob(job: Job) {
  const message = job.payload as unknown as EmailMessage
  if (!message.to || !message.subject) throw new Error('send-email job without a recipient or subject')
  await sendEmail(message)
}
