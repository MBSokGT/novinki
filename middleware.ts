import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hasSession(rawValue?: string) {
  return typeof rawValue === 'string' && rawValue.trim().length > 16
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = request.cookies.get('novinki_session')?.value
    if (!hasSession(session)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
