import type { Availability, Product } from '@/types/product'

const STYLES: Record<Availability | 'partial' | 'broken', { dot: string; text: string; border: string }> = {
  in_stock: { dot: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' },
  partial: { dot: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
  on_order: { dot: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
  showroom: { dot: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200' },
  out_of_stock: { dot: 'bg-slate-400', text: 'text-slate-500', border: 'border-slate-200' },
  other: { dot: 'bg-slate-400', text: 'text-slate-500', border: 'border-slate-200' },
  broken: { dot: 'bg-red-500', text: 'text-red-600', border: 'border-red-200' },
}

interface AvailabilityBadgeProps {
  kind: keyof typeof STYLES
  label: string
  variant?: 'chip' | 'inline'
  title?: string
}

export default function AvailabilityBadge({ kind, label, variant = 'chip', title }: AvailabilityBadgeProps) {
  const style = STYLES[kind]
  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] leading-tight ${style.text}`} title={title}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        {label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-px text-[10px] font-medium ${style.border} ${style.text}`} title={title}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      {label}
    </span>
  )
}

// Сводный статус для карточки: статус основной ссылки товара, а если его нет —
// сводка по вариантам ("В наличии 5 из 7").
export function productAvailabilitySummary(product: Pick<Product, 'availability' | 'availability_label' | 'variants'>): { kind: keyof typeof STYLES; label: string } | null {
  if (product.availability && product.availability_label) {
    return { kind: product.availability, label: shortLabel(product.availability_label) }
  }
  const checked = (product.variants || []).filter((v) => v.availability)
  if (checked.length === 0) return null
  const inStock = checked.filter((v) => v.availability === 'in_stock').length
  if (inStock === checked.length) return { kind: 'in_stock', label: 'В наличии' }
  if (inStock === 0) return { kind: 'out_of_stock', label: 'Нет в наличии' }
  return { kind: 'partial', label: `В наличии ${inStock} из ${checked.length}` }
}

// "В наличии > 100 шт." — для маленького бейджа на карточке хватит "В наличии";
// полный текст с количеством показываем в самой карточке товара.
export function shortLabel(label: string): string {
  return label.replace(/\s*[>≥<]?\s*\d[\d\s]*\s*шт\.?/i, '').trim() || label
}

export const AVAILABILITY_SOURCE_HINT = 'По данным complexbar.ru (Москва), обновляется раз в сутки'

const CURRENCY_SIGNS: Record<string, string> = { RUB: '₽', KZT: '₸', BYN: 'Br', KGS: 'сом', AMD: '֏' }

export function formatPrice(price: number | null | undefined, currency?: string | null): string | null {
  if (price === null || price === undefined || !Number.isFinite(price)) return null
  const amount = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(price)
  return `${amount} ${CURRENCY_SIGNS[currency || 'RUB'] || currency || '₽'}`
}

// Цена для карточки в каталоге: своя цена товара или "от" минимальной цены вариантов.
export function productPriceSummary(product: Pick<Product, 'site_price' | 'site_currency' | 'variants'>): string | null {
  const own = formatPrice(product.site_price, product.site_currency)
  if (own) return own
  const priced = (product.variants || []).filter((v) => typeof v.price === 'number' && v.price > 0)
  if (priced.length === 0) return null
  const cheapest = priced.reduce((min, v) => (v.price! < min.price! ? v : min))
  const text = formatPrice(cheapest.price, cheapest.currency)
  const allSame = priced.every((v) => v.price === cheapest.price)
  return allSame ? text : `от ${text}`
}
