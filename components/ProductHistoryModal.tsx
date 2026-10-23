'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { showToast } from '@/components/Toast'
import type { Product } from '@/types/product'

interface HistoryEntry {
  id: string
  product_id: string
  changed_by: string | null
  changed_at: string
  changed_fields: string[]
  snapshot: Record<string, unknown>
}

const FIELD_LABELS: Record<string, string> = {
  name: 'название',
  brand: 'бренд',
  article_number: 'артикул',
  description: 'описание',
  image_url: 'главное фото',
  images: 'фото',
  flyer_url: 'листовка',
  price_list_url: 'прайс-лист',
  advantages: 'преимущества',
  attention_points: 'на что обратить внимание',
  website_link: 'ссылка на товар',
  is_archived: 'публикация / архив',
  is_supplier_novelty: 'склад / поставщик',
  is_dishwasher_safe: 'ПММ',
  is_microwave_safe: 'СВЧ',
  temp_min: 'температура от',
  temp_max: 'температура до',
  category: 'категория',
  year: 'год',
  tags: 'теги',
  order_multiple: 'кратность',
  variants: 'варианты',
  price: 'цена',
  bumped_at: 'продвижение',
}

// Эти поля при откате не трогаем: служебные или обновляются проверкой наличия.
const NOT_RESTORED = new Set([
  'id', 'created_at', 'created_by', 'updated_at', 'updated_by', 'rating',
  'availability', 'availability_label', 'link_broken', 'link_checked_at', 'site_price', 'site_currency',
])

function describeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '— пусто —'
  if (typeof value === 'boolean') {
    if (field === 'is_archived') return value ? 'в архиве' : 'опубликован'
    if (field === 'is_supplier_novelty') return value ? 'новинка поставщика' : 'новинка на складе'
    return value ? 'да' : 'нет'
  }
  if (Array.isArray(value)) {
    if (field === 'variants') return `${value.length} шт.: ${value.map((v) => (v as { article_number?: string }).article_number || '—').join(', ')}`
    return `${value.length} шт.`
  }
  const text = String(value)
  return text.length > 160 ? `${text.slice(0, 160)}…` : text
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface ProductHistoryModalProps {
  product: Product
  onClose: () => void
  onRestored: (product: Product) => void
}

export default function ProductHistoryModal({ product, onClose, onRestored }: ProductHistoryModalProps) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .from('product_history')
      .select('*')
      .eq('product_id', product.id)
      .order('changed_at', { ascending: false })
      .then(({ data }: { data: HistoryEntry[] | null }) => setEntries(data || []))
  }, [product.id])

  const restore = async (entry: HistoryEntry) => {
    if (!confirm(`Вернуть карточку к состоянию до правки от ${formatDate(entry.changed_at)}? Текущая версия сохранится в истории — откат можно будет отменить.`)) return
    setRestoringId(entry.id)
    const payload = Object.fromEntries(Object.entries(entry.snapshot).filter(([key]) => !NOT_RESTORED.has(key)))
    const { data, error } = await apiClient.from('products').update(payload).eq('id', product.id).select()
    setRestoringId(null)
    if (error || !data?.[0]) {
      showToast(error?.message || 'Не удалось вернуть версию', 'error')
      return
    }
    showToast('Версия восстановлена', 'success')
    onRestored(data[0] as Product)
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900">История правок</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">{product.name}</p>
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="shrink-0 text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {entries === null && <p className="p-5 text-sm text-slate-400">Загружаю…</p>}
          {entries?.length === 0 && (
            <p className="p-5 text-sm text-slate-500">Правок пока не было. История пишется с момента этого обновления — каждая следующая правка появится здесь.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {entries?.map((entry) => {
              const open = openId === entry.id
              return (
                <li key={entry.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <button onClick={() => setOpenId(open ? null : entry.id)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-medium text-slate-800">
                        {formatDate(entry.changed_at)}
                        <span className="font-normal text-slate-400"> · {entry.changed_by || 'неизвестно'}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Изменено: {entry.changed_fields.map((f) => FIELD_LABELS[f] || f).join(', ')}
                        <span className="ml-1 text-[#9B1B1B]">{open ? 'скрыть' : 'что было'}</span>
                      </p>
                    </button>
                    <button
                      onClick={() => restore(entry)}
                      disabled={restoringId !== null}
                      className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      title="Вернуть карточку к состоянию до этой правки"
                    >
                      {restoringId === entry.id ? 'Возвращаю…' : 'Вернуть как было'}
                    </button>
                  </div>
                  {open && (
                    <dl className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">До этой правки было</p>
                      {entry.changed_fields.map((field) => (
                        <div key={field} className="grid grid-cols-[8rem_1fr] gap-2">
                          <dt className="text-slate-400">{FIELD_LABELS[field] || field}</dt>
                          <dd className="break-words text-slate-700">{describeValue(field, entry.snapshot[field])}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
