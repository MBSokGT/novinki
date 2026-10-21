'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'

import ImageWithFallback from '@/components/ImageWithFallback'
import { cleanProductName, type FlyerItem } from '@/lib/flyerPdf'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

interface PublicSelection {
  title: string
  created_at: string
  items: FlyerItem[]
}

// Подборка для клиента: открывается по ссылке без входа. Только фото,
// названия, бренд и артикулы.
export default function SelectionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [selection, setSelection] = useState<PublicSelection | null>(null)
  const [error, setError] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)

  useEffect(() => {
    fetch(`${BASE_PATH}/api/selection/${token}`)
      .then((response) => response.json())
      .then((json) => (json.data ? setSelection(json.data) : setError(json.error?.message || 'Подборка не найдена')))
      .catch(() => setError('Не удалось загрузить подборку — проверьте интернет и обновите страницу'))
  }, [token])

  const downloadPdf = async () => {
    if (!selection) return
    setPdfBusy(true)
    try {
      const { buildFlyerPdf, downloadPdf: save } = await import('@/lib/flyerPdf')
      save(await buildFlyerPdf({ badge: 'подборка', title: selection.title, items: selection.items }), 'podborka.pdf')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="bg-[#1A1A1A]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Image src={`${BASE_PATH}/logo.png`} alt="Комплекс-Бар" width={110} height={37} className="object-contain" priority />
          <a href="https://www.complexbar.ru" className="text-xs text-gray-400 hover:text-gray-200">www.complexbar.ru</a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {error && <p className="rounded-xl bg-white p-6 text-center text-slate-600 shadow-sm">{error}</p>}
        {!error && !selection && <div className="mx-auto mt-16 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#9B1B1B]" />}
        {selection && (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{selection.title}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Товаров: {selection.items.length} · {new Date(selection.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={downloadPdf} disabled={pdfBusy} className="inline-flex items-center gap-2 rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-60">
                {pdfBusy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                Скачать PDF
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {selection.items.map((item, i) => (
                <article key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="relative aspect-square bg-white">
                    <ImageWithFallback src={item.image_url} alt={item.name} label={item.brand || item.name} className="object-contain p-3" sizes="(min-width: 1024px) 280px, 50vw" />
                  </div>
                  <div className="border-t border-slate-100 p-3">
                    <h2 className="line-clamp-3 text-[13px] font-semibold leading-snug text-slate-900">{cleanProductName(item.name)}</h2>
                    {item.brand && <p className="mt-1 text-xs text-slate-500">{item.brand}</p>}
                    {item.articles.length > 0 && (
                      <p className="mt-2 break-words font-mono text-xs font-semibold tracking-wide text-[#9B1B1B]">{item.articles.join(' · ')}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <span className="font-semibold text-slate-700">Комплекс-Бар</span>
          <span>Т/Ф: +7 495 431-90-60 · info@complexbar.ru · www.complexbar.ru</span>
        </div>
      </footer>
    </div>
  )
}
