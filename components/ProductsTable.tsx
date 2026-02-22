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
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'rating' | 'price-asc' | 'price-desc'>('date')
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [compareProducts, setCompareProducts] = useState<Product[]>([])
  const [viewHistory, setViewHistory] = useState<string[]>([])

  // Дебаунс поиска: ждём 300мс после последнего символа
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Инициализация
  useEffect(() => {
    fetchProductsMeta()
    if (!isAdmin) {
      fetchBookmarks()
      fetchUserRatings()
    }
  }, [isAdmin])

  // Сброс на 1-ю страницу при смене фильтров
  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1)
    else fetchProducts()
  }, [debouncedSearch, selectedBrand, selectedCategory, sortBy])

  // Загрузка страницы при изменении currentPage
  useEffect(() => {
    fetchProducts()
  }, [currentPage])

  // Esc закрывает модалки
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedImage) setSelectedImage(null)
        else if (selectedProduct) setSelectedProduct(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, selectedProduct])

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
    let query = supabase.from('products').select('*', { count: 'exact' })

    if (debouncedSearch) {
      query = query.or(
        `name.ilike.%${debouncedSearch}%,brand.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
      )
    }
    if (selectedBrand) query = query.eq('brand', selectedBrand)
    if (selectedCategory) query = query.eq('category', selectedCategory)

    if (sortBy === 'name') query = query.order('name', { ascending: true })
    else if (sortBy === 'rating') query = query.order('rating', { ascending: false, nullsFirst: false })
    else if (sortBy === 'price-asc') query = query.order('price', { ascending: true, nullsFirst: false })
    else if (sortBy === 'price-desc') query = query.order('price', { ascending: false, nullsFirst: false })
    else query = query.order('created_at', { ascending: false })

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
    const { data } = await supabase.from('bookmarks').select('product_id').eq('user_id', user.id)
    if (data) setBookmarks(new Set(data.map(b => b.product_id)))
  }

  const fetchUserRatings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('product_ratings').select('product_id, rating').eq('user_id', user.id)
    if (data) setUserRatings(new Map(data.map(r => [r.product_id, r.rating])))
  }

  const rateProduct = async (productId: string, rating: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      await supabase.from('product_ratings').upsert({ product_id: productId, user_id: user.id, rating })
      setUserRatings(prev => new Map(prev).set(productId, rating))
      fetchProducts()
      showToast('Рейтинг сохранен', 'success')
    } catch {
      showToast('Ошибка при сохранении рейтинга', 'error')
    }
  }

  const toggleCompare = (product: Product) => {
    setCompareProducts(prev => {
      const exists = prev.find(p => p.id === product.id)
      if (exists) return prev.filter(p => p.id !== product.id)
      if (prev.length < 4) return [...prev, product]
      showToast('Можно сравнить максимум 4 товара', 'info')
      return prev
    })
  }

  const addToHistory = async (productId: string) => {
    if (viewHistory.includes(productId)) return
    setViewHistory(prev => [productId, ...prev.slice(0, 9)])
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('view_history').insert({ user_id: user.id, product_id: productId })
  }

  const viewProduct = (product: Product) => {
    setSelectedProduct(product)
    addToHistory(product.id)
  }

  // Использует productsMeta (полный список) для точных рекомендаций
  const getSimilarProducts = (product: Product) => {
    const extractSizes = (text: string) => {
      const matches = text.match(/\d+\s*(мм|см|м|мл|л|г|кг|шт)/gi)
      return matches ? matches.map(m => m.toLowerCase()) : []
    }
    const currentSizes = extractSizes(product.description + ' ' + product.advantages)
    const currentPrice = product.price || 0
    const scored = productsMeta
      .filter(p => p.id !== product.id)
      .map(p => {
        let score = 0
        const pSizes = extractSizes(p.description + ' ' + p.advantages)
        const pPrice = p.price || 0
        if (p.category === product.category && p.brand === product.brand) score += 10
        else if (p.category === product.category) score += 5
        else if (p.brand === product.brand) score += 3
        if (currentPrice > 0 && pPrice > 0) {
          const diff = Math.abs(pPrice - currentPrice) / currentPrice
          if (diff <= 0.3) score += 4
          else if (diff <= 0.5) score += 2
        }
        const matchingSizes = currentSizes.filter(s => pSizes.includes(s)).length
        score += matchingSizes * 2
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
        await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('product_id', productId)
        setBookmarks(prev => { const next = new Set(prev); next.delete(productId); return next })
        showToast('Удалено из закладок', 'info')
      } else {
        await supabase.from('bookmarks').insert({ user_id: user.id, product_id: productId })
        setBookmarks(prev => new Set(prev).add(productId))
        showToast('Добавлено в закладки', 'success')
      }
    } catch {
      showToast('Ошибка при работе с закладками', 'error')
    }
  }

  const isNewProduct = (createdAt: string) => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(createdAt) > sevenDaysAgo
  }

  const resetFilters = () => { setSearch(''); setSelectedBrand(null); setSelectedCategory(null) }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

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

      {/* Active filter chips */}
      {(selectedBrand || selectedCategory) && (
        <div className="mt-3 flex items-center flex-wrap gap-2">
          {selectedBrand && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-900 rounded-lg text-sm font-medium">
              Бренд: {selectedBrand}
              <button onClick={() => setSelectedBrand(null)} className="hover:text-red-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          )}
          <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-slate-600 underline">
            Сбросить всё
          </button>
        </div>
      )}

      {/* Results count */}
      {totalCount > 0 && (
        <div className="mt-3 mb-4">
          <p className="text-sm text-slate-400">
            {debouncedSearch || selectedBrand || selectedCategory
              ? `Найдено: ${totalCount} товаров`
              : `Всего: ${totalCount} товаров`}
            {totalPages > 1 && ` · стр. ${currentPage}/${totalPages}`}
          </p>
        </div>
      )}

      {/* Cards view */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product, idx) => (
            <div
              key={product.id}
              className="relative bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-200 group card-enter flex flex-col"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Image */}
              <div className="relative h-48 bg-slate-100 cursor-pointer overflow-hidden flex-shrink-0" onClick={() => setSelectedImage(product.image_url)}>
                <Image src={product.image_url} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                {isNewProduct(product.created_at) && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 bg-[#8B1538] text-white text-xs font-bold rounded-full shadow">Новинка</span>
                  </div>
                )}
                {!isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCompare(product) }}
                    className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all shadow ${compareProducts.find(p => p.id === product.id) ? 'bg-[#8B1538] text-white' : 'bg-white/90 text-gray-600 hover:bg-white'}`}
                    title="Сравнить"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </button>
                )}
                {product.article_number && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white/90 font-medium">Арт: {product.article_number}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 leading-snug text-sm flex-1">{product.name}</h3>
                  {!isAdmin && (
                    <button
                      onClick={() => toggleBookmark(product.id)}
                      className={`flex-shrink-0 mt-0.5 p-1 rounded transition ${bookmarks.has(product.id) ? 'text-yellow-500 hover:text-yellow-600' : 'text-slate-300 hover:text-slate-400'}`}
                      title={bookmarks.has(product.id) ? 'Убрать из закладок' : 'В закладки'}
                    >
                      <svg className="w-5 h-5" fill={bookmarks.has(product.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  <button onClick={() => setSelectedBrand(product.brand)} className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-900 hover:bg-red-200 transition">{product.brand}</button>
                  {product.category && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-900">{product.category}</span>}
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3 flex-1">{product.description}</p>

                <div className="mt-auto space-y-2">
                  {product.price != null && product.price > 0 && (
                    <p className="text-base font-bold text-[#8B1538]">{product.price.toLocaleString('ru-RU')} ₽</p>
                  )}
                  {!isAdmin && (
                    <StarRating rating={product.rating || 0} userRating={userRatings.get(product.id)} onRate={(r) => rateProduct(product.id, r)} />
                  )}
                  <button
                    onClick={() => viewProduct(product)}
                    className="w-full px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-[#8B1538] transition-colors"
                  >
                    Подробнее
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Фото</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Название</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Бренд</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Цена</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Описание</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Преимущества</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Внимание</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition cursor-pointer" onClick={() => setSelectedImage(product.image_url)}>
                        <Image src={product.image_url} alt={product.name} fill className="object-cover" loading="lazy" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-sm">{product.name}</div>
                      {product.article_number && <div className="text-xs text-slate-400 mt-0.5">Арт: {product.article_number}</div>}
                      {isNewProduct(product.created_at) && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded">Новинка</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedBrand(product.brand)} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-900 hover:bg-red-200 transition">{product.brand}</button>
                      {product.category && <div className="mt-1"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-900">{product.category}</span></div>}
                    </td>
                    <td className="px-4 py-3">
                      {product.price != null && product.price > 0
                        ? <span className="font-bold text-[#8B1538] text-sm">{product.price.toLocaleString('ru-RU')} ₽</span>
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs"><div className="line-clamp-2">{product.description}</div></td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs"><div className="line-clamp-2">{product.advantages}</div></td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs"><div className="line-clamp-2">{product.attention_points}</div></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!isAdmin && (
                          <button
                            onClick={() => toggleBookmark(product.id)}
                            className={`p-1.5 rounded-lg transition ${bookmarks.has(product.id) ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            title={bookmarks.has(product.id) ? 'Убрать из закладок' : 'В закладки'}
                          >
                            <svg className="w-4 h-4" fill={bookmarks.has(product.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                          </button>
                        )}
                        <button onClick={() => viewProduct(product)} className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-[#8B1538] transition-colors">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-1.5 flex-wrap">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition text-sm" title="Первая">«</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition text-sm">‹</button>
          <div className="flex gap-1 flex-wrap justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1) ? (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-lg transition text-sm font-medium ${currentPage === page ? 'bg-[#8B1538] text-white shadow-sm' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                  {page}
                </button>
              ) : page === currentPage - 2 || page === currentPage + 2 ? (
                <span key={page} className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm">…</span>
              ) : null
            ))}
          </div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition text-sm">›</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition text-sm" title="Последняя">»</button>
        </div>
      )}

      {/* Empty states */}
      {totalCount === 0 && !loading && (debouncedSearch || selectedBrand || selectedCategory) && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <p className="mt-4 text-slate-400 text-lg">Ничего не найдено</p>
          <p className="text-slate-300 text-sm mt-1">Попробуйте изменить параметры поиска</p>
          <button onClick={resetFilters} className="mt-4 px-4 py-2 bg-[#8B1538] text-white text-sm font-medium rounded-lg hover:bg-[#6B0F2A] transition">
            Сбросить фильтры
          </button>
        </div>
      )}
      {totalCount === 0 && !loading && !debouncedSearch && !selectedBrand && !selectedCategory && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          <p className="mt-4 text-slate-400 text-lg">Новинок пока нет</p>
        </div>
      )}

      {/* Image lightbox */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image src={selectedImage} alt="Просмотр изображения" fill className="object-contain" />
            <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-2.5 hover:bg-white transition shadow-lg">
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">Esc или клик — закрыть</p>
          </div>
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <div onClick={() => setSelectedProduct(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl zoom-in">
            <div className="relative h-72 bg-slate-100 cursor-zoom-in overflow-hidden flex-shrink-0" onClick={() => setSelectedImage(selectedProduct.image_url)}>
              <Image src={selectedProduct.image_url} alt={selectedProduct.name} fill className="object-cover hover:scale-105 transition-transform duration-500" />
              <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(null) }} className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-full p-2 hover:bg-white transition shadow-lg z-10">
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur text-red-900 shadow">{selectedProduct.brand}</span>
                {selectedProduct.category && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur text-blue-900 shadow">{selectedProduct.category}</span>}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-18rem)]">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedProduct.name}</h2>
                {selectedProduct.price != null && selectedProduct.price > 0 && (
                  <span className="flex-shrink-0 text-xl font-bold text-[#8B1538]">{selectedProduct.price.toLocaleString('ru-RU')} ₽</span>
                )}
              </div>
              {selectedProduct.article_number && (
                <p className="text-sm text-slate-400 mb-4">Артикул: <span className="font-medium text-slate-600 select-all">{selectedProduct.article_number}</span></p>
              )}

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <h3 className="font-semibold text-slate-800 text-sm">Описание</h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{selectedProduct.description}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <h3 className="font-semibold text-green-800 text-sm">Преимущества</h3>
                  </div>
                  <p className="text-green-700 text-sm leading-relaxed">{selectedProduct.advantages}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <h3 className="font-semibold text-orange-800 text-sm">На что обратить внимание</h3>
                  </div>
                  <p className="text-orange-700 text-sm leading-relaxed">{selectedProduct.attention_points}</p>
                </div>
                {(selectedProduct.website_link || selectedProduct.onec_link) && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      <h3 className="font-semibold text-blue-800 text-sm">Полезные ссылки</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.website_link && (
                        <a href={selectedProduct.website_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition text-sm font-medium">
                          🌐 Посмотреть на сайте
                        </a>
                      )}
                      {selectedProduct.onec_link && (
                        <a href={selectedProduct.onec_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition text-sm font-medium">
                          📊 Открыть в 1С
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {getSimilarProducts(selectedProduct).length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <h3 className="font-semibold text-purple-900 text-sm mb-3">🔍 Похожие товары</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {getSimilarProducts(selectedProduct).map(similar => (
                        <button key={similar.id} onClick={() => viewProduct(similar)} className="flex items-center gap-2 p-2.5 bg-white rounded-lg hover:bg-purple-50 transition text-left border border-purple-100">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <Image src={similar.image_url} alt={similar.name} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-900 truncate">{similar.name}</div>
                            <div className="text-xs text-gray-500">{similar.brand}</div>
                            {similar.price != null && similar.price > 0 && (
                              <div className="text-xs font-bold text-[#8B1538]">{similar.price.toLocaleString('ru-RU')} ₽</div>
                            )}
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
