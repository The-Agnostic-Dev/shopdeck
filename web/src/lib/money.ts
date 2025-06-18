// Amounts from the API are integer kobo. Format at the last moment.

const formatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 1250000 -> "₦12,500.00" */
export function formatMoney(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined) return '·'
  return formatter.format(kobo / 100)
}

/** "12,500.50" -> 1250050; null when it is not an amount. */
export function parseMoneyInput(value: string): number | null {
  const cleaned = value.replace(/[₦,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'))
}

export function koboToInput(kobo: number): string {
  return (kobo / 100).toFixed(2)
}
