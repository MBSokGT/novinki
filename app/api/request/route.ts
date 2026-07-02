import { NextResponse } from 'next/server'
import { getAppEnv, insertRequest } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(`request:${getClientIp(request)}`, 5, 60_000)) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Подождите минуту.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as {
      name?: string
      contact?: string
      product?: string
      article?: string
    }
    const name = String(body.name || '').trim().slice(0, 200)
    const product = String(body.product || '').trim().slice(0, 500)
    const article = String(body.article || '').trim().slice(0, 100)

    if (!name || !product) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const emailContent = `
Новый запрос на добавление товара:

Имя: ${name}
Название товара: ${product}
Артикул: ${article || 'Не указан'}
    `

    const env = await getAppEnv()
    const webhookUrl = env.REQUEST_WEBHOOK_URL || process.env.REQUEST_WEBHOOK_URL
    let delivered = false

    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'M.B.Sokolova@kbmik.ru',
            subject: 'Запрос на добавление новинки',
            text: emailContent,
            payload: { name, product, article },
          }),
          signal: AbortSignal.timeout(10_000),
        })
        delivered = response.ok
      } catch (webhookError) {
        // The request is still saved below with delivered=false; the admin
        // panel shows undelivered requests, so nothing is lost.
        console.error('Request webhook failed:', webhookError)
      }
    }

    await insertRequest({
      name,
      contact: '',
      product,
      article,
      delivered,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request API error:', error)
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
  }
}
