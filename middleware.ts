import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'

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

  // Защита админских роутов с двойной проверкой
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('sb-access-token')
    const sessionHash = request.cookies.get('session-hash')
    
    if (!token || !sessionHash) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Проверка целостности сессии
    const expectedHash = createHash('sha256')
      .update(token.value + ip + userAgent)
      .digest('hex')
    
    if (sessionHash.value !== expectedHash) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

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
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
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
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "upgrade-insecure-requests"
  )

  // Добавление fingerprint для отслеживания сессий
  const fingerprint = createHash('sha256')
    .update(ip + userAgent + request.headers.get('accept-language'))
    .digest('hex')
  
  response.cookies.set('fp', fingerprint, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600
  })

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

// Очистка заблокированных IP каждые 30 минут
setInterval(() => {
  blockedIPs.clear()
  suspiciousActivity.clear()
}, 1800000)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
