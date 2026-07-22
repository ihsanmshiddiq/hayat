import { createClient } from '@libsql/client'

const url = process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error('DATABASE_URL and TURSO_AUTH_TOKEN are required')
  process.exit(1)
}

const client = createClient({ url, authToken })

const schema = `
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "image" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'credentials',
  "theme" TEXT NOT NULL DEFAULT 'system',
  "enableMenstrual" BOOLEAN NOT NULL DEFAULT false,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Habit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "schedule" TEXT NOT NULL DEFAULT 'daily',
  "targetCount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Habit_userId_idx" ON "Habit"("userId");

CREATE TABLE IF NOT EXISTS "HabitLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "habitId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");
CREATE INDEX IF NOT EXISTS "HabitLog_habitId_date_idx" ON "HabitLog"("habitId", "date");

CREATE TABLE IF NOT EXISTS "SholatLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "subuh" BOOLEAN NOT NULL DEFAULT false,
  "dzuhur" BOOLEAN NOT NULL DEFAULT false,
  "ashar" BOOLEAN NOT NULL DEFAULT false,
  "maghrib" BOOLEAN NOT NULL DEFAULT false,
  "isya" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "SholatLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SholatLog_userId_date_key" ON "SholatLog"("userId", "date");
CREATE INDEX IF NOT EXISTS "SholatLog_userId_date_idx" ON "SholatLog"("userId", "date");

CREATE TABLE IF NOT EXISTS "HifdzItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "surah" TEXT NOT NULL,
  "surahNumber" INTEGER NOT NULL,
  "fromAyah" INTEGER NOT NULL,
  "toAyah" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'learning',
  "lastReviewed" DATETIME,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "HifdzItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "HifdzItem_userId_idx" ON "HifdzItem"("userId");

CREATE TABLE IF NOT EXISTS "Target" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'personal',
  "deadline" DATETIME,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Target_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Target_userId_idx" ON "Target"("userId");

CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "targetId" TEXT,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "dueDate" DATETIME,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Task_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Task_userId_idx" ON "Task"("userId");
CREATE INDEX IF NOT EXISTS "Task_targetId_idx" ON "Task"("targetId");

CREATE TABLE IF NOT EXISTS "Budget" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "limit" REAL NOT NULL,
  "spent" REAL NOT NULL DEFAULT 0,
  CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Budget_userId_month_category_key" ON "Budget"("userId", "month", "category");
CREATE INDEX IF NOT EXISTS "Budget_userId_month_idx" ON "Budget"("userId", "month");

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT,
  "note" TEXT,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "budgetId" TEXT,
  CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

CREATE TABLE IF NOT EXISTS "SavingsGoal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "target" REAL NOT NULL,
  "current" REAL NOT NULL DEFAULT 0,
  "deadline" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavingsGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "SavingsGoal_userId_idx" ON "SavingsGoal"("userId");

CREATE TABLE IF NOT EXISTS "MenstrualLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "endDate" TEXT,
  "cycleLength" INTEGER NOT NULL DEFAULT 28,
  "periodLength" INTEGER NOT NULL DEFAULT 5,
  "symptoms" TEXT,
  CONSTRAINT "MenstrualLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MenstrualLog_userId_startDate_idx" ON "MenstrualLog"("userId", "startDate");
`

async function main() {
  console.log('🚀 Pushing schema to Turso...')
  const statements = schema.split(';').filter(s => s.trim().length > 0)
  
  for (const stmt of statements) {
    try {
      await client.execute(stmt.trim())
    } catch (e: any) {
      // Ignore "already exists" errors
      if (!e.message?.includes('already exists')) {
        console.error('❌ Error:', e.message)
      }
    }
  }
  
  console.log('✅ Schema pushed successfully!')
  
  // Verify tables
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  console.log('📋 Tables:', result.rows.map(r => r.name).join(', '))
  
  client.close()
}

main().catch(console.error)
