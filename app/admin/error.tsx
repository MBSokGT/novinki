'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin section error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <svg className="w-12 h-12 mx-auto mb-4 text-[#9B1B1B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Что-то пошло не так в админке</h1>
        <p className="text-slate-600 mb-6 text-sm">
          Данные на сайте не пострадали — просто не получилось отобразить эту страницу. Попробуйте ещё раз.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition font-medium text-sm"
          >
            Попробовать снова
          </button>
          <Link href="/admin" className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium text-sm">
            Панель администратора
          </Link>
        </div>
      </div>
    </div>
  )
}
