import { describe, expect, it } from 'vitest'
import { fromTrashRecord, toTrashRecord } from '@/lib/trashPayload'
import type { Product } from '@/types/product'

const product: Product = {
  id: 'p1',
  name: 'Бокал',
  brand: 'RONA',
  article_number: '01040922',
  description: 'Описание',
  image_url: '/api/uploads/products/a.jpg',
  images: ['/api/uploads/products/a.jpg', '/api/uploads/products/b.jpg'],
  flyer_url: '/api/uploads/flyers/f.pdf',
  price_list_url: '/api/uploads/flyers/p.xlsx',
  advantages: 'Хрусталь',
  attention_points: 'Хрупкое',
  website_link: 'https://complexbar.ru/product/x/',
  category: 'Стекло',
  year: '2026',
  tags: 'бокалы',
  order_multiple: '6',
  variants: [{ image_url: '/api/uploads/products/v.jpg', article_number: '01050260', website_link: 'https://complexbar.ru/product/y/' }],
  price: 450,
  is_supplier_novelty: true,
  is_dishwasher_safe: true,
  is_microwave_safe: false,
  temp_min: -10,
  temp_max: 90,
  created_at: '2026-01-01T00:00:00.000Z',
}

describe('корзина: удаление и восстановление', () => {
  it('ни одно поле карточки не теряется при переносе в корзину и обратно', () => {
    const now = new Date('2026-09-01T00:00:00.000Z')
    const trashed = toTrashRecord(product, now)
    expect(trashed.original_product_id).toBe('p1')
    expect(trashed.deleted_at).toBe(now.toISOString())

    const restored = fromTrashRecord(trashed)
    const { id, created_at, ...content } = product
    void id
    void created_at
    expect(restored).toEqual({ ...content, is_archived: false })
  })

  it('пустые необязательные поля заменяются значениями по умолчанию', () => {
    const minimal = { ...product, images: undefined, variants: undefined, price: undefined, category: undefined }
    const trashed = toTrashRecord(minimal)
    expect(trashed.images).toEqual([])
    expect(trashed.variants).toEqual([])
    expect(trashed.price).toBeNull()
    expect(trashed.category).toBe('')
  })
})
