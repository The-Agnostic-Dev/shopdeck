import { db } from '../../db/client.js'
import type { OrderStatus, StaffUser } from '../../db/schema/index.js'
import { AppError } from '../../lib/http-errors.js'
import { findOrdersForUpdate } from './repo.js'
import type { BulkAction } from './schemas.js'
import { assignPicker } from './service.js'
import { applyTransition } from './transitions.js'

const targetFor: Record<Exclude<BulkAction, 'assign_picker'>, OrderStatus> = {
  confirm: 'confirmed',
  start_picking: 'picking',
  mark_packed: 'packed',
  cancel: 'cancelled',
}

export interface BulkResult {
  id: number
  ok: boolean
  error?: string
}

/** Applies one action to many orders. Each order succeeds or fails on its own. */
export async function runBulkAction(
  ids: number[],
  action: BulkAction,
  actor: StaffUser,
  opts: { reason?: string; pickerId?: number },
): Promise<BulkResult[]> {
  const results: BulkResult[] = []
  for (const id of [...new Set(ids)]) {
    try {
      if (action === 'assign_picker') {
        await assignPicker(id, opts.pickerId ?? null, actor)
      } else {
        await db.transaction(async (tx) => {
          const [order] = await findOrdersForUpdate(tx, [id])
          if (!order) throw new AppError(404, 'not_found', 'Order not found')
          await applyTransition(tx, order, targetFor[action], { actorId: actor.id, reason: opts.reason })
        })
      }
      results.push({ id, ok: true })
    } catch (err) {
      results.push({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return results
}
