import { test, describe } from '@e2e-dev/web'
import { expect } from 'e2e'

// «Связи нет»: запросы за каталогом не доходят до сервера. Делаем это в самой
// странице (а не через перехват в браузере), чтобы одинаково работало
// в Chromium и в WebKit.
const blockCatalogRequests = () => {
  const realFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('/api/internal/data')) return Promise.reject(new TypeError('Failed to fetch'))
    return realFetch(input, init)
  }
}

describe('работа без сети', () => {
  test('без связи открывается сохранённый каталог с пометкой', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/')
    await expect(screen.getByRole('heading', 'Сироп «Агава» ODK 1 л')).toBeVisible()

    // Ждём, пока страница доложит в хранилище браузера каталог, страницу и фото
    await expect
      .poll(() => browser.evaluate(async () => (await (await caches.open('novinki-offline-v1')).keys()).length))
      .toBeGreaterThan(8)

    await browser.addInitScript(blockCatalogRequests)
    await browser.reload()

    await expect(screen.getByText('Нет связи — показан каталог', { exact: false })).toBeVisible()
    await expect(screen.getByRole('heading', 'Сироп «Агава» ODK 1 л')).toBeVisible()
    await expect(screen.getByRole('heading', 'ЧЕРНОВИК_НЕ_ДЛЯ_СОТРУДНИКОВ')).toBeHidden()
  })

  test('ссылка на товар открывается без связи из сохранённого каталога', { session: 'admin' }, async ({ app, screen, browser }) => {
    await app.open('/')
    await expect(screen.getByRole('heading', 'Бокал для вина Pasabahce 450 мл')).toBeVisible()
    await expect
      .poll(() => browser.evaluate(async () => (await (await caches.open('novinki-offline-v1')).keys()).length))
      .toBeGreaterThan(8)

    await browser.addInitScript(blockCatalogRequests)
    await browser.goto('/?p=e2e-5')
    await expect(screen.getByText('Нет связи — показан каталог', { exact: false })).toBeVisible()
    await expect(screen.getByRole('button', 'Поделиться ссылкой на товар')).toBeVisible()
  })
})
