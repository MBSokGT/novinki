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

interface Facts {
  material: string
  colors: string[]
  shape: string
  series: string
  brand: string
  country: string
  volume: ReturnType<typeof volumeOf>
  sizes: string[]
}

// Что одинаково у всех позиций серии (и что у них различается — цвета)
function gatherFacts(pages: Features[]): Facts {
  const volumes = pages.map(volumeOf)
  return {
    material: common(pages, /^материал/i),
    colors: unique(pages, /^цвет/i),
    shape: common(pages, /^форма/i),
    series: common(pages, /^серия/i),
    brand: common(pages, /^бренд/i),
    country: common(pages, /^страна/i),
    volume: volumes.every((v) => v && v.text === volumes[0]?.text) ? volumes[0] : null,
    sizes: sizesOf(pages),
  }
}

function sizesOf(pages: Features[]): string[] {
  const sizes: string[] = []
  for (const [label, word] of SIZE_LABELS) {
    const n = parseFloat(common(pages, label).replace(',', '.'))
    if (Number.isFinite(n) && n > 0) sizes.push(`${word} ${formatNumber(n)} мм`)
  }
  return sizes
}

function lookSentence(f: Facts): string {
  const look = [
    f.material ? materialPhrase(f.material) : '',
    f.colors.length > 0 ? `цвет — ${f.colors.join(', ')}` : '',
    f.shape ? `форма — ${f.shape.toLowerCase()}` : '',
  ].filter(Boolean)
  return look.length > 0 ? `${capitalize(look.join(', '))}.` : ''
}

// «Бренд X, серия Y.»; без бренда — «Серия Y.»
function identitySentence(f: Facts): string {
  const parts = [f.brand ? `Бренд ${f.brand}` : '', f.series ? (f.brand ? `серия ${f.series}` : `Серия ${f.series}`) : ''].filter(Boolean)
  return parts.length > 0 ? `${parts.join(', ')}.` : ''
}

function describe(f: Facts): string {
  return [
    lookSentence(f),
    f.volume ? `Объём ${f.volume.text}.` : '',
    f.sizes.length > 0 ? `Размеры: ${f.sizes.join(', ')}.` : '',
    identitySentence(f),
    f.country ? `Страна производства: ${capitalize(f.country.toLowerCase())}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

type ParsedFields = ReturnType<typeof featuresToFields>

function temperatureAdvantage(fields: ParsedFields[]): string {
  const { temp_min: min, temp_max: max } = fields[0]
  if (!fields.every((f) => f.temp_min === min && f.temp_max === max)) return ''
  if (min !== undefined && max !== undefined) return `Выдерживает температуру от ${min} до ${max} °C`
  return max !== undefined ? `Выдерживает температуру до ${max} °C` : ''
}

function advantagesOf(f: Facts, pages: Features[]): string {
  const fields = pages.map((p) => featuresToFields(p))
  const all = (flag: (x: ParsedFields) => boolean | undefined) => fields.every((x) => flag(x))
  const list = [
    MATERIAL_BENEFITS.find(([re]) => re.test(f.material))?.[1],
    all((x) => x.is_dishwasher_safe) ? 'Можно мыть в посудомоечной машине' : '',
    all((x) => x.is_microwave_safe) ? 'Подходит для микроволновой печи' : '',
    temperatureAdvantage(fields),
    f.volume?.double ? `Два объёма в одном: ${f.volume.text.replace('/', ' и ')}` : '',
    pages.every((p) => /^да/i.test(valueOf(p, /мерного деления/i))) ? 'Есть мерное деление' : '',
    f.series ? `Входит в серию ${f.series} — удобно собрать комплект в одном стиле` : '',
  ].filter(Boolean)
  return list.length > 0 ? `${list.join('. ')}.` : ''
}

export function describeFromFeatures(pages: Features[]): GeneratedText {
  if (pages.length === 0) return { description: '', advantages: '' }
  const facts = gatherFacts(pages)
  return { description: describe(facts), advantages: advantagesOf(facts, pages) }
}
