import { afterEach, describe, expect, it, vi } from 'vitest'
import { classifyAvailability, parseProductStatus } from '@/lib/complexbarParser'
import { productAvailabilitySummary, shortLabel } from '@/components/AvailabilityBadge'
import { checkLink, isCheckableLink } from '@/lib/linkCheck'

// Упрощённая копия разметки страницы товара complexbar.ru: у самого товара
// свой статус, а в блоке "похожие товары" выше по странице — чужой.
const productPage = (ownLabel: string) => `
  <div class="related"><span class="ty-qty-in-stock ty-qty-in-stock--not" id="stock_info_1947010">Нет в наличии</span></div>
  <span id="product_code_5319954">05090276</span>
  <div class="cmx-product-details__vendor-name" data-ca-warehouses-stock-availability-product-id="5319955"></div>
  <span class="ty-qty-in-stock" id="stock_info_5319955"><i></i> ${ownLabel} </span>
`

describe('статус наличия со страницы complexbar.ru', () => {
  it('берёт статус именно этого товара, а не соседнего', () => {
    expect(parseProductStatus(productPage('В наличии > 100 шт.'))).toEqual({ availability: 'in_stock', label: 'В наличии > 100 шт.' })
    expect(parseProductStatus(productPage('На витрине'))).toEqual({ availability: 'showroom', label: 'На витрине' })
  })

  it('распознаёт «Под заказ» и «Нет в наличии»', () => {
    expect(classifyAvailability('Под заказ')).toBe('on_order')
    expect(classifyAvailability('Ожидается поступление')).toBe('on_order')
    expect(classifyAvailability('Нет в наличии')).toBe('out_of_stock')
  })

  it('если вёрстка поменялась — берёт статус из разметки schema.org', () => {
    expect(parseProductStatus('<script>{"availability":"InStock"}</script>')).toEqual({ availability: 'in_stock', label: 'В наличии' })
    expect(parseProductStatus('<script>{"availability":"http:\\/\\/schema.org\\/PreOrder"}</script>')?.availability).toBe('out_of_stock')
    expect(parseProductStatus('<p>ничего</p>')).toBeNull()
  })
})

describe('бейдж на карточке', () => {
  it('убирает количество из короткой подписи', () => {
    expect(shortLabel('В наличии > 100 шт.')).toBe('В наличии')
    expect(shortLabel('В наличии 5 шт')).toBe('В наличии')
    expect(shortLabel('На витрине')).toBe('На витрине')
  })

  it('сводит статусы вариантов', () => {
    const v = (availability: 'in_stock' | 'out_of_stock' | null) => ({ image_url: '', article_number: '1', website_link: '', availability })
    expect(productAvailabilitySummary({ variants: [v('in_stock'), v('out_of_stock'), v('in_stock')] })).toEqual({ kind: 'partial', label: 'В наличии 2 из 3' })
    expect(productAvailabilitySummary({ variants: [v('in_stock'), v(null)] })).toEqual({ kind: 'in_stock', label: 'В наличии' })
    expect(productAvailabilitySummary({ variants: [v('out_of_stock')] })).toEqual({ kind: 'out_of_stock', label: 'Нет в наличии' })
    expect(productAvailabilitySummary({ variants: [] })).toBeNull()
  })

  it('статус основной ссылки важнее сводки по вариантам', () => {
    expect(productAvailabilitySummary({ availability: 'showroom', availability_label: 'На витрине', variants: [] })).toEqual({ kind: 'showroom', label: 'На витрине' })
  })
})

describe('проверка ссылок', () => {
  afterEach(() => vi.unstubAllGlobals())

  const respond = (status: number, body = '', finalUrl?: string) =>
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const response = new Response(body, { status })
      Object.defineProperty(response, 'url', { value: finalUrl || url })
      return response
    }))

  it('проверяет только ссылки на complexbar.ru и городские сайты', () => {
    expect(isCheckableLink('https://complexbar.ru/product/x/')).toBe(true)
    expect(isCheckableLink('https://spb.complexbar.ru/product/x/')).toBe(true)
    expect(isCheckableLink('https://complex-bar.kz/product/x/')).toBe(true)
    expect(isCheckableLink('https://supplier.example.com/x')).toBe(false)
    expect(isCheckableLink('')).toBe(false)
  })

  it('404 — товар пропал', async () => {
    respond(404)
    expect(await checkLink('https://complexbar.ru/product/x/')).toEqual({ broken: true })
  })

  it('перекинуло с товара в каталог — товар пропал', async () => {
    respond(200, '<html></html>', 'https://complexbar.ru/catalog/chay/')
    expect(await checkLink('https://complexbar.ru/product/x/')).toEqual({ broken: true })
  })

  it('сбой их сайта — не помечаем битым, данные не трогаем', async () => {
    respond(503)
    expect(await checkLink('https://complexbar.ru/product/x/')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network') }))
    expect(await checkLink('https://complexbar.ru/product/x/')).toBeNull()
  })

  it('живая страница — отдаёт статус наличия', async () => {
    respond(200, productPage('Нет в наличии'))
    expect(await checkLink('https://complexbar.ru/product/x/')).toEqual({ broken: false, status: { availability: 'out_of_stock', label: 'Нет в наличии' } })
  })
})
