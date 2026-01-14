import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { sanitizeInput } from '@/lib/security'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  if (!checkRateLimit(`login:${ip}`, 5, 60000)) {
    return NextResponse.json(
      { error: 'Слишком много попыток входа. Попробуйте через минуту.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const email = sanitizeInput(body.email)
    const password = body.password

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Неверный формат email' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
