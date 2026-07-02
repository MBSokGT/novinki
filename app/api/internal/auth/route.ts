import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  adminCreateUser,
  adminSetUserPassword,
  confirmPasswordReset,
  getCurrentUser,
  requestPasswordReset,
  SESSION_COOKIE_NAME,
  signInUser,
  signOutUser,
  updateUserPassword,
} from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

function buildCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  return NextResponse.json({ data: { user }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, any>
    const action = String(body?.action || '')

    if (action === 'signInWithPassword') {
      if (!checkRateLimit(`signin:${getClientIp(request)}`, 10, 60_000)) {
        return NextResponse.json(
          { data: { user: null }, error: { message: 'Слишком много попыток входа. Подождите минуту.' } },
          { status: 429 }
        )
      }

      const result = await signInUser(String(body.email || ''), String(body.password || ''))
      const response = NextResponse.json({ data: { user: result.user }, error: null })
      response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, buildCookieOptions(request))
      return response
    }

    if (action === 'resetPasswordForEmail') {
      if (!checkRateLimit(`reset:${getClientIp(request)}`, 5, 60_000)) {
        return NextResponse.json(
          { data: null, error: { message: 'Слишком много запросов. Подождите минуту.' } },
          { status: 429 }
        )
      }

      const result = await requestPasswordReset(String(body.email || ''), body.options?.redirectTo)
      return NextResponse.json({ data: result, error: null })
    }

    if (action === 'confirmPasswordReset') {
      if (!checkRateLimit(`reset-confirm:${getClientIp(request)}`, 10, 60_000)) {
        return NextResponse.json(
          { data: null, error: { message: 'Слишком много запросов. Подождите минуту.' } },
          { status: 429 }
        )
      }

      await confirmPasswordReset(String(body.token || ''), String(body.password || ''), String(body.passwordConfirm || ''))
      return NextResponse.json({ data: null, error: null })
    }

    if (action === 'updateUser') {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json({ data: { user: null }, error: { message: 'Not authenticated' } }, { status: 401 })
      }

      await updateUserPassword(user.id, String(body.password || ''))
      return NextResponse.json({ data: { user }, error: null })
    }

    if (action === 'adminCreateUser') {
      const requestingUser = await getCurrentUser(request)
      if (!requestingUser) {
        return NextResponse.json({ data: null, error: { message: 'Authentication required' } }, { status: 401 })
      }

      const result = await adminCreateUser(
        requestingUser.id,
        String(body.email || ''),
        String(body.password || ''),
        Boolean(body.isAdmin)
      )
      return NextResponse.json({ data: { user: result.user }, error: null })
    }

    if (action === 'adminSetUserPassword') {
      const requestingUser = await getCurrentUser(request)
      if (!requestingUser) {
        return NextResponse.json({ data: null, error: { message: 'Authentication required' } }, { status: 401 })
      }

      await adminSetUserPassword(requestingUser.id, String(body.userId || ''), String(body.password || ''))
      return NextResponse.json({ data: true, error: null })
    }

    if (action === 'signOut') {
      await signOutUser(request.cookies.get(SESSION_COOKIE_NAME)?.value)
      const response = NextResponse.json({ error: null })
      response.cookies.set(SESSION_COOKIE_NAME, '', {
        ...buildCookieOptions(request),
        maxAge: 0,
      })
      return response
    }

    if (action === 'getUser') {
      const user = await getCurrentUser(request)
      return NextResponse.json({ data: { user }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
    }

    return NextResponse.json({ data: null, error: { message: `Unsupported auth action: ${action}` } }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown auth error'
    return NextResponse.json(
      { data: null, error: { message } },
      { status: message === 'Forbidden' ? 403 : 400 }
    )
  }
}
