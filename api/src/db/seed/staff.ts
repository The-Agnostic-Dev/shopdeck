import { hashPassword } from '../../auth/passwords.js'
import { db } from '../client.js'
import { staffUsers, type StaffUser } from '../schema/index.js'

export const DEMO_PASSWORD = 'shopdeck2026'

const STAFF: { email: string; name: string; role: StaffUser['role']; active?: boolean }[] = [
  { email: 'admin@ojafresh.ng', name: 'Adaeze Obi', role: 'admin' },
  { email: 'ops@ojafresh.ng', name: 'Segun Alabi', role: 'ops_lead' },
  { email: 'picker@ojafresh.ng', name: 'Musa Danjuma', role: 'picker' },
  { email: 'care@ojafresh.ng', name: 'Blessing Etim', role: 'customer_care' },
  { email: 'finance@ojafresh.ng', name: 'Ifeoma Nwankwo', role: 'finance' },
  { email: 'ibrahim.sule@ojafresh.ng', name: 'Ibrahim Sule', role: 'picker' },
  { email: 'grace.okon@ojafresh.ng', name: 'Grace Okon', role: 'picker' },
  { email: 'kemi.adebayo@ojafresh.ng', name: 'Kemi Adebayo', role: 'customer_care' },
  { email: 'emeka.eze@ojafresh.ng', name: 'Emeka Eze', role: 'ops_lead', active: false },
]

export async function seedStaff() {
  // One hash for everyone keeps seeding fast; scrypt is slow on purpose.
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const rows = await db
    .insert(staffUsers)
    .values(STAFF.map((s) => ({ ...s, active: s.active ?? true, passwordHash })))
    .returning()
  const byEmail = (email: string) => rows.find((r) => r.email === email)!
  return {
    all: rows,
    admin: byEmail('admin@ojafresh.ng'),
    finance: byEmail('finance@ojafresh.ng'),
    pickers: rows.filter((r) => r.role === 'picker' && r.active),
  }
}
