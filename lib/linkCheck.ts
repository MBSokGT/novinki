import { getLocalD1 } from './sqlite'
import { isComplexbarHost } from './complexbar-cities'
import { parseProductPrice, parseProductStatus, type ProductStatus } from './complexbarParser'
import type { ProductVariant } from '@/types/product'

// Пауза между запросами к complexbar.ru — проверка идёт раз в сутки и не
// торопится, чтобы не создавать заметной нагрузки на их сайт.
const REQUEST_DELAY_MS = 700
const MIN_INTERVAL_MS = 1000 * 60 * 60 * 20

export type LinkCheckResult =
  | { broken: true }
  | { broken: false; status: ProductStatus | null; price: { price: number; currency: string } | null }

let running = false
let startedAt: string | null = null

export function isCheckableLink(link: string | null | undefined): boolean {
  if (!link) return false
  try {
    const url = new URL(link)
    return url.protocol === 'https:' && isComplexbarHost(url.hostname)
  } catch {
    return false
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// null — проверить не удалось (сеть, 5xx, лимит запросов): старые данные не трогаем,
// чтобы временный сбой их сайта не пометил весь каталог битым.
export async function checkLink(link: string): Promise<LinkCheckResult | null> {
  let response: Response
  try {
    response = await fetch(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; novinki-catalog link check)', 'Accept-Language': 'ru-RU,ru;q=0.9' },
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    return null
  }
  if (response.status === 404 || response.status === 410) return { broken: true }
  if (!response.ok) return null

  // Удалённый товар сайт может не 404-ить, а перекидывать в каталог или на главную.
  const wasProduct = new URL(link).pathname.includes('/product/')
  if (wasProduct && !new URL(response.url || link).pathname.includes('/product/')) return { broken: true }

  const html = await response.text()
  return { broken: false, status: parseProductStatus(html), price: parseProductPrice(html) }
}

function parseVariants(raw: string | null): ProductVariant[] {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function applyToVariant(variant: ProductVariant, result: LinkCheckResult, checkedAt: string): ProductVariant {
  if (result.broken) return { ...variant, link_broken: true }
  return {
    ...variant,
    checked_at: checkedAt,
    link_broken: false,
    availability: result.status?.availability ?? null,
    availability_label: result.status?.label ?? null,
    price: result.price?.price ?? null,
    currency: result.price?.currency ?? null,
  }
}

export interface ProductUpdatePlan {
  assignments: string[]
  values: unknown[]
}

type CheckResults = ReadonlyMap<string, LinkCheckResult | null>

const resultFor = (link: string | null | undefined, results: CheckResults) => (isCheckableLink(link) ? results.get(link as string) : undefined)

function mainLinkPlan(result: LinkCheckResult, checkedAt: string): ProductUpdatePlan {
  const ok = result.broken ? null : result
  return {
    assignments: ['link_broken = ?', 'availability = ?', 'availability_label = ?', 'site_price = ?', 'site_currency = ?', 'availability_checked_at = ?'],
    values: [result.broken ? 1 : 0, ok?.status?.availability ?? null, ok?.status?.label ?? null, ok?.price?.price ?? null, ok?.price?.currency ?? null, checkedAt],
  }
}

// Что записать в карточку по итогам проверки: поля самого товара и варианты.
// Если результата для ссылки нет (не проверялась или сбой сайта) — прежние
// данные остаются как были.
export function planProductUpdate(fresh: { website_link: string | null; variants: string | null }, results: CheckResults, checkedAt: string): ProductUpdatePlan {
  const plan: ProductUpdatePlan = { assignments: ['link_checked_at = ?'], values: [checkedAt] }

  const mainResult = resultFor(fresh.website_link, results)
  if (mainResult) {
    const main = mainLinkPlan(mainResult, checkedAt)
    plan.assignments.push(...main.assignments)
    plan.values.push(...main.values)
  }

  const variants = parseVariants(fresh.variants)
  if (variants.length > 0) {
    const updated = variants.map((variant) => {
      const result = resultFor(variant.website_link, results)
      return result ? applyToVariant(variant, result, checkedAt) : variant
    })
    plan.assignments.push('variants = ?')
    plan.values.push(JSON.stringify(updated))
  }
  return plan
}

export async function lastLinkCheckAt(): Promise<string | null> {
  const row = await getLocalD1().prepare('SELECT MAX(link_checked_at) AS last FROM products').first<{ last: string | null }>()
  return row?.last ?? null
}

export function linkCheckState() {
  return { running, startedAt }
}

export async function checkAllLinks({ force = false } = {}) {
  if (running) return null
  if (!force) {
    const last = await lastLinkCheckAt()
    if (last && Date.now() - new Date(last).getTime() < MIN_INTERVAL_MS) return null
  }

  running = true
  startedAt = new Date().toISOString()
  const db = getLocalD1()
  const cache = new Map<string, LinkCheckResult | null>()
  const stats = { products: 0, requests: 0, broken: 0, failed: 0 }

  const check = async (link: string) => {
    if (cache.has(link)) return cache.get(link)!
    if (stats.requests > 0) await sleep(REQUEST_DELAY_MS)
    stats.requests++
    const result = await checkLink(link)
    cache.set(link, result)
    if (!result) stats.failed++
    else if (result.broken) stats.broken++
    return result
  }

  try {
    const { results } = await db
      .prepare('SELECT id, website_link, variants FROM products WHERE is_archived = 0')
      .all<{ id: string; website_link: string | null; variants: string | null }>()

    for (const row of results) {
      const links = [row.website_link, ...parseVariants(row.variants).map((v) => v.website_link)].filter(isCheckableLink) as string[]
      if (links.length === 0) continue
      stats.products++
      for (const link of links) await check(link)

      // Проверка идёт минутами — за это время админ мог отредактировать карточку.
      // Перечитываем её и применяем результаты к свежей версии, а не к снимку.
      const fresh = await db
        .prepare('SELECT website_link, variants FROM products WHERE id = ?')
        .bind(row.id)
        .first<{ website_link: string | null; variants: string | null }>()
      if (!fresh) continue

      const { assignments, values } = planProductUpdate(fresh, cache, new Date().toISOString())
      await db.prepare(`UPDATE products SET ${assignments.join(', ')} WHERE id = ?`).bind(...values, row.id).run()
    }

    console.log(
      `[link-check] проверено карточек: ${stats.products}, запросов: ${stats.requests}, ` +
        `пропало с сайта: ${stats.broken}, не удалось проверить: ${stats.failed}`
    )
    return stats
  } finally {
    running = false
  }
}
