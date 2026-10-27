import { describe, expect, it } from 'vitest'
import { buildNewProduct, pickExactMatch, preselected } from '@/lib/articleImport'

const found = (article: string, name = 'Товар') => ({ name, brand: 'Probar', article_number: article, image_url: 'thumb.png', website_link: `https://complexbar.ru/product/${article}/` })

describe('поиск товара по артикулу на сайте', () => {
  it('берёт только точное совпадение артикула, с нулями или без', () => {
    const results = [found('02030587', 'чужой'), found('02030586', 'нужный')]
    expect(pickExactMatch(results, '2030586')?.name).toBe('нужный')
  })

  it('одинокий результат с другим артикулом — не наш товар', () => {
    expect(pickExactMatch([found('03100433', 'Графин')], '9999999')).toBeUndefined()
    expect(pickExactMatch([], '2030586')).toBeUndefined()
  })
})

describe('карточка из найденного товара', () => {
  const item = found('02030586', 'Стрейнер')

  it('собирает карточку из сайта: название, бренд, ссылка, фото, характеристики', () => {
    const product = buildNewProduct({
      item,
      article: '2030586',
      fields: { description: 'Д', advantages: 'П', attention_points: 'В', tags: 'сталь', is_dishwasher_safe: true, temp_min: -5, temp_max: 40 },
      category: 'Барный инвентарь',
      year: '2026',
      photo: '/api/uploads/products/x.jpg',
      publish: false,
    })
    expect(product).toMatchObject({
      name: 'Стрейнер',
      brand: 'Probar',
      article_number: '02030586',
      website_link: 'https://complexbar.ru/product/02030586/',
      description: 'Д',
      advantages: 'П',
      attention_points: 'В',
      tags: 'сталь',
      category: 'Барный инвентарь',
      year: '2026',
      is_dishwasher_safe: true,
      is_microwave_safe: false,
      temp_min: -5,
      temp_max: 40,
      images: ['/api/uploads/products/x.jpg'],
      image_url: '/api/uploads/products/x.jpg',
      is_archived: true,
    })
  })

  it('без фото и характеристик остаются пустые поля, а не undefined; с публикацией — не в архиве', () => {
    const product = buildNewProduct({ item: { ...item, article_number: '' }, article: '2030586', fields: {}, category: null, year: '', photo: '', publish: true })
    expect(product).toMatchObject({ article_number: '2030586', category: '', description: '', tags: '', images: [], image_url: '', temp_min: null, temp_max: null, is_archived: false })
  })
})

describe('что отмечено в списке по умолчанию', () => {
  it('найденные и не дубли', () => {
    const rows = [
      { status: 'found' as const, duplicate: null },
      { status: 'found' as const, duplicate: { id: 'a' } },
      { status: 'missing' as const },
      { status: 'error' as const },
      { status: 'found' as const },
    ]
    expect(preselected(rows)).toEqual([0, 4])
  })
})
