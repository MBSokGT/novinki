'use client'

import { useCallback, useEffect, useState } from 'react'

import { showToast } from '@/components/Toast'

const API = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/internal/search-misses`
const COLLAPSED_LIMIT = 6

interface Miss {
  query: string
  count: number
  last_at: string
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

function times(n: number): string {
  const lastDigit = n % 10
  const lastTwo = n % 100
  return `${n} ${lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 10 || lastTwo >= 20) ? 'раза' : 'раз'}`
}

// Что сотрудники искали в каталоге и не нашли за последние 30 дней: готовый
// перечень товаров, которые стоит завести, и слов, под которые нужны синонимы.
export default function SearchMissesPanel() {
  const [misses, setMisses] = useState<Miss[] | null>(null)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      const json = await (await fetch(API)).json()
      setMisses(json.data || [])
    } catch {
      setMisses([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- начальные данные приходят с сервера
    load()
  }, [load])

  const remove = async (query?: string) => {
    if (!query && !confirm('Очистить весь список запросов?')) return
    await fetch(query ? `${API}?query=${encodeURIComponent(query)}` : API, { method: 'DELETE' })
    showToast(query ? 'Запрос убран' : 'Список очищен', 'success')
    load()
  }

  if (misses === null || misses.length === 0) {
    return misses === null ? null : (
      <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        <span className="font-medium text-slate-700">Что искали и не нашли</span> — пока ничего: всё, что искали сотрудники, есть в каталоге
      </div>
    )
  }

  const visible = expanded ? misses : misses.slice(0, COLLAPSED_LIMIT)
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <span className="font-semibold text-amber-800">Что искали и не нашли: {misses.length}</span>
        <span className="text-xs text-slate-400">за 30 дней — возможно, эти товары стоит завести</span>
        <button onClick={() => remove()} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700">Очистить список</button>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {visible.map((miss) => (
          <li key={miss.query} className="flex items-center gap-3 px-4 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{miss.query}</span>
            <span className="shrink-0 text-xs text-slate-500">искали {times(miss.count)}, последний — {formatDate(miss.last_at)}</span>
            <button onClick={() => remove(miss.query)} aria-label={`Убрать запрос «${miss.query}»`} className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Убрать
            </button>
          </li>
        ))}
      </ul>
      {misses.length > COLLAPSED_LIMIT && (
        <button onClick={() => setExpanded((v) => !v)} className="w-full border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700">
          {expanded ? 'Свернуть' : `Показать все (${misses.length})`}
        </button>
      )}
    </div>
  )
}
