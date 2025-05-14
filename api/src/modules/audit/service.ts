import { and, desc, eq, inArray } from 'drizzle-orm'
import { db, type DbOrTx } from '../../db/client.js'
import { auditLog, staffUsers } from '../../db/schema/index.js'

export type AuditEntity = 'order' | 'product' | 'customer' | 'discount' | 'refund' | 'staff' | 'slot'

export async function record(
  tx: DbOrTx,
  entry: { actorId: number | null; entity: AuditEntity; entityId: number; action: string; details?: Record<string, unknown> },
) {
  await tx.insert(auditLog).values({ ...entry, details: entry.details ?? {} })
}

export async function recordMany(
  tx: DbOrTx,
  entries: { actorId: number | null; entity: AuditEntity; entityId: number; action: string; details?: Record<string, unknown> }[],
) {
  if (!entries.length) return
  await tx.insert(auditLog).values(entries.map((e) => ({ ...e, details: e.details ?? {} })))
}

export async function historyFor(entity: AuditEntity, entityId: number | number[], limit = 50) {
  const ids = Array.isArray(entityId) ? entityId : [entityId]
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
      actorName: staffUsers.name,
    })
    .from(auditLog)
    .leftJoin(staffUsers, eq(staffUsers.id, auditLog.actorId))
    .where(and(eq(auditLog.entity, entity), inArray(auditLog.entityId, ids)))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit)
}
