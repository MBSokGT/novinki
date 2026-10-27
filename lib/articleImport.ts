import { normalizeArticle } from '@/lib/articles'
import type { ScrapedProduct } from '@/lib/complexbarParser'
import type { FieldsFromFeatures } from '@/lib/featuresToFields'

// Создание карточек по списку артикулов: правила без обращений к сети и к
// базе — окно (components/ArticleListImportModal.tsx) только вызывает их.

// Только точное совпадение артикула: поиск сайта ищет и по словам, и на чужой
// артикул может вернуть посторонний товар — такой карточки нам не нужно.
export function pickExactMatch(found: readonly ScrapedProduct[], article: string): ScrapedProduct | undefined {
  const wanted = normalizeArticle(article)
  return found.find((f) => normalizeArticle(f.article_number) === wanted)
}

interface NewProductInput {
  item: ScrapedProduct
  // Артикул из списка — если на странице товара своего не оказалось
  article: string
  fields: FieldsFromFeatures
  category: string | null
  year: string
  // Адрес сохранённого у нас фото; пусто — карточка без фото
  photo: string
  publish: boolean
}

export function buildNewProduct({ item, article, fields, category, year, photo, publish }: NewProductInput) {
  return {
    name: item.name,
    brand: item.brand,
    article_number: item.article_number || article,
    description: fields.description || '',
    advantages: fields.advantages || '',
    attention_points: fields.attention_points || '',
    website_link: item.website_link,
    category: category || '',
    year,
    tags: fields.tags || '',
    order_multiple: '',
    is_supplier_novelty: false,
    is_dishwasher_safe: Boolean(fields.is_dishwasher_safe),
    is_microwave_safe: Boolean(fields.is_microwave_safe),
    temp_min: fields.temp_min ?? null,
    temp_max: fields.temp_max ?? null,
    variants: [],
    images: photo ? [photo] : [],
    image_url: photo,
    flyer_url: '',
    price_list_url: '',
    // Пока админ не проверил — карточка в архиве, сотрудники её не видят
    is_archived: !publish,
  }
}

// Уже существующие товары по умолчанию не отмечаем — чтобы не наплодить копий
export function preselected(rows: ReadonlyArray<{ status: string; duplicate?: unknown }>): number[] {
  return rows.flatMap((row, i) => (row.status === 'found' && !row.duplicate ? [i] : []))
}
