import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Local development: use file-based SQLite
  // Production (Vercel): use Turso
  const isLocal = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')

  if (isLocal) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    })
  }

  // Turso (production)
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for Turso production')
  const libsql = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  const adapter = new PrismaLibSql(libsql)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
