import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="text-center">
        <Image src="/logo.png" alt="Logo" width={150} height={50} className="mx-auto mb-8" />
        <div className="text-9xl font-bold text-slate-300 mb-4">404</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Страница не найдена</h1>
        <p className="text-slate-600 mb-8 max-w-md">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <div className="space-x-4">
          <Link href="/" className="inline-block px-6 py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 transition font-medium">
            На главную
          </Link>
          <Link href="/login" className="inline-block px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium">
            Войти
          </Link>
        </div>
      </div>
    </div>
  )
}