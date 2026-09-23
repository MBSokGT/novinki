'use client'

import { useState } from 'react'
import Image from 'next/image'

import type { ScrapedProduct } from '@/lib/complexbarParser'

interface BulkImportSeriesModalProps {
  onClose: () => void
  // Отдаёт выбранные позиции наверх как варианты — сама карточка (название,
  // бренд, фото, описание) заполняется и сохраняется в основной форме, эта
  // модалка только собирает список "фото + артикул + ссылка".
  onAddVariants: (items: ScrapedProduct[]) => void
}

type Stage = 'input' | 'loading' | 'preview' | 'saving'

export default function BulkImportSeriesModal({ onClose, onAddVariants }: BulkImportSeriesModalProps) {
  const [stage, setStage] = useState<Stage>('input')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [products, setProducts] = useState<ScrapedProduct[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())

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

  // Фото скачиваются к нам на сервер только сейчас и только для выбранных
  // позиций — если скачивать всё найденное сразу при разборе, невыбранные и
  // брошенные на полпути импорты оставляли бы на диске мусорные файлы.
  const confirm = async () => {
    const chosen = products.filter((_, i) => selected.has(i))
    if (chosen.length === 0) return
    setStage('saving')
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/internal/mirror-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: chosen.map((p) => p.image_url) }),
      })
      const json = await res.json()
      const urls: string[] | undefined = json.data?.urls
      onAddVariants(urls ? chosen.map((p, i) => ({ ...p, image_url: urls[i] || p.image_url })) : chosen)
      onClose()
    } catch {
      setError('Не удалось сохранить фото — попробуйте ещё раз')
      setStage('preview')
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Загрузить варианты по ссылке</h3>
            <p className="mt-0.5 text-xs text-slate-500">Найденные позиции добавятся как варианты к текущей карточке — фото, артикул и ссылка на каждый.</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {(stage === 'input' || stage === 'loading') && (
          <div className="p-5">
            <p className="mb-3 text-sm text-slate-500">
              Вставьте ссылку на страницу поиска, категорию или конкретный товар на complexbar.ru. Или просто впишите артикул (5–8 цифр) — найдём сами, без похода на сайт.
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

        {(stage === 'preview' || stage === 'saving') && (
          <>
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center justify-between">
                <button onClick={toggleAll} className="text-sm font-medium text-[#9B1B1B] hover:underline">
                  {selected.size === products.length ? 'Снять выделение' : 'Выбрать все'}
                </button>
                <span className="text-sm text-slate-500">Найдено: {products.length}, выбрано: {selected.size}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                {products.map((p, i) => (
                  <label key={i} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition ${selected.has(i) ? 'border-[#9B1B1B]/30 bg-red-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="h-4 w-4 shrink-0 accent-[#9B1B1B]" />
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
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
            </div>
            {error && stage !== 'saving' && <p className="px-5 pt-3 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button
                onClick={confirm}
                disabled={selected.size === 0 || stage === 'saving'}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-50"
              >
                {stage === 'saving' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Сохраняю фото...
                  </>
                ) : (
                  `Добавить ${selected.size} вариантов в карточку`
                )}
              </button>
              <button onClick={() => setStage('input')} disabled={stage === 'saving'} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Назад
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
