import type { Context, MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { config } from '../config.js'
import type { StaffUser } from '../db/schema/index.js'
import { AppError, forbidden } from '../lib/http-errors.js'
import { can, type Permission } from './permissions.js'
import { findSessionUser } from './sessions.js'

export type AppEnv = {
  Variables: {
    user: StaffUser
    requestId: string
  }
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await findSessionUser(getCookie(c, config.SESSION_COOKIE))
  if (!user) throw new AppError(401, 'unauthenticated', 'Please sign in')
  c.set('user', user)
  await next()
}

export function requirePermission(permission: Permission): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user')
    if (!user || !can(user.role, permission)) throw forbidden()
    await next()
  }
}

export function currentUser(c: Context<AppEnv>): StaffUser {
  return c.get('user')
}
