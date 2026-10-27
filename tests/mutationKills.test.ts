import { describe, expect, it } from 'vitest'
import { buildDuplicateIndex, findDuplicate } from '@/lib/articles'
import { buildNewProduct } from '@/lib/articleImport'
import { describeFromFeatures } from '@/lib/autoDescription'
import { featuresToFields } from '@/lib/featuresToFields'
import { planOfflineSync } from '@/lib/offlineSyncPlan'
import type { Product } from '@/types/product'

// Границы и пустые значения, на которых раньше «не замечалась» порча кода

describe('индекс дублей', () => {
  const products = [
    { id: 'first', name: 'Первый', article_number: '111', website_link: 'https://complexbar.ru/product/same/', variants: [] },
    { id: 'second', name: 'Второй', article_number: '0111', website_link: 'https://complexbar.ru/product/same', variants: [] },
    { id: 'empty', name: 'Без артикула', article_number: '', website_link: '', variants: [{ image_url: '', article_number: '', website_link: '' }] },
  ] as unknown as Product[]
  const index = buildDuplicateIndex(products)

  it('пустые артикулы и ссылки в индекс не попадают', () => {
    expect(index.byArticle.has('')).toBe(false)
    expect(index.byLink.has('')).toBe(false)
    expect(index.byArticle.size).toBe(1)
    expect(index.byLink.size).toBe(1)
  })

  it('при совпадении остаётся первый товар', () => {
    expect(findDuplicate(index, { article: '111' })?.id).toBe('first')
    expect(findDuplicate(index, { link: 'complexbar.ru/product/same' })?.id).toBe('first')
  })

  it('своя карточка не дубль по артикулу, но дубль по ссылке с другой карточкой — да', () => {
    expect(findDuplicate(index, { article: '111', link: 'https://complexbar.ru/product/same/' }, 'first')).toBeNull()
    const other = [
      { id: 'a', name: 'А', article_number: '5', website_link: '', variants: [] },
      { id: 'b', name: 'Б', article_number: '', website_link: 'https://complexbar.ru/product/x/', variants: [] },
    ] as unknown as Product[]
    expect(findDuplicate(buildDuplicateIndex(other), { article: '5', link: 'https://complexbar.ru/product/x/' }, 'a')?.id).toBe('b')
  })
})

describe('карточка из списка артикулов: значения по умолчанию', () => {
  const item = { name: 'Н', brand: 'Б', article_number: '1', image_url: '', website_link: 'https://complexbar.ru/p/' }
  const make = (fields: object) => buildNewProduct({ item, article: '1', fields, category: null, year: '', photo: '', publish: true })

  it('это не новинка поставщика и не посудомоечное по умолчанию', () => {
    expect(make({})).toMatchObject({ is_supplier_novelty: false, is_dishwasher_safe: false, is_microwave_safe: false })
  })

  it('нулевая температура — это 0, а не «не указано»', () => {
    expect(make({ temp_min: 0, temp_max: 0 })).toMatchObject({ temp_min: 0, temp_max: 0 })
  })
})

describe('описание: границы чисел', () => {
  const desc = (f: Record<string, string>) => describeFromFeatures([f]).description

  it('объём: 1 мл — это объём, 0 и не число — нет; ровно 1000 мл — литр', () => {
    expect(desc({ 'Объем (мл)': '1' })).toBe('Объём 1 мл.')
    expect(desc({ 'Объем (мл)': '0' })).toBe('')
    expect(desc({ 'Объем (мл)': 'много' })).toBe('')
    expect(desc({ 'Объем (мл)': '1000' })).toBe('Объём 1 л.')
    expect(desc({ 'Объем (мл)': '999' })).toBe('Объём 999 мл.')
  })

  it('«два объёма в одном» только если названо «второй» и значений правда два', () => {
    const adv = (f: Record<string, string>) => describeFromFeatures([f]).advantages
    expect(adv({ 'Объем второй (мл)': '60' })).toBe('')
    expect(adv({ 'Объем (мл)': '30', 'Объем 2 (мл)': '60' })).toBe('')
    expect(adv({ 'Объем (мл)': '30', 'Объем второй (мл)': '60' })).toBe('Два объёма в одном: 30 и 60 мл.')
  })

  it('размер: 1 мм — размер, 0 и не число — нет; один размер тоже перечисляется', () => {
    expect(desc({ 'Длина (мм)': '1' })).toBe('Размеры: длина 1 мм.')
    expect(desc({ 'Длина (мм)': '0' })).toBe('')
    expect(desc({ 'Длина (мм)': 'н/д' })).toBe('')
  })

  it('температуру пишет, только если и минимум, и максимум одинаковы у всех позиций', () => {
    const page = (max: string) => ({ 'Температура от': '5', 'Температура макс': max })
    expect(describeFromFeatures([page('40'), page('40')]).advantages).toBe('Выдерживает температуру от 5 до 40 °C.')
    expect(describeFromFeatures([page('40'), page('50')]).advantages).toBe('')
    const minDiffers = describeFromFeatures([{ 'Температура от': '5', 'Температура макс': '40' }, { 'Температура от': '10', 'Температура макс': '40' }])
    expect(minDiffers.advantages).toBe('')
  })
})

describe('характеристики → поля: ветки', () => {
  it('пустые характеристики не дают никаких полей', () => {
    expect(featuresToFields({})).toEqual({})
    expect(featuresToFields({ 'Серия': '' })).toEqual({})
  })

  it('одно условие хранения и один тег — уже поле', () => {
    expect(featuresToFields({ 'Условия хранения': 'В сухом месте' })).toEqual({ attention_points: 'В сухом месте.' })
    expect(featuresToFields({ Вкус: 'Малина' })).toEqual({ tags: 'малина' })
  })

  it('срок хранения без цифр не пишем', () => {
    expect(featuresToFields({ 'Срок хранения': 'не ограничен' })).toEqual({})
    expect(featuresToFields({ 'Срок хранения': '12', 'Период срока хранения': 'месяцев' })).toEqual({ attention_points: 'Срок хранения: 12 мес.' })
  })

  it('температура: «до» без «макс» и пара чисел в любом порядке', () => {
    expect(featuresToFields({ 'Температура до': '80' })).toEqual({ temp_max: 80 })
    expect(featuresToFields({ 'Температура применения': '100 / 20' })).toEqual({ temp_min: 20, temp_max: 100 })
    expect(featuresToFields({ 'Температура применения': '20 — 100' })).toEqual({ temp_min: 20, temp_max: 100 })
    expect(featuresToFields({ 'Температура применения': '-20 - -5' })).toEqual({ temp_min: -20, temp_max: -5 })
    expect(featuresToFields({ 'Температура хранения': '-18' }).temp_max).toBeUndefined()
  })
})

describe('план синхронизации: одиночные файлы', () => {
  const origin = 'https://s.test'
  const base = { staticPrefix: `${origin}/_next/static/`, imagePrefix: `${origin}/_next/image?`, wantedImages: new Map<string, string>(), onScreen: new Set<string>() }

  it('один загруженный файл приложения уже считается: устаревшее удаляется, новое скачивается', () => {
    const plan = planOfflineSync({ ...base, known: new Set([`${origin}/_next/static/old.js`]), loadedStatic: [`${origin}/_next/static/new.js`] })
    expect(plan.deleteUrls).toEqual([`${origin}/_next/static/old.js`])
    expect(plan.fetchStatic).toEqual([`${origin}/_next/static/new.js`])
  })
})
