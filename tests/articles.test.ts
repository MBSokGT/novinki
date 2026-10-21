import { describe, expect, it } from 'vitest'
import { buildDuplicateIndex, findDuplicate, normalizeArticle, normalizeLink, parseArticleList } from '@/lib/articles'
import { describeFromFeatures } from '@/lib/autoDescription'
import type { Product } from '@/types/product'

describe('список артикулов', () => {
  it('достаёт артикулы из любого текста и убирает повторы', () => {
    const text = '2030586, 2030587; 02030586\nАртикул 4145668 / MT-GLQ-26/B\n123 и 123456789'
    expect(parseArticleList(text)).toEqual(['2030586', '2030587', '4145668'])
  })
  it('нули в начале не мешают сравнению', () => {
    expect(normalizeArticle('02030586')).toBe(normalizeArticle(' 2030586 '))
  })
})

describe('поиск дублей', () => {
  const products = [
    { id: 'a', name: 'Стрейнер', article_number: '02030586', website_link: 'https://complexbar.ru/product/streyner-02030586/', variants: [] },
    { id: 'b', name: 'Серия ODK', article_number: '', website_link: '', variants: [{ image_url: '', article_number: '05045060', website_link: '' }] },
  ] as unknown as Product[]
  const index = buildDuplicateIndex(products)

  it('находит по артикулу без нулей', () => {
    expect(findDuplicate(index, { article: '2030586' })?.id).toBe('a')
  })
  it('находит по артикулу варианта серии', () => {
    expect(findDuplicate(index, { article: '5045060' })).toMatchObject({ id: 'b', via: 'variant' })
  })
  it('находит по ссылке другого города', () => {
    expect(findDuplicate(index, { link: 'https://spb.complexbar.ru/product/streyner-02030586' })?.id).toBe('a')
    expect(normalizeLink('https://www.example.com/x/')).toBe('example.com/x')
  })
  it('не считает карточку дублем самой себя', () => {
    expect(findDuplicate(index, { article: '2030586' }, 'a')).toBeNull()
    expect(findDuplicate(index, { article: '999999' })).toBeNull()
  })
})

describe('описание по характеристикам', () => {
  const onyx = { Бренд: 'Probar Premium', Серия: 'Onix', Страна: 'КИТАЙ', Материал: 'Сталь нержавеющая', 'Длина (мм)': '184', 'Ширина (мм)': '198', Цвет: 'Черный', Форма: 'Лапа' }
  it('пишет только то, что есть на сайте', () => {
    const { description, advantages } = describeFromFeatures([onyx])
    expect(description).toBe('Нержавеющая сталь, цвет — черный, форма — лапа. Размеры: длина 184 мм, ширина 198 мм. Бренд Probar Premium, серия Onix. Страна производства: Китай.')
    expect(advantages).toContain('Нержавеющая сталь прочная')
    expect(advantages).not.toContain('посудомоечной')
  })
  it('у серии перечисляет цвета и не пишет то, что различается', () => {
    const { description } = describeFromFeatures([onyx, { ...onyx, Цвет: 'Серебристый', Серия: 'Pure' }])
    expect(description).toContain('цвет — черный, серебристый')
    expect(description).not.toContain('серия')
  })
  it('понимает двусторонний джиггер и литры', () => {
    const jigger = describeFromFeatures([{ Материал: 'Сталь нержавеющая', 'Объем второй (мл)': '60', 'Объем (мм)': '30', 'Наличие мерного деления': 'Да' }])
    expect(jigger.description).toContain('Объём 30/60 мл.')
    expect(jigger.advantages).toContain('Два объёма в одном: 30 и 60 мл')
    expect(jigger.advantages).toContain('Есть мерное деление')
    expect(describeFromFeatures([{ 'Объем (мл)': '4000' }]).description).toBe('Объём 4 л.')
  })
  it('для пустых характеристик ничего не придумывает', () => {
    expect(describeFromFeatures([])).toEqual({ description: '', advantages: '' })
    expect(describeFromFeatures([{ Артикул: '1' }])).toEqual({ description: '', advantages: '' })
  })
})

describe('названия для листовки', () => {
  it('убирает размеры с сайта целиком, в том числе «L=230,B=89мм»', async () => {
    const { cleanProductName } = await import('@/lib/flyerPdf')
    expect(cleanProductName('Сквизер «Пробар Премиум» сталь нерж. ,L=230,B=89мм серебрист.')).toBe('Сквизер «Пробар Премиум» сталь нерж. серебрист.')
    expect(cleanProductName('Питчер «Пробар Премиум» сталь нерж. 0,6л ,H=119,L=128,B=87мм серебрист.')).toBe('Питчер «Пробар Премиум» сталь нерж. 0,6л серебрист.')
  })
})
