'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Product } from '@/types/product'
import { showToast } from '@/components/Toast'

const API = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/internal/link-check`
const POLL_MS = 5000
const COLLAPSED_LIMIT = 5

interface LinkAttentionPanelProps {
  products: Product[]
  onEdit: (product: Product) => void
  onChecked: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function LinkAttentionPanel({ products, onEdit, onChecked }: LinkAttentionPanelProps) {
  const [running, setRunning] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshState = useCallback(async () => {
    try {
      const json = await (await fetch(API)).json()
      if (!json.data) return false
      setLastCheckedAt(json.data.lastCheckedAt)
      setRunning(json.data.running)
      return json.data.running as boolean
    } catch {
      return false
    }
  }, [])

  const poll = useCallback(() => {
    pollRef.current = setTimeout(async () => {
      const stillRunning = await refreshState()
      if (stillRunning) {
        poll()
      } else {
        onChecked()
        showToast('Проверка ссылок и наличия завершена', 'success')
      }
    }, POLL_MS)
  }, [refreshState, onChecked])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- начальное состояние проверки приходит с сервера
    refreshState()
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [refreshState])

  const startCheck = async () => {
    try {
      await fetch(API, { method: 'POST' })
      setRunning(true)
      showToast('Проверка запущена — это займёт несколько минут', 'info')
      poll()
    } catch {
      showToast('Не удалось запустить проверку', 'error')
    }
  }

  const attention = products
    .filter((p) => !p.is_archived)
    .map((p) => ({
      product: p,
      mainBroken: Boolean(p.link_broken),
      brokenVariants: (p.variants || []).filter((v) => v.link_broken),
    }))
    .filter((item) => item.mainBroken || item.brokenVariants.length > 0)

  const visible = expanded ? attention : attention.slice(0, COLLAPSED_LIMIT)

  return (
    <div className={`mb-6 rounded-lg border bg-white ${attention.length > 0 ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        {attention.length > 0 ? (
          <span className="font-semibold text-red-700">Требуют внимания: {attention.length}</span>
        ) : (
          <span className="font-medium text-slate-700">Ссылки на complexbar.ru в порядке</span>
        )}
        <span className="text-xs text-slate-400">
          {running
            ? 'Идёт проверка наличия и ссылок…'
            : lastCheckedAt
              ? `Наличие и ссылки проверены ${formatDate(lastCheckedAt)}, проверка раз в сутки`
              : 'Наличие и ссылки ещё не проверялись'}
        </span>
        <button
          onClick={startCheck}
          disabled={running}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {running && <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-[#9B1B1B]" />}
          Проверить сейчас
        </button>
      </div>

      {attention.length > 0 && (
        <div className="border-t border-red-100">
          <p className="px-4 pt-2 text-xs text-slate-500">
            Страницы этих товаров пропали с complexbar.ru: сотрудники по ссылке попадут на ошибку. Поправьте ссылку, уберите вариант или отправьте карточку в архив.
          </p>
          <ul className="divide-y divide-slate-100">
            {visible.map(({ product, mainBroken, brokenVariants }) => (
              <li key={product.id} className="flex items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{product.name}</p>
                  <p className="truncate text-xs text-red-600">
                    {[
                      mainBroken && 'основная ссылка',
                      brokenVariants.length > 0 &&
                        `варианты: ${brokenVariants.map((v) => v.article_number || v.name || '—').join(', ')}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => onEdit(product)}
                  className="shrink-0 rounded-md border border-[#9B1B1B] px-2.5 py-1 text-xs font-medium text-[#9B1B1B] transition hover:bg-[#9B1B1B] hover:text-white"
                >
                  Изменить
                </button>
              </li>
            ))}
          </ul>
          {attention.length > COLLAPSED_LIMIT && (
            <button onClick={() => setExpanded((v) => !v)} className="w-full border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700">
              {expanded ? 'Свернуть' : `Показать все (${attention.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
