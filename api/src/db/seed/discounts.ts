import { db } from '../client.js'
import { discountCodes } from '../schema/index.js'

const DAY = 86_400_000

export async function seedDiscountCodes(now: Date) {
  const t = now.getTime()
  return db
    .insert(discountCodes)
    .values([
      {
        code: 'WELCOME10',
        description: '10% off a first order',
        kind: 'percent',
        value: 10,
        minOrderKobo: 1_000_000,
        maxUses: 1000,
        startsAt: new Date(t - 400 * DAY),
      },
      {
        code: 'OJA2000',
        description: '₦2,000 off orders over ₦15,000',
        kind: 'fixed',
        value: 200_000,
        minOrderKobo: 1_500_000,
        maxUses: 400,
        startsAt: new Date(t - 120 * DAY),
      },
      {
        code: 'FRESHFRIDAY',
        description: '15% off fresh produce Fridays',
        kind: 'percent',
        value: 15,
        minOrderKobo: 800_000,
        maxUses: null,
        startsAt: new Date(t - 200 * DAY),
      },
      {
        code: 'LEKKI1500',
        description: 'Lekki launch, ₦1,500 off',
        kind: 'fixed',
        value: 150_000,
        minOrderKobo: 1_000_000,
        maxUses: 300,
        startsAt: new Date(t - 75 * DAY),
        endsAt: new Date(t + 20 * DAY),
      },
      {
        code: 'BULKBUY5',
        description: '5% off orders over ₦60,000',
        kind: 'percent',
        value: 5,
        minOrderKobo: 6_000_000,
        maxUses: null,
        startsAt: new Date(t - 300 * DAY),
      },
      {
        code: 'EASTER25',
        description: 'Easter promo',
        kind: 'percent',
        value: 25,
        minOrderKobo: 2_000_000,
        maxUses: 150,
        startsAt: new Date(t - 230 * DAY),
        endsAt: new Date(t - 215 * DAY),
      },
      { code: 'STAFF5', description: 'Staff purchases', kind: 'percent', value: 5, minOrderKobo: 0, maxUses: null, active: false },
    ])
    .returning()
}
