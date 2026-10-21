import crypto from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/db'
import { getLocalD1 } from '@/lib/sqlite'

export const dynamic = 'force-dynamic'

const MAX_ITEMS = 60
const LIFETIME_DAYS = 30

// Менеджер (любой вошедший сотрудник) создаёт подборку для клиента и получает
// ссылку. По самой ссылке подборка открывается без входа — см. /api/selection/[token].
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ data: null, error: { message: 'Authentication required' } }, { status: 401 })

  let title = ''
  let ids: string[] = []
  try {
    const body = await request.json()
    title = String(body?.title || '').trim().slice(0, 120)
    ids = Array.isArray(body?.ids) ? [...new Set<string>(body.ids.map((id: unknown) => String(id)))].slice(0, MAX_ITEMS) : []
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Некорректный запрос' } }, { status: 400 })
  }
  if (ids.length === 0) return NextResponse.json({ data: null, error: { message: 'В подборке нет товаров' } }, { status: 400 })

  const db = getLocalD1()
  // В подборку попадают только опубликованные товары
  const marks = ids.map(() => '?').join(',')
  const { results } = await db.prepare(`SELECT id FROM products WHERE is_archived = 0 AND id IN (${marks})`).bind(...ids).all<{ id: string }>()
  const valid = new Set(results.map((r) => r.id))
  const kept = ids.filter((id) => valid.has(id))
  if (kept.length === 0) return NextResponse.json({ data: null, error: { message: 'Эти товары больше не опубликованы' } }, { status: 400 })

  const token = crypto.randomBytes(12).toString('base64url')
  const now = new Date()
  const expires = new Date(now.getTime() + LIFETIME_DAYS * 24 * 60 * 60 * 1000)
  await db
    .prepare('INSERT INTO selections (token, title, product_ids, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(token, title || 'Подборка Комплекс-Бар', JSON.stringify(kept), user.id, now.toISOString(), expires.toISOString())
    .run()
  // Просроченные подборки убираем заодно
  await db.prepare('DELETE FROM selections WHERE expires_at < ?').bind(now.toISOString()).run()

  return NextResponse.json({ data: { token, expires_at: expires.toISOString(), count: kept.length }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
}
