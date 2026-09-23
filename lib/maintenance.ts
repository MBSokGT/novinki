import fs from 'fs/promises'
import path from 'path'
import { getLocalD1 } from './sqlite'
import { checkAllLinks } from './linkCheck'

const TRASH_RETENTION_MS = 1000 * 60 * 60 * 24 * 14
// Файл, на который пока никто не ссылается, может быть только что загружен
// в ещё не сохранённую форму (или лежать в черновике формы в браузере) —
// поэтому удаляем только достаточно старые "сироты".
const ORPHAN_GRACE_MS = 1000 * 60 * 60 * 24 * 7
const MAINTENANCE_INTERVAL_MS = 1000 * 60 * 60 * 24
const UPLOAD_BUCKETS = ['products', 'flyers', 'vendors']

export interface UploadFile {
  bucket: string
  name: string
  mtimeMs: number
}

export function findOrphanFiles(files: UploadFile[], referenceBlob: string, now: number, graceMs = ORPHAN_GRACE_MS): UploadFile[] {
  return files.filter((file) => now - file.mtimeMs > graceMs && !referenceBlob.includes(file.name))
}

export async function purgeOldTrash(now = Date.now()) {
  const db = getLocalD1()
  const threshold = new Date(now - TRASH_RETENTION_MS).toISOString()
  await db.prepare('DELETE FROM deleted_products WHERE deleted_at <= ?').bind(threshold).run()
  await db.prepare('DELETE FROM deleted_vendors WHERE deleted_at <= ?').bind(threshold).run()
}

// Ссылки на загруженные файлы разбросаны по многим колонкам (фото, галерея,
// листовка, прайс, варианты, файлы вендоров, корзина...) — надёжнее просто
// собрать содержимое всех таблиц в одну строку и искать имя файла в ней,
// чем поддерживать список колонок и забыть новую.
async function collectReferenceBlob(): Promise<string> {
  const db = getLocalD1()
  const { results: tables } = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('sessions', 'password_reset_tokens', '_migrations')")
    .all<{ name: string }>()
  const parts: string[] = []
  for (const { name } of tables) {
    const { results } = await db.prepare(`SELECT * FROM "${name.replace(/"/g, '')}"`).all()
    parts.push(JSON.stringify(results))
  }
  return parts.join('\n')
}

async function listUploadFiles(): Promise<UploadFile[]> {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
  const files: UploadFile[] = []
  for (const bucket of UPLOAD_BUCKETS) {
    let names: string[]
    try {
      names = await fs.readdir(path.join(uploadDir, bucket))
    } catch {
      continue
    }
    for (const name of names) {
      const stat = await fs.stat(path.join(uploadDir, bucket, name)).catch(() => null)
      if (stat?.isFile()) files.push({ bucket, name, mtimeMs: stat.mtimeMs })
    }
  }
  return files
}

export async function removeOrphanUploads(now = Date.now()): Promise<number> {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
  const files = await listUploadFiles()
  if (files.length === 0) return 0
  const orphans = findOrphanFiles(files, await collectReferenceBlob(), now)
  for (const file of orphans) {
    await fs.unlink(path.join(uploadDir, file.bucket, file.name)).catch(() => {})
  }
  return orphans.length
}

export async function runMaintenance() {
  try {
    await purgeOldTrash()
    const removed = await removeOrphanUploads()
    console.log(`[maintenance] корзина очищена от записей старше 14 дней, удалено неиспользуемых файлов: ${removed}`)
  } catch (error) {
    console.error('[maintenance] ошибка обслуживания:', error)
  }
  try {
    await checkAllLinks()
  } catch (error) {
    console.error('[link-check] ошибка проверки ссылок:', error)
  }
}

let started = false

export function startMaintenanceSchedule() {
  if (started) return
  started = true
  setTimeout(runMaintenance, 60 * 1000).unref()
  setInterval(runMaintenance, MAINTENANCE_INTERVAL_MS).unref()
}
