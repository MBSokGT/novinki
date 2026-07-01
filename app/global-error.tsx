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
            <Link href="/" aria-label="На главную" className="inline-block">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={150} height={50} className="mx-auto mb-8" />
            </Link>
            <svg className="w-14 h-14 mx-auto mb-4 text-[#9B1B1B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Что-то пошло не так</h1>
            <p className="text-slate-600 mb-8 max-w-md">
              Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться на главную.
            </p>
            <div className="space-x-4">
              <button 
                onClick={reset}
                className="inline-block px-6 py-3 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition font-medium"
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
