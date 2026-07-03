// Categories for which storage/serving temperature makes sense to specify.
// Matched case-insensitively against the product's category name.
export const TEMPERATURE_CATEGORIES = [
  'Сиропы',
  'Пюре',
  'Топпинги',
  'Кордиалы',
  'Смеси, соки, основы для напитков',
  'Кофе, чай, какао',
  'Безалкогольные напитки',
  'Гарниши и добавки',
  'Джус-боллы и тапиока',
]

export function isTemperatureCategory(category: string | null | undefined): boolean {
  if (!category) return false
  const normalized = category.trim().toLowerCase()
  return TEMPERATURE_CATEGORIES.some((name) => name.toLowerCase() === normalized)
}
