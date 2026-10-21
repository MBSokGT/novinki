import { test, describe } from '@e2e-dev/web'
import { expect } from 'e2e'

describe('анонс-листовка PDF', () => {
  test('админ отмечает товары и скачивает PDF', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/admin')
    // Отмечаем все товары в списке и открываем окно анонса
    await screen.getByRole('checkbox', 'Выбрать все').check()
    await screen.getByRole('button', 'Анонс PDF').tap()
    await expect(screen.getByText('Анонс новинок в PDF')).toBeVisible()

    const file = await browser.waitForDownload(() => screen.getByRole('button', 'Скачать PDF').tap(), { timeout: 90_000 })
    expect(file.suggestedFilename).toMatch(/^anons_.*\.pdf$/)
  })
})
