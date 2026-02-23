import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, contact, product, article } = body

    const emailContent = `
Новый запрос на добавление товара:

Имя: ${name}
Контакт: ${contact}
Название товара: ${product}
Артикул: ${article || 'Не указан'}
    `

    const webhookUrl = process.env.REQUEST_WEBHOOK_URL
    let delivered = false

    // Опциональная отправка во внешний email/webhook сервис.
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

    // Гарантированно сохраняем заявку в PocketBase.
    const { error } = await supabase.from('requests').insert([
      {
        name,
        contact,
        product,
        article,
        delivered,
        created_at: new Date().toISOString(),
      },
    ])

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request API error:', error)
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
  }
}
