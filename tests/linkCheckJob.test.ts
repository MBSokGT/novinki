import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Ежедневная проверка целиком: временная база, подменённый сайт complexbar.ru
const OK_URL = 'https://complexbar.ru/product/ok/'
const VARIANT_URL = 'https://complexbar.ru/product/variant/'
const GONE_URL = 'https://complexbar.ru/product/gone/'

const page = (price: number, label: string) => `
  <script type="application/ld+json">{"@type":"Product","offers":{"price":"${price}","priceCurrency":"RUB"}}</script>
  <span id="product_code_1">05000001</span>
  <div class="cmx-product-details__vendor-name" data-ca-warehouses-stock-availability-product-id="1"></div>
  <span class="ty-qty-in-stock" id="stock_info_1">${label}</span>`

const site: Record<string, { status: number; body?: string }> = {
  [OK_URL]: { status: 200, body: page(1200, 'В наличии > 100 шт.') },
  [VARIANT_URL]: { status: 200, body: page(450, 'Под заказ') },
  [GONE_URL]: { status: 404 },
}

let dir: string
let db: { prepare: (sql: string) => { bind: (...v: unknown[]) => { first: <T>() => Promise<T | null>; run: () => Promise<unknown> } } }
let checkAllLinks: typeof import('@/lib/linkCheck').checkAllLinks

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novinki-linkcheck-'))
  process.env.SQLITE_DB_PATH = path.join(dir, 'test.db')
  vi.resetModules()
  vi.stubGlobal('fetch', async (url: string) => {
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
    const stats = await checkAllLinks({ force: true })
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
    await checkAllLinks({ force: true })
    const after = await row('ok')
    const strip = (r: Record<string, unknown>) => ({ ...r, link_checked_at: 0, availability_checked_at: 0, variants: JSON.parse(r.variants as string).map((v: object) => ({ ...v, checked_at: 0 })) })
    expect(strip(after)).toEqual(strip(before))
  })

  it('не запускается второй раз раньше срока, если не просили принудительно', async () => {
    expect(await checkAllLinks()).toBeNull()
  })

  it('сбой сайта не стирает прежние данные', async () => {
    site[OK_URL] = { status: 503 }
    const stats = await checkAllLinks({ force: true })
    expect(stats?.failed).toBeGreaterThan(0)
    expect(await row('ok')).toMatchObject({ link_broken: 0, availability: 'in_stock', site_price: 1200 })
  })
})
