// Одноразовый бэкфилл: варианты, добавленные до фикса в
// app/api/internal/scrape-complexbar/route.ts, хранят живую внешнюю ссылку
// на CDN complexbar.ru вместо локально скачанной копии — такие ссылки со
// временем протухают (истёкшая подпись и т.п.), и картинка перестаёт
// открываться независимо от того, жив ли сам complexbar.ru.
//
// Это скачивает такие внешние картинки на сервер и переписывает variants
// на локальные /api/uploads/... ссылки. Безопасно запускать повторно —
// уже локальные ссылки (начинаются с /api/uploads или НЕ начинаются с http)
// просто пропускаются.
//
// Заодно заполняет пустые названия вариантов (варианты, добавленные до того,
// как название стало сохраняться) — берёт заголовок со страницы товара на
// complexbar.ru по сохранённой ссылке варианта.
//
// Запуск на сервере: node scripts/backfill-variant-images.js
const path = require('path')
const fs = require('fs/promises')
const crypto = require('crypto')
const Database = require('better-sqlite3')

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'novinki.db')
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

function sanitizeFileName(fileName) {
  const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '')
  return `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`
}

async function saveUploadedFile(bucket, originalFileName, buffer) {
  const dir = path.join(UPLOAD_DIR, bucket)
  await fs.mkdir(dir, { recursive: true })
  const safeName = sanitizeFileName(originalFileName)
  await fs.writeFile(path.join(dir, safeName), buffer)
  return `${BASE_PATH}/api/uploads/${bucket}/${safeName}`
}

async function mirrorImage(url) {
  if (!url || !/^https?:\/\//.test(url)) return { url, changed: false }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { url, changed: false, failed: true }
    const buffer = Buffer.from(await res.arrayBuffer())
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase() || 'jpg'
    const localUrl = await saveUploadedFile('products', `variant.${/^[a-z0-9]{2,4}$/.test(ext) ? ext : 'jpg'}`, buffer)
    return { url: localUrl, changed: true }
  } catch {
    return { url, changed: false, failed: true }
  }
}

function decodeEntities(text) {
  return text
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
}

async function fetchVariantName(link) {
  let url
  try {
    url = new URL(link)
  } catch {
    return ''
  }
  const host = url.hostname.toLowerCase()
  if (url.protocol !== 'https:' || !(host === 'complexbar.ru' || host.endsWith('.complexbar.ru'))) return ''
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) return ''
    const match = (await res.text()).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    return match ? decodeEntities(match[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim() : ''
  } catch {
    return ''
  }
}

async function processTable(db, table) {
  const rows = db.prepare(`SELECT id, variants FROM ${table} WHERE variants IS NOT NULL AND variants != '[]'`).all()
  let touchedRows = 0
  let touchedImages = 0
  let failedImages = 0
  let namedVariants = 0

  for (const row of rows) {
    let variants
    try {
      variants = JSON.parse(row.variants)
    } catch {
      continue
    }
    if (!Array.isArray(variants) || variants.length === 0) continue

    let rowChanged = false
    for (const v of variants) {
      if (!v.name && v.website_link) {
        const name = await fetchVariantName(v.website_link)
        if (name) {
          v.name = name
          rowChanged = true
          namedVariants++
        }
      }
      const { url, changed, failed } = await mirrorImage(v.image_url)
      if (changed) {
        v.image_url = url
        rowChanged = true
        touchedImages++
      } else if (failed) {
        failedImages++
      }
    }

    if (rowChanged) {
      db.prepare(`UPDATE ${table} SET variants = ? WHERE id = ?`).run(JSON.stringify(variants), row.id)
      touchedRows++
    }
  }

  return { touchedRows, touchedImages, failedImages, namedVariants, totalRows: rows.length }
}

async function main() {
  const db = new Database(DB_PATH)
  for (const table of ['products', 'deleted_products', 'archived_products']) {
    const stats = await processTable(db, table)
    console.log(
      `==> ${table}: ${stats.totalRows} строк с вариантами, обновлено строк: ${stats.touchedRows}, ` +
      `скачано картинок: ${stats.touchedImages}, не удалось скачать: ${stats.failedImages}, ` +
      `заполнено названий вариантов: ${stats.namedVariants}`
    )
  }
  db.close()
  console.log('==> Готово.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
