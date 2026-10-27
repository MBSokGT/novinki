import { test, describe } from '@e2e-dev/web'
import { expect } from 'e2e'

describe('что искали и не нашли', () => {
  test('запрос без результатов попадает в список админа, найденный — нет', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/')
    const search = screen.getByPlaceholder('Поиск по названию, бренду или артикулу...')
    await search.fill('питчер')
    await expect(screen.getByRole('heading', 'Питчер «Пробар Премиум»', { exact: false })).toBeVisible()
    await search.fill('сифон для сливок')
    await expect(screen.getByText('Ничего не найдено по запросу', { exact: false })).toBeVisible()
    // Запрос уходит на сервер, когда человек закончил печатать
    await expect
      .poll(() => browser.evaluate(async () => (await (await fetch('/api/internal/search-misses')).json()).data.map((m: { query: string }) => m.query)), { timeout: 10_000 })
      .toContain('сифон для сливок')
    const queries = await browser.evaluate(async () => (await (await fetch('/api/internal/search-misses')).json()).data.map((m: { query: string }) => m.query))
    expect(queries).not.toContain('питчер')

    await app.open('/admin')
    await expect(screen.getByText('Что искали и не нашли', { exact: false })).toBeVisible()
    await expect(screen.getByText('сифон для сливок')).toBeVisible()
  })

  test('посторонний не видит список, но может сообщить о запросе', { session: 'admin' }, async ({ app, browser }) => {
    await app.open('/')
    const result = await browser.evaluate(async () => {
      const post = await fetch('/api/internal/search-miss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '<script>' }) })
      const body = await post.json()
      return { status: post.status, recorded: body.data.recorded }
    })
    expect(result).toEqual({ status: 200, recorded: false })
  })
})
