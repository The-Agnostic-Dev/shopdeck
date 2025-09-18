// Shapes of the Payfront API we use. Amounts are in kobo, like the rest of Shopdeck.

export type PayfrontRefundStatus = 'pending' | 'processed' | 'failed'

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
  'refund.pending' | 'refund.processed' | 'refund.failed' | 'charge.success'

export interface PayfrontWebhook {
  event: PayfrontEventName
  id: string
  data: PayfrontRefund
}
