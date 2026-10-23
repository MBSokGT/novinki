// Запускает собранное приложение на пустой временной базе с несколькими
// товарами и одним администратором — для автотестов (e2e.config.ts).
// Перед запуском нужна сборка: npm run build.
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

const root = process.cwd()
const require = createRequire(path.join(root, 'package.json'))
const Database = require('better-sqlite3')

const PORT = process.env.E2E_PORT || '3100'
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@example.test'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'e2e-local-password'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novinki-e2e-'))
const dbPath = path.join(dir, 'novinki.db')
const uploads = path.join(dir, 'uploads')
fs.mkdirSync(path.join(uploads, 'products'), { recursive: true })

// --- база: миграции так же, как это делает приложение -------------------
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)')
for (const file of fs.readdirSync(path.join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  db.exec(fs.readFileSync(path.join(root, 'migrations', file), 'utf8'))
  db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString())
}
db.close()

const seed = spawnSync('node', ['scripts/seed-admin.js', ADMIN_EMAIL, ADMIN_PASSWORD], { cwd: root, env: { ...process.env, SQLITE_DB_PATH: dbPath }, encoding: 'utf8' })
if (seed.status !== 0) {
  console.error(seed.stdout, seed.stderr)
  process.exit(1)
}

// --- фото: небольшие однотонные PNG --------------------------------------
function png(r, g, b, size = 240) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf) => {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const out = Buffer.alloc(body.length + 8)
    out.writeUInt32BE(data.length, 0)
    body.copy(out, 4)
    out.writeUInt32BE(crc(body), body.length + 4)
    return out
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 2
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat())])
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
const photos = [[190, 70, 70], [70, 120, 190], [80, 170, 110], [210, 170, 60]]
photos.forEach(([r, g, b], i) => fs.writeFileSync(path.join(uploads, 'products', `e2e-${i}.png`), png(r, g, b)))
const photo = (i) => `/api/uploads/products/e2e-${i % photos.length}.png`

// --- товары ---------------------------------------------------------------
const now = Date.now()
const iso = (ms) => new Date(ms).toISOString()
const products = [
  { id: 'e2e-1', name: 'Стрейнер «Пробар Премиум Оникс» (лапа) сталь нерж. ,L=18,4,B=19,8см черный', brand: 'Probar Premium', article: '02030586', category: 'Барный инвентарь', description: 'СЕКРЕТНОЕ_ОПИСАНИЕ_ДЛЯ_СОТРУДНИКОВ нержавеющая сталь, цвет — чёрный.', price: 1249 },
  { id: 'e2e-2', name: 'Совок для льда «Пробар Премиум» сталь нерж. 250мл серебрист.', brand: 'Probar Premium', article: '02110342', category: 'Барный инвентарь', description: 'Совок для льда.', price: 1425 },
  { id: 'e2e-3', name: 'Питчер «Пробар Премиум» сталь нерж. 0,6л серебрист.', brand: 'Probar Premium', article: '03170876', category: 'Барный инвентарь', description: 'Питчер.', price: 1464 },
  {
    id: 'e2e-4', name: 'Сироп «Агава» ODK 1 л', brand: 'ODK', article: '', category: 'Сиропы', description: 'Сироп агавы.',
    variants: [
      { name: 'Агава', image_url: photo(0), article_number: '05045060', website_link: 'https://complexbar.ru/product/e2e-agava/' },
      { name: 'Пандан', image_url: photo(1), article_number: '05045263', website_link: 'https://complexbar.ru/product/e2e-pandan/' },
    ],
  },
  { id: 'e2e-5', name: 'Бокал для вина Pasabahce 450 мл', brand: 'Pasabahce', article: '04010101', category: 'Стекло', description: 'Бокал.' },
  { id: 'e2e-6', name: 'ЧЕРНОВИК_НЕ_ДЛЯ_СОТРУДНИКОВ', brand: 'Draft', article: '09999999', category: 'Стекло', description: 'Скрытая карточка.', archived: 1 },
]
const database = new Database(dbPath)
const insert = database.prepare(
  `INSERT INTO products (id, name, brand, article_number, description, advantages, attention_points, image_url, images, is_archived, category, year, tags, variants,
     availability, availability_label, site_price, site_currency, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, '', '', ?, ?, ?, ?, '2026', '', ?, ?, ?, ?, 'RUB', ?, ?)`
)
products.forEach((p, i) => {
  const created = iso(now - i * 60000)
  insert.run(
    p.id, p.name, p.brand, p.article, p.description, photo(i), JSON.stringify([photo(i)]), p.archived || 0, p.category,
    JSON.stringify(p.variants || []), p.price ? 'in_stock' : null, p.price ? 'В наличии' : null, p.price ?? null, created, created
  )
})
// Вендоры: добавлялись в таком порядке — от старого к новому (на сайте должен быть новый сверху)
const addVendor = database.prepare('INSERT INTO vendors (id, name, product, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
;['Alpha', 'Bravo', 'Charlie'].forEach((name, i) => {
  const at = iso(now - (3 - i) * 3600000)
  addVendor.run(`e2e-v${i}`, `Вендор ${name}`, 'Тестовый вендор', at, at)
})
database.close()

// --- сервер ---------------------------------------------------------------
const server = spawn('node', ['server.js'], {
  cwd: path.join(root, '.next', 'standalone'),
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT,
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
    SQLITE_DB_PATH: dbPath,
    UPLOAD_DIR: uploads,
    NEXT_PUBLIC_STORAGE_DRIVER: 'filesystem',
    NOVINKI_DISABLE_MAINTENANCE: '1',
    APP_VERSION: 'e2e',
  },
})
const stop = () => {
  server.kill()
  fs.rmSync(dir, { recursive: true, force: true })
}
process.on('SIGTERM', () => { stop(); process.exit(0) })
process.on('SIGINT', () => { stop(); process.exit(0) })
server.on('exit', (code) => { fs.rmSync(dir, { recursive: true, force: true }); process.exit(code ?? 0) })
