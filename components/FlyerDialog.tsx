'use client'

import { useState } from 'react'

import { showToast } from '@/components/Toast'
import type { FlyerItem } from '@/lib/flyerPdf'

interface FlyerDialogProps {
  // announce — анонс новинок для рассылки (админ); selection — подборка для клиента
  mode: 'announce' | 'selection'
  items: FlyerItem[]
  defaultTitle: string
  defaultSubtitle?: string
  onClose: () => void
}

export default function FlyerDialog({ mode, items, defaultTitle, defaultSubtitle = '', onClose }: FlyerDialogProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [subtitle, setSubtitle] = useState(defaultSubtitle)
  const [intro, setIntro] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [busy, setBusy] = useState(false)

  const announce = mode === 'announce'
  const withPhoto = items.filter((i) => i.image_url).length

  const create = async () => {
    setBusy(true)
    setProgress(null)
    try {
      const { buildFlyerPdf, downloadPdf } = await import('@/lib/flyerPdf')
      const bytes = await buildFlyerPdf({
        badge: announce ? 'новинка' : 'подборка',
        title: title.trim() || defaultTitle,
        subtitle,
        intro: announce ? intro : '',
        items,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      downloadPdf(bytes, `${announce ? 'anons' : 'podborka'}_${new Date().toISOString().slice(0, 10)}.pdf`)
      showToast('PDF готов', 'success')
      onClose()
    } catch (error) {
      console.error('PDF error:', error)
      showToast('Не удалось собрать PDF', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onClick={busy ? undefined : onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{announce ? 'Анонс новинок в PDF' : 'Подборка в PDF'}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Товаров: {items.length}{withPhoto < items.length ? `, без фото: ${items.length - withPhoto}` : ''}. Обложка, страницы с фото, названиями и артикулами, контакты Комплекс-Бар.
            </p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Закрыть" className="shrink-0 text-slate-400 hover:text-slate-600 disabled:opacity-40">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Заголовок на обложке</label>
            <textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Подзаголовок <span className="font-normal text-slate-400">(необязательно)</span></label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]" />
          </div>
          {announce && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Текст страницы после обложки <span className="font-normal text-slate-400">(необязательно)</span></label>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={5}
                placeholder="Первый абзац станет крупным вступлением, остальные — обычным текстом. Пустое поле — страницы не будет."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]"
              />
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          <button onClick={create} disabled={busy || items.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-60">
            {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {busy ? (progress ? `Готовлю фото: ${progress.done} из ${progress.total}` : 'Собираю файл…') : 'Скачать PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
