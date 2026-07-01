'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Breadcrumbs() {
  const pathname = usePathname()
  const paths = pathname.split('/').filter(Boolean)

  const breadcrumbMap: Record<string, string> = {
    'admin': 'Панель администратора',
    'bookmarks': 'Закладки',
    'trash': 'Корзина',
    'archive': 'Архив',
    'analytics': 'Аналитика',
    'categories': 'Категории',
    'requests': 'Запросы новинок'
  }

  if (paths.length === 0) return null

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      <Link href="/" className="inline-flex items-center gap-1.5 hover:text-slate-700 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        Главная
      </Link>
      {paths.map((path, index) => {
        const href = '/' + paths.slice(0, index + 1).join('/')
        const isLast = index === paths.length - 1
        const label = breadcrumbMap[path] || path

        return (
          <span key={path} className="flex items-center gap-2">
            <span className="text-gray-400">/</span>
            {isLast ? (
              <span className="text-slate-700 font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-slate-700 transition">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
