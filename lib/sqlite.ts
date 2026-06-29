import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'novinki.db')
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations')

let db: Database.Database | null = null

function applyMigrations(instance: Database.Database) {
  instance.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)')
  if (!fs.existsSync(MIGRATIONS_DIR)) return
  const applied = new Set(
    instance.prepare('SELECT name FROM _migrations').all().map((row) => (row as { name: string }).name)
  )
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
    instance.exec(sql)
    instance.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString())
  }
}

function getRawDb(): Database.Database {
  if (db) return db
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  applyMigrations(db)
  return db
}

class LocalStatement {
  constructor(private rawDb: Database.Database, private sql: string, private params: unknown[] = []) {}

  bind(...params: unknown[]): LocalStatement {
    return new LocalStatement(this.rawDb, this.sql, params)
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const stmt = this.rawDb.prepare(this.sql)
    const results = stmt.all(...this.params) as T[]
    return { results }
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const stmt = this.rawDb.prepare(this.sql)
    const row = stmt.get(...this.params) as T | undefined
    return row ?? null
  }

  async run(): Promise<{ success: true }> {
    const stmt = this.rawDb.prepare(this.sql)
    stmt.run(...this.params)
    return { success: true }
  }
}

export type LocalD1Database = {
  prepare(sql: string): LocalStatement
}

export function getLocalD1(): LocalD1Database {
  const rawDb = getRawDb()
  return {
    prepare(sql: string) {
      return new LocalStatement(rawDb, sql)
    },
  }
}
