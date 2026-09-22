import type { RefundStatus } from '../../db/schema/index.js'
import type { PayfrontRefundStatus } from './types.js'

// Payfront refund statuses (API v2) to our refund statuses.
const REFUND_STATUS_MAP: Record<PayfrontRefundStatus, RefundStatus> = {
  pending: 'pending',
  processing: 'pending',
  'needs-attention': 'pending',
  processed: 'succeeded',
  reversed: 'succeeded',
  failed: 'failed',
}

export function mapRefundStatus(status: string): RefundStatus {
  return REFUND_STATUS_MAP[status as PayfrontRefundStatus] ?? 'pending'
}

export function describeProviderStatus(status: string | null | undefined): string {
  switch (status) {
    case 'needs-attention':
      return 'Payfront needs more information from the bank'
    case 'processing':
      return 'Payfront is sending the money'
    case 'reversed':
      return 'The bank returned the money to Payfront'
    default:
      return status ?? ''
  }
}
