import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db/client.js'
import { orders, refunds, type Order, type PaymentStatus, type StaffUser } from '../../db/schema/index.js'
import { createRefund as payfrontRefund } from '../../integrations/payfront/client.js'
import { mapRefundStatus } from '../../integrations/payfront/status.js'
import type { PayfrontRefund } from '../../integrations/payfront/types.js'
import { AppError, conflict, notFound, unprocessable } from '../../lib/http-errors.js'
import { UpstreamError } from '../../lib/http-client.js'
import { logger } from '../../lib/logger.js'
import { formatKobo } from '../../lib/money.js'
import { record } from '../audit/service.js'
import { notifyRefundProcessed } from '../notifications/service.js'

const log = logger.child({ component: 'refunds' })

export const REFUND_REASONS = ['damaged', 'missing_item', 'substitution', 'late_delivery', 'cancelled', 'goodwill', 'other'] as const

export const refundInputSchema = z.object({
  amountKobo: z.number().int().positive(),
  reason: z.enum(REFUND_REASONS),
  note: z.string().trim().max(500).optional(),
})

export type RefundInput = z.infer<typeof refundInputSchema>

export function paymentStatusFor(totalKobo: number, refundedKobo: number): PaymentStatus {
  if (refundedKobo <= 0) return 'paid'
  return refundedKobo >= totalKobo ? 'refunded' : 'partially_refunded'
}

function refundableOf(order: Order) {
  return Math.max(0, order.totalKobo - order.refundedKobo)
}

/**
 * Starts a refund with Payfront and records it. The amount is reserved on the
 * order straight away; it is given back if Payfront later reports a failure.
 */
export async function createRefund(orderId: number, input: RefundInput, actor: StaffUser) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId))
  if (!order) throw notFound('Order')
  if (order.paymentStatus === 'refunded') throw conflict(`Order ${order.number} has already been refunded in full`)
  const refundable = refundableOf(order)
  if (input.amountKobo > refundable) {
    throw unprocessable(`At most ${formatKobo(refundable)} can be refunded on ${order.number}`, {
      fields: { amountKobo: 'More than the refundable balance' },
    })
  }

  const provider = await payfrontRefund({
    transactionReference: order.paymentReference,
    amountKobo: input.amountKobo,
    merchantNote: `${input.reason}${input.note ? `: ${input.note}` : ''}`,
    customerNote: `Refund for order ${order.number}`,
  })

  return db.transaction(async (tx) => {
    const [refund] = await tx
      .insert(refunds)
      .values({
        orderId,
        amountKobo: input.amountKobo,
        reason: input.reason,
        note: input.note ?? null,
        status: mapRefundStatus(provider.status),
        providerRef: String(provider.id),
        providerStatus: provider.status,
        createdBy: actor.id,
      })
      .returning()
    await tx
      .update(orders)
      .set({
        refundedKobo: sql`${orders.refundedKobo} + ${input.amountKobo}`,
        paymentStatus: paymentStatusFor(order.totalKobo, order.refundedKobo + input.amountKobo),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
    await record(tx, {
      actorId: actor.id,
      entity: 'order',
      entityId: orderId,
      action: 'refund.created',
      details: { refundId: refund.id, amountKobo: input.amountKobo, reason: input.reason },
    })
    return { refund }
  })
}

/** Applies a refund update from Payfront (webhook or the sync job). */
export async function applyProviderUpdate(update: PayfrontRefund) {
  const [refund] = await db
    .select()
    .from(refunds)
    .where(eq(refunds.providerRef, String(update.id)))
    .limit(1)
  if (!refund) {
    log.warn('update for an unknown refund', { providerRef: update.id })
    return
  }
  const next = mapRefundStatus(update.status)

  await db.transaction(async (tx) => {
    await tx.update(refunds).set({ providerStatus: update.status }).where(eq(refunds.id, refund.id))
    // Payfront can deliver events out of order; a settled refund stays settled.
    if (refund.status !== 'pending' || next === 'pending') return

    const [order] = await tx.select().from(orders).where(eq(orders.id, refund.orderId)).for('update')
    if (next === 'succeeded') {
      await tx.update(refunds).set({ status: 'succeeded', processedAt: new Date() }).where(eq(refunds.id, refund.id))
      await notifyRefundProcessed(tx, order, refund.amountKobo)
    } else {
      const refundedKobo = Math.max(0, order.refundedKobo - refund.amountKobo)
      await tx
        .update(refunds)
        .set({ status: 'failed', processedAt: new Date(), failureReason: update.failure_reason ?? 'Refund failed at Payfront' })
        .where(eq(refunds.id, refund.id))
      await tx
        .update(orders)
        .set({ refundedKobo, paymentStatus: paymentStatusFor(order.totalKobo, refundedKobo), updatedAt: new Date() })
        .where(eq(orders.id, order.id))
    }
    await record(tx, {
      actorId: null,
      entity: 'order',
      entityId: order.id,
      action: `refund.${next}`,
      details: { refundId: refund.id, providerStatus: update.status },
    })
  })
}
