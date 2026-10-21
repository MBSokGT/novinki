import { featuresToFields } from './featuresToFields'

export interface GeneratedText {
  description: string
  advantages: string
}

// Короткое описание и преимущества по характеристикам со страницы
// complexbar.ru. Берём только то, что там написано, ничего не додумываем:
// маркетинговых обещаний нет, есть материал, размеры, серия и то, что
// сайт явно отметил (посудомойка, СВЧ, мерное деление). Админ правит текст
// перед сохранением.
//
// pages — характеристики всех позиций серии. В текст попадает только то, что
// у позиций совпадает (материал, размеры); различающееся (цвет) перечисляется.
type Features = Record<string, string>

const MATERIAL_BENEFITS: Array<[RegExp, string]> = [
  [/нержав/i, 'Нержавеющая сталь прочная, не ржавеет и легко моется'],
  [/стекл/i, 'Стекло не впитывает запахи и вкусы'],
  [/фарфор/i, 'Фарфор не впитывает запахи и вкусы'],
]

const SIZE_LABELS: Array<[RegExp, string]> = [
  [/^высота/i, 'высота'],
  [/^длина/i, 'длина'],
  [/^ширина/i, 'ширина'],
  [/^диаметр/i, 'диаметр'],
  [/^глубина/i, 'глубина'],
]

const capitalize = (text: string) => (text ? text[0].toUpperCase() + text.slice(1) : text)
const clean = (value?: string) => (value || '').replace(/\s+/g, ' ').trim()

function valueOf(features: Features, label: RegExp): string {
  const key = Object.keys(features).find((k) => label.test(k))
  return key ? clean(features[key]) : ''
}

// Значение, одинаковое у всех позиций; иначе пусто
function common(pages: Features[], label: RegExp): string {
  const values = pages.map((p) => valueOf(p, label))
  return values.every((v) => v && v === values[0]) ? values[0] : ''
}

function unique(pages: Features[], label: RegExp): string[] {
  return [...new Set(pages.map((p) => valueOf(p, label).toLowerCase()).filter(Boolean))]
}

// «Сталь нержавеющая» читается лучше как «нержавеющая сталь»
function materialPhrase(material: string): string {
  const lower = material.toLowerCase()
  const swapped = lower.match(/^(сталь|стекло|фарфор|керамика|дерево|пластик)\s+([а-яё-]+)$/)
  return swapped ? `${swapped[2]} ${swapped[1]}` : lower
}

function formatNumber(n: number): string {
  return String(n).replace('.', ',')
}

function volumeOf(features: Features): { text: string; double: boolean } | null {
  const keys = Object.keys(features).filter((k) => /^объ[её]м/i.test(k))
  const numbers = keys
    .map((k) => parseFloat(clean(features[k]).replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b)
  if (numbers.length === 0) return null
  const unique = [...new Set(numbers)]
  // На сайте объём бывает записан в мл и в литрах; ≥ 1000 мл показываем литрами
  const text =
    unique.every((n) => n >= 1000)
      ? `${unique.map((n) => formatNumber(n / 1000)).join('/')} л`
      : `${unique.map(formatNumber).join('/')} мл`
  return { text, double: keys.some((k) => /втор/i.test(k)) && unique.length > 1 }
}

export function describeFromFeatures(pages: Features[]): GeneratedText {
  if (pages.length === 0) return { description: '', advantages: '' }

  const material = common(pages, /^материал/i)
  const colors = unique(pages, /^цвет/i)
  const shape = common(pages, /^форма/i)
  const series = common(pages, /^серия/i)
  const brand = common(pages, /^бренд/i)
  const country = common(pages, /^страна/i)

  const volumes = pages.map(volumeOf)
  const volume = volumes.every((v) => v && v.text === volumes[0]?.text) ? volumes[0] : null

  const sizes: string[] = []
  for (const [label, word] of SIZE_LABELS) {
    const value = common(pages, label)
    const n = parseFloat(value.replace(',', '.'))
    if (Number.isFinite(n) && n > 0) sizes.push(`${word} ${formatNumber(n)} мм`)
  }

  const description: string[] = []
  const look = [
    material ? materialPhrase(material) : '',
    colors.length > 0 ? `цвет — ${colors.join(', ')}` : '',
    shape ? `форма — ${shape.toLowerCase()}` : '',
  ].filter(Boolean)
  if (look.length > 0) description.push(`${capitalize(look.join(', '))}.`)
  if (volume) description.push(`Объём ${volume.text}.`)
  if (sizes.length > 0) description.push(`Размеры: ${sizes.join(', ')}.`)
  if (brand || series) description.push(`${[brand ? `Бренд ${brand}` : '', series ? (brand ? `серия ${series}` : `Серия ${series}`) : ''].filter(Boolean).join(', ')}.`)
  if (country) description.push(`Страна производства: ${capitalize(country.toLowerCase())}.`)

  const fields = pages.map((p) => featuresToFields(p))
  const advantages: string[] = []
  const benefit = MATERIAL_BENEFITS.find(([re]) => re.test(material))
  if (benefit) advantages.push(benefit[1])
  if (fields.every((f) => f.is_dishwasher_safe)) advantages.push('Можно мыть в посудомоечной машине')
  if (fields.every((f) => f.is_microwave_safe)) advantages.push('Подходит для микроволновой печи')
  const tMin = fields[0].temp_min
  const tMax = fields[0].temp_max
  if (fields.every((f) => f.temp_min === tMin && f.temp_max === tMax)) {
    if (tMin !== undefined && tMax !== undefined) advantages.push(`Выдерживает температуру от ${tMin} до ${tMax} °C`)
    else if (tMax !== undefined) advantages.push(`Выдерживает температуру до ${tMax} °C`)
  }
  if (volume?.double) advantages.push(`Два объёма в одном: ${volume.text.replace('/', ' и ')}`)
  if (pages.every((p) => /^да/i.test(valueOf(p, /мерного деления/i)))) advantages.push('Есть мерное деление')
  if (series) advantages.push(`Входит в серию ${series} — удобно собрать комплект в одном стиле`)

  return {
    description: description.join(' '),
    advantages: advantages.length > 0 ? `${advantages.join('. ')}.` : '',
  }
}
