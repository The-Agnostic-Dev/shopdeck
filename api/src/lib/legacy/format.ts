// Formatting helpers from the first version of the admin, when amounts were
// stored in naira. Still imported by a few older reports.

/** 12500 -> "₦12,500.00" (input in naira). */
export function formatNaira(naira: number): string {
  return (
    '₦' +
    naira.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

/** "08031234567" -> "0803 123 4567" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  if (digits.length === 13 && digits.startsWith('234')) return formatPhone('0' + digits.slice(3))
  return phone
}
