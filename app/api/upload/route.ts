import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/db'
import { isAllowedBucket, isFilesystemStorageEnabled, saveUploadedFile } from '@/lib/storage'

export async function POST(request: NextRequest) {
  if (!isFilesystemStorageEnabled()) {
    return NextResponse.json({ data: null, error: { message: 'Filesystem storage is disabled' } }, { status: 404 })
  }

  const user = await getCurrentUser(request)
  if (!user || !user.is_admin) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const bucket = String(formData.get('bucket') || '')
    const file = formData.get('file')

    if (!isAllowedBucket(bucket)) {
      return NextResponse.json({ data: null, error: { message: 'Unsupported bucket' } }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ data: null, error: { message: 'Missing file' } }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const path = await saveUploadedFile(bucket, file.name, buffer)

    return NextResponse.json({ data: { path }, error: null })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: { message: error instanceof Error ? error.message : 'Upload failed' } },
      { status: 400 }
    )
  }
}
