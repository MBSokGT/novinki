'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Product } from '@/types/product'
import Image from 'next/image'
import ProductSkeleton from './ProductSkeleton'
import { showToast } from './Toast'
import FilterBar from './FilterBar'
import StarRating from './StarRating'
import SearchBar from './SearchBar'
import CompareBar from './CompareBar'
import Breadcrumbs from './Breadcrumbs'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface ProductsTableProps {
  isAdmin: boolean
}

const ITEMS_PER_PAGE = 30
const VIEW_MODE_KEY = 'novinki:viewMode'
const SORT_BY_KEY = 'novinki:sortBy'
const CATEGORY_KEY = 'novinki:selectedCategory'
const YEAR_KEY = 'novinki:selectedYear'
const VIEW_HISTORY_KEY = 'novinki:viewHistory'
const BOOKMARKS_SYNC_KEY = 'novinki:bookmarks_sync'

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
  const [hasUserSession, setHasUserSession] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'rating'>('date')
  const [userRatings, setUserRatings] = useState<Map<string, number>>(new Map())
  const [compareProducts, setCompareProducts] = useState<Product[]>([])
  const [viewHistory, setViewHistory] = useState<string[]>([])
  const [isUrlStateReady, setIsUrlStateReady] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedViewMode = window.localStorage.getItem(VIEW_MODE_KEY)
    if (savedViewMode === 'cards' || savedViewMode === 'table') {
      setViewMode(savedViewMode)
    }

    const savedSortBy = window.localStorage.getItem(SORT_BY_KEY)
    if (savedSortBy === 'date' || savedSortBy === 'name' || savedSortBy === 'rating') {
      setSortBy(savedSortBy)
    }

    const savedCategory = window.localStorage.getItem(CATEGORY_KEY)
    if (savedCategory) {
      setSelectedCategory(savedCategory)
    }

    const savedYear = window.localStorage.getItem(YEAR_KEY)
    if (savedYear) {
      setSelectedYear(savedYear)
    }

    const savedHistory = window.localStorage.getItem(VIEW_HISTORY_KEY)
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        if (Array.isArray(parsedHistory)) {
          setViewHistory(parsedHistory.filter((id) => typeof id === 'string').slice(0, 10))
        }
      } catch {
        // Ignore invalid JSON and continue with empty history.
      }
    }
  }, [])

  useEffect(() => {
    const hasAnyQueryParam =
      searchParams.has('q') ||
      searchParams.has('brand') ||
      searchParams.has('category') ||
      searchParams.has('year') ||
      searchParams.has('sort') ||
      searchParams.has('view') ||
      searchParams.has('page')

    if (!hasAnyQueryParam) {
      setIsUrlStateReady(true)
      return
    }

    const q = searchParams.get('q') || ''
    const brand = searchParams.get('brand')
    const category = searchParams.get('category')
    const year = searchParams.get('year')
    const sort = searchParams.get('sort')
    const view = searchParams.get('view')
    const pageFromQuery = Number.parseInt(searchParams.get('page') || '1', 10)
    const page = Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1

    setSearch(q)
    setDebouncedSearch(q)
    setSelectedBrand(brand || null)
    setSelectedCategory(category || null)
    setSelectedYear(year || null)
    setSortBy(sort === 'name' || sort === 'rating' ? sort : 'date')
    setViewMode(view === 'table' ? 'table' : 'cards')
    setCurrentPage(page)
    setIsUrlStateReady(true)
  }, [searchParams])
  // Дебаунс поиска: ждём 300мс после последнего символа
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!isUrlStateReady) return

    const params = new URLSearchParams(searchParams.toString())

    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    else params.delete('q')

    if (selectedBrand) params.set('brand', selectedBrand)
    else params.delete('brand')

    if (selectedCategory) params.set('category', selectedCategory)
    else params.delete('category')

    if (selectedYear) params.set('year', selectedYear)
    else params.delete('year')

    if (sortBy !== 'date') params.set('sort', sortBy)
    else params.delete('sort')

    if (viewMode !== 'cards') params.set('view', viewMode)
    else params.delete('view')

    if (currentPage > 1) params.set('page', String(currentPage))
    else params.delete('page')

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [
    currentPage,
    debouncedSearch,
    isUrlStateReady,
    pathname,
    router,
    searchParams,
    selectedBrand,
    selectedCategory,
    selectedYear,
    sortBy,
    viewMode,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(VIEW_MODE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SORT_BY_KEY, sortBy)
  }, [sortBy])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedCategory) {
      window.localStorage.setItem(CATEGORY_KEY, selectedCategory)
    } else {
      window.localStorage.removeItem(CATEGORY_KEY)
    }
  }, [selectedCategory])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (selectedYear) {
      window.localStorage.setItem(YEAR_KEY, selectedYear)
    } else {
      window.localStorage.removeItem(YEAR_KEY)
    }
  }, [selectedYear])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (viewHistory.length > 0) {
      window.localStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(viewHistory))
    } else {
      window.localStorage.removeItem(VIEW_HISTORY_KEY)
    }
  }, [viewHistory])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 520)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Cross-tab bookmark sync: refetch when another tab adds/removes a bookmark
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key === BOOKMARKS_SYNC_KEY) fetchBookmarks()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  }, [debouncedSearch, selectedBrand, selectedCategory, selectedYear, sortBy])

  // Загрузка страницы при изменении currentPage
  useEffect(() => {
    fetchProducts()
  }, [currentPage])

  // Полный список товаров с базовыми полями — для автодополнения и похожих товаров
  const fetchProductsMeta = async () => {
    const { data } = await apiClient
      .from('products')
      .select('id, name, brand, category, year, article_number, price, rating, image_url, description, advantages')
      .order('created_at', { ascending: false })
    if (data) setProductsMeta(data as Product[])
  }

  // Серверная фильтрация + пагинация
  const fetchProducts = async () => {
    setLoading(true)

    let query = apiClient
      .from('products')
      .select('*', { count: 'exact' })

    if (debouncedSearch) {
      query = query.or(
        `name.ilike.%${debouncedSearch}%,brand.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
      )
    }
    if (selectedBrand) query = query.eq('brand', selectedBrand)
    if (selectedCategory) query = query.eq('category', selectedCategory)
    if (selectedYear) query = query.eq('year', selectedYear)

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
    const { data: { user } } = await apiClient.auth.getUser()
    setHasUserSession(Boolean(user))
    if (!user) {
      setBookmarks(new Set())
      return
    }

    const { data } = await apiClient
      .from('bookmarks')
      .select('product_id')
      .eq('user_id', user.id)
    
    if (data) setBookmarks(new Set(data.map((b: any) => b.product_id)))
  }

  const fetchUserRatings = async () => {
    const { data: { user } } = await apiClient.auth.getUser()
    if (!user) return

    const { data } = await apiClient
      .from('product_ratings')
      .select('product_id, rating')
      .eq('user_id', user.id)
    
    if (data) setUserRatings(new Map(data.map((r: any) => [r.product_id, r.rating])))
  }

  const rateProduct = async (productId: string, rating: number) => {
    const { data: { user } } = await apiClient.auth.getUser()
    if (!user) return

    // Optimistic update: immediately reflect the new user rating in the UI
    setUserRatings(prev => new Map(prev).set(productId, rating))

    try {
      await apiClient
        .from('product_ratings')
        .upsert({ product_id: productId, user_id: user.id, rating })

      // Fetch only the single updated product to get the new average rating
      const { data: updated } = await apiClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (updated) {
        setProducts(prev => prev.map(p => p.id === productId ? updated as Product : p))
        setProductsMeta(prev => prev.map(p => p.id === productId ? updated as Product : p))
      }

      showToast('Рейтинг сохранен', 'success')
    } catch (error) {
      // Revert optimistic update on error
      setUserRatings(prev => {
        const next = new Map(prev)
        next.delete(productId)
        return next
      })
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
    setViewHistory((prev) => [productId, ...prev.filter((id) => id !== productId)].slice(0, 10))
    
    const { data: { user } } = await apiClient.auth.getUser()
    if (user) {
      await apiClient.from('view_history').insert({ user_id: user.id, product_id: productId })
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

    const currentSizes = extractSizes((product.description || '') + ' ' + (product.advantages || ''))
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

  // Compute once to avoid double-calling getSimilarProducts in the modal
  const selectedProductSimilar = useMemo(
    () => (selectedProduct ? getSimilarProducts(selectedProduct) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedProduct, productsMeta]
  )

  const toggleBookmark = async (productId: string) => {
    const { data: { user } } = await apiClient.auth.getUser()
    if (!user) return

    try {
      if (bookmarks.has(productId)) {
        await apiClient
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)

        setBookmarks(prev => {
          const next = new Set(prev)
          next.delete(productId)
          return next
        })
        window.localStorage.setItem(BOOKMARKS_SYNC_KEY, Date.now().toString())
        showToast('Удалено из закладок', 'info')
      } else {
        await apiClient
          .from('bookmarks')
          .insert({ user_id: user.id, product_id: productId })

        setBookmarks(prev => new Set(prev).add(productId))
        window.localStorage.setItem(BOOKMARKS_SYNC_KEY, Date.now().toString())
        showToast('Добавлено в закладки', 'success')
      }
    } catch (error) {
      showToast('Ошибка при работе с закладками', 'error')
    }
  }

  const clearAllFilters = () => {
    setSearch('')
    setSelectedBrand(null)
    setSelectedCategory(null)
    setSelectedYear(null)
    setSortBy('date')
    setCurrentPage(1)
  }

  const activeFiltersCount =
    (debouncedSearch ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedYear ? 1 : 0) +
    (sortBy !== 'date' ? 1 : 0)

  const productsById = useMemo(() => {
    const map = new Map<string, Product>()
    productsMeta.forEach((product) => map.set(product.id, product))
    products.forEach((product) => map.set(product.id, product))
    return map
  }, [productsMeta, products])

  const recentViewedProducts = useMemo(
    () => viewHistory.map((id) => productsById.get(id)).filter(Boolean) as Product[],
    [viewHistory, productsById]
  )

  const popularBrands = useMemo(() => {
    const counts = new Map<string, number>()
    productsMeta.forEach((product) => {
      counts.set(product.brand, (counts.get(product.brand) || 0) + 1)
    })

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([brand, count]) => ({ brand, count }))
  }, [productsMeta])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  // products уже является текущей страницей, пагинация сделана на сервере

  if (loading) return <ProductSkeleton />

  return (
    <div>
      <Breadcrumbs />
      <div className="mb-4">
        <SearchBar
          products={productsMeta}
          search={search}
          setSearch={setSearch}
          onSelectProduct={viewProduct}
        />
      </div>
      <FilterBar
        products={productsMeta}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeFiltersCount={activeFiltersCount}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        onClearFilters={clearAllFilters}
      />
      
      {recentViewedProducts.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Недавно просмотренные</p>
            <button
              onClick={() => setViewHistory([])}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Очистить
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentViewedProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => viewProduct(product)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                <span className="truncate max-w-[220px]">{product.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {popularBrands.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Популярные бренды:</span>
          {popularBrands.map(({ brand, count }) => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                selectedBrand === brand
                  ? 'border-slate-300 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{brand}</span>
              <span className="text-[10px] text-slate-500">({count})</span>
            </button>
          ))}
        </div>
      )}
      
      {selectedBrand && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-slate-600">Фильтр по бренду:</span>
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-sm font-medium">
            {selectedBrand}
            <button onClick={() => setSelectedBrand(null)} className="hover:text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        </div>
      )}
      
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product, idx) => (
            <div
              key={product.id}
              className="relative flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="relative h-36 bg-slate-100 cursor-pointer" onClick={() => product.image_url && setSelectedImage(product.image_url)}>
                <Image src={product.image_url || (process.env.NEXT_PUBLIC_BASE_PATH||'')+'/placeholder.svg'} alt={product.name} fill className="object-cover" loading="lazy" />
                {!isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                    className={`absolute top-2 right-2 p-1.5 rounded-lg transition ${compareProducts.find(p => p.id === product.id) ? 'bg-[#9B1B1B] text-white' : 'bg-white/90 text-gray-600 hover:bg-white'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </button>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 flex-1 mr-1">{product.name}</h3>
                  {!isAdmin && hasUserSession && (
                    <button onClick={() => toggleBookmark(product.id)} className={`p-1.5 rounded-lg transition flex-shrink-0 ${bookmarks.has(product.id) ? 'text-yellow-500' : 'text-slate-300 hover:text-slate-500'}`}>
                      <svg className="w-4 h-4" fill={bookmarks.has(product.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </button>
                  )}
                </div>
                {product.article_number && <p className="text-[10px] text-slate-400 mb-1 font-mono">{product.article_number}</p>}
                {product.flyer_url && (
                  <a
                    href={product.flyer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9B1B1B] hover:text-[#7A1515] mb-2"
                  >
                    📄 Листовка (PDF)
                  </a>
                )}
                <div className="flex flex-wrap items-center justify-start gap-1 mb-2">
                  <button onClick={() => setSelectedBrand(product.brand)} className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition">{product.brand}</button>
                  {product.category && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">{product.category}</span>}
                  {product.year && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">{product.year}</span>}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-2">{product.description}</p>
                {!isAdmin && hasUserSession && <StarRating rating={product.rating || 0} userRating={userRatings.get(product.id)} onRate={(r) => rateProduct(product.id, r)} />}
                <button onClick={() => viewProduct(product)} className="w-full px-3 py-1.5 bg-[#9B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#7A1515] transition mt-auto">Подробнее</button>
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-100 transition-colors group">
                    <td className="px-6 py-4">
                      <div 
                        className="relative w-20 h-20 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition cursor-pointer"
                        onClick={() => product.image_url && setSelectedImage(product.image_url)}
                      >
                        <Image src={product.image_url || (process.env.NEXT_PUBLIC_BASE_PATH||'')+'/placeholder.svg'} alt={product.name} fill className="object-cover" loading="lazy" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelectedBrand(product.brand)} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition cursor-pointer">{product.brand}</button>
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
                        {!isAdmin && hasUserSession && (
                          <button
                            onClick={() => toggleBookmark(product.id)}
                            className={`p-2 rounded-lg transition ${bookmarks.has(product.id) ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            title={bookmarks.has(product.id) ? 'Удалить из закладок' : 'Добавить в закладки'}
                          >
                            <svg className="w-5 h-5" fill={bookmarks.has(product.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                          </button>
                        )}
                        <button onClick={() => viewProduct(product)} className="inline-flex items-center px-3 py-1.5 bg-[#9B1B1B] text-white text-sm font-medium rounded-lg hover:bg-[#7A1515] transition">
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
                <button key={page} onClick={() => setCurrentPage(page)} className={`px-4 py-2 rounded-lg transition ${currentPage === page ? 'bg-[#9B1B1B] text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}>
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
            className="mt-2 text-slate-800 hover:text-slate-900 font-medium"
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
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur text-slate-900 shadow-lg">{selectedProduct.brand}</span>
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
                <div className="bg-slate-100 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <h3 className="font-bold text-slate-900">На что обратить внимание</h3>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{selectedProduct.attention_points}</p>
                </div>
                {(selectedProduct.website_link || selectedProduct.onec_link || selectedProduct.flyer_url) && (
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      <h3 className="font-bold text-blue-900">Полезные ссылки</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedProduct.flyer_url && (
                        <a href={selectedProduct.flyer_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#9B1B1B] hover:text-[#7A1515] font-medium">
                          📄 Открыть листовку (PDF)
                        </a>
                      )}
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
                
                {selectedProductSimilar.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                    <h3 className="font-bold text-purple-900 mb-3">🔍 Похожие товары</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedProductSimilar.map(similar => (
                        <button
                          key={similar.id}
                          onClick={() => viewProduct(similar)}
                          className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-purple-100 transition text-left"
                        >
                          <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                            <Image src={similar.image_url || (process.env.NEXT_PUBLIC_BASE_PATH||'')+'/placeholder.svg'} alt={similar.name} fill className="object-cover" />
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

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-[#9B1B1B] p-3 text-white shadow-lg hover:bg-[#7A1515] transition"
          aria-label="Наверх"
          title="Наверх"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
      
      <CompareBar 
        compareProducts={compareProducts}
        onRemove={(id) => setCompareProducts(prev => prev.filter(p => p.id !== id))}
        onClear={() => setCompareProducts([])}
      />
    </div>
  )
}
