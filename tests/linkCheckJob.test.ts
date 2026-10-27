import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// Ежедневная проверка целиком: временная база, подменённый сайт complexbar.ru
const OK_URL = 'https://complexbar.ru/product/ok/'
const VARIANT_URL = 'https://complexbar.ru/product/variant/'
const GONE_URL = 'https://complexbar.ru/product/gone/'
const BARE_URL = 'https://complexbar.ru/product/bare/'
const BARE_VARIANT_URL = 'https://complexbar.ru/product/bare-variant/'

const page = (price: number, label: string) => `
  <script type="application/ld+json">{"@type":"Product","offers":{"price":"${price}","priceCurrency":"RUB"}}</script>
  <span id="product_code_1">05000001</span>
  <div class="cmx-product-details__vendor-name" data-ca-warehouses-stock-availability-product-id="1"></div>
  <span class="ty-qty-in-stock" id="stock_info_1">${label}</span>`

const site: Record<string, { status: number; body?: string }> = {
  [OK_URL]: { status: 200, body: page(1200, 'В наличии > 100 шт.') },
  [VARIANT_URL]: { status: 200, body: page(450, 'Под заказ') },
  [GONE_URL]: { status: 404 },
  [BARE_URL]: { status: 200, body: '<p>ничего</p>' },
  [BARE_VARIANT_URL]: { status: 200, body: '<p>ничего</p>' },
}
const requestTimes: number[] = []

let dir: string
let db: { prepare: (sql: string) => { bind: (...v: unknown[]) => { first: <T>() => Promise<T | null>; run: () => Promise<unknown> } } }
let checkAllLinks: typeof import('@/lib/linkCheck').checkAllLinks

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novinki-linkcheck-'))
  process.env.SQLITE_DB_PATH = path.join(dir, 'test.db')
  vi.resetModules()
  vi.stubGlobal('fetch', async (url: string) => {
    requestTimes.push(Date.now())
    const hit = site[url]
    if (!hit) throw new Error(`unexpected request ${url}`)
    return new Response(hit.body ?? '', { status: hit.status })
  })
  const sqlite = await import('@/lib/sqlite')
  db = sqlite.getLocalD1() as unknown as typeof db
  ;({ checkAllLinks } = await import('@/lib/linkCheck'))

  const insert = async (id: string, link: string | null, variants: unknown[]) =>
    db
      .prepare('INSERT INTO products (id, name, brand, description, advantages, attention_points, image_url, is_archived, website_link, variants, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)')
      .bind(id, id, 'B', '', '', '', '', link, JSON.stringify(variants), 'now', 'now')
      .run()
  await insert('ok', OK_URL, [{ article_number: 'v1', website_link: VARIANT_URL }, { article_number: 'v2', website_link: 'https://example.com/other' }])
  await insert('gone', GONE_URL, [])
  await insert('foreign', 'https://example.com/x', [])
})

afterAll(() => {
  vi.unstubAllGlobals()
  fs.rmSync(dir, { recursive: true, force: true })
})

const row = (id: string) =>
  db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<Record<string, unknown>>() as Promise<Record<string, unknown>>

describe('ежедневная проверка ссылок, наличия и цены', () => {
  it('записывает наличие и цену товара и его вариантов, помечает пропавшие страницы', async () => {
    const stats = await checkAllLinks({ force: true, delayMs: 0 })
    expect(stats).toMatchObject({ products: 2, requests: 3, broken: 1, failed: 0 })

    const ok = await row('ok')
    expect(ok).toMatchObject({ link_broken: 0, availability: 'in_stock', site_price: 1200, site_currency: 'RUB' })
    expect(ok.availability_checked_at).toBeTruthy()
    const variants = JSON.parse(ok.variants as string)
    expect(variants[0]).toMatchObject({ price: 450, availability: 'on_order', link_broken: false })
    expect(variants[0].checked_at).toBeTruthy()
    // Чужая ссылка не проверяется и остаётся как была
    expect(variants[1]).toEqual({ article_number: 'v2', website_link: 'https://example.com/other' })

    expect(await row('gone')).toMatchObject({ link_broken: 1 })
    expect((await row('foreign')).link_checked_at).toBeNull()
  })

  it('повторный запуск приводит к тому же состоянию', async () => {
    const before = await row('ok')
    await checkAllLinks({ force: true, delayMs: 0 })
    const after = await row('ok')
    const strip = (r: Record<string, unknown>) => ({ ...r, link_checked_at: 0, availability_checked_at: 0, variants: JSON.parse(r.variants as string).map((v: object) => ({ ...v, checked_at: 0 })) })
    expect(strip(after)).toEqual(strip(before))
  })

  it('не запускается второй раз раньше срока, если не просили принудительно', async () => {
    expect(await checkAllLinks()).toBeNull()
  })

  it('сбой сайта не стирает прежние данные', async () => {
    site[OK_URL] = { status: 503 }
    const stats = await checkAllLinks({ force: true, delayMs: 0 })
    expect(stats?.failed).toBeGreaterThan(0)
    expect(await row('ok')).toMatchObject({ link_broken: 0, availability: 'in_stock', site_price: 1200 })
  })
})

