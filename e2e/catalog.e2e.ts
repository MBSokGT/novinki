import { test, describe } from '@e2e-dev/web'
import { expect } from 'e2e'

describe('каталог', () => {
  test('показывает опубликованные товары и прячет скрытые', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/')
    await expect(screen.getByRole('heading', 'Стрейнер «Пробар Премиум Оникс»', { exact: false })).toBeVisible()
    await expect(screen.getByRole('heading', 'Сироп «Агава» ODK 1 л')).toBeVisible()
    await expect(screen.getByRole('heading', 'ЧЕРНОВИК_НЕ_ДЛЯ_СОТРУДНИКОВ')).toBeHidden()
    await expect(screen.getByRole('heading', { level: 3 })).toHaveCount(5)
  })

  test('поиск оставляет подходящие товары, в том числе по артикулу варианта', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/')
    const search = screen.getByPlaceholder('Поиск по названию, бренду или артикулу...')
    await search.fill('питчер')
    await expect(screen.getByRole('heading', 'Питчер «Пробар Премиум»', { exact: false })).toBeVisible()
    await expect(screen.getByRole('heading', 'Бокал для вина Pasabahce 450 мл')).toBeHidden()

    await search.fill('05045263')
    await expect(screen.getByRole('heading', 'Сироп «Агава» ODK 1 л')).toBeVisible()
    await expect(screen.getByRole('heading', 'Питчер «Пробар Премиум»', { exact: false })).toBeHidden()
  })

  test('окно товара: подробности и закрытие по Esc', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/')
    await screen.getByRole('heading', 'Бокал для вина Pasabahce 450 мл').tap()
    await expect(screen.getByRole('button', 'Поделиться ссылкой на товар')).toBeVisible()
    await browser.keyboard.press('Escape')
    await expect(screen.getByRole('button', 'Поделиться ссылкой на товар')).toBeHidden()
  })

  test('Excel выгружает показанные товары', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/')
    const file = await browser.waitForDownload(() => screen.getByRole('button', 'Выгрузить показанные товары в Excel').tap())
    expect(file.suggestedFilename).toMatch(/^novinki_sklad_\d{4}-\d{2}-\d{2}\.xlsx$/)
  })
})
