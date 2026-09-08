// Подсказка категории учится на уже существующих товарах, а не на жёстком
// словаре "тарелка → Посуда" — так она сама подстраивается под то, как
// конкретно эта компания называет свои категории, и не требует ручного
// обновления при добавлении новых категорий.
const MIN_WORD_LENGTH = 4

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((w) => w.length >= MIN_WORD_LENGTH)
}

export interface CategorizedProduct {
  name: string
  category?: string | null
}

/** Индекс "слово → счётчик категорий", строить один раз на список товаров. */
export function buildCategoryWordIndex(products: CategorizedProduct[]): Map<string, Map<string, number>> {
  const index = new Map<string, Map<string, number>>()
  for (const p of products) {
    if (!p.category) continue
    for (const word of significantWords(p.name)) {
      let byCategory = index.get(word)
      if (!byCategory) {
        byCategory = new Map()
        index.set(word, byCategory)
      }
      byCategory.set(p.category, (byCategory.get(p.category) || 0) + 1)
    }
  }
  return index
}

/** По названию нового товара предлагает самую вероятную категорию из индекса. */
export function suggestCategory(name: string, index: Map<string, Map<string, number>>): string | null {
  const words = significantWords(name)
  if (words.length === 0) return null

  const totals = new Map<string, number>()
  for (const word of words) {
    const byCategory = index.get(word)
    if (!byCategory) continue
    for (const [category, count] of byCategory) {
      totals.set(category, (totals.get(category) || 0) + count)
    }
  }
  if (totals.size === 0) return null

  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0]
}
