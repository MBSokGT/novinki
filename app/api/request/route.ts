import { NextResponse } from 'next/server'
import { getAppEnv, insertRequest } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string
      contact?: string
      product?: string
      article?: string
    }
    const name = String(body.name || '').trim()
    const contact = String(body.contact || '').trim()
    const product = String(body.product || '').trim()
    const article = String(body.article || '').trim()

    if (!name || !contact || !product) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const emailContent = `
Новый запрос на добавление товара:

Имя: ${name}
Контакт: ${contact}
Название товара: ${product}
Артикул: ${article || 'Не указан'}
    `

    const env = await getAppEnv()
    const webhookUrl = env.REQUEST_WEBHOOK_URL || process.env.REQUEST_WEBHOOK_URL
    let delivered = false

    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'M.B.Sokolova@kbmik.ru',
          subject: 'Запрос на добавление новинки',
          text: emailContent,
          payload: { name, contact, product, article },
        }),
      })
      delivered = response.ok
    }

    await insertRequest({
      name,
      contact,
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
