import type { ProductVariant } from '@/types/product'

const DIMENSIONS = /\s*\b[DHLWВ]=\d[\d.,]*(?:\s*,\s*[DHLWВ]=\d[\d.,]*)*\s*(?:мм|см|м)?\.?/gi

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Названия с complexbar.ru длинные: бренд, общее для всей серии название в
// кавычках и габариты. Внутри одной карточки всё это одинаковое и только
// мешает различать варианты — оставляем то, чем они отличаются.
export function shortVariantNames(variants: Pick<ProductVariant, 'name'>[], brand?: string): string[] {
  const names = variants.map((v) => (v.name || '').trim())
  const quoted = (name: string) => name.match(/«[^»]+»/g) || []
  const common =
    names.filter(Boolean).length >= 2
      ? quoted(names.find(Boolean) as string).filter((q) => names.every((n) => !n || n.includes(q)))
      : []

  return names.map((name) => {
    if (!name) return ''
    let short = name.replace(DIMENSIONS, ' ')
    for (const q of common) short = short.split(q).join(' ')
    if (brand?.trim()) short = short.replace(new RegExp(`(^|\\s)${escapeRegExp(brand.trim())}(?=\\s|$)`, 'gi'), ' ')
    return short.replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').trim()
  })
}
