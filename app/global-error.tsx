'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="text-center">
            <Image src="/logo.png" alt="Logo" width={150} height={50} className="mx-auto mb-8" />
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Что-то пошло не так</h1>
            <p className="text-slate-600 mb-8 max-w-md">
              Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться на главную.
            </p>
            <div className="space-x-4">
              <button 
                onClick={reset}
                className="inline-block px-6 py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 transition font-medium"
              >
                Попробовать снова
              </button>
              <Link href="/" className="inline-block px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium">
                На главную
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}