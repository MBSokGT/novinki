'use client'

import { useState } from 'react'
import Image from 'next/image'
import { apiClient } from '@/lib/api-client'
import { showToast } from './Toast'

interface ScrapedProduct {
  name: string
  brand: string
  article_number: string
  image_url: string
  website_link: string
}

interface BulkImportSeriesModalProps {
  onClose: () => void
  onImported: () => void
}

type Stage = 'input' | 'loading' | 'preview' | 'importing'

export default function BulkImportSeriesModal({ onClose, onImported }: BulkImportSeriesModalProps) {
  const [stage, setStage] = useState<Stage>('input')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [products, setProducts] = useState<ScrapedProduct[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [category, setCategory] = useState('')
  const [year, setYear] = useState('')
  const [isSupplierNovelty, setIsSupplierNovelty] = useState(false)

  const parse = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    setStage('loading')
    setError('')
    // Голый артикул (5-8 цифр) — сами собираем ссылку на поиск по complexbar.ru,
    // не заставляя админа сначала идти туда за самой ссылкой.
    const targetUrl = /^\d{5,8}$/.test(trimmed)
      ? `https://complexbar.ru/index.php?dispatch=products.search&search_performed=Y&q=${trimmed}`
      : trimmed
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/internal/scrape-complexbar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      })
      const json = await res.json()
      if (json.error || !json.data?.products?.length) {
        setError(json.error?.message || 'Ничего не нашли на этой странице')
        setStage('input')
        return
      }
      const found: ScrapedProduct[] = json.data.products
      setProducts(found)
      setSelected(new Set(found.map((_, i) => i)))
      setStage('preview')
    } catch {
      setError('Не удалось разобрать страницу — попробуйте ещё раз')
      setStage('input')
    }
  }

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) => (prev.size === products.length ? new Set() : new Set(products.map((_, i) => i))))
  }

  const importSelected = async () => {
    const chosen = products.filter((_, i) => selected.has(i))
    if (chosen.length === 0) return
    setStage('importing')
    const payload = chosen.map((p) => ({
      name: p.name,
      brand: p.brand,
      article_number: p.article_number,
      description: '',
      advantages: '',
      attention_points: '',
      website_link: p.website_link,
      category,
      year,
      tags: '',
      order_multiple: '',
      is_supplier_novelty: isSupplierNovelty,
      is_dishwasher_safe: false,
      is_microwave_safe: false,
      is_archived: false,
      images: p.image_url ? [p.image_url] : [],
      image_url: p.image_url || '',
    }))
    const { error } = await apiClient.from('products').insert(payload)
    if (error) {
      showToast(error.message || 'Ошибка при массовом добавлении', 'error')
      setStage('preview')
      return
    }
    showToast(`Добавлено товаров: ${chosen.length}`, 'success')
    onImported()
    onClose()
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h3 className="text-lg font-bold text-slate-900">Добавить серию по ссылке</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {(stage === 'input' || stage === 'loading') && (
          <div className="p-5">
            <p className="mb-3 text-sm text-slate-500">
              Вставьте ссылку на страницу поиска, категорию или конкретный товар на complexbar.ru — разберём список и предзаполним карточки названием, брендом, артикулом и фото. Или просто впишите артикул (5–8 цифр) — найдём сами, без похода на сайт.
            </p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && parse()}
              placeholder="Ссылка на complexbar.ru или просто артикул, например 05032146"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              onClick={parse}
              disabled={stage === 'loading' || !url.trim()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#9B1B1B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-50"
            >
              {stage === 'loading' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Разбираю страницу...
                </>
              ) : (
                'Разобрать'
              )}
            </button>
          </div>
        )}

        {(stage === 'preview' || stage === 'importing') && (
          <>
            <div className="border-b border-slate-100 p-5">
              <div className="mb-3 flex items-center justify-between">
                <button onClick={toggleAll} className="text-sm font-medium text-[#9B1B1B] hover:underline">
                  {selected.size === products.length ? 'Снять выделение' : 'Выбрать все'}
                </button>
                <span className="text-sm text-slate-500">Найдено: {products.length}, выбрано: {selected.size}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Категория (для всех)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]" />
                <input type="text" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Год (для всех)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]" />
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={isSupplierNovelty} onChange={(e) => setIsSupplierNovelty(e.target.checked)} className="h-4 w-4 accent-[#9B1B1B]" />
                  Новинка поставщика
                </label>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {products.map((p, i) => (
                <label key={i} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-slate-50">
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="h-4 w-4 shrink-0 accent-[#9B1B1B]" />
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill className="object-cover" unoptimized />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="truncate text-xs text-slate-500">{p.brand}{p.article_number ? ` · Арт. ${p.article_number}` : ''}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button
                onClick={importSelected}
                disabled={stage === 'importing' || selected.size === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-50"
              >
                {stage === 'importing' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Добавляю...
                  </>
                ) : (
                  `Добавить ${selected.size} товаров`
                )}
              </button>
              <button onClick={() => setStage('input')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Назад
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
