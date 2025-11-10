import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { exportsTable, staffUsers, type ExportRow, type StaffUser } from '../../db/schema/index.js'
import { enqueue } from '../../jobs/queue.js'
import { lagosDay } from '../../lib/dates.js'
import { notFound } from '../../lib/http-errors.js'
import { buildCustomersCsv } from './customers-csv.js'
import { buildOrdersCsv } from './orders-csv.js'
import { buildProductsCsv } from './products-csv.js'

export type ExportKind = ExportRow['kind']

const builders: Record<ExportKind, (f: Record<string, string>) => Promise<{ csv: string; rows: number }>> = {
  orders: buildOrdersCsv,
  products: buildProductsCsv,
  customers: buildCustomersCsv,
}

export async function requestExport(kind: ExportKind, filters: Record<string, string>, actor: StaffUser) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(exportsTable).values({ kind, filters, requestedBy: actor.id }).returning()
    await enqueue('export', { exportId: row.id }, { tx })
    return row
  })
}

/** Builds the file. Called by the export job. */
export async function buildExport(exportId: number) {
  const [row] = await db.select().from(exportsTable).where(eq(exportsTable.id, exportId))
  if (!row) throw notFound('Export')
  const { csv, rows } = await builders[row.kind](row.filters)
  const filename = `ojafresh-${row.kind}-${lagosDay()}.csv`
  const [done] = await db
    .update(exportsTable)
    .set({ status: 'ready', content: csv, rowCount: rows, filename, completedAt: new Date() })
    .where(eq(exportsTable.id, exportId))
    .returning()
  return done
}

export async function recentExports(limit = 30) {
  return db
    .select({
      id: exportsTable.id,
      kind: exportsTable.kind,
      filters: exportsTable.filters,
      status: exportsTable.status,
      filename: exportsTable.filename,
      rowCount: exportsTable.rowCount,
      createdAt: exportsTable.createdAt,
      completedAt: exportsTable.completedAt,
      requestedByName: staffUsers.name,
    })
    .from(exportsTable)
    .leftJoin(staffUsers, eq(staffUsers.id, exportsTable.requestedBy))
    .orderBy(desc(exportsTable.createdAt))
    .limit(limit)
}

export async function exportFile(id: number) {
  const [row] = await db.select().from(exportsTable).where(eq(exportsTable.id, id))
  if (!row) throw notFound('Export')
  return row
}
