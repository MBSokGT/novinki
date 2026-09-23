import { describe, expect, it } from 'vitest'
import { isMirrorableImageHost } from '@/lib/mirrorImage'
import { productRows } from '@/lib/export'
import { requestMatchesProduct } from '@/lib/matchRequests'
import { localizeComplexbarLink } from '@/lib/complexbar-cities'
import type { Product } from '@/types/product'

describe('isMirrorableImageHost', () => {
  it('пускает только complexbar.ru и его CDN', () => {
    expect(isMirrorableImageHost('complexbar.ru')).toBe(true)
    expect(isMirrorableImageHost('spb.complexbar.ru')).toBe(true)
    expect(isMirrorableImageHost('jz9czo0xs6.ru.scalesta-cdn.com')).toBe(true)
    expect(isMirrorableImageHost('evil.com')).toBe(false)
    expect(isMirrorableImageHost('complexbar.ru.evil.com')).toBe(false)
    expect(isMirrorableImageHost('127.0.0.1')).toBe(false)
  })
})

describe('выгрузка в Excel', () => {
  it('выводит артикулы вариантов отдельной колонкой', () => {
    const [row] = productRows([
      {
        id: '1', name: 'Серия', brand: 'ODK', description: '', image_url: '', advantages: '', attention_points: '', created_at: '',
        article_number: '111',
        variants: [
          { image_url: '', article_number: '05045060', website_link: '' },
          { image_url: '', article_number: '', website_link: '' },
          { image_url: '', article_number: '05045263', website_link: '' },
        ],
      } as Product,
    ])
    expect(row['Артикул']).toBe('111')
    expect(row['Артикулы вариантов']).toBe('05045060, 05045263')
  })
})

describe('совпадение заявок с новинками', () => {
  const product = { name: 'Сироп «Агава» ODK', brand: 'ODK', article_number: '05045060' }
  it('совпадает по артикулу', () => {
    expect(requestMatchesProduct({ id: '1', name: 'Иван', product: 'что-то', article: '05045060' }, product)).toBe(true)
  })
  it('совпадает по словам с опечаткой', () => {
    expect(requestMatchesProduct({ id: '1', name: 'Иван', product: 'сироп агва' }, product)).toBe(true)
  })
  it('не совпадает с посторонней заявкой', () => {
    expect(requestMatchesProduct({ id: '1', name: 'Иван', product: 'бокалы для вина' }, product)).toBe(false)
  })
})

describe('ссылки по городам', () => {
  it('меняет хост ссылки complexbar.ru и не трогает чужие ссылки', () => {
    expect(localizeComplexbarLink('https://complexbar.ru/product/x/', 'spb.complexbar.ru')).toBe('https://spb.complexbar.ru/product/x/')
    expect(localizeComplexbarLink('https://example.com/x', 'spb.complexbar.ru')).toBe('https://example.com/x')
    expect(localizeComplexbarLink('https://complexbar.ru/product/x/', null)).toBe('https://complexbar.ru/product/x/')
  })
})
