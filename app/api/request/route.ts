import { NextResponse } from 'next/server'

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

    // Отправка через Supabase Edge Function или внешний сервис
    const response = await fetch('https://wbggwkteyecakxhrssct.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: 'M.B.Sokolova@kbmik.ru',
        subject: 'Запрос на добавление новинки',
        text: emailContent
      })
    })

    if (!response.ok) {
      // Fallback: сохранение в базу данных
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      await supabase.from('requests').insert([{
        name,
        contact,
        product,
        article,
        created_at: new Date().toISOString()
      }])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
  }
}
