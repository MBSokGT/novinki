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

const PRICE_DROP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export interface PriceDrop {
  percent: number
  from: number
  to: number
  currency: string | null
  changedAt: string
}

// Цена упала за последнюю неделю: у самого товара или у любого его варианта —
// берём самое заметное снижение. Подорожание на сайте не показываем.
export function productPriceDrop(
  product: Pick<Product, 'site_price' | 'site_currency' | 'price_prev' | 'price_changed_at' | 'variants'>,
  now: number = Date.now()
): PriceDrop | null {
  const candidates: Array<{ prev?: number | null; price?: number | null; at?: string | null; currency?: string | null }> = [
    { prev: product.price_prev, price: product.site_price, at: product.price_changed_at, currency: product.site_currency },
    ...(product.variants || []).map((v) => ({ prev: v.price_prev, price: v.price, at: v.price_changed_at, currency: v.currency })),
  ]
  let best: PriceDrop | null = null
  for (const c of candidates) {
    if (!c.prev || !c.price || !c.at || c.price >= c.prev) continue
    const changed = new Date(c.at).getTime()
    if (Number.isNaN(changed) || now - changed > PRICE_DROP_WINDOW_MS) continue
    const percent = Math.round(((c.prev - c.price) / c.prev) * 100)
    if (percent < 1) continue
    if (!best || percent > best.percent) best = { percent, from: c.prev, to: c.price, currency: c.currency ?? null, changedAt: c.at }
  }
  return best
}

export function priceDropHint(drop: PriceDrop): string {
  const was = formatPrice(drop.from, drop.currency)
  const now = formatPrice(drop.to, drop.currency)
  const when = formatCheckedAt(drop.changedAt)
  return `Было ${was}, стало ${now}${when ? ` (изменилась ${when})` : ''}`
}

export function formatCheckedAt(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const day = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time}`
}

// Самое старое время среди вариантов со статусом: "по состоянию на" не должно
// выдавать за свежие данные те варианты, которые в последний раз не проверились.
// Для данных до появления отметки у вариантов — время проверки карточки.
export function variantsCheckedAt(product: Pick<Product, 'variants' | 'link_checked_at'>): string | null {
  const checked = (product.variants || []).filter((v) => v.availability || v.price)
  if (checked.length === 0) return null
  const times = checked.map((v) => v.checked_at || product.link_checked_at).filter((t): t is string => Boolean(t))
  if (times.length === 0) return null
  return times.reduce((min, t) => (t < min ? t : min))
}

export function availabilityHint(checkedAt: string | null | undefined): string {
  const when = formatCheckedAt(checkedAt)
  return when ? `По данным complexbar.ru (Москва) на ${when}. Обновляется раз в сутки` : AVAILABILITY_SOURCE_HINT
}
