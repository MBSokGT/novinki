import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/db'
import { isCheckableLink } from '@/lib/linkCheck'
import { parseProductFeatures } from '@/lib/complexbarParser'
import { featuresToFields } from '@/lib/featuresToFields'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || !user.is_admin) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  let url = ''
  try {
    url = String((await request.json())?.url || '').trim()
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Некорректный запрос' } }, { status: 400 })
  }
  // Сервер ходит по этой ссылке сам — только complexbar.ru (SSRF).
  if (!isCheckableLink(url)) {
    return NextResponse.json({ data: null, error: { message: 'Разрешены только ссылки на complexbar.ru' } }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ru-RU,ru;q=0.9' },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      return NextResponse.json({ data: null, error: { message: `complexbar.ru ответил с ошибкой (${response.status})` } }, { status: 502 })
    }
    const features = parseProductFeatures(await response.text())
    return NextResponse.json({ data: { features, fields: featuresToFields(features) }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Не удалось загрузить страницу товара' } }, { status: 502 })
  }
}
