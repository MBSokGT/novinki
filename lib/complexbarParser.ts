import * as cheerio from 'cheerio'

export interface ScrapedProduct {
  name: string
  brand: string
  article_number: string
  image_url: string
  website_link: string
}

function absolutize(url: string, base: string): string {
  try {
    return new URL(url, base).toString()
  } catch {
    return url
  }
}

function parseListing($: cheerio.CheerioAPI, baseUrl: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = []
  $('.cmx-product-grid__item').each((_, el) => {
    const card = $(el)
    const link = card.find('a.product-title').first()
    const name = link.text().trim()
    const href = link.attr('href')
    if (!name || !href) return

    const brand = card.find('.cmx-product-grid__item-brand, .cmx-products-brand-name').first().text().trim()
    const article = card.find('[id^="product_code_"]').first().text().trim()
    const imgEl = card.find('img[data-src], img').first()
    const img = imgEl.attr('data-src') || imgEl.attr('src') || ''

    products.push({
      name,
      brand,
      article_number: article,
      image_url: img ? absolutize(img, baseUrl) : '',
      website_link: absolutize(href, baseUrl),
    })
  })
  return products
}

function parseSingleProduct($: cheerio.CheerioAPI, baseUrl: string): ScrapedProduct[] {
  const name = $('h1').first().text().trim()
  if (!name) return []

  const brand = $('a.ga-brand-link').first().text().trim()
  const article = $('[id^="product_code_"]').first().text().trim()
  // Главное фото на странице товара: сначала пробуем полноразмерную ссылку
  // с обёртки-превьюера, иначе — сам <img> (страница верстается то через
  // ленивую загрузку с data-src, то сразу через обычный src, вёрстка меняется).
  const imgSelector = '.cmx-product-details-images img, .cm-image-gallery img, .ty-product-block__gallery img, img.cm-image'
  const img =
    $('.cmx-product-details-images a.cm-previewer').first().attr('href') ||
    $(imgSelector).first().attr('data-src') ||
    $(imgSelector).first().attr('src') ||
    ''

  return [
    {
      name,
      brand,
      article_number: article,
      image_url: img ? absolutize(img, baseUrl) : '',
      website_link: baseUrl,
    },
  ]
}

export function parseComplexbarPage(html: string, baseUrl: string): ScrapedProduct[] {
  const $ = cheerio.load(html)
  const products = parseListing($, baseUrl)
  return products.length > 0 ? products : parseSingleProduct($, baseUrl)
}

export interface ProductStatus {
  availability: 'in_stock' | 'out_of_stock' | 'on_order' | 'showroom' | 'other'
  label: string
}

export function classifyAvailability(label: string): ProductStatus['availability'] {
  const text = label.toLowerCase()
  if (text.includes('нет в наличии')) return 'out_of_stock'
  if (text.includes('витрин')) return 'showroom'
  if (text.includes('заказ') || text.includes('ожида')) return 'on_order'
  if (text.includes('в наличии')) return 'in_stock'
  return 'other'
}

// Статус наличия самого товара со страницы complexbar.ru. На странице есть и
// чужие статусы (блоки "похожие товары" и т.п.), поэтому берём именно тот,
// что привязан к складской доступности этого товара; если вёрстка поменялась —
// откатываемся на разметку schema.org.
export function parseProductStatus(html: string): ProductStatus | null {
  const $ = cheerio.load(html)
  const stockId = $('[data-ca-warehouses-stock-availability-product-id]').first().attr('data-ca-warehouses-stock-availability-product-id')
  if (stockId) {
    const label = $(`#stock_info_${stockId}`).first().text().replace(/\s+/g, ' ').trim()
    if (label) return { availability: classifyAvailability(label), label }
  }

  const schema = html.match(/"availability"\s*:\s*"(?:https?:\\?\/\\?\/schema\.org\\?\/)?(\w+)"/)
  if (schema) {
    return schema[1] === 'InStock'
      ? { availability: 'in_stock', label: 'В наличии' }
      : { availability: 'out_of_stock', label: 'Нет в наличии' }
  }
  return null
}

// Похоже ли это на живую страницу товара (а не на заглушку/каталог, куда
// сайт может перекинуть вместо удалённого товара).
export function looksLikeProductPage(html: string): boolean {
  return /id="product_code_\d+"/.test(html) || /"@type"\s*:\s*"(?:[^"]*\/)?Product"/.test(html)
}
