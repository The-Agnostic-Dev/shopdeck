import { config } from '../config.js'

const TZ = config.BUSINESS_TZ

// Lagos does not observe daylight saving, so the offset is fixed at +01:00.
// Kept as a constant because Intl offset lookups are not available on every
// slim base image we have deployed to.
export const LAGOS_OFFSET_MINUTES = 60

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "2026-11-03" for an instant, as a calendar day in Lagos. */
export function lagosDay(at: Date = new Date()): string {
  return dayFormatter.format(at)
}

/** The instant a Lagos calendar day starts ("2026-11-03" -> 2026-11-02T23:00:00Z). */
export function startOfLagosDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) - LAGOS_OFFSET_MINUTES * 60_000)
}

/** Half-open range [start, end) covering one Lagos calendar day. */
export function lagosDayRange(day: string): { start: Date; end: Date } {
  const start = startOfLagosDay(day)
  return { start, end: new Date(start.getTime() + 86_400_000) }
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}

export function isIsoDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Lagos wall-clock time for an instant: "14:05". */
export function lagosTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(at)
}

export function minutesAgo(n: number, from = new Date()): Date {
  return new Date(from.getTime() - n * 60_000)
}
