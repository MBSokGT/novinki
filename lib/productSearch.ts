import type { Product } from '@/types/product'

// Поля, по которым ищется карточка: кроме основных — артикулы и названия
// вариантов, чтобы товар из серии находился по артикулу конкретной позиции.
export function productSearchFields(p: Pick<Product, 'name' | 'brand' | 'description' | 'tags' | 'article_number' | 'variants'>) {
  const variantFields = (p.variants || []).flatMap((v) => [v.article_number, v.name])
  return [p.name, p.brand, p.description, p.tags, p.article_number, ...variantFields]
}
