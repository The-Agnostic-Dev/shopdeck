import { Hono } from 'hono'
import { config } from '../../../config.js'
import { logger } from '../../../lib/logger.js'
import { signPayload } from '../signature.js'
import type { PayfrontEventName, PayfrontRefund, PayfrontRefundStatus } from '../types.js'
import { findCharge, REVERSAL_TEST_CARD_LAST4 } from './ledger.js'

// Sandbox Payfront. Behaves like the hosted sandbox for the calls Shopdeck
// makes: refunds are queued, then move through processing to processed, and
// each change is announced with a signed webhook a moment later.

const log = logger.child({ component: 'payfront-sandbox' })
const refunds = new Map<number, PayfrontRefund>()
const refundedByCharge = new Map<string, number>()
let nextId = 9_100_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function deliver(event: PayfrontEventName, refund: PayfrontRefund) {
  const body = JSON.stringify({ event, id: `evt_${refund.id}_${refund.status}`, data: refund })
  try {
    const res = await fetch(config.PAYFRONT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-payfront-signature': signPayload(body) },
      body,
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) log.warn('webhook not accepted', { event, status: res.status })
  } catch (err) {
    log.warn('webhook delivery failed', { event, err: String(err) })
  }
}

function advance(refund: PayfrontRefund, status: PayfrontRefundStatus, extra: Partial<PayfrontRefund> = {}) {
  Object.assign(refund, { status, updatedAt: new Date().toISOString() }, extra)
}

function schedule(refund: PayfrontRefund, last4: string | null) {
  const step = config.FAKE_PAYFRONT_WEBHOOK_DELAY_MS
  setTimeout(async () => {
    advance(refund, 'processing')
    await deliver('refund.processing', refund)
  }, step)
  setTimeout(async () => {
    advance(refund, 'processed', { refunded_at: new Date().toISOString() })
    await deliver('refund.processed', refund)
  }, step * 2)
  if (last4 === REVERSAL_TEST_CARD_LAST4) {
    setTimeout(async () => {
      advance(refund, 'reversed', { failure_reason: 'Beneficiary bank returned the funds' })
      const ref = refund.transaction.reference
      refundedByCharge.set(ref, (refundedByCharge.get(ref) ?? 0) - refund.amount)
      await deliver('refund.reversed', refund)
    }, step * 3)
  }
}

export const payfrontFake = new Hono()

payfrontFake.use('*', async (c, next) => {
  if (c.req.header('authorization') !== `Bearer ${config.PAYFRONT_SECRET_KEY}`) {
    return c.json({ status: false, message: 'Invalid key' }, 401)
  }
  await next()
})

payfrontFake.post('/refund', async (c) => {
  await sleep(config.FAKE_PAYFRONT_LATENCY_MS)
  const body = (await c.req.json()) as { transaction?: string; amount?: number; merchant_note?: string; customer_note?: string }
  const charge = body.transaction ? await findCharge(body.transaction) : null
  if (!charge) return c.json({ status: false, message: 'Transaction not found' }, 404)
  const already = refundedByCharge.get(charge.reference) ?? 0
  const amount = body.amount ?? charge.amount - already
  if (!Number.isInteger(amount) || amount <= 0) {
    return c.json({ status: false, message: 'Refund amount must be a positive number of kobo' }, 400)
  }
  if (amount + already > charge.amount) {
    return c.json({ status: false, message: 'Refund amount cannot be more than the unrefunded transaction amount' }, 400)
  }
  refundedByCharge.set(charge.reference, already + amount)
  const now = new Date().toISOString()
  const refund: PayfrontRefund = {
    id: nextId++,
    integration: 412_907,
    domain: 'test',
    transaction: { id: charge.id, reference: charge.reference, amount: charge.amount },
    amount,
    currency: 'NGN',
    status: 'pending',
    refunded_by: 'finance@ojafresh.ng',
    merchant_note: body.merchant_note ?? null,
    customer_note: body.customer_note ?? null,
    refunded_at: null,
    createdAt: now,
    updatedAt: now,
  }
  refunds.set(refund.id, refund)
  schedule(refund, charge.last4)
  return c.json({ status: true, message: 'Refund has been queued for processing', data: refund })
})

payfrontFake.get('/refund/:id', (c) => {
  const refund = refunds.get(Number(c.req.param('id')))
  if (!refund) return c.json({ status: false, message: 'Refund not found' }, 404)
  return c.json({ status: true, message: 'Refund retrieved', data: refund })
})

payfrontFake.get('/refund', (c) => {
  const reference = c.req.query('transaction')
  const data = [...refunds.values()].filter((r) => !reference || r.transaction.reference === reference)
  return c.json({ status: true, message: 'Refunds retrieved', data })
})
