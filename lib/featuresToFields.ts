// Раскладывает характеристики со страницы complexbar.ru по полям нашей
// карточки. Возвращает только то, что удалось уверенно определить — решение,
// перезаписывать ли уже заполненное, остаётся за формой.
export interface FieldsFromFeatures {
  is_dishwasher_safe?: boolean
  is_microwave_safe?: boolean
  temp_min?: number
  temp_max?: number
  attention_points?: string
  tags?: string
}

const TAG_LABELS = ['Материал', 'Вкус', 'Тип чая', 'Вид чая', 'Серия', 'Назначение', 'Форма']
const PERIODS: Record<string, string> = { месяц: 'мес.', месяцев: 'мес.', день: 'дн.', дней: 'дн.', год: 'г.', лет: 'лет' }

// \b в JS не понимает кириллицу — границы слов проверяем вручную
const isYes = (value: string) => /^да(?![а-яё])/i.test(value.trim())
const hasWord = (text: string, word: string) => new RegExp(`(^|[^а-яё])${word}(?![а-яё])`, 'i').test(text)

function numbers(value: string): number[] {
  return (value.replace(/[−–—]/g, '-').match(/-?\s*\d+(?:[.,]\d+)?/g) || []).map((n) => parseFloat(n.replace(/\s/g, '').replace(',', '.')))
}

export function featuresToFields(features: Record<string, string>): FieldsFromFeatures {
  const result: FieldsFromFeatures = {}
  const entries = Object.entries(features)

  for (const [label, value] of entries) {
    const l = label.toLowerCase()
    if (l.includes('посудомо') && isYes(value)) result.is_dishwasher_safe = true
    if ((l.includes('свч') || l.includes('микроволн')) && isYes(value)) result.is_microwave_safe = true

    if ((l.includes('температур') || l.includes('термостойк')) && !l.includes('хранени')) {
      const nums = numbers(value)
      if (l.includes('мин') || hasWord(l, 'от')) result.temp_min = nums[0]
      else if (l.includes('макс') || hasWord(l, 'до')) result.temp_max = nums[0]
      else if (nums.length >= 2) {
        result.temp_min = Math.min(nums[0], nums[1])
        result.temp_max = Math.max(nums[0], nums[1])
      } else if (nums.length === 1) result.temp_max = nums[0]
    }
  }

  const attention: string[] = []
  if (features['Условия хранения']) attention.push(features['Условия хранения'].replace(/\s*\.?\s*$/, '.'))
  const shelfLife = features['Срок хранения']
  if (shelfLife && /\d/.test(shelfLife)) {
    const period = (features['Период срока хранения'] || '').toLowerCase()
    attention.push(`Срок хранения: ${shelfLife} ${PERIODS[period] || period}`.trim() + (PERIODS[period] ? '' : '.'))
  }
  if (attention.length > 0) result.attention_points = attention.join(' ').replace(/\.\.$/, '.')

  const tags = TAG_LABELS.map((label) => features[label]?.trim().toLowerCase()).filter((t): t is string => Boolean(t))
  if (tags.length > 0) result.tags = [...new Set(tags)].join(', ')

  return result
}
