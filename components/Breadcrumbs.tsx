'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Breadcrumbs() {
  const pathname = usePathname()
  const paths = pathname.split('/').filter(Boolean)

  const breadcrumbMap: Record<string, string> = {
    'admin': 'Админ панель',
    'bookmarks': 'Закладки',
    'users': 'Пользователи',
    'trash': 'Корзина',
    'archive': 'Архив',
    'analytics': 'Аналитика',
    'categories': 'Категории',
    'settings': 'Настройки'
  }

  if (paths.length === 0) return null

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      <Link href="/" className="hover:text-[#8B1538] transition">
        🏠 Главная
      </Link>
      {paths.map((path, index) => {
        const href = '/' + paths.slice(0, index + 1).join('/')
        const isLast = index === paths.length - 1
        const label = breadcrumbMap[path] || path

        return (
          <span key={path} className="flex items-center gap-2">
            <span className="text-gray-400">/</span>
            {isLast ? (
              <span className="text-[#8B1538] font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-[#8B1538] transition">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
