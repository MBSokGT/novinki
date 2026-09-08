import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import { getCurrentUser } from '@/lib/db'

// Только complexbar.ru и её городские поддомены — этот эндпоинт делает
// запрос с сервера по адресу, который прислал админ, так что нельзя
// пускать сюда произвольный URL (SSRF).
const ALLOWED_HOST_SUFFIX = '.complexbar.ru'
const ALLOWED_HOST_EXACT = 'complexbar.ru'

function isAllowedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  return lower === ALLOWED_HOST_EXACT || lower.endsWith(ALLOWED_HOST_SUFFIX)
}

interface ScrapedProduct {
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
    const img = card.find('img[data-src]').first().attr('data-src') || ''

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
  const img =
    $('.cm-image-gallery img[data-src], .ty-product-block__gallery img[data-src], img.cm-image[data-src]')
      .first()
      .attr('data-src') || ''

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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user || !user.is_admin) {
    return NextResponse.json({ data: null, error: { message: 'Forbidden' } }, { status: 403 })
  }

  let targetUrl: string
  try {
    const body = await request.json()
    targetUrl = String(body?.url || '').trim()
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Некорректный запрос' } }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Некорректная ссылка' } }, { status: 400 })
  }

  if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ data: null, error: { message: 'Разрешены только ссылки на complexbar.ru' } }, { status: 400 })
  }

  let html: string
  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      return NextResponse.json({ data: null, error: { message: `complexbar.ru ответил с ошибкой (${response.status})` } }, { status: 502 })
    }
    html = await response.text()
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Не удалось загрузить страницу — сайт недоступен или запрос завис' } }, { status: 502 })
  }

  const $ = cheerio.load(html)
  const baseUrl = parsed.toString()

  let products = parseListing($, baseUrl)
  if (products.length === 0) {
    products = parseSingleProduct($, baseUrl)
  }

  if (products.length === 0) {
    return NextResponse.json(
      { data: null, error: { message: 'Не нашли ни одного товара на этой странице — возможно, страница изменилась или это не каталог/товар' } },
      { status: 200 }
    )
  }

  return NextResponse.json({ data: { products }, error: null }, { headers: { 'Cache-Control': 'no-store' } })
}
