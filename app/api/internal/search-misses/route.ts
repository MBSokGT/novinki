import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/db'
import { clearSearchMisses, deleteSearchMiss, listSearchMisses } from '@/lib/searchMisses'

export const dynamic = 'force-dynamic'

const forbidden = () => NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })

async function isAdmin(request: NextRequest) {
  const user = await getCurrentUser(request)
  return Boolean(user?.is_admin)
}

// Список «что искали и не нашли» — только для админов
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) return forbidden()
  return NextResponse.json({ data: await listSearchMisses(), error: null }, { headers: { 'Cache-Control': 'no-store' } })
}

// ?query=… убирает один запрос, без параметра — очищает весь список
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin(request))) return forbidden()
  const query = request.nextUrl.searchParams.get('query')
  if (query) await deleteSearchMiss(query)
  else await clearSearchMisses()
  return NextResponse.json({ data: { ok: true }, error: null })
}
