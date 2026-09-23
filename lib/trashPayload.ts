import type { Product, ProductVariant } from '@/types/product'

// Поля карточки, которые переезжают в корзину и обратно. Одна общая функция
// вместо трёх копий списка полей — раньше при добавлении новой колонки
// (варианты, цена) её забывали в одной из копий, и данные молча терялись.
export interface ProductContent {
  name: string
  brand: string
  article_number?: string
  description: string
  image_url: string
  images?: string[]
  flyer_url?: string
  price_list_url?: string
  advantages: string
  attention_points: string
  website_link?: string
  category?: string
  year?: string
  tags?: string
  order_multiple?: string
  variants?: ProductVariant[]
  price?: number | null
  is_supplier_novelty?: boolean
  is_dishwasher_safe?: boolean
  is_microwave_safe?: boolean
  temp_min?: number | null
  temp_max?: number | null
}

function copyContent(p: ProductContent) {
  return {
    name: p.name,
    brand: p.brand,
    article_number: p.article_number,
    description: p.description,
    image_url: p.image_url,
    images: p.images || [],
    flyer_url: p.flyer_url || '',
    price_list_url: p.price_list_url || '',
    advantages: p.advantages,
    attention_points: p.attention_points,
    website_link: p.website_link,
    category: p.category || '',
    year: p.year || '',
    tags: p.tags || '',
    order_multiple: p.order_multiple || '',
    variants: p.variants || [],
    price: p.price ?? null,
    is_supplier_novelty: Boolean(p.is_supplier_novelty),
    is_dishwasher_safe: Boolean(p.is_dishwasher_safe),
    is_microwave_safe: Boolean(p.is_microwave_safe),
    temp_min: p.temp_min ?? null,
    temp_max: p.temp_max ?? null,
  }
}

export function toTrashRecord(product: Product, now = new Date()) {
  return { ...copyContent(product), original_product_id: product.id, deleted_at: now.toISOString() }
}

export function fromTrashRecord(deleted: ProductContent) {
  return { ...copyContent(deleted), is_archived: false }
}
