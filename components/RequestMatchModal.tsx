'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { showToast } from './Toast'

interface MatchedRequest {
  id: string
  name: string
  product: string
  article?: string | null
}

interface RequestMatchModalProps {
  productName: string
  requests: MatchedRequest[]
  onClose: () => void
}

export default function RequestMatchModal({ productName, requests, onClose }: RequestMatchModalProps) {
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const markDelivered = async (id: string) => {
    setLoadingId(id)
    const { error } = await apiClient.from('requests').update({ delivered: true }).eq('id', id)
    setLoadingId(null)
    if (error) {
      showToast('Не удалось отметить запрос', 'error')
      return
    }
    setResolvedIds((prev) => new Set(prev).add(id))
    showToast('Запрос отмечен как выполненный', 'success')
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-5">
          <div className="mb-1 flex items-center gap-2 text-slate-900">
            <svg className="h-5 w-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <h3 className="text-lg font-bold">Похоже, это закрывает запрос</h3>
          </div>
          <p className="text-sm text-slate-500">
            «{productName}» совпадает {requests.length === 1 ? 'с незакрытой заявкой' : `с ${requests.length} незакрытыми заявками`}. Отметить как выполненные?
          </p>
        </div>
        <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {requests.map((r) => {
            const resolved = resolvedIds.has(r.id)
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{r.name}</p>
                  <p className="truncate text-sm text-slate-500">{r.product}</p>
                  {r.article && <p className="text-xs text-slate-400">Артикул: {r.article}</p>}
                </div>
                {resolved ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Готово
                  </span>
                ) : (
                  <button
                    onClick={() => markDelivered(r.id)}
                    disabled={loadingId === r.id}
                    className="shrink-0 rounded-lg bg-[#9B1B1B] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-50"
                  >
                    {loadingId === r.id ? 'Сохраняю...' : 'Отметить выполненным'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="p-4">
          <button onClick={onClose} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
