/** "08031234567" -> "0803 123 4567" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return phone
}
