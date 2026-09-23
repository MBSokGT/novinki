import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { parseComplexbarPage } from '@/lib/complexbarParser'

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8')

describe('parseComplexbarPage', () => {
  it('разбирает страницу-каталог: все карточки с названием, брендом, артикулом, фото и ссылкой', () => {
    const products = parseComplexbarPage(fixture('complexbar-listing.html'), 'https://complexbar.ru/brand-odk/')
    expect(products).toHaveLength(2)
    const articles = products.map((p) => p.article_number).sort()
    expect(articles).toEqual(['05045060', '05045263'])
    for (const p of products) {
      expect(p.name).toMatch(/ODK/)
      expect(p.brand).toBe('ODK')
      expect(p.image_url).toMatch(/^https:\/\//)
      expect(p.website_link).toMatch(/^https:\/\/complexbar\.ru\/product\//)
    }
  })

  it('разбирает страницу одного товара и находит фото (там src, а не data-src)', () => {
    const url = 'https://complexbar.ru/product/sirop-odk-05045060/'
    const [product] = parseComplexbarPage(fixture('complexbar-product.html'), url)
    expect(product.name).toMatch(/Агава/)
    expect(product.article_number).toBe('05045060')
    expect(product.image_url).toMatch(/^https:\/\/.+\.jpg$/)
    expect(product.website_link).toBe(url)
  })

  it('на странице без товаров возвращает пустой список', () => {
    expect(parseComplexbarPage('<html><body><p>Ничего</p></body></html>', 'https://complexbar.ru/')).toEqual([])
  })
})
