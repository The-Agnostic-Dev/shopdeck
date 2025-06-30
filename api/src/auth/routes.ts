import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'
import { config } from '../config.js'
import { db } from '../db/client.js'
import { staffUsers } from '../db/schema/index.js'
import { AppError } from '../lib/http-errors.js'
import { readJson } from '../lib/validation.js'
import { requireAuth, type AppEnv } from './middleware.js'
import { verifyPassword } from './passwords.js'
import { ROLE_LABELS, ROLE_PERMISSIONS } from './permissions.js'
import { createSession, destroySession } from './sessions.js'

const loginSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(1),
})

export const authRoutes = new Hono<AppEnv>()

function publicUser(user: typeof staffUsers.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    permissions: ROLE_PERMISSIONS[user.role],
  }
}

authRoutes.post('/login', async (c) => {
  const { email, password } = await readJson(c, loginSchema)
  const [user] = await db
    .select()
    .from(staffUsers)
    .where(eq(sql`lower(${staffUsers.email})`, email.toLowerCase()))
    .limit(1)
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, 'invalid_credentials', 'Email or password is not correct')
  }
  const session = await createSession(user.id, c.req.header('user-agent'))
  await db.update(staffUsers).set({ lastLoginAt: new Date() }).where(eq(staffUsers.id, user.id))
  setCookie(c, config.SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.SESSION_SECURE_COOKIE,
    path: '/',
    expires: session.expiresAt,
  })
  return c.json({ user: publicUser(user) })
})

authRoutes.post('/logout', async (c) => {
  await destroySession(getCookie(c, config.SESSION_COOKIE))
  deleteCookie(c, config.SESSION_COOKIE, { path: '/' })
  return c.json({ ok: true })
})

authRoutes.get('/me', requireAuth, (c) => c.json({ user: publicUser(c.get('user')) }))
