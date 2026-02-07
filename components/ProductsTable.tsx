'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types/product'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import ProductSkeleton from './ProductSkeleton'
import { showToast } from './Toast'
import FilterBar from './FilterBar'
import StarRating from './StarRating'

interface ProductsTableProps {
  isAdmin: boolean
}

const ITEMS_PER_PAGE = 30

export default function ProductsTable({ isAdmin }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'rating'>('date')
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const router = useRouter()

  useEffect(() => {
    fetchProducts()
    if (!isAdmin) {
      fetchBookmarks()
      fetchUserRatings()
    }
  }, [isAdmin])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setProducts(data)
    setLoading(false)
  }

  const fetchBookmarks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('bookmarks')
      .select('product_id')
      .eq('user_id', user.id)
    
    if (data) setBookmarks(new Set(data.map(b => b.product_id)))
  }

  const fetchUserRatings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('product_ratings')
      .select('product_id, rating')
      .eq('user_id', user.id)
    
    if (data) setUserRatings(new Map(data.map(r => [r.product_id, r.rating])))
  }

  const rateProduct = async (productId: string, rating: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      await supabase
        .from('product_ratings')
        .upsert({ product_id: productId, user_id: user.id, rating })
      
      setUserRatings(prev => new Map(prev).set(productId, rating))
      fetchProducts()
      showToast('Рейтинг сохранен', 'success')
    } catch (error) {
      showToast('Ошибка при сохранении рейтинга', 'error')
    }
  }

  const toggleBookmark = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
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
        showToast('Удалено из закладок', 'info')
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, product_id: productId })
        
        setBookmarks(prev => new Set(prev).add(productId))
        showToast('Добавлено в закладки', 'success')
      }
    } catch (error) {
      showToast('Ошибка при работе с закладками', 'error')
    }
  }

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      const matchesBrand = !selectedBrand || p.brand === selectedBrand
      const matchesCategory = !selectedCategory || p.category === selectedCategory
      return matchesSearch && matchesBrand && matchesCategory
    })

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return result
  }, [products, search, selectedBrand, selectedCategory, sortBy])

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  }, [products])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedBrand, selectedCategory, sortBy])

  if (loading) return <ProductSkeleton />

  return (
    <div>
      <FilterBar 
        products={products}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Поиск по названию, бренду или описанию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
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
      
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition group">
              <div className="relative h-48 bg-slate-100 cursor-pointer" onClick={() => setSelectedImage(product.image_url)}>
                <Image src={product.image_url} alt={product.name} fill className="object-cover" loading="lazy" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-lg">{product.name}</h3>
                  {!isAdmin && (
                    <button onClick={() => toggleBookmark(product.id)} className={`p-2 rounded-lg transition ${bookmarks.has(product.id) ? 'text-yellow-600' : 'text-slate-400'}`}>
                      <svg className="w-5 h-5" fill={bookmarks.has(product.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </button>
                  )}
                </div>
                <button onClick={() => setSelectedBrand(product.brand)} className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-900 mb-3">{product.brand}</button>
                {product.category && <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-900 mb-3 ml-2">{product.category}</span>}
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">{product.description}</p>
                {!isAdmin && <StarRating rating={product.rating || 0} userRating={userRatings.get(product.id)} onRate={(r) => rateProduct(product.id, r)} />}
                <button onClick={() => setSelectedProduct(product)} className="w-full px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition mt-3">Подробнее</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-100 transition-colors group">
                    <td className="px-6 py-4">
                      <div 
                        className="relative w-20 h-20 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition cursor-pointer"
                        onClick={() => setSelectedImage(product.image_url)}
                      >
                        <Image src={product.image_url} alt={product.name} fill className="object-cover" loading="lazy" />
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
                        <button onClick={() => setSelectedProduct(product)} className="inline-flex items-center px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition">
                          Подробнее
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2 flex-wrap">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-white border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition">
            ←
          </button>
          <div className="flex gap-1 flex-wrap justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1) ? (
                <button key={page} onClick={() => setCurrentPage(page)} className={`px-4 py-2 rounded-lg transition ${currentPage === page ? 'bg-red-800 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}>
                  {page}
                </button>
              ) : page === currentPage - 2 || page === currentPage + 2 ? (
                <span key={page} className="px-2 py-2">...</span>
              ) : null
            ))}
          </div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-lg bg-white border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition">
            →
          </button>
        </div>
      )}

      {filtered.length === 0 && search && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="mt-4 text-slate-400 text-lg">Ничего не найдено по запросу "{search}"</p>
          <button 
            onClick={() => setSearch('')}
            className="mt-2 text-red-800 hover:text-red-900 font-medium"
          >
            Очистить поиск
          </button>
        </div>
      )}
      {filtered.length === 0 && !search && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          <p className="mt-4 text-slate-400 text-lg">Новинок пока нет</p>
        </div>
      )}

      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)} 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image 
              src={selectedImage} 
              alt="Просмотр изображения" 
              fill 
              className="object-contain" 
            />
            <button 
              onClick={() => setSelectedImage(null)} 
              className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-full p-2.5 hover:bg-white transition shadow-lg"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div onClick={() => setSelectedProduct(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative h-80 bg-gradient-to-br from-slate-100 to-slate-200">
              <Image 
                src={selectedProduct.image_url} 
                alt={selectedProduct.name} 
                fill 
                className="object-cover cursor-pointer" 
                onClick={() => setSelectedImage(selectedProduct.image_url)}
              />
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
