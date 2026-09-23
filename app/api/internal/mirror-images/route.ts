import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/db'
import { mirrorImages } from '@/lib/mirrorImage'

const MAX_URLS = 200

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || !user.is_admin) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  let urls: string[]
  try {
    const body = await request.json()
    urls = Array.isArray(body?.urls) ? body.urls.map((u: unknown) => String(u ?? '')) : []
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Некорректный запрос' } }, { status: 400 })
  }
  if (urls.length > MAX_URLS) {
    return NextResponse.json({ data: null, error: { message: `Слишком много фото за раз (максимум ${MAX_URLS})` } }, { status: 400 })
  }

  const mirrored = await mirrorImages(urls)
  return NextResponse.json({ data: { urls: mirrored }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
}
