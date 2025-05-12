// All amounts are integer kobo (1 naira = 100 kobo). Convert at the edges only.

export const KOBO_PER_NAIRA = 100

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 1250000 -> "₦12,500.00" */
export function formatKobo(kobo: number): string {
  return nairaFormatter.format(kobo / KOBO_PER_NAIRA)
}

/** 1250000 -> "12500.00" (CSV friendly, no symbol, no grouping) */
export function koboToNairaString(kobo: number): string {
  const sign = kobo < 0 ? '-' : ''
  const abs = Math.abs(kobo)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** "12,500.50" or "₦12500" -> 1250050. Returns null when it is not a money value. */
export function parseNairaToKobo(input: string | number): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null
  const cleaned = input.replace(/[₦,\s]/g, '').replace(/^NGN/i, '')
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.replace('-', '').split('.')
  const kobo = Number(whole) * 100 + Number(frac || 0)
  return cleaned.startsWith('-') ? -kobo : kobo
}

/** Percentage of an amount in kobo, rounded half up to the nearest kobo. */
export function percentOf(kobo: number, percent: number): number {
  return Math.round((kobo * percent) / 100)
}

export function sumKobo(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}
