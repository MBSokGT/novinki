import { getLocalD1 } from '@/lib/sqlite'
import { normalizeMissQuery } from '@/lib/searchMissQuery'

const DAY_MS = 24 * 60 * 60 * 1000
const KEEP_ROWS = 1000

export interface SearchMiss {
  query: string
  count: number
  first_at: string
  last_at: string
}

// Записывает запрос, по которому в каталоге ничего не нашлось. Повтор того же
// запроса увеличивает счётчик. Возвращает false, если запрос записывать не надо.
export async function recordSearchMiss(raw: string, nowMs = Date.now(), keepRows = KEEP_ROWS): Promise<boolean> {
  const query = normalizeMissQuery(raw)
  if (!query) return false
  const db = getLocalD1()
  const at = new Date(nowMs).toISOString()
  await db
    .prepare('INSERT INTO search_misses (query, count, first_at, last_at) VALUES (?, 1, ?, ?) ON CONFLICT(query) DO UPDATE SET count = count + 1, last_at = excluded.last_at')
    .bind(query, at, at)
    .run()
  // Журнал не растёт бесконечно: остаются самые свежие
  await db
    .prepare('DELETE FROM search_misses WHERE query NOT IN (SELECT query FROM search_misses ORDER BY last_at DESC LIMIT ?)')
    .bind(keepRows)
    .run()
  return true
}

export async function listSearchMisses(nowMs = Date.now(), days = 30, limit = 100): Promise<SearchMiss[]> {
  const since = new Date(nowMs - days * DAY_MS).toISOString()
  const { results } = await getLocalD1()
    .prepare('SELECT query, count, first_at, last_at FROM search_misses WHERE last_at >= ? ORDER BY count DESC, last_at DESC LIMIT ?')
    .bind(since, limit)
    .all<SearchMiss>()
  return results
}

export async function deleteSearchMiss(query: string): Promise<void> {
  await getLocalD1().prepare('DELETE FROM search_misses WHERE query = ?').bind(query).run()
}

export async function clearSearchMisses(): Promise<void> {
  await getLocalD1().prepare('DELETE FROM search_misses').bind().run()
}
