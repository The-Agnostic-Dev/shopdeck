const TZ = 'Africa/Lagos'

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Calendar day in Lagos, "2026-11-03". */
export function lagosToday(at: Date = new Date()): string {
  return dayFmt.format(at)
}

export function shiftDay(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '·'
  return new Intl.DateTimeFormat('en-NG', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '·'
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+01:00`) : new Date(value)
  return new Intl.DateTimeFormat('en-NG', { timeZone: TZ, dateStyle: 'medium' }).format(date)
}

export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function weekdayShort(day: string): string {
  return new Intl.DateTimeFormat('en-NG', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(`${day}T12:00:00+01:00`),
  )
}

export function relativeTime(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return formatDate(value)
}
