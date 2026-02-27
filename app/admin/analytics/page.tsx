'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
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
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      setLoading(false)
      return
    }

    const { data: adminStatus } = await supabase.rpc('check_admin_status', { user_id: user.id })
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
    const { data: products } = await supabase.from('products').select('id, name, brand, rating').catch(() => ({ data: [] }))
    const { data: users } = await supabase.from('user_profiles').select('id').catch(() => ({ data: [] }))
    const { data: bookmarks } = await supabase.from('bookmarks').select('id').catch(() => ({ data: [] }))

    // product_views / product_statistics могут отсутствовать в схеме
    let totalViews = 0
    let topProds: any[] = []
    try {
      const { data: views } = await supabase.from('product_views').select('*')
      totalViews = views?.length || 0
    } catch { /* коллекция не существует */ }

    try {
      const { data: stats } = await supabase
        .from('product_statistics')
        .select('id, name, brand, view_count, bookmark_count')
        .order('view_count', { ascending: false })
        .limit(10)
      topProds = stats || []
    } catch { /* коллекция не существует */ }

    setStats({
      totalProducts: products?.length || 0,
      totalUsers: users?.length || 0,
      totalViews,
      totalBookmarks: bookmarks?.length || 0,
    })

    setTopProducts(topProds)

    // Популярные бренды — вычисляем из списка товаров
    const brandStats: Record<string, number> = {}
    products?.forEach((p: any) => {
      if (p.brand) brandStats[p.brand] = (brandStats[p.brand] || 0) + 1
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="text-2xl font-bold text-white">📊 Аналитика</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Общая статистика */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-slate-900">{stats.totalProducts}</div>
            <div className="text-slate-600 mt-1">Всего новинок</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-blue-900">{stats.totalUsers}</div>
            <div className="text-slate-600 mt-1">Пользователей</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-green-900">{stats.totalViews}</div>
            <div className="text-slate-600 mt-1">Просмотров</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl font-bold text-purple-900">{stats.totalBookmarks}</div>
            <div className="text-slate-600 mt-1">Закладок</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Топ-10 новинок */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">🏆 Топ-10 новинок</h2>
            <div className="space-y-3">
              {topProducts.map((product, idx) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-300">#{idx + 1}</span>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-slate-600">{product.brand}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{product.view_count} 👁️</div>
                    <div className="text-sm text-purple-600">{product.bookmark_count} 🔖</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Популярные бренды */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">🏷️ Популярные бренды</h2>
            <div className="space-y-3">
              {topBrands.map((brand: any, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-300">#{idx + 1}</span>
                    <span className="font-medium">{brand.brand}</span>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-sm font-bold">
                    {brand.count} товаров
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
