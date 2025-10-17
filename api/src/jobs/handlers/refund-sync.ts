import { and, eq, lt } from 'drizzle-orm'
import { config } from '../../config.js'
import { db } from '../../db/client.js'
import { refunds } from '../../db/schema/index.js'
import { fetchRefund } from '../../integrations/payfront/client.js'
import { logger } from '../../lib/logger.js'
import { minutesAgo } from '../../lib/dates.js'
import { applyProviderUpdate } from '../../modules/refunds/service.js'

const log = logger.child({ component: 'refund-sync' })

/** Catches refunds whose webhook never arrived by asking Payfront directly. */
export async function refundSyncJob() {
  const stale = await db
    .select({ id: refunds.id, providerRef: refunds.providerRef })
    .from(refunds)
    .where(and(eq(refunds.status, 'pending'), lt(refunds.createdAt, minutesAgo(config.REFUND_SYNC_STALE_MINUTES))))
    .limit(50)
  for (const r of stale) {
    if (!r.providerRef) continue
    try {
      await applyProviderUpdate(await fetchRefund(r.providerRef))
    } catch (err) {
      log.warn('could not sync refund', { refundId: r.id, err: String(err) })
    }
  }
}
