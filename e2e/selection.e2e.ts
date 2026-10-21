import { test, describe } from '@e2e-dev/web'
import { expect } from 'e2e'

describe('подборка для клиента', () => {
  test('менеджер собирает подборку, а клиент видит только фото, названия и артикулы', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/')
    await screen.getByRole('button', 'Добавить в подборку для клиента').first().tap()
    await screen.getByRole('button', 'Добавить в подборку для клиента').first().tap()
    await expect(screen.getByText('Подборка 2')).toBeVisible()

    await screen.getByRole('button', 'Отправить клиенту').tap()
    await screen.getByRole('button', 'Создать ссылку').tap()
    await expect(screen.getByText('Ссылка готова', { exact: false })).toBeVisible()
    const link = await screen.getByRole('textbox').last().inputValue()
    expect(link).toMatch(/\/s\/[A-Za-z0-9_-]{16}$/)

    // Ссылка открывается без входа: убираем cookie сессии
    await browser.setCookies([])
    await browser.goto(link)
    await expect(screen.getByRole('heading', 'Подборка Комплекс-Бар')).toBeVisible()
    await expect(screen.getByText('Товаров: 2', { exact: false })).toBeVisible()
    await expect(screen.getByText('02030586')).toBeVisible()
    // Внутренние данные до клиента не доходят
    await expect(screen.getByText('СЕКРЕТНОЕ_ОПИСАНИЕ_ДЛЯ_СОТРУДНИКОВ')).toBeHidden()
    await expect(screen.getByText('1 249')).toBeHidden()
  })

  test('публичный адрес подборки не отдаёт лишних полей и не знает чужих токенов', { session: 'admin' }, async ({ app, browser }) => {
    await app.open('/')
    const result = await browser.evaluate(async () => {
      const unknown = await fetch('/api/selection/zzzzzzzzzzzzzzzz')
      const created = await (await fetch('/api/internal/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Проверка', ids: ['e2e-1', 'e2e-6'] }),
      })).json()
      const token = created.data.token
      const body = await (await fetch(`/api/selection/${token}`, { credentials: 'omit' })).json()
      return { unknown: unknown.status, count: created.data.count, keys: Object.keys(body.data.items[0]).sort(), items: body.data.items.length }
    })
    expect(result.unknown).toBe(404)
    // Скрытый товар в подборку не попадает
    expect(result.count).toBe(1)
    expect(result.items).toBe(1)
    expect(result.keys).toEqual(['articles', 'brand', 'category', 'image_url', 'name'])
  })

  test('PDF подборки собирается', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/')
    await screen.getByRole('button', 'Добавить в подборку для клиента').first().tap()
    await screen.getByRole('button', 'Отправить клиенту').tap()
    const file = await browser.waitForDownload(() => screen.getByRole('button', 'Скачать PDF').tap(), { timeout: 60_000 })
    expect(file.suggestedFilename).toMatch(/^podborka_.*\.pdf$/)
  })
})
