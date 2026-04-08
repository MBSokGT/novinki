import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  confirmPasswordReset,
  getCurrentUser,
  requestPasswordReset,
  SESSION_COOKIE_NAME,
  signInUser,
  signOutUser,
  signUpUser,
  updateUserPassword,
} from '@/lib/d1'

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
      const result = await signInUser(String(body.email || ''), String(body.password || ''))
      const response = NextResponse.json({ data: { user: result.user }, error: null })
      response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, buildCookieOptions(request))
      return response
    }

    if (action === 'signUp') {
      const result = await signUpUser(String(body.email || ''), String(body.password || ''))
      return NextResponse.json({ data: { user: result.user }, error: null })
    }

    if (action === 'resetPasswordForEmail') {
      const result = await requestPasswordReset(String(body.email || ''), body.options?.redirectTo)
      return NextResponse.json({ data: result, error: null })
    }

    if (action === 'confirmPasswordReset') {
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
    return NextResponse.json(
      {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown auth error' },
      },
      { status: 400 }
    )
  }
}
