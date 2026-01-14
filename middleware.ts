import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const blockedIPs = new Set<string>()
const suspiciousActivity = new Map<string, { count: number; timestamp: number }>()

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || ''
  
  // Блокировка подозрительных IP
  if (blockedIPs.has(ip)) {
    return new NextResponse('Access Denied', { status: 403 })
  }

  // Детекция ботов и сканеров
  const botPatterns = /bot|crawler|spider|scraper|curl|wget|python|java|postman/i
  if (botPatterns.test(userAgent) && !pathname.startsWith('/api')) {
    trackSuspiciousActivity(ip)
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Защита админских роутов (временно отключено)
  // if (pathname.startsWith('/admin')) {
  //   const token = request.cookies.get('sb-access-token')
  //   if (!token) {
  //     return NextResponse.redirect(new URL('/login', request.url))
  //   }
  // }

  // Защита от path traversal атак
  if (pathname.includes('..') || pathname.includes('%2e%2e')) {
    trackSuspiciousActivity(ip)
    return new NextResponse('Invalid Path', { status: 400 })
  }

  const response = NextResponse.next()
  
  // Максимальные security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'no-referrer')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  // Строгая Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://*.supabase.co; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'"
  )

  return response
}

function trackSuspiciousActivity(ip: string) {
  const now = Date.now()
  const activity = suspiciousActivity.get(ip)
  
  if (!activity || now - activity.timestamp > 300000) {
    suspiciousActivity.set(ip, { count: 1, timestamp: now })
  } else {
    activity.count++
    if (activity.count > 5) {
      blockedIPs.add(ip)
      console.warn(`[SECURITY] IP blocked: ${ip}`)
    }
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
