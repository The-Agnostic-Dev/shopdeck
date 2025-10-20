import { formatKobo } from '../../lib/money.js'
import type { EmailMessage } from './client.js'

const signoff = '\n\nỌjà Fresh'

export function orderCancelledEmail(input: { to: string; name: string; orderNumber: string; reason?: string | null }): EmailMessage {
  return {
    to: input.to,
    category: 'order-cancelled',
    subject: `Your order ${input.orderNumber} has been cancelled`,
    text:
      `Hi ${input.name},\n\nYour order ${input.orderNumber} has been cancelled` +
      (input.reason ? ` (${input.reason})` : '') +
      `. If you paid online, any money due to you will be refunded to your original payment method.` +
      signoff,
  }
}

export function refundProcessedEmail(input: { to: string; name: string; orderNumber: string; amountKobo: number }): EmailMessage {
  return {
    to: input.to,
    category: 'refund',
    subject: `Refund of ${formatKobo(input.amountKobo)} for order ${input.orderNumber}`,
    text:
      `Hi ${input.name},\n\nWe have refunded ${formatKobo(input.amountKobo)} for order ${input.orderNumber}. ` +
      `Depending on your bank it can take 3 to 10 working days to show on your statement.` +
      signoff,
  }
}

export function lowStockEmail(input: {
  to: string
  products: { sku: string; name: string; stock: number; threshold: number }[]
}): EmailMessage {
  const lines = input.products.map((p) => `- ${p.name} (${p.sku}): ${p.stock} left, reorder level ${p.threshold}`)
  const first = input.products[0]
  return {
    to: input.to,
    category: 'low-stock',
    subject:
      input.products.length === 1
        ? `Low stock: ${first.name} (${first.sku})`
        : `Low stock: ${input.products.length} products need reordering`,
    text: `These products are at or below their reorder level:\n\n${lines.join('\n')}\n\nShopdeck`,
  }
}

export function exportReadyEmail(input: {
  to: string
  name: string
  exportId: number
  filename: string
  rows: number
  url: string
}): EmailMessage {
  return {
    to: input.to,
    category: 'export',
    subject: `Your export ${input.filename} is ready`,
    text:
      `Hi ${input.name},\n\nExport #${input.exportId} (${input.filename}, ${input.rows} rows) is ready to download:\n${input.url}\n\n` +
      `The link works while you are signed in to Shopdeck.\n\nShopdeck`,
  }
}
