import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { recordSearchMiss } from '@/lib/searchMisses'

export const dynamic = 'force-dynamic'

// Каталог открыт без входа, поэтому сюда пишет любой посетитель: ограничиваем
// частоту по адресу, а сам текст проверяет normalizeMissQuery.
export async function POST(request: NextRequest) {
  if (!checkRateLimit(`miss:${getClientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ data: null, error: { message: 'Слишком часто' } }, { status: 429 })
  }
  const body = await request.json().catch(() => null)
  const query = typeof body?.query === 'string' ? body.query : ''
  const recorded = await recordSearchMiss(query)
  return NextResponse.json({ data: { recorded }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
}
