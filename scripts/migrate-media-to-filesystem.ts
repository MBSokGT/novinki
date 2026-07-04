/*
 * One-time migration: extract base64 data-URL images/flyers embedded in the
 * SQLite DB (products, deleted_products, archived_products) into files
 * under uploads/, rewriting the DB rows to point at /api/uploads/... paths.
 *
 * Safe to re-run: rows already pointing at a non-data: URL are left alone.
 * Defaults to a dry run (reports what it would do); pass --apply to write.
 *
 * Usage:
 *   SQLITE_DB_PATH=/path/to/novinki.db UPLOAD_DIR=/path/to/uploads \
 *     npx tsx scripts/migrate-media-to-filesystem.ts [--apply]
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getLocalD1 } from '../lib/sqlite'

const APPLY = process.argv.includes('--apply')
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

function getUploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
  }
  return map[mime] || ''
}

function isDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:')
}

function saveDataUrlToFile(dataUrl: string, bucket: 'products' | 'flyers'): string {
  const commaIndex = dataUrl.indexOf(',')
  const header = dataUrl.slice(5, commaIndex)
  const base64 = dataUrl.slice(commaIndex + 1)
  const mime = header.split(';')[0] || 'application/octet-stream'
  const buffer = Buffer.from(base64, 'base64')

  const dir = path.join(getUploadDir(), bucket)
  fs.mkdirSync(dir, { recursive: true })

  const fileName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${extFromMime(mime)}`
  fs.writeFileSync(path.join(dir, fileName), buffer)

  return `${BASE_PATH}/api/uploads/${bucket}/${fileName}`
}

async function main() {
  console.log(APPLY ? 'Running in APPLY mode — files will be written and DB rows updated.' : 'Running in DRY-RUN mode (pass --apply to write changes).')

  const db = getLocalD1()
  const tables = ['products', 'deleted_products', 'archived_products']

  let filesWritten = 0
  let bytesWritten = 0
  let rowsUpdated = 0

  for (const table of tables) {
    const rows = (await db.prepare(`SELECT id, image_url, images, flyer_url FROM ${table}`).all())
      .results as Array<{ id: string; image_url: string | null; images: string | null; flyer_url: string | null }>

    for (const row of rows) {
      let changed = false
      let newImageUrl = row.image_url
      let newImages: string[] | null = null
      let newFlyerUrl = row.flyer_url

      // images is stored as a JSON-encoded array (TEXT column)
      let imagesArray: string[] = []
      if (row.images) {
        try {
          imagesArray = JSON.parse(row.images)
        } catch {
          imagesArray = []
        }
      }

      if (imagesArray.some(isDataUrl)) {
        newImages = imagesArray.map((img) => {
          if (!isDataUrl(img)) return img
          bytesWritten += img.length
          filesWritten++
          return APPLY ? saveDataUrlToFile(img, 'products') : '[would migrate]'
        })
        changed = true
      }

      if (isDataUrl(row.image_url)) {
        bytesWritten += row.image_url!.length
        filesWritten++
        newImageUrl = APPLY ? saveDataUrlToFile(row.image_url!, 'products') : '[would migrate]'
        changed = true
      }

      if (isDataUrl(row.flyer_url)) {
        bytesWritten += row.flyer_url!.length
        filesWritten++
        newFlyerUrl = APPLY ? saveDataUrlToFile(row.flyer_url!, 'flyers') : '[would migrate]'
        changed = true
      }

      if (changed) {
        rowsUpdated++
        if (APPLY) {
          await db
            .prepare(`UPDATE ${table} SET image_url = ?, images = ?, flyer_url = ? WHERE id = ?`)
            .bind(
              newImageUrl,
              newImages ? JSON.stringify(newImages) : row.images,
              newFlyerUrl,
              row.id
            )
            .run()
        }
      }
    }
  }

  console.log(`Rows with embedded media: ${rowsUpdated}`)
  console.log(`Files ${APPLY ? 'written' : 'that would be written'}: ${filesWritten}`)
  console.log(`Approx. base64 bytes ${APPLY ? 'moved out of the DB' : 'that would move out of the DB'}: ${bytesWritten.toLocaleString()}`)
  if (!APPLY) {
    console.log('\nDry run only — re-run with --apply to actually migrate.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
