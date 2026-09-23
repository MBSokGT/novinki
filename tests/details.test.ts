import { describe, expect, it } from 'vitest'
import { parseProductFeatures, parseProductPrice } from '@/lib/complexbarParser'
import { featuresToFields } from '@/lib/featuresToFields'
import { changedProductFields } from '@/lib/db'
import { formatPrice, productPriceSummary } from '@/components/AvailabilityBadge'

const feature = (label: string, value: string) =>
  `<div class="ty-product-feature"><div class="ty-product-feature__label"><span>${label}</span></div><div class="ty-product-feature__value">\n  <input type="checkbox"> <a>Найти похожие</a>\n ${value} </div></div>`

describe('цена со страницы complexbar.ru', () => {
  it('берёт цену из разметки товара', () => {
    const html = `<script type="application/ld+json">{"@type":"http:\\/\\/schema.org\\/Product","offers":[{"@type":"Offer","price":1646,"priceCurrency":"RUB"}]}</script>`
    expect(parseProductPrice(html)).toEqual({ price: 1646, currency: 'RUB' })
  })
  it('без разметки — null', () => {
    expect(parseProductPrice('<p>нет</p>')).toBeNull()
  })
})

describe('характеристики → поля карточки', () => {
  const html = [
    feature('Материал', 'Стекло хрустальное'),
    feature('Серия', 'Tribute Collection'),
    feature('Использование в посудомоечной машине', 'Да'),
    feature('Использование в СВЧ', 'Нет'),
    feature('Условия хранения', 'Хранить в сухом месте'),
    feature('Срок хранения', '24'),
    feature('Период срока хранения', 'Месяц'),
    feature('Артикул производителя', '-'),
  ].join('')

  it('читает характеристики без «Найти похожие» и пустых значений', () => {
    const f = parseProductFeatures(html)
    expect(f['Материал']).toBe('Стекло хрустальное')
    expect(f).not.toHaveProperty('Артикул производителя')
  })

  it('раскладывает по полям формы', () => {
    expect(featuresToFields(parseProductFeatures(html))).toEqual({
      is_dishwasher_safe: true,
      attention_points: 'Хранить в сухом месте. Срок хранения: 24 мес.',
      tags: 'стекло хрустальное, tribute collection',
    })
  })

  it('понимает температуру диапазоном и по отдельности', () => {
    expect(featuresToFields({ 'Температурный режим (°C)': 'от −20 до +250' })).toMatchObject({ temp_min: -20, temp_max: 250 })
    expect(featuresToFields({ 'Термостойкость (°C)': '300' })).toMatchObject({ temp_max: 300 })
    expect(featuresToFields({ 'Минимальная температура': '-40' })).toMatchObject({ temp_min: -40 })
  })
})

describe('история правок: какие поля изменились', () => {
  const before = { id: '1', name: 'Бокал', is_dishwasher_safe: true, variants: [{ article_number: '1' }], temp_min: null, updated_by: 'a' }
  it('находит изменённые поля и игнорирует служебные', () => {
    expect(changedProductFields(before, { name: 'Бокал новый', is_dishwasher_safe: true, updated_by: 'b', temp_min: null })).toEqual(['name'])
  })
  it('не считает правкой одинаковые значения в разном виде', () => {
    expect(changedProductFields(before, { variants: '[{"article_number":"1"}]', temp_min: '', is_dishwasher_safe: 1 as unknown as boolean })).toEqual([])
  })
})

describe('формат цены', () => {
  it('рубли и тенге', () => {
    expect(formatPrice(1646, 'RUB')).toBe(`${new Intl.NumberFormat('ru-RU').format(1646)} ₽`)
    expect(formatPrice(12500, 'KZT')).toContain('₸')
    expect(formatPrice(null)).toBeNull()
  })
  it('у серии — "от" минимальной цены', () => {
    const v = (price: number) => ({ image_url: '', article_number: '1', website_link: '', price, currency: 'RUB' })
    expect(productPriceSummary({ variants: [v(1253), v(470), v(900)] })).toBe(`от ${formatPrice(470, 'RUB')}`)
    expect(productPriceSummary({ variants: [v(500), v(500)] })).toBe(formatPrice(500, 'RUB'))
    expect(productPriceSummary({ site_price: 1646, site_currency: 'RUB', variants: [v(1)] })).toBe(formatPrice(1646, 'RUB'))
  })
})
