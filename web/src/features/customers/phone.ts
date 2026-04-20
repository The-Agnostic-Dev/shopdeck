/** "08031234567" -> "0803 123 4567" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  return phone
}
