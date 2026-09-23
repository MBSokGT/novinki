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
