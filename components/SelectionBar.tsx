'use client'

import { useState } from 'react'

import ImageWithFallback from '@/components/ImageWithFallback'
import { showToast } from '@/components/Toast'
import { cleanProductName, productToFlyerItem } from '@/lib/flyerPdf'
import { useSelection } from '@/lib/selectionStore'
import type { Product } from '@/types/product'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
const DEFAULT_TITLE = 'Подборка Комплекс-Бар'

// Панель подборки для клиента: менеджер отмечает товары в каталоге, а здесь
// превращает их в ссылку (открывается без входа) или в PDF.
export default function SelectionBar({ products }: { products: Product[] }) {
  const selection = useSelection()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(DEFAULT_TITLE)
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState<'link' | 'pdf' | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const items = selection.ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => Boolean(p))
  if (items.length === 0) return null

  const createLink = async () => {
    setBusy('link')
    try {
      const response = await fetch(`${BASE_PATH}/api/internal/selection`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ids: items.map((p) => p.id) }),
      })
      const json = await response.json()
      if (!json.data?.token) throw new Error(json.error?.message || 'Не удалось создать ссылку')
      const url = `${window.location.origin}${BASE_PATH}/s/${json.data.token}`
      setLink(url)
      if (window.matchMedia('(pointer: coarse)').matches && navigator.share) {
        navigator.share({ title, url }).catch(() => {})
      } else {
        await navigator.clipboard.writeText(url).catch(() => {})
        showToast('Ссылка скопирована', 'success')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось создать ссылку', 'error')
    } finally {
      setBusy(null)
    }
  }

  const createPdf = async () => {
    setBusy('pdf')
    setProgress(null)
    try {
      const { buildFlyerPdf, downloadPdf } = await import('@/lib/flyerPdf')
      const bytes = await buildFlyerPdf({
        badge: 'подборка',
        title: title.trim() || DEFAULT_TITLE,
        items: items.map(productToFlyerItem),
        onProgress: (done, total) => setProgress({ done, total }),
      })
      downloadPdf(bytes, `podborka_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (error) {
      console.error('PDF error:', error)
      showToast('Не удалось собрать PDF', 'error')
    } finally {
      setBusy(null)
    }
  }

  const close = () => {
    setOpen(false)
    setLink(null)
  }

  return (
    <>
      <div className="rise-in fixed left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-4 sm:w-auto sm:max-w-none">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white py-2 pl-2 pr-2 shadow-xl">
          <div className="flex -space-x-2">
            {items.slice(0, 3).map((p) => (
              <div key={p.id} className="relative h-9 w-9 overflow-hidden rounded-lg border-2 border-white bg-slate-100">
                <ImageWithFallback src={p.image_url} alt={p.name} label={p.brand || p.name} size="sm" className="object-contain bg-white p-0.5" />
              </div>
            ))}
          </div>
          <p className="min-w-0 flex-1 text-sm font-semibold text-slate-800 sm:flex-none">
            Подборка <span className="text-[#9B1B1B]">{items.length}</span>
          </p>
          <button onClick={() => setOpen(true)} className="rounded-xl bg-[#9B1B1B] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#7A1515]">
            Отправить клиенту
          </button>
          <button onClick={selection.clear} aria-label="Очистить подборку" title="Очистить подборку" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {open && (
        <div onClick={busy ? undefined : close} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Подборка для клиента</h3>
                <p className="mt-0.5 text-xs text-slate-500">Клиент увидит только фото, названия и артикулы — без цен, описаний и внутренних данных.</p>
              </div>
              <button onClick={close} disabled={busy !== null} aria-label="Закрыть" className="shrink-0 text-slate-400 hover:text-slate-600 disabled:opacity-40">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Название подборки</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]" />
              </div>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <ImageWithFallback src={p.image_url} alt={p.name} label={p.brand || p.name} size="sm" className="object-contain bg-white p-0.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{cleanProductName(p.name)}</p>
                      <p className="truncate text-xs text-slate-500">{p.brand}{p.article_number ? ` · ${p.article_number}` : ''}</p>
                    </div>
                    <button onClick={() => selection.remove(p.id)} aria-label="Убрать из подборки" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
              {link && (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="mb-1.5 text-xs font-medium text-emerald-800">Ссылка готова — открывается без входа, действует 30 дней</p>
                  <div className="flex gap-2">
                    <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-slate-700" />
                    <button
                      onClick={() => navigator.clipboard.writeText(link).then(() => showToast('Ссылка скопирована', 'success'), () => showToast('Не удалось скопировать', 'error'))}
                      className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100"
                    >
                      Копировать
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button onClick={createLink} disabled={busy !== null} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-60">
                {busy === 'link' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {link ? 'Создать новую ссылку' : 'Создать ссылку'}
              </button>
              <button onClick={createPdf} disabled={busy !== null} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                {busy === 'pdf' && <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#9B1B1B]" />}
                {busy === 'pdf' ? (progress ? `Фото ${progress.done}/${progress.total}` : 'Собираю…') : 'Скачать PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
