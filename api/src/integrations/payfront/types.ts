// Shapes of the Payfront API we use. Amounts are in kobo, like the rest of Shopdeck.

export type PayfrontRefundStatus = 'pending' | 'processing' | 'needs-attention' | 'processed' | 'failed' | 'reversed'

export interface PayfrontRefund {
  id: number
  integration: number
  domain: 'test' | 'live'
  transaction: { id: number; reference: string; amount: number }
  amount: number
  currency: 'NGN'
  status: PayfrontRefundStatus
  refunded_by: string
  merchant_note: string | null
  customer_note: string | null
  failure_reason?: string | null
  refunded_at: string | null
  createdAt: string
  updatedAt: string
}

export interface PayfrontEnvelope<T> {
  status: boolean
  message: string
  data: T
}

export type PayfrontEventName =
  'refund.pending' | 'refund.processing' | 'refund.processed' | 'refund.failed' | 'refund.reversed' | 'charge.success'

export interface PayfrontWebhook {
  event: PayfrontEventName
  id: string
  data: PayfrontRefund
}
