import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../db/client.js'
import { customers, type Order } from '../../db/schema/index.js'
import { orderCancelledEmail, refundProcessedEmail } from '../../integrations/mail/templates.js'
import { enqueue } from '../../jobs/queue.js'

// Customer notifications are queued, never sent inline, so a slow provider
// cannot hold an order transaction open.

async function customerFor(tx: DbOrTx, customerId: number) {
  const [c] = await tx.select().from(customers).where(eq(customers.id, customerId)).limit(1)
  return c ?? null
}

export async function notifyOrderCancelled(tx: DbOrTx, order: Order) {
  const customer = await customerFor(tx, order.customerId)
  if (!customer) return
  await enqueue(
    'send-email',
    {
      ...orderCancelledEmail({
        to: customer.email,
        name: customer.name.split(' ')[0],
        orderNumber: order.number,
        reason: order.cancelReason,
      }),
    },
    { tx },
  )
}

export async function notifyRefundProcessed(tx: DbOrTx, order: Order, amountKobo: number) {
  const customer = await customerFor(tx, order.customerId)
  if (!customer) return
  await enqueue(
    'send-email',
    { ...refundProcessedEmail({ to: customer.email, name: customer.name.split(' ')[0], orderNumber: order.number, amountKobo }) },
    { tx },
  )
}
