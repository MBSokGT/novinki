import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const ALLOWED_BUCKETS = new Set(['products', 'flyers', 'vendors'])

function getUploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
}

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '')
  return `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`
}

export function isFilesystemStorageEnabled() {
  return process.env.NEXT_PUBLIC_STORAGE_DRIVER === 'filesystem'
}

export function isAllowedBucket(bucket: string): bucket is 'products' | 'flyers' | 'vendors' {
  return ALLOWED_BUCKETS.has(bucket)
}

export async function saveUploadedFile(bucket: string, originalFileName: string, buffer: Buffer): Promise<string> {
  if (!isAllowedBucket(bucket)) {
    throw new Error(`Unsupported storage bucket "${bucket}"`)
  }

  const dir = path.join(getUploadDir(), bucket)
  await fs.mkdir(dir, { recursive: true })

  const safeName = sanitizeFileName(originalFileName)
  await fs.writeFile(path.join(dir, safeName), buffer)

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  return `${basePath}/api/uploads/${bucket}/${safeName}`
}

export async function readUploadedFile(bucket: string, fileName: string): Promise<Buffer> {
  if (!isAllowedBucket(bucket)) {
    throw new Error(`Unsupported storage bucket "${bucket}"`)
  }
  if (fileName.includes('..') || fileName.includes('/')) {
    throw new Error('Invalid file name')
  }

  return fs.readFile(path.join(getUploadDir(), bucket, fileName))
}
