'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { openFileInNewTab } from '@/lib/openFile'
import { Product } from '@/types/product'
import Image from 'next/image'
import ProductSkeleton from './ProductSkeleton'
import ImageCarousel from './ImageCarousel'
import { showToast } from './Toast'
import FilterBar from './FilterBar'
import SearchBar from './SearchBar'
import CompareBar from './CompareBar'
import Breadcrumbs from './Breadcrumbs'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { isTemperatureCategory } from '@/lib/constants'
import { exportProductsToExcel } from '@/lib/export'

interface ProductsTableProps {
  isAdmin: boolean
  onExportReady?: (exportFn: () => void) => void
}

const VIEW_MODE_KEY = 'novinki:viewMode'
const SORT_BY_KEY = 'novinki:sortBy'
const CATEGORY_KEY = 'novinki:selectedCategory'
const YEAR_KEY = 'novinki:selectedYear'
const SUPPLIER_NOVELTIES_KEY = 'novinki:supplierNoveltiesOnly'
const DISHWASHER_SAFE_KEY = 'novinki:dishwasherSafeOnly'
const MICROWAVE_SAFE_KEY = 'novinki:microwaveSafeOnly'

export default function ProductsTable({ isAdmin, onExportReady }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  // Лёгкий список всех товаров: автодополнение, категории, похожие товары
  const [productsMeta, setProductsMeta] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [supplierNoveltiesOnly, setSupplierNoveltiesOnly] = useState(false)
  const [dishwasherSafeOnly, setDishwasherSafeOnly] = useState(false)
  const [microwaveSafeOnly, setMicrowaveSafeOnly] = useState(false)
  const [tempMin, setTempMin] = useState('')
  const [tempMax, setTempMax] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
  const [compareProducts, setCompareProducts] = useState<Product[]>([])
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
    if (savedSortBy === 'date' || savedSortBy === 'name') {
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

    const savedSupplierNovelties = window.localStorage.getItem(SUPPLIER_NOVELTIES_KEY)
    if (savedSupplierNovelties === '1') {
      setSupplierNoveltiesOnly(true)
    }

    const savedDishwasherSafe = window.localStorage.getItem(DISHWASHER_SAFE_KEY)
    if (savedDishwasherSafe === '1') {
      setDishwasherSafeOnly(true)
    }

    const savedMicrowaveSafe = window.localStorage.getItem(MICROWAVE_SAFE_KEY)
    if (savedMicrowaveSafe === '1') {
      setMicrowaveSafeOnly(true)
    }
  }, [])

  useEffect(() => {
    const hasAnyQueryParam =
      searchParams.has('q') ||
      searchParams.has('brand') ||
      searchParams.has('category') ||
      searchParams.has('year') ||
      searchParams.has('supplier') ||
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
    const supplier = searchParams.get('supplier')
    const sort = searchParams.get('sort')
    const view = searchParams.get('view')
    setSearch(q)
    setDebouncedSearch(q)
    setSelectedBrand(brand || null)
    setSelectedCategory(category || null)
    setSelectedYear(year || null)
    setSupplierNoveltiesOnly(supplier === '1')
    setSortBy(sort === 'name' ? sort : 'date')
    setViewMode(view === 'table' ? 'table' : 'cards')
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

    if (supplierNoveltiesOnly) params.set('supplier', '1')
    else params.delete('supplier')

    if (sortBy !== 'date') params.set('sort', sortBy)
    else params.delete('sort')

    if (viewMode !== 'cards') params.set('view', viewMode)
    else params.delete('view')

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [
    debouncedSearch,
    isUrlStateReady,
    pathname,
    router,
    searchParams,
    selectedBrand,
    selectedCategory,
    selectedYear,
    supplierNoveltiesOnly,
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
    if (supplierNoveltiesOnly) {
      window.localStorage.setItem(SUPPLIER_NOVELTIES_KEY, '1')
    } else {
      window.localStorage.removeItem(SUPPLIER_NOVELTIES_KEY)
    }
  }, [supplierNoveltiesOnly])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (dishwasherSafeOnly) {
      window.localStorage.setItem(DISHWASHER_SAFE_KEY, '1')
    } else {
      window.localStorage.removeItem(DISHWASHER_SAFE_KEY)
    }
  }, [dishwasherSafeOnly])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (microwaveSafeOnly) {
      window.localStorage.setItem(MICROWAVE_SAFE_KEY, '1')
    } else {
      window.localStorage.removeItem(MICROWAVE_SAFE_KEY)
    }
  }, [microwaveSafeOnly])

  // Температурный фильтр имеет смысл только для категорий со списка TEMPERATURE_CATEGORIES
  useEffect(() => {
    if (!isTemperatureCategory(selectedCategory)) {
      setTempMin('')
      setTempMax('')
    }
  }, [selectedCategory])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 520)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Инициализация: загружаем мета-список (все товары, лёгкие поля)
  useEffect(() => {
    fetchProductsMeta()
  }, [isAdmin])

  useEffect(() => {
    fetchProducts()
  }, [debouncedSearch, selectedBrand, selectedCategory, selectedYear, supplierNoveltiesOnly, dishwasherSafeOnly, microwaveSafeOnly, tempMin, tempMax, sortBy])

  // Полный список товаров с базовыми полями — для автодополнения и похожих товаров
  const fetchProductsMeta = async () => {
    let query = apiClient
      .from('products')
      .select('id, name, brand, category, year, article_number, image_url, description, advantages')
    if (!isAdmin) query = query.eq('is_archived', false)
    query = query.order('created_at', { ascending: false })
    const { data } = await query
    if (data) setProductsMeta(data as Product[])
  }

  // Серверная фильтрация + пагинация
  const fetchProducts = async () => {
    setLoading(true)

    let query = apiClient
      .from('products')
      .select('*', { count: 'exact' })

    // Публичным посетителям неопубликованные (в том числе черновики после
    // импорта из Excel) и архивные товары показывать нельзя.
    if (!isAdmin) query = query.eq('is_archived', false)

    if (debouncedSearch) {
      query = query.or(
        `name.ilike.%${debouncedSearch}%,brand.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
      )
    }
    if (selectedBrand) query = query.eq('brand', selectedBrand)
    if (selectedCategory) query = query.eq('category', selectedCategory)
    if (selectedYear) query = query.eq('year', selectedYear)
    if (supplierNoveltiesOnly) query = query.eq('is_supplier_novelty', true)
    if (dishwasherSafeOnly) query = query.eq('is_dishwasher_safe', true)
    if (microwaveSafeOnly) query = query.eq('is_microwave_safe', true)
    if (isTemperatureCategory(selectedCategory)) {
      // Пересечение диапазонов: товар подходит, если его температурный
      // диапазон хранения пересекается с диапазоном, заданным в фильтре.
      if (tempMin) query = query.gte('temp_max', parseFloat(tempMin))
      if (tempMax) query = query.lte('temp_min', parseFloat(tempMax))
    }

    if (sortBy === 'name') {
      query = query.order('name', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data } = await query
    if (data) setProducts(data)
    setLoading(false)
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

  const viewProduct = (product: Product) => {
    setSelectedProduct(product)
  }

  const getSimilarProducts = (product: Product) => {
    // Извлекаем размеры из описания (числа с единицами измерения)
    const extractSizes = (text: string) => {
      const matches = text.match(/\d+\s*(мм|см|м|мл|л|г|кг|шт)/gi)
      return matches ? matches.map(m => m.toLowerCase()) : []
    }

    const currentSizes = extractSizes((product.description || '') + ' ' + (product.advantages || ''))

    // Вычисляем score похожести для каждого товара (работаем с полным мета-списком)
    const scored = productsMeta
      .filter(p => p.id !== product.id)
      .map(p => {
        let score = 0
        const pSizes = extractSizes(p.description + ' ' + p.advantages)

        // Та же категория И бренд = +10
        if (p.category === product.category && p.brand === product.brand) score += 10
        // Та же категория = +5
        else if (p.category === product.category) score += 5
        // Тот же бренд = +3
        else if (p.brand === product.brand) score += 3

        // Совпадающие размеры = +2 за каждый
        const matchingSizes = currentSizes.filter(s => pSizes.includes(s)).length
        score += matchingSizes * 2

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

  const clearAllFilters = () => {
    setSearch('')
    setSelectedBrand(null)
    setSelectedCategory(null)
    setSelectedYear(null)
    setSupplierNoveltiesOnly(false)
    setDishwasherSafeOnly(false)
    setMicrowaveSafeOnly(false)
    setTempMin('')
    setTempMax('')
    setSortBy('date')
  }

  const activeFiltersCount =
    (debouncedSearch ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedYear ? 1 : 0) +
    (supplierNoveltiesOnly ? 1 : 0) +
    (dishwasherSafeOnly ? 1 : 0) +
    (microwaveSafeOnly ? 1 : 0) +
    (tempMin ? 1 : 0) +
    (tempMax ? 1 : 0) +
    (sortBy !== 'date' ? 1 : 0)

  const handleExport = async () => {
    let query = apiClient
      .from('products')
      .select('name,brand,article_number,category,year,description,advantages,attention_points,website_link,is_supplier_novelty,is_dishwasher_safe,is_microwave_safe,temp_min,temp_max')
    if (!isAdmin) query = query.eq('is_archived', false)
    if (selectedBrand) query = query.eq('brand', selectedBrand)
    if (selectedCategory) query = query.eq('category', selectedCategory)
    if (selectedYear) query = query.eq('year', selectedYear)
    if (supplierNoveltiesOnly) query = query.eq('is_supplier_novelty', true)
    if (dishwasherSafeOnly) query = query.eq('is_dishwasher_safe', true)
    if (microwaveSafeOnly) query = query.eq('is_microwave_safe', true)
    if (isTemperatureCategory(selectedCategory)) {
      if (tempMin) query = query.gte('temp_max', parseFloat(tempMin))
      if (tempMax) query = query.lte('temp_min', parseFloat(tempMax))
    }
    const { data } = await query
    if (data && data.length > 0) {
      exportProductsToExcel(data as Product[])
      showToast('Файл Excel сформирован', 'success')
    } else {
      showToast('Нет товаров для выгрузки', 'info')
    }
  }

  const handleExportRef = useRef(handleExport)
  handleExportRef.current = handleExport

  useEffect(() => {
    onExportReady?.(() => handleExportRef.current())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Группировка по годам: текущий год — первым без заголовка, остальные — с красным заголовком
  const productsByYear = useMemo(() => {
    const currentYear = new Date().getFullYear().toString()
    const map = new Map<string, Product[]>()
    for (const p of products) {
      const yr = p.year || ''
      if (!map.has(yr)) map.set(yr, [])
      map.get(yr)!.push(p)
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === currentYear) return -1
      if (b === currentYear) return 1
      // Числовые годы — по убыванию; пустой год — в конец
      if (!a) return 1
      if (!b) return -1
      return b.localeCompare(a)
    })
    return { currentYear, groups: sorted }
  }, [products])

  // Показывать год-разделители только когда нет фильтра по году и есть несколько лет
  const showYearDividers = !selectedYear && productsByYear.groups.length > 1

  if (loading) return <ProductSkeleton viewMode={viewMode} />

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
        supplierNoveltiesOnly={supplierNoveltiesOnly}
        setSupplierNoveltiesOnly={setSupplierNoveltiesOnly}
        dishwasherSafeOnly={dishwasherSafeOnly}
        setDishwasherSafeOnly={setDishwasherSafeOnly}
        microwaveSafeOnly={microwaveSafeOnly}
        setMicrowaveSafeOnly={setMicrowaveSafeOnly}
        tempMin={tempMin}
        setTempMin={setTempMin}
        tempMax={tempMax}
        setTempMax={setTempMax}
        showTemperatureFilter={isTemperatureCategory(selectedCategory)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeFiltersCount={activeFiltersCount}
        totalCount={products.length}
        onClearFilters={clearAllFilters}
      />
      
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
        <div className="space-y-10">
          {productsByYear.groups.map(([year, yearProducts]) => (
            <div key={year}>
              {showYearDividers && year !== productsByYear.currentYear && (
                <div className="mb-5 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-2xl font-extrabold tracking-tight text-[#9B1B1B] select-none">{year || 'Без года'}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {yearProducts.map((product, idx) => (
            <div
              key={product.id}
              onClick={() => viewProduct(product)}
              className="relative flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group animate-in fade-in slide-in-from-bottom-4 cursor-pointer"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="relative h-36 bg-slate-100" onClick={(e) => { e.stopPropagation(); product.image_url && setSelectedImage(product.image_url) }}>
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
                </div>
                {product.article_number && <p className="text-[10px] text-slate-400 mb-1 font-mono">{product.article_number}</p>}
                {product.flyer_url && (
                  <a
                    href={product.flyer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); openFileInNewTab(product.flyer_url!) }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9B1B1B] hover:text-[#7A1515] mb-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Листовка (PDF)
                  </a>
                )}
                <div className="flex flex-wrap items-center justify-start gap-1 mb-2">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedBrand(product.brand) }} className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition">{product.brand}</button>
                  {product.category && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">{product.category}</span>}
                  {product.year && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">{product.year}</span>}
                  {product.is_dishwasher_safe && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">ПММ</span>}
                  {product.is_microwave_safe && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">СВЧ</span>}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-2">{product.description}</p>
                <button onClick={(e) => { e.stopPropagation(); viewProduct(product) }} className="w-full px-3 py-1.5 bg-[#9B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#7A1515] transition mt-auto">Подробнее</button>
              </div>
            </div>
          ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {productsByYear.groups.map(([year, yearProducts]) => (
            <div key={year}>
              {showYearDividers && year !== productsByYear.currentYear && (
                <div className="mb-5 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-2xl font-extrabold tracking-tight text-[#9B1B1B] select-none">{year || 'Без года'}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              )}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          {/* Мобильный режим: компактные карточки вместо широкой таблицы */}
          <div className="lg:hidden divide-y divide-slate-100">
            {yearProducts.map((product) => (
              <div key={product.id} onClick={() => viewProduct(product)} className="flex gap-3 p-4 cursor-pointer hover:bg-slate-50 transition">
                <div
                  className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100"
                  onClick={(e) => { e.stopPropagation(); product.image_url && setSelectedImage(product.image_url) }}
                >
                  <Image src={product.image_url || (process.env.NEXT_PUBLIC_BASE_PATH||'')+'/placeholder.svg'} alt={product.name} fill className="object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{product.name}</div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                          className={`p-1.5 rounded-lg transition ${compareProducts.find(p => p.id === product.id) ? 'bg-[#9B1B1B] text-white' : 'bg-slate-100 text-slate-400'}`}
                          title="Сравнить"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedBrand(product.brand) }} className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">{product.brand}</button>
                    {product.is_dishwasher_safe && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">ПММ</span>}
                    {product.is_microwave_safe && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">СВЧ</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{product.description}</p>
                  <button onClick={(e) => { e.stopPropagation(); viewProduct(product) }} className="mt-2 w-full px-3 py-1.5 bg-[#9B1B1B] text-white text-xs font-medium rounded-lg">Подробнее</button>
                </div>
              </div>
            ))}
          </div>

          {/* Десктопный режим: полная таблица с прокруткой и закреплёнными ключевыми колонками */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="sticky left-0 z-10 bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Фото</th>
                  <th className="sticky left-[128px] z-10 bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Название</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Бренд</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Отметки</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Описание</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Преимущества</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Внимание</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearProducts.map((product) => (
                  <tr key={product.id} onClick={() => viewProduct(product)} className="hover:bg-slate-100 group cursor-pointer">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-100 px-6 py-4">
                      <div
                        className="relative w-20 h-20 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition"
                        onClick={(e) => { e.stopPropagation(); product.image_url && setSelectedImage(product.image_url) }}
                      >
                        <Image src={product.image_url || (process.env.NEXT_PUBLIC_BASE_PATH||'')+'/placeholder.svg'} alt={product.name} fill className="object-cover" loading="lazy" />
                      </div>
                    </td>
                    <td className="sticky left-[128px] z-10 bg-white group-hover:bg-slate-100 px-6 py-4">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedBrand(product.brand) }} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-900 hover:bg-slate-200 transition">{product.brand}</button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.is_dishwasher_safe && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">ПММ</span>}
                        {product.is_microwave_safe && <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">СВЧ</span>}
                      </div>
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
                            onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                            className={`p-2 rounded-lg transition ${compareProducts.find(p => p.id === product.id) ? 'bg-[#9B1B1B] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            title="Сравнить"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); viewProduct(product) }} className="inline-flex items-center px-3 py-1.5 bg-[#9B1B1B] text-white text-sm font-medium rounded-lg hover:bg-[#7A1515] transition">
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
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && debouncedSearch && (
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
      {products.length === 0 && !debouncedSearch && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          <p className="mt-4 text-slate-400 text-lg">Новинок пока нет</p>
        </div>
      )}

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200 cursor-pointer"
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
        <div onClick={() => setSelectedProduct(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 cursor-default">
            <div className="relative h-36 sm:h-44 bg-gradient-to-br from-slate-100 to-slate-200 shrink-0">
              <ImageCarousel
                images={selectedProduct.images?.length ? selectedProduct.images : [selectedProduct.image_url]}
                alt={selectedProduct.name}
                className="w-full h-full"
                onImageClick={(url) => setSelectedImage(url)}
              />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur rounded-full p-2.5 hover:bg-white transition shadow-lg">
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
              <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-9rem)] sm:max-h-[calc(90vh-11rem)]">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-900">{selectedProduct.brand}</span>
                  {selectedProduct.is_dishwasher_safe && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">Можно мыть в посудомоечной машине</span>}
                  {selectedProduct.is_microwave_safe && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">Можно использовать в микроволновой печи</span>}
                  {(selectedProduct.temp_min != null || selectedProduct.temp_max != null) && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                      Температура: {selectedProduct.temp_min ?? '—'}…{selectedProduct.temp_max ?? '—'}°C
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-slate-900">{selectedProduct.name}</h2>
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
                {(selectedProduct.website_link || selectedProduct.flyer_url) && (
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      <h3 className="font-bold text-blue-900">Полезные ссылки</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedProduct.flyer_url && (
                        <a href={selectedProduct.flyer_url} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); openFileInNewTab(selectedProduct.flyer_url!) }} className="flex items-center gap-2 text-[#9B1B1B] hover:text-[#7A1515] font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Открыть листовку (PDF)
                        </a>
                      )}
                      {selectedProduct.website_link && (
                        <a href={selectedProduct.website_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-700 hover:text-blue-900 font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z" /></svg>
                          Посмотреть на сайте
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedProductSimilar.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                    <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      Похожие товары
                    </h3>
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
