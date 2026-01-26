'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types/product'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface ProductsTableProps {
  isAdmin: boolean
}

export default function ProductsTable({ isAdmin }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchProducts()
    if (!isAdmin) fetchBookmarks()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
    }
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) setProducts(data)
    setLoading(false)
  }

  const fetchBookmarks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('bookmarks')
      .select('product_id')
      .eq('user_id', user.id)
    
    if (data) {
      setBookmarks(new Set(data.map(b => b.product_id)))
    }
  }

  const toggleBookmark = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (bookmarks.has(productId)) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
      
      setBookmarks(prev => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    } else {
      await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, product_id: productId })
      
      setBookmarks(prev => new Set(prev).add(productId))
    }
  }

  const viewProduct = async (product: Product) => {
    setSelectedProduct(product)
    
    // Отслеживание просмотра с ограничениями
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('product_views').insert({
          product_id: product.id,
          user_id: user.id,
          ip_address: 'web'
        })
      }
    } catch (error) {
      // Молчаливо игнорируем ошибки логирования
      console.warn('Failed to log view:', error)
    }
  }

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    const matchesBrand = !selectedBrand || p.brand === selectedBrand
    return matchesSearch && matchesBrand
  })

  if (loading || !user) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
    </div>
  )

  return (
    <div>
      <div className="mb-6 relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          placeholder="Поиск по названию, бренду или описанию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      
      {selectedBrand && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-600">Фильтр по бренду:</span>
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-900 rounded-lg text-sm font-medium">
            {selectedBrand}
            <button onClick={() => setSelectedBrand(null)} className="hover:text-red-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Фото</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Название</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Бренд</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Описание</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Преимущества</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Внимание</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product, idx) => (
                <tr key={product.id} className="hover:bg-slate-100 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition">
                      <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelectedBrand(product.brand)} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-900 hover:bg-red-200 transition cursor-pointer">{product.brand}</button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                    <div className="line-clamp-2">{product.description}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                    <div className="line-clamp-2">{product.advantages}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                    <div className="line-clamp-2">{product.attention_points}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!isAdmin && (
                        <button
                          onClick={() => toggleBookmark(product.id)}
                          className={`p-2 rounded-lg transition ${bookmarks.has(product.id) ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          title={bookmarks.has(product.id) ? 'Удалить из закладок' : 'Добавить в закладки'}
                        >
                          <svg className="w-5 h-5" fill={bookmarks.has(product.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </button>
                      )}
                      <button onClick={() => viewProduct(product)} className="inline-flex items-center px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition">
                        Подробнее
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="mt-4 text-slate-400 text-lg">Ничего не найдено</p>
          </div>
        )}
      </div>

      {selectedProduct && (
        <div onClick={() => setSelectedProduct(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative h-80 bg-gradient-to-br from-slate-100 to-slate-200">
              <Image src={selectedProduct.image_url} alt={selectedProduct.name} fill className="object-cover" />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-full p-2.5 hover:bg-white transition shadow-lg">
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="absolute bottom-4 left-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur text-red-900 shadow-lg">{selectedProduct.brand}</span>
              </div>
            </div>
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-20rem)]">
              <h2 className="text-3xl font-bold mb-6 text-slate-900">{selectedProduct.name}</h2>
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <h3 className="font-bold text-slate-900">Описание</h3>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{selectedProduct.description}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <h3 className="font-bold text-green-900">Преимущества</h3>
                  </div>
                  <p className="text-green-800 leading-relaxed">{selectedProduct.advantages}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <h3 className="font-bold text-orange-900">На что обратить внимание</h3>
                  </div>
                  <p className="text-orange-800 leading-relaxed">{selectedProduct.attention_points}</p>
                </div>
                {(selectedProduct.website_link || selectedProduct.onec_link) && (
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      <h3 className="font-bold text-blue-900">Полезные ссылки</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedProduct.website_link && (
                        <a href={selectedProduct.website_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium">
                          🌐 Посмотреть на сайте
                        </a>
                      )}
                      {selectedProduct.onec_link && (
                        <a href={selectedProduct.onec_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-700 hover:text-green-900 font-medium">
                          📊 Открыть в 1С
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
