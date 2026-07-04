'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null)
  const [topBrands, setTopBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await apiClient.auth.getUser()

    if (!user) {
      router.push('/login')
      setLoading(false)
      return
    }

    const { data: adminStatus } = await apiClient.rpc('check_admin_status', { user_id: user.id })
    if (!adminStatus) {
      router.push('/')
      setLoading(false)
      return
    }

    setIsAdmin(true)
    await fetchAnalytics()
  }

  const fetchAnalytics = async () => {
    // Для счётчиков выбираем только id — намного быстрее, чем select('*')
    const { data: products } = await apiClient.from('products').select('id, name, brand, is_archived').catch(() => ({ data: [] }))

    setStats({
      totalProducts: products?.length || 0,
      activeProducts: products?.filter((product: any) => !product.is_archived).length || 0,
    })

    // Популярные бренды — вычисляем из активных (неархивных) товаров
    const brandStats: Record<string, number> = {}
    products?.forEach((p: any) => {
      if (p.brand && !p.is_archived) brandStats[p.brand] = (brandStats[p.brand] || 0) + 1
    })

    const brandsArray = Object.entries(brandStats)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 10)

    setTopBrands(brandsArray)
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div></div>
  if (!isAdmin) return null

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Аналитика</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Общая статистика */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-slate-900">{stats.totalProducts}</div>
            <div className="text-slate-600 mt-1">Всего новинок</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-blue-900">{stats.activeProducts}</div>
            <div className="text-slate-600 mt-1">Активных товаров</div>
          </div>
        </div>

        {/* Популярные бренды */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold mb-4">Популярные бренды</h2>
          <div className="space-y-3">
            {topBrands.map((brand: any, idx) => (
              <div key={idx} className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-2xl font-bold text-slate-300">#{idx + 1}</span>
                  <span className="break-words font-medium">{brand.brand}</span>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-sm font-bold">
                  {brand.count} товаров
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
