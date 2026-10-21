'use client'

import { useEffect, useState } from 'react'

import { apiClient } from '@/lib/api-client'
import { formatPrice } from '@/components/AvailabilityBadge'
import type { Product } from '@/types/product'

interface PriceChange {
  id: string
  product_id: string
  product_name: string
  article: string | null
  old_price: number
  new_price: number
  currency: string | null
  changed_at: string
}

interface PriceChangesPanelProps {
  products: Product[]
  onEdit: (product: Product) => void
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const COLLAPSED_LIMIT = 5

const formatDate = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Что изменилось в цене на complexbar.ru за последнюю неделю — по журналу,
// который ведёт ежедневная проверка. Сверху то, что подешевело.
export default function PriceChangesPanel({ products, onEdit }: PriceChangesPanelProps) {
  const [changes, setChanges] = useState<PriceChange[] | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiClient
      .from('price_changes')
      .select('*')
      .gte('changed_at', new Date(Date.now() - WEEK_MS).toISOString())
      .order('changed_at', { ascending: false })
      .then(({ data }: { data: PriceChange[] | null }) => {
        if (!cancelled) setChanges(data || [])
      })
    return () => { cancelled = true }
  }, [products])

  if (changes === null) return null

  const percent = (c: PriceChange) => Math.round(((c.new_price - c.old_price) / c.old_price) * 100)
  const sorted = [...changes].sort((a, b) => percent(a) - percent(b))
  const drops = changes.filter((c) => c.new_price < c.old_price).length
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_LIMIT)

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <span className="font-medium text-slate-700">Цены за неделю</span>
        {changes.length > 0 ? (
          <span className="text-xs text-slate-500">
            изменилось: {changes.length}, из них подешевело: <span className="font-semibold text-emerald-700">{drops}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">Цены на complexbar.ru не менялись — проверка раз в сутки</span>
        )}
      </div>
      {changes.length > 0 && (
        <div className="border-t border-slate-100">
          <ul className="divide-y divide-slate-100">
            {visible.map((c) => {
              const delta = percent(c)
              const down = delta < 0
              const product = products.find((p) => p.id === c.product_id)
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2">
                  <span className={`w-14 shrink-0 text-right text-sm font-semibold tabular-nums ${down ? 'text-emerald-700' : 'text-red-600'}`}>
                    {down ? '' : '+'}{delta}%
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{c.product_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {c.article ? `Арт. ${c.article} · ` : ''}
                      <span className="tabular-nums">{formatPrice(c.old_price, c.currency)} → {formatPrice(c.new_price, c.currency)}</span> · {formatDate(c.changed_at)}
                    </p>
                  </div>
                  {product && (
                    <button
                      onClick={() => onEdit(product)}
                      className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Открыть
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          {sorted.length > COLLAPSED_LIMIT && (
            <button onClick={() => setExpanded((v) => !v)} className="w-full border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700">
              {expanded ? 'Свернуть' : `Показать все (${sorted.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
