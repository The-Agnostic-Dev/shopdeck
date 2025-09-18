import { eq } from 'drizzle-orm'
import { db } from '../../../db/client.js'
import { orders } from '../../../db/schema/index.js'

// The sandbox needs to know about charges to refund them. Charges happen in
// the storefront, which writes the same reference onto the order, so the fake
// reads them from the local orders table.

export interface SandboxCharge {
  id: number
  reference: string
  amount: number
  last4: string | null
}

export async function findCharge(reference: string): Promise<SandboxCharge | null> {
  const [row] = await db
    .select({ id: orders.id, amount: orders.totalKobo, last4: orders.cardLast4 })
    .from(orders)
    .where(eq(orders.paymentReference, reference))
    .limit(1)
  return row ? { id: 4_000_000 + row.id, reference, amount: row.amount, last4: row.last4 } : null
}
