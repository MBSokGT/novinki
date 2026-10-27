import { describe, expect, it } from 'vitest'
import { describeFromFeatures } from '@/lib/autoDescription'

// Поведение, которое фиксируем перед разбором функции на части
describe('описание по характеристикам: ветки', () => {
  it('бренд без серии и серия без бренда пишутся по-разному', () => {
    expect(describeFromFeatures([{ Бренд: 'ODK' }]).description).toBe('Бренд ODK.')
    expect(describeFromFeatures([{ Серия: 'Pure' }]).description).toBe('Серия Pure.')
    expect(describeFromFeatures([{ Бренд: 'ODK', Серия: 'Pure' }]).description).toBe('Бренд ODK, серия Pure.')
  })

  it('отмечает посудомойку, микроволновку и температуру только если это у всех позиций', () => {
    const base = { Материал: 'Фарфор', 'Посудомоечная машина': 'Да', 'Применение в СВЧ': 'Да', 'Максимальная температура': '250' }
    const both = describeFromFeatures([base, base]).advantages
    expect(both).toContain('Можно мыть в посудомоечной машине')
    expect(both).toContain('Подходит для микроволновой печи')
    expect(both).toContain('Выдерживает температуру до 250 °C')
    expect(both).toContain('Фарфор не впитывает запахи и вкусы')

    const mixed = describeFromFeatures([base, { ...base, 'Посудомоечная машина': 'Нет' }]).advantages
    expect(mixed).not.toContain('посудомоечной')
    expect(mixed).toContain('микроволновой')
  })

  it('диапазон температур: от и до', () => {
    const { advantages } = describeFromFeatures([{ 'Температура применения': '-20 / 60' }])
    expect(advantages).toBe('Выдерживает температуру от -20 до 60 °C.')
  })

  it('стекло и объём в литрах, разный объём у серии не пишется', () => {
    expect(describeFromFeatures([{ Материал: 'Стекло', 'Объем (мл)': '1500' }])).toEqual({
      description: 'Стекло. Объём 1,5 л.',
      advantages: 'Стекло не впитывает запахи и вкусы.',
    })
    expect(describeFromFeatures([{ 'Объем (мл)': '200' }, { 'Объем (мл)': '300' }]).description).toBe('')
  })

  it('размеры: дробные значения и все названия измерений', () => {
    const { description } = describeFromFeatures([{ 'Высота (мм)': '65,5', 'Длина (мм)': '255', 'Ширина (мм)': '90', 'Диаметр (мм)': '76', 'Глубина (мм)': '10' }])
    expect(description).toBe('Размеры: высота 65,5 мм, длина 255 мм, ширина 90 мм, диаметр 76 мм, глубина 10 мм.')
  })

  it('страна пишется с заглавной, материал переставляется в «нержавеющая сталь»', () => {
    expect(describeFromFeatures([{ Страна: 'КИТАЙ', Материал: 'Сталь нержавеющая' }]).description).toBe('Нержавеющая сталь. Страна производства: Китай.')
    expect(describeFromFeatures([{ Материал: 'Дерево' }]).description).toBe('Дерево.')
  })
})