const run = (sql: string, ...values: unknown[]) => db.prepare(sql).bind(...values).run()
const addProduct = (id: string, link: string | null, variants: string | null) =>
  run(
    'INSERT INTO products (id, name, brand, description, advantages, attention_points, image_url, is_archived, website_link, variants, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)',
    id, id, 'B', '', '', '', '', link, variants, 'now', 'now'
  )

describe('граничные случаи проверки', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('страница без наличия и цены записывает «нет данных», а пропавший вариант помечается', async () => {
    await addProduct('bare', BARE_URL, JSON.stringify([{ article_number: 'b1', website_link: BARE_VARIANT_URL }]))
    await addProduct('brokenvar', null, JSON.stringify([{ article_number: 'g1', website_link: GONE_URL }]))
    await checkAllLinks({ force: true, delayMs: 0 })

    expect(await row('bare')).toMatchObject({ link_broken: 0, availability: null, availability_label: null, site_price: null, site_currency: null })
    const [bare] = JSON.parse((await row('bare')).variants as string)
    expect(bare).toMatchObject({ link_broken: false, availability: null, availability_label: null, price: null, currency: null })
    expect(bare.checked_at).toBeTruthy()

    const [gone] = JSON.parse((await row('brokenvar')).variants as string)
    expect(gone).toMatchObject({ article_number: 'g1', link_broken: true })
  })

  it('карточка без вариантов остаётся без вариантов', async () => {
    await addProduct('novariants', OK_URL, '[]')
    await checkAllLinks({ force: true, delayMs: 0 })
    expect((await row('novariants')).variants).toBe('[]')
  })

  it('первый запрос идёт сразу, следующие — с паузой, чтобы не нагружать сайт', async () => {
    requestTimes.length = 0
    const started = Date.now()
    await checkAllLinks({ force: true })
    expect(requestTimes.length).toBeGreaterThan(2)
    expect(requestTimes[0] - started).toBeLessThan(400)
    for (let i = 1; i < requestTimes.length; i++) expect(requestTimes[i] - requestTimes[i - 1]).toBeGreaterThanOrEqual(650)
  }, 30_000)

  it('пишет в журнал итог проверки', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const stats = await checkAllLinks({ force: true, delayMs: 0 })
    const message = String(log.mock.calls.at(-1)?.[0])
    log.mockRestore()
    expect(message).toContain(`проверено карточек: ${stats?.products}`)
    expect(message).toContain(`запросов: ${stats?.requests}`)
    expect(message).toContain('пропало с сайта')
  })

  it('две проверки одновременно не запускаются: вторая отказывается', async () => {
    const first = checkAllLinks({ force: true, delayMs: 0 })
    expect(await checkAllLinks({ force: true, delayMs: 0 })).toBeNull()
    expect(await first).not.toBeNull()
  })

  it('без принуждения проверка идёт, когда прошлой не было или прошло 20 часов, и не идёт раньше', async () => {
    const MIN = 20 * 60 * 60 * 1000
    const setLast = (at: string | null) => run('UPDATE products SET link_checked_at = ?', at)
    const now = Date.now()
    vi.useFakeTimers({ toFake: ['Date'], now })

    await setLast(null)
    expect(await (await import('@/lib/linkCheck')).lastLinkCheckAt()).toBeNull()
    expect(await checkAllLinks({ delayMs: 0 })).not.toBeNull()

    await setLast(new Date(now - MIN + 60_000).toISOString())
    expect(await checkAllLinks({ delayMs: 0 })).toBeNull()

    await setLast(new Date(now - MIN).toISOString())
    expect(await checkAllLinks({ delayMs: 0 })).not.toBeNull()

    await setLast(new Date(now - MIN - 60_000).toISOString())
    const last = await (await import('@/lib/linkCheck')).lastLinkCheckAt()
    expect(last).toBe(new Date(now - MIN - 60_000).toISOString())
    expect(await checkAllLinks({ delayMs: 0 })).not.toBeNull()
  })
})
