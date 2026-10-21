import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getLocalD1 } from '@/lib/sqlite'

export const dynamic = 'force-dynamic'

function parseJson<T>(raw: string | null, fallback: T): T {
  try {
    const parsed = JSON.parse(raw || '')
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

// Публичная подборка: открывается по секретной ссылке без входа. Отдаём ТОЛЬКО
// то, что можно показать клиенту — название, бренд, категорию, фото и артикулы.
// Описания, цены, ссылки на поставщиков, заметки и всё остальное остаются внутри.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return NextResponse.json({ data: null, error: { message: 'Not found' } }, { status: 404 })

  const db = getLocalD1()
  const selection = await db
    .prepare('SELECT title, product_ids, created_at, expires_at FROM selections WHERE token = ?')
    .bind(token)
    .first<{ title: string; product_ids: string; created_at: string; expires_at: string }>()
  if (!selection || selection.expires_at < new Date().toISOString()) {
    return NextResponse.json({ data: null, error: { message: 'Подборка не найдена или срок её действия закончился' } }, { status: 404 })
  }

  const ids = parseJson<string[]>(selection.product_ids, [])
  const marks = ids.map(() => '?').join(',')
  const { results } = ids.length
    ? await db
        .prepare(`SELECT id, name, brand, category, article_number, image_url, images, variants FROM products WHERE is_archived = 0 AND id IN (${marks})`)
        .bind(...ids)
        .all<{ id: string; name: string; brand: string; category: string | null; article_number: string | null; image_url: string | null; images: string | null; variants: string | null }>()
    : { results: [] }
  const byId = new Map(results.map((row) => [row.id, row]))

  const items = ids.flatMap((id) => {
    const row = byId.get(id)
    if (!row) return []
    const variants = parseJson<Array<{ article_number?: string }>>(row.variants, [])
    const articles = [row.article_number, ...variants.map((v) => v.article_number)].map((a) => (a || '').trim()).filter(Boolean)
    return [
      {
        name: row.name,
        brand: row.brand,
        category: row.category || '',
        articles: [...new Set(articles)],
        image_url: parseJson<string[]>(row.images, [])[0] || row.image_url || '',
      },
    ]
  })

  return NextResponse.json(
    { data: { title: selection.title, created_at: selection.created_at, items }, error: null },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }
  )
}
