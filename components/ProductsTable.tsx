'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types/product'
import Image from 'next/image'
import ProductSkeleton from './ProductSkeleton'
import { showToast } from './Toast'
import FilterBar from './FilterBar'
import StarRating from './StarRating'
import SearchBar from './SearchBar'
import CompareBar from './CompareBar'
import Breadcrumbs from './Breadcrumbs'

interface ProductsTableProps {
  isAdmin: boolean
}

const ITEMS_PER_PAGE = 30

export default function ProductsTable({ isAdmin }: ProductsTableProps) {
  // Текущая страница (серверная пагинация)
  const [products, setProducts] = useState<Product[]>([])
  // Лёгкий список всех товаров: автодополнение, категории, похожие товары
  const [productsMeta, setProductsMeta] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'rating'>('date')
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [compareProducts, setCompareProducts] = useState<Product[]>([])
  const [viewHistory, setViewHistory] = useState<string[]>([])
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null)
  // Дебаунс поиска: ждём 300мс после последнего символа
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Инициализация: загружаем мета-список (все товары, лёгкие поля) и остальное
  useEffect(() => {
    fetchProductsMeta()
    if (!isAdmin) {
      fetchBookmarks()
      fetchUserRatings()
    }
  }, [isAdmin])

  // Сброс на 1-ю страницу при смене фильтров (не при смене самой страницы)
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1)
    else fetchProducts()
  }, [debouncedSearch, selectedBrand, selectedCategory, sortBy])

  // Загрузка страницы при изменении currentPage
  useEffect(() => {
    fetchProducts()
  }, [currentPage])

  // Полный список товаров с базовыми полями — для автодополнения и похожих товаров
  const fetchProductsMeta = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, category, article_number, price, rating, image_url, description, advantages')
      .order('created_at', { ascending: false })
    if (data) setProductsMeta(data as Product[])
  }

  // Серверная фильтрация + пагинация
  const fetchProducts = async () => {
    setLoading(true)

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })

    if (debouncedSearch) {
      query = query.or(
        `name.ilike.%${debouncedSearch}%,brand.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
      )
    }
    if (selectedBrand) query = query.eq('brand', selectedBrand)
    if (selectedCategory) query = query.eq('category', selectedCategory)

    if (sortBy === 'name') {
      query = query.order('name', { ascending: true })
    } else if (sortBy === 'rating') {
      query = query.order('rating', { ascending: false, nullsFirst: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE
    query = query.range(start, start + ITEMS_PER_PAGE - 1)

    const { data, count } = await query
    if (data) setProducts(data)
    setTotalCount(count ?? 0)
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

  const toggleCompare = (product: Product) => {
    setCompareProducts(prev => {
      const exists = prev.find(p => p.id === product.id)
      if (exists) {
        return prev.filter(p => p.id !== product.id)
      } else if (prev.length < 4) {
        return [...prev, product]
      } else {
        showToast('Можно сравнить максимум 4 товара', 'info')
        return prev
      }
    })
  }

  const addToHistory = async (productId: string) => {
    if (viewHistory.includes(productId)) return
    setViewHistory(prev => [productId, ...prev.slice(0, 9)])
    
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('view_history').insert({ user_id: user.id, product_id: productId })
    }
  }

  const viewProduct = (product: Product) => {
    setSelectedProduct(product)
    addToHistory(product.id)
  }

  const getSimilarProducts = (product: Product) => {
    // Извлекаем размеры из описания (числа с единицами измерения)
    const extractSizes = (text: string) => {
      const matches = text.match(/\d+\s*(мм|см|м|мл|л|г|кг|шт)/gi)
      return matches ? matches.map(m => m.toLowerCase()) : []
    }

    const currentSizes = extractSizes(product.description + ' ' + product.advantages)
    const currentPrice = product.price || 0

    // Вычисляем score похожести для каждого товара (работаем с полным мета-списком)
    const scored = productsMeta
      .filter(p => p.id !== product.id)
      .map(p => {
        let score = 0
        const pSizes = extractSizes(p.description + ' ' + p.advantages)
        const pPrice = p.price || 0

        // Та же категория И бренд = +10
        if (p.category === product.category && p.brand === product.brand) score += 10
        // Та же категория = +5
        else if (p.category === product.category) score += 5
        // Тот же бренд = +3
        else if (p.brand === product.brand) score += 3

        // Похожая цена (±30%) = +4
        if (currentPrice > 0 && pPrice > 0) {
          const priceDiff = Math.abs(pPrice - currentPrice) / currentPrice
          if (priceDiff <= 0.3) score += 4
          else if (priceDiff <= 0.5) score += 2
        }

        // Совпадающие размеры = +2 за каждый
        const matchingSizes = currentSizes.filter(s => pSizes.includes(s)).length
        score += matchingSizes * 2

        // Высокий рейтинг = +1
        if ((p.rating || 0) >= 4) score += 1

        return { product: p, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, 4).map(item => item.product)
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  // products уже является текущей страницей, пагинация сделана на сервере

  if (loading) return <ProductSkeleton />

  return (
    <div>
      <Breadcrumbs />
      <FilterBar
        products={productsMeta}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <SearchBar
        products={productsMeta}
        search={search}
        setSearch={setSearch}
        onSelectProduct={viewProduct}
      />
      
      <div className="mb-6">
        <div className="relative">
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
          {products.map((product, idx) => (
            <div 
              key={product.id} 
              className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition group animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${idx * 50}ms` }}
              onMouseEnter={() => setHoveredProduct(product)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              <div className="relative h-48 bg-slate-100 cursor-pointer" onClick={() => setSelectedImage(product.image_url)}>
                <Image src={product.image_url} alt={product.name} fill className="object-cover" loading="lazy" />
                {!isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                    className={`absolute top-2 right-2 p-2 rounded-lg transition ${compareProducts.find(p => p.id === product.id) ? 'bg-[#8B1538] text-white' : 'bg-white/90 text-gray-700'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </button>
                )}
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
              
              {hoveredProduct?.id === product.id && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm p-4 flex flex-col justify-center animate-in fade-in duration-200">
                  <h4 className="text-white font-bold mb-2">{product.name}</h4>
                  <p className="text-white/90 text-sm mb-3 line-clamp-3">{product.description}</p>
                  <button onClick={() => viewProduct(product)} className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition text-sm font-medium">
                    Подробнее
                  </button>
                </div>
              )}
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
                {products.map((product) => (
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

      {totalCount === 0 && debouncedSearch && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="mt-4 text-slate-400 text-lg">Ничего не найдено по запросу "{debouncedSearch}"</p>
          <button 
            onClick={() => setSearch('')}
            className="mt-2 text-red-800 hover:text-red-900 font-medium"
          >
            Очистить поиск
          </button>
        </div>
      )}
      {totalCount === 0 && !debouncedSearch && (
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
                
                {getSimilarProducts(selectedProduct).length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                    <h3 className="font-bold text-purple-900 mb-3">🔍 Похожие товары</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {getSimilarProducts(selectedProduct).map(similar => (
                        <button
                          key={similar.id}
                          onClick={() => viewProduct(similar)}
                          className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-purple-100 transition text-left"
                        >
                          <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <Image src={similar.image_url} alt={similar.name} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{similar.name}</div>
                            <div className="text-xs text-gray-500">{similar.brand}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <CompareBar 
        compareProducts={compareProducts}
        onRemove={(id) => setCompareProducts(prev => prev.filter(p => p.id !== id))}
        onClear={() => setCompareProducts([])}
      />
    </div>
  )
}
