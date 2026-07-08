import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Resolve the SQLite file path.
 *
 * In dev, Prisma resolves `file:./db/custom.db` relative to the schema file
 * (`prisma/schema.prisma`), landing on `prisma/db/custom.db` — which is correct.
 *
 * In production (Vercel serverless) the bundled client resolves the relative
 * URL against the compiled schema inside `.next/server/...`, so the file is never
 * found ("Unable to open the database file"). Vercel's code layer is also
 * read-only, so we copy the bundled DB into `/tmp` (writable) and use that.
 */
function resolveDatabaseUrl(): string {
  if (process.env.NODE_ENV !== 'production') {
    return process.env.DATABASE_URL ?? 'file:./db/custom.db'
  }

  const bundled = path.join(process.cwd(), 'prisma', 'db', 'custom.db')
  const writable = path.join('/tmp', 'custom.db')

  if (fs.existsSync(bundled) && !fs.existsSync(writable)) {
    fs.mkdirSync(path.dirname(writable), { recursive: true })
    fs.copyFileSync(bundled, writable)
  }

  return `file:${writable}`
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
