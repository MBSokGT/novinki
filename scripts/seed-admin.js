/**
 * Provisioning first admin account in Docker.
 * Usage: node scripts/seed-admin.js <email> <password>
 */
const crypto = require('crypto')
const path = require('path')
const Database = require('better-sqlite3')

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Usage: node scripts/seed-admin.js <email> <password>')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Пароль должен быть не короче 8 символов')
  process.exit(1)
}

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'novinki.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function createId() {
  return crypto.randomBytes(16).toString('hex')
}

const normalizedEmail = email.trim().toLowerCase()
const existing = db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').get(normalizedEmail)

if (existing) {
  console.error(`Пользователь ${normalizedEmail} уже существует`)
  process.exit(1)
}

const userId = createId()
const now = new Date().toISOString()

db.prepare('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
  userId, normalizedEmail, hashPassword(password), now, now
)
db.prepare(
  'INSERT INTO user_profiles (id, email, is_admin, is_blocked, blocked_reason, blocked_at, created_at, updated_at) VALUES (?, ?, 1, 0, NULL, NULL, ?, ?)'
).run(userId, normalizedEmail, now, now)

console.log(`Готово: создан администратор ${normalizedEmail}`)
