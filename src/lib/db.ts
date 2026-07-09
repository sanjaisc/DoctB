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
 *
 * We probe several candidate locations for the bundled DB because Vercel's
 * serverless function working directory is not guaranteed to be the project
 * root, and we never let Prisma silently create an EMPTY database (which would
 * make every page render with zero rows).
 */
function findBundledDb(): string | null {
  const candidates = [
    path.join(process.cwd(), 'prisma', 'db', 'custom.db'),
    path.join('/var/task', 'prisma', 'db', 'custom.db'),
    path.join(__dirname, '..', '..', '..', 'prisma', 'db', 'custom.db'),
    path.join(__dirname, '..', '..', '..', '..', 'prisma', 'db', 'custom.db'),
  ]

  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate)
      // Reject clearly-empty files (< 10KB suggests an unseeded/partial DB)
      if (stat.isFile() && stat.size > 10 * 1024) {
        return candidate
      }
    } catch {
      // File not at this candidate location — try the next one.
    }
  }
  return null
}

function resolveDatabaseUrl(): string {
  if (process.env.NODE_ENV !== 'production') {
    return process.env.DATABASE_URL ?? 'file:./db/custom.db'
  }

  const writable = path.join('/tmp', 'custom.db')

  // Only copy once; reuse the existing /tmp copy on warm invocations.
  if (!fs.existsSync(writable)) {
    const bundled = findBundledDb()
    if (!bundled) {
      throw new Error(
        '[DB] Bundled prisma/db/custom.db not found in any expected location. ' +
          'Ensure the DB file is deployed and NODE_ENV=production.'
      )
    }
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
