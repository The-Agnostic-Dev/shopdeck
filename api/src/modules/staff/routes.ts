import { asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { currentUser, requirePermission, type AppEnv } from '../../auth/middleware.js'
import { hashPassword } from '../../auth/passwords.js'
import { ROLE_LABELS } from '../../auth/permissions.js'
import { db } from '../../db/client.js'
import { staffUsers } from '../../db/schema/index.js'
import { conflict, notFound, unprocessable } from '../../lib/http-errors.js'
import { idParam, readJson } from '../../lib/validation.js'
import { record } from '../audit/service.js'

const roles = ['admin', 'ops_lead', 'picker', 'customer_care', 'finance'] as const

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(roles),
  password: z.string().min(10, 'At least 10 characters'),
})

const updateSchema = z.object({
  role: z.enum(roles).optional(),
  active: z.boolean().optional(),
  name: z.string().trim().min(2).max(80).optional(),
})

const publicColumns = {
  id: staffUsers.id,
  name: staffUsers.name,
  email: staffUsers.email,
  role: staffUsers.role,
  active: staffUsers.active,
  lastLoginAt: staffUsers.lastLoginAt,
  createdAt: staffUsers.createdAt,
}

export const staffRoutes = new Hono<AppEnv>()

/** Pickers list is open to anyone who can assign orders. */
staffRoutes.get('/pickers', requirePermission('orders:update_status'), async (c) => {
  const items = await db
    .select({ id: staffUsers.id, name: staffUsers.name })
    .from(staffUsers)
    .where(eq(staffUsers.role, 'picker'))
    .orderBy(asc(staffUsers.name))
  return c.json({ items })
})

staffRoutes.get('/', requirePermission('staff:manage'), async (c) => {
  const items = await db.select(publicColumns).from(staffUsers).orderBy(asc(staffUsers.name))
  return c.json({ items: items.map((u) => ({ ...u, roleLabel: ROLE_LABELS[u.role] })) })
})

staffRoutes.post('/', requirePermission('staff:manage'), async (c) => {
  const input = await readJson(c, createSchema)
  const [clash] = await db.select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.email, input.email))
  if (clash) throw conflict(`${input.email} already has an account`)
  const [user] = await db
    .insert(staffUsers)
    .values({ name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) })
    .returning(publicColumns)
  await record(db, {
    actorId: currentUser(c).id,
    entity: 'staff',
    entityId: user.id,
    action: 'staff.created',
    details: { role: user.role },
  })
  return c.json({ user }, 201)
})

staffRoutes.patch('/:id', requirePermission('staff:manage'), async (c) => {
  const id = idParam(c)
  const input = await readJson(c, updateSchema)
  const me = currentUser(c)
  if (id === me.id && (input.active === false || (input.role && input.role !== 'admin'))) {
    throw unprocessable('You cannot remove your own admin access')
  }
  const [user] = await db.update(staffUsers).set(input).where(eq(staffUsers.id, id)).returning(publicColumns)
  if (!user) throw notFound('Staff member')
  await record(db, { actorId: me.id, entity: 'staff', entityId: id, action: 'staff.updated', details: input })
  return c.json({ user })
})
