/*
 * Run manually on the server to provision the first admin account.
 * There is no HTTP endpoint for this — accounts are created either here
 * or via the in-app "Добавить сотрудника" form by an already-logged-in admin.
 *
 * Usage:
 *   SQLITE_DB_PATH=/path/to/novinki.db npx tsx scripts/seed-admin.ts admin@example.com 'password123'
 */
import crypto from 'crypto'
import { getLocalD1 } from '../lib/sqlite'
import { hashPassword } from '../lib/security'

function createId(): string {
  return crypto.randomBytes(16).toString('hex')
}

async function main() {
  const [email, password] = process.argv.slice(2)
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> <password>')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Пароль должен быть не короче 8 символов')
    process.exit(1)
  }

  const db = getLocalD1()
  const normalizedEmail = email.trim().toLowerCase()

  const existing = await db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(normalizedEmail).first<{ id: string }>()
  if (existing?.id) {
    console.error(`Пользователь с email ${normalizedEmail} уже существует`)
    process.exit(1)
  }

  const userId = createId()
  const now = new Date().toISOString()

  await db
    .prepare('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, normalizedEmail, hashPassword(password), now, now)
    .run()

  await db
    .prepare(
      'INSERT INTO user_profiles (id, email, is_admin, is_blocked, blocked_reason, blocked_at, created_at, updated_at) VALUES (?, ?, 1, 0, NULL, NULL, ?, ?)'
    )
    .bind(userId, normalizedEmail, now, now)
    .run()

  console.log(`Готово: создан админ-аккаунт ${normalizedEmail}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
