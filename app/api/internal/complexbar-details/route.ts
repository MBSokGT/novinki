import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/db'
import { isCheckableLink } from '@/lib/linkCheck'
import { parseProductFeatures } from '@/lib/complexbarParser'
import { featuresToFields, mergeTags } from '@/lib/featuresToFields'

const MAX_PAGES = 10
const PAUSE_MS = 400

async function fetchFeatures(url: string): Promise<Record<string, string> | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ru-RU,ru;q=0.9' },
      signal: AbortSignal.timeout(15000),
    })
    return response.ok ? parseProductFeatures(await response.text()) : null
  } catch {
    return null
  }
}

// Характеристики со страниц товаров complexbar.ru — для автозаполнения формы.
// Поля (ПММ, температура, хранение) берём с первой страницы, а теги собираем
// со всех: у серии вкусов/объёмов у каждой позиции свои.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || !user.is_admin) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  let urls: string[] = []
  try {
    const body = await request.json()
    urls = (Array.isArray(body?.urls) ? body.urls : [body?.url]).map((u: unknown) => String(u || '').trim())
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Некорректный запрос' } }, { status: 400 })
  }
  // Сервер ходит по этим ссылкам сам — только complexbar.ru (SSRF).
  urls = [...new Set(urls.filter(isCheckableLink))].slice(0, MAX_PAGES)
  if (urls.length === 0) {
    return NextResponse.json({ data: null, error: { message: 'Разрешены только ссылки на complexbar.ru' } }, { status: 400 })
  }

  const pages: Record<string, string>[] = []
  for (const [i, url] of urls.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSE_MS))
    const features = await fetchFeatures(url)
    if (features) pages.push(features)
  }
  if (pages.length === 0) {
    return NextResponse.json({ data: null, error: { message: 'Не удалось загрузить страницы товаров' } }, { status: 502 })
  }

  const fields = featuresToFields(pages[0])
  const tags = pages.reduce((acc, features) => mergeTags(acc, featuresToFields(features).tags || ''), '')
  if (tags) fields.tags = tags
  else delete fields.tags
  return NextResponse.json({ data: { fields }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
}
