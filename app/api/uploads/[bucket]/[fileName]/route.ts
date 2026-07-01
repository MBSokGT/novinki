import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAllowedBucket, readUploadedFile } from '@/lib/storage'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ bucket: string; fileName: string }> }) {
  const { bucket, fileName } = await params

  if (!isAllowedBucket(bucket)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const buffer = await readUploadedFile(bucket, fileName)
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
