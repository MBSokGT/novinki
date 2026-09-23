import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/db'
import { checkAllLinks, lastLinkCheckAt, linkCheckState } from '@/lib/linkCheck'

export const dynamic = 'force-dynamic'

async function forbidden(request: NextRequest) {
  const user = await getCurrentUser(request)
  return !user || !user.is_admin
}

export async function GET(request: NextRequest) {
  if (await forbidden(request)) return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  return NextResponse.json({ data: { ...linkCheckState(), lastCheckedAt: await lastLinkCheckAt() }, error: null })
}

// Проверка всех ссылок идёт минутами, поэтому запускаем её в фоне и сразу
// отвечаем — админка сама опрашивает GET, пока проверка не закончится.
export async function POST(request: NextRequest) {
  if (await forbidden(request)) return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  const alreadyRunning = linkCheckState().running
  if (!alreadyRunning) {
    checkAllLinks({ force: true }).catch((error) => console.error('[link-check] ошибка проверки ссылок:', error))
  }
  return NextResponse.json({ data: { started: !alreadyRunning, running: true }, error: null })
}
