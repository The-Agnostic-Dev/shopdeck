import { createHash } from 'node:crypto'
import { and, eq, gt, lt } from 'drizzle-orm'
import { config } from '../config.js'
import { db } from '../db/client.js'
import { sessions, staffUsers, type StaffUser } from '../db/schema/index.js'
import { token } from '../lib/ids.js'

const hash = (raw: string) => createHash('sha256').update(raw).digest('hex')

export async function createSession(userId: number, userAgent?: string) {
  const raw = token()
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 3_600_000)
  await db.insert(sessions).values({ id: hash(raw), userId, userAgent, expiresAt })
  return { token: raw, expiresAt }
}

export async function findSessionUser(raw: string | undefined): Promise<StaffUser | null> {
  if (!raw) return null
  const [row] = await db
    .select({ user: staffUsers })
    .from(sessions)
    .innerJoin(staffUsers, eq(staffUsers.id, sessions.userId))
    .where(and(eq(sessions.id, hash(raw)), gt(sessions.expiresAt, new Date()), eq(staffUsers.active, true)))
    .limit(1)
  return row?.user ?? null
}

export async function destroySession(raw: string | undefined) {
  if (!raw) return
  await db.delete(sessions).where(eq(sessions.id, hash(raw)))
}

export async function purgeExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}
