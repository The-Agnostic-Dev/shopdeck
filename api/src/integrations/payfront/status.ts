import type { RefundStatus } from '../../db/schema/index.js'
import type { PayfrontRefundStatus } from './types.js'

// Payfront refund statuses to our refund statuses.
const REFUND_STATUS_MAP: Record<PayfrontRefundStatus, RefundStatus> = {
  pending: 'pending',
  processed: 'succeeded',
  failed: 'failed',
}

export function mapRefundStatus(status: string): RefundStatus {
  return REFUND_STATUS_MAP[status as PayfrontRefundStatus] ?? 'pending'
}
