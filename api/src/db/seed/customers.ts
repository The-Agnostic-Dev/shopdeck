import { db } from '../client.js'
import { customers, type Customer } from '../schema/index.js'
import { AREAS, EMAIL_DOMAINS, FIRST_NAMES, LAST_NAMES, MOBILE_PREFIXES } from './data/people.js'
import type { Rng } from './random.js'

const TOTAL = 400
const LEGACY = 150

export async function seedCustomers(rng: Rng, now: Date): Promise<Customer[]> {
  // Accounts brought over from the old store were imported in one run, so
  // they all share the import timestamp.
  const importedAt = new Date(now.getTime() - 480 * 86_400_000)
  importedAt.setUTCHours(8, 0, 0, 0)
  const usedEmails = new Set<string>()
  const rows: (typeof customers.$inferInsert)[] = []

  for (let i = 0; i < TOTAL; i++) {
    const first = rng.pick(FIRST_NAMES)
    const last = rng.pick(LAST_NAMES)
    let email = `${first}.${last}`.toLowerCase() + `@${rng.pick(EMAIL_DOMAINS)}`
    if (usedEmails.has(email)) email = `${first.toLowerCase()}${last.toLowerCase()}${rng.int(1, 99)}@${rng.pick(EMAIL_DOMAINS)}`
    usedEmails.add(email)
    const area = rng.weighted(AREAS)
    const legacy = i < LEGACY
    const createdAt = legacy ? importedAt : new Date(importedAt.getTime() + rng.int(1, 478 * 24 * 60) * 60_000 + rng.int(0, 59_999))
    rows.push({
      name: `${first} ${last}`,
      email,
      phone: `${rng.pick(MOBILE_PREFIXES)}${String(rng.int(0, 9_999_999)).padStart(7, '0')}`,
      area: area.name,
      address: `${rng.int(1, 120)} ${rng.pick(area.streets)}, ${area.name}, Lagos`,
      marketingOptIn: rng.chance(0.55),
      source: legacy ? 'legacy_import' : rng.chance(0.6) ? 'app' : 'web',
      createdAt,
      notes: rng.chance(0.06)
        ? rng.pick(['Prefers morning slots', 'Allergic to groundnuts', 'Usually pays by transfer', 'VIP, handle with care'])
        : null,
    })
  }
  return db.insert(customers).values(rows).returning()
}
