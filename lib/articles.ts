import type { Product } from '@/types/product'

// Артикул на complexbar.ru пишется с нулями в начале (02030586), а в прайсах и
// анонсах — без них (2030586): для сравнения нули и регистр не важны.
export function normalizeArticle(article?: string | null): string {
  return (article || '').trim().toLowerCase().replace(/\s+/g, '').replace(/^0+(?=.)/, '')
}

// Вытаскивает артикулы (5–8 цифр) из любого вставленного текста — через запятую,
// пробел, с новой строки, вместе с названиями, как из письма или PDF.
export function parseArticleList(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const match of text.matchAll(/(?<![\d])\d{5,8}(?![\d])/g)) {
    const key = normalizeArticle(match[0])
    if (seen.has(key)) continue
    seen.add(key)
    result.push(match[0])
  }
  return result
}

// Ссылки на один товар отличаются хостом (город) и хвостом — сравниваем путь.
export function normalizeLink(link?: string | null): string {
  const raw = (link || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.replace(/\/+$/, '').toLowerCase()
    return host === 'complexbar.ru' || host.endsWith('.complexbar.ru') ? `complexbar.ru${path}` : `${host}${path}`
  } catch {
    return raw.toLowerCase()
  }
}

type IndexedProduct = Pick<Product, 'id' | 'name' | 'article_number' | 'website_link' | 'variants'> & { is_archived?: boolean }

export interface DuplicateHit {
  id: string
  name: string
  isArchived: boolean
  // По чему совпало: главный артикул, артикул варианта серии или ссылка
  via: 'article' | 'variant' | 'link'
}

export interface DuplicateIndex {
  byArticle: Map<string, DuplicateHit>
  byLink: Map<string, DuplicateHit>
}

export function buildDuplicateIndex(products: IndexedProduct[]): DuplicateIndex {
  const byArticle = new Map<string, DuplicateHit>()
  const byLink = new Map<string, DuplicateHit>()
  for (const p of products) {
    const hit = (via: DuplicateHit['via']): DuplicateHit => ({ id: p.id, name: p.name, isArchived: Boolean(p.is_archived), via })
    const main = normalizeArticle(p.article_number)
    if (main && !byArticle.has(main)) byArticle.set(main, hit('article'))
    for (const v of p.variants || []) {
      const key = normalizeArticle(v.article_number)
      if (key && !byArticle.has(key)) byArticle.set(key, hit('variant'))
    }
    const link = normalizeLink(p.website_link)
    if (link && !byLink.has(link)) byLink.set(link, hit('link'))
  }
  return { byArticle, byLink }
}

// Ищет, есть ли уже такой товар. excludeId — карточка, которую правят сейчас
// (сама с собой она дублем не считается).
export function findDuplicate(
  index: DuplicateIndex,
  query: { article?: string | null; link?: string | null },
  excludeId?: string | null
): DuplicateHit | null {
  const article = normalizeArticle(query.article)
  const byArticle = article ? index.byArticle.get(article) : undefined
  if (byArticle && byArticle.id !== excludeId) return byArticle
  const link = normalizeLink(query.link)
  const byLink = link ? index.byLink.get(link) : undefined
  if (byLink && byLink.id !== excludeId) return byLink
  return null
}
