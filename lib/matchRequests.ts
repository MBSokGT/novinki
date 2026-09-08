import { fuzzyMatches } from './fuzzySearch'

export interface OpenRequest {
  id: string
  name: string
  product: string
  article?: string | null
}

export interface MatchableProduct {
  name: string
  brand: string
  tags?: string | null
  category?: string | null
  article_number?: string | null
}

// Слова длиной < 4 обычно "хочу", "нужен", "такой", "для" и т.п. — не несут
// смысла для сопоставления, только шумят.
const MIN_WORD_LENGTH = 4

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((w) => w.length >= MIN_WORD_LENGTH)
}

/**
 * Заявка считается закрытой новым товаром, если совпал артикул, либо если
 * заметная доля значимых слов из текста заявки нашлась (с допуском на
 * опечатки/раскладку) в названии/бренде/тегах/категории товара.
 */
export function requestMatchesProduct(request: OpenRequest, product: MatchableProduct): boolean {
  const reqArticle = (request.article || '').trim()
  const prodArticle = (product.article_number || '').trim()
  if (reqArticle && prodArticle && reqArticle.toLowerCase() === prodArticle.toLowerCase()) return true

  const words = significantWords(request.product || '')
  if (words.length === 0) return false

  const fields = [product.name, product.brand, product.tags, product.category]
  const matchCount = words.filter((w) => fuzzyMatches(fields, w)).length
  const threshold = Math.max(1, Math.ceil(words.length * 0.4))
  return matchCount >= threshold
}

export function findMatchingRequests<T extends OpenRequest>(product: MatchableProduct, openRequests: T[]): T[] {
  return openRequests.filter((r) => requestMatchesProduct(r, product))
}
