import { eq } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { exportsTable, staffUsers, type Job } from '../../db/schema/index.js'
import { exportReadyEmail } from '../../integrations/mail/templates.js'
import { buildExport } from '../../modules/exports/service.js'
import { enqueue } from '../queue.js'

export async function exportJob(job: Job) {
  const exportId = Number(job.payload.exportId)
  try {
    const done = await buildExport(exportId)
    if (!done.requestedBy) return
    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.id, done.requestedBy))
    if (!user) return
    await enqueue('send-email', {
      ...exportReadyEmail({
        to: user.email,
        name: user.name.split(' ')[0],
        exportId: done.id,
        filename: done.filename ?? `export-${done.id}.csv`,
        rows: done.rowCount ?? 0,
        url: `${config.APP_URL}/exports?download=${done.id}`,
      }),
    })
  } catch (err) {
    await db.update(exportsTable).set({ status: 'failed' }).where(eq(exportsTable.id, exportId))
    throw err
  }
}
