import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hasPocketbaseToken(rawValue?: string) {
  if (!rawValue) return false

  try {
    const payload = JSON.parse(decodeURIComponent(rawValue))
    return typeof payload?.token === 'string' && payload.token.length > 0
  } catch {
    return rawValue.length > 10
  }
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const pocketbaseAuth = request.cookies.get('pb_auth')?.value
    if (!hasPocketbaseToken(pocketbaseAuth)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
