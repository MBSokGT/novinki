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
import { useRouter, useSearchParams } from 'next/navigation'
import { isTemperatureCategory } from '@/lib/constants'
import { fuzzyMatches } from '@/lib/fuzzySearch'
import { productSearchFields } from '@/lib/productSearch'
import { shortVariantNames } from '@/lib/variantName'
import { isNewSince, useLastVisit } from '@/lib/useLastVisit'
import AvailabilityBadge, { AVAILABILITY_SOURCE_HINT, availabilityHint, formatCheckedAt, formatPrice, productAvailabilitySummary, productPriceSummary, variantsCheckedAt } from '@/components/AvailabilityBadge'
import { safeHref } from '@/lib/url'
import { localizeComplexbarLink } from '@/lib/complexbar-cities'
import ImageWithFallback from '@/components/ImageWithFallback'

interface ProductsTableProps {
  isAdmin: boolean
  supplierNoveltiesOnly: boolean
  setSupplierNoveltiesOnly: (value: boolean) => void
  cityHost: string | null
}

const VIEW_MODE_KEY = 'novinki:viewMode'
const SORT_BY_KEY = 'novinki:sortBy'
const CATEGORY_KEY = 'novinki:selectedCategory'
const YEAR_KEY = 'novinki:selectedYear'
const DISHWASHER_SAFE_KEY = 'novinki:dishwasherSafeOnly'
const MICROWAVE_SAFE_KEY = 'novinki:microwaveSafeOnly'

export default function ProductsTable({ isAdmin, supplierNoveltiesOnly, setSupplierNoveltiesOnly, cityHost }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const lastVisit = useLastVisit()
  const [onlyNew, setOnlyNew] = useState(false)
  // Лёгкий список всех товаров: автодополнение, категории, похожие товары
  const [productsMeta, setProductsMeta] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [dishwasherSafeOnly, setDishwasherSafeOnly] = useState(false)
  const [microwaveSafeOnly, setMicrowaveSafeOnly] = useState(false)
  const [tempMin, setTempMin] = useState('')
  const [tempMax, setTempMax] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
  const [compareProducts, setCompareProducts] = useState<Product[]>([])
  const [isUrlStateReady, setIsUrlStateReady] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const router = useRouter()
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
    // "supplier" сюда намеренно не входит — этой вкладкой полностью владеет
    // родитель (app/page.tsx, через проп supplierNoveltiesOnly), а не этот
    // компонент. Раньше этот эффект ещё и сам переопределял её при каждом
    // изменении searchParams (например, при возврате из админки), из-за
    // чего вкладка "Поставщики" иногда сама переключалась на "Склад".
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
    setSearch(q)
    setDebouncedSearch(q)
    setSelectedBrand(brand || null)
    setSelectedCategory(category || null)
    setSelectedYear(year || null)
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

    // Берём за основу реальную адресную строку (window.location.search), а не
    // Next-овский searchParams — родитель (app/page.tsx) пишет "supplier"/"tab"
    // напрямую через window.history.replaceState в обход роутера Next, и
    // searchParams из useSearchParams() может этого не увидеть. Если строить
    // параметры от searchParams, можно молча стереть то, что только что
    // выставил родитель. Этот эффект ниже трогает только "свои" ключи
    // (q/brand/category/year/sort/view) — "supplier"/"tab" не его забота.
    const params = new URLSearchParams(window.location.search)

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

    const nextQuery = params.toString()
    const currentQuery = window.location.search.replace(/^\?/, '')
    if (nextQuery !== currentQuery) {
      // window.location.pathname, а не usePathname() — тот возвращает путь БЕЗ
      // basePath (Next.js его сам вырезает), и replaceState с таким путём молча
      // стирал бы "/novinki" из адресной строки при любом поиске/фильтре.
      const base = window.location.pathname
      const url = nextQuery ? `${base}?${nextQuery}` : base
      window.history.replaceState(null, '', url)
    }
  }, [
    debouncedSearch,
    isUrlStateReady,
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

  // Открытие карточки по прямой ссылке ?p=<id> (кнопка «Скопировать ссылку»
  // в модалке товара). Грузим товар отдельным запросом по id, а не берём из
  // уже отфильтрованного списка — по ссылке может прийти товар, которого нет
  // среди текущих фильтров/поиска.
  useEffect(() => {
    const productId = searchParams.get('p')
    if (!productId || selectedProduct) return
    apiClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_archived', false)
      .maybeSingle()
      .then(({ data }: { data: Product | null }) => {
        if (data) setSelectedProduct(data)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Полный список товаров с базовыми полями — для автодополнения и похожих товаров
  const fetchProductsMeta = async () => {
    let query = apiClient
      .from('products')
      .select('id, name, brand, category, year, article_number, image_url, description, advantages, is_supplier_novelty, tags, variants, created_at')
      .eq('is_archived', false)
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
    query = query.eq('is_archived', false)

    // Текстовый поиск теперь не в SQL (обычный ILIKE не прощает опечатки),
    // а на клиенте, ниже — с допуском на опечатки, неверную раскладку
    // клавиатуры и транслит. Здесь остаются только точные фильтры.
    if (selectedBrand) query = query.eq('brand', selectedBrand)
    if (selectedCategory) query = query.eq('category', selectedCategory)
    if (selectedYear) query = query.eq('year', selectedYear)
    // Вкладка "Новинки на складе" / "Новинки поставщиков" — взаимоисключающие
    // режимы, а не доп.фильтр: по умолчанию склад (не поставщик), иначе только поставщик.
    query = query.eq('is_supplier_novelty', supplierNoveltiesOnly)
    if (dishwasherSafeOnly) query = query.eq('is_dishwasher_safe', true)
    if (microwaveSafeOnly) query = query.eq('is_microwave_safe', true)
    if (isTemperatureCategory(selectedCategory)) {
      // Пересечение диапазонов: товар подходит, если его температурный
      // диапазон хранения пересекается с диапазоном, заданным в фильтре.
      // Если "от" больше "до" (человек перепутал местами), меняем их местами,
      // а не молча возвращаем пустой список.
      let [effMin, effMax] = [tempMin, tempMax]
      if (effMin && effMax && parseFloat(effMin) > parseFloat(effMax)) {
        ;[effMin, effMax] = [effMax, effMin]
      }
      if (effMin) query = query.gte('temp_max', parseFloat(effMin))
      if (effMax) query = query.lte('temp_min', parseFloat(effMax))
    }

    if (sortBy === 'name') {
      query = query.order('name', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data } = await query
    if (data) {
      const filtered = debouncedSearch
        ? (data as Product[]).filter((p) =>
            fuzzyMatches(productSearchFields(p), debouncedSearch)
          )
        : (data as Product[])
      setProducts(filtered)
    }
    setLoading(false)
    setInitialLoading(false)
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
    const params = new URLSearchParams(searchParams.toString())
    params.set('p', product.id)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }

  const closeProduct = () => {
    setSelectedProduct(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('p')
    const query = params.toString()
    const base = window.location.pathname
    window.history.replaceState(null, '', query ? `${base}?${query}` : base)
  }

  const copyVariantArticles = (product: Product) => {
    const articles = (product.variants || []).map((v) => v.article_number).filter(Boolean)
    navigator.clipboard.writeText(articles.join(', ')).then(
      () => showToast(`Скопировано артикулов: ${articles.length}`, 'success'),
      () => showToast('Не удалось скопировать', 'error')
    )
  }

  const copyProductLink = (product: Product) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('p', product.id)
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    navigator.clipboard.writeText(url).then(
      () => showToast('Ссылка скопирована', 'success'),
      () => showToast('Не удалось скопировать ссылку', 'error')
    )
  }

  const getSimilarProducts = (product: Product) => {
    // Извлекаем размеры из описания (числа с единицами измерения)
    const extractSizes = (text: string) => {
      const matches = text.match(/\d+\s*(мм|см|м|мл|л|г|кг|шт)/gi)
      return matches ? matches.map(m => m.toLowerCase()) : []
    }

    const currentSizes = extractSizes((product.description || '') + ' ' + (product.advantages || ''))

    // Вычисляем score похожести для каждого товара (работаем с полным мета-списком).
    // Похожие товары не должны пересекать границу "склад" / "поставщики" —
    // у карточки новинки поставщика в подборке не должны всплывать складские
    // позиции и наоборот, это разные вкладки с разным смыслом.
    const scored = productsMeta
      .filter(p => p.id !== product.id && Boolean(p.is_supplier_novelty) === Boolean(product.is_supplier_novelty))
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

  // Compute once to avoid double-calling getSimilarProducts in the modal.
  // Не показываем блок вовсе для новинок поставщика — их слишком мало,
  // чтобы подбор по категории/бренду/размерам давал осмысленный результат,
  // получается случайный шум, а не реально похожий товар.
  const selectedProductSimilar = useMemo(
    () => (selectedProduct && !selectedProduct.is_supplier_novelty ? getSimilarProducts(selectedProduct) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedProduct, productsMeta]
  )

  const selectedVariantNames = useMemo(
    () => shortVariantNames(selectedProduct?.variants || [], selectedProduct?.brand),
    [selectedProduct]
  )
  const searchedArticle = /^\d{4,}$/.test(debouncedSearch.trim()) ? debouncedSearch.trim() : ''

  const clearAllFilters = () => {
    // supplierNoveltiesOnly сюда намеренно не входит — это вкладка
    // "Новинки на складе" / "Новинки поставщиков" в верхней панели,
    // а не фильтр, который логично сбрасывать кнопкой "Сбросить".
    setSearch('')
    setSelectedBrand(null)
    setSelectedCategory(null)
    setSelectedYear(null)
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
    (dishwasherSafeOnly ? 1 : 0) +
    (microwaveSafeOnly ? 1 : 0) +
    (tempMin ? 1 : 0) +
    (tempMax ? 1 : 0) +
    (sortBy !== 'date' ? 1 : 0)

  // productsMeta смешивает склад и поставщиков — без этого фильтра полоса
  // брендов, автодополнение поиска и списки категорий/годов на вкладке
  // "Новинки поставщиков" показывали данные со склада и наоборот.
  const productsMetaForTab = useMemo(
    () => productsMeta.filter((product) => Boolean(product.is_supplier_novelty) === supplierNoveltiesOnly),
    [productsMeta, supplierNoveltiesOnly]
  )

  // Группировка по годам: текущий год — первым; при нескольких годах у каждого прилипающий заголовок
  const newCount = useMemo(() => products.filter((p) => isNewSince(p.created_at, lastVisit)).length, [products, lastVisit])
  const showOnlyNew = onlyNew && newCount > 0

  const productsByYear = useMemo(() => {
    const currentYear = new Date().getFullYear().toString()
    const map = new Map<string, Product[]>()
    const visible = showOnlyNew ? products.filter((p) => isNewSince(p.created_at, lastVisit)) : products
    for (const p of visible) {
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
  }, [products, showOnlyNew, lastVisit])

  // Показывать год-разделители только когда нет фильтра по году и есть несколько лет
  const showYearDividers = !selectedYear && productsByYear.groups.length > 1

  // Высота прилипшего поиска — чтобы заголовки годов прилипали сразу под ним
  const searchStickyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = searchStickyRef.current
    if (!el) return
    const update = () => document.documentElement.style.setProperty('--search-h', `${el.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [initialLoading])

  const [showBackToTop, setShowBackToTop] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Категории текущей вкладки плашками — с количеством товаров в каждой
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of productsMetaForTab) {
      if (p.category) counts.set(p.category, (counts.get(p.category) || 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
  }, [productsMetaForTab])
  const showCategoryChips = categoryChips.length >= 2


  if (initialLoading) return <ProductSkeleton viewMode={viewMode} />

  return (
    <div>
      <Breadcrumbs />
      <div
        ref={searchStickyRef}
        className="sticky z-30 -mx-4 mb-2 bg-[var(--background)]/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
        style={{ top: 'var(--header-h, 0px)' }}
      >
        <SearchBar
          products={productsMetaForTab}
          search={search}
          setSearch={setSearch}
          onSelectProduct={viewProduct}
        />
      </div>
      <FilterBar
        products={productsMetaForTab}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
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

      {showCategoryChips && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${!selectedCategory ? 'border-[#9B1B1B] bg-[#9B1B1B] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
          >
            Все
          </button>
          {categoryChips.map(([category, count]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${selectedCategory === category ? 'border-[#9B1B1B] bg-[#9B1B1B] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              {category} <span className={selectedCategory === category ? 'text-white/70' : 'text-slate-400'}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {newCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#9B1B1B]/15 bg-[#9B1B1B]/[0.04] px-3 py-2 text-sm">
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span className="h-2 w-2 rounded-full bg-[#9B1B1B]" />
            {newCount} {pluralNew(newCount)} с вашего прошлого визита
          </span>
          <button onClick={() => setOnlyNew((v) => !v)} className="text-sm font-medium text-[#9B1B1B] hover:underline">
            {showOnlyNew ? 'Показать все' : 'Показать только их'}
          </button>
        </div>
      )}

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg transition hover:text-[#9B1B1B] sm:bottom-6"
          aria-label="Наверх"
          title="Наверх"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
      )}

      <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      {viewMode === 'cards' ? (
        <div className="space-y-10">
          {productsByYear.groups.map(([year, yearProducts]) => (
            <div key={year}>
              {showYearDividers && (
                <div
                  className="sticky z-20 -mx-4 mb-4 flex items-center gap-4 bg-[var(--background)]/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
                  style={{ top: 'calc(var(--header-h, 0px) + var(--search-h, 0px))' }}
                >
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xl font-extrabold tracking-tight text-[#9B1B1B] select-none">{year || 'Без года'}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {yearProducts.map((product, idx) => (
            <div
              key={product.id}
              onClick={() => viewProduct(product)}
              className="relative flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 group cursor-pointer"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="relative h-48 bg-white overflow-hidden border-b border-slate-100">
                <ImageWithFallback src={product.image_url} alt={product.name} label={product.brand || product.name} className="object-contain p-3 group-hover:scale-[1.03] transition-transform duration-300" loading="lazy" />
                {isNewSince(product.created_at, lastVisit) && (
                  <span className="absolute left-2 top-2 rounded-md bg-[#9B1B1B] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">Новое</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100 ${compareProducts.find(p => p.id === product.id) ? 'opacity-100 bg-[#9B1B1B] text-white' : 'bg-white/95 text-slate-500 hover:text-slate-800 shadow-sm'}`}
                  title="Сравнить"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </button>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1">{product.name}</h3>
                {product.article_number && <p className="text-[10px] text-slate-400 mb-1.5 font-mono tracking-wide">{product.article_number}</p>}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedBrand(product.brand) }} className="max-w-full break-words text-[11px] font-medium text-slate-600 hover:text-[#9B1B1B] transition underline-offset-2 hover:underline">{product.brand}</button>
                  {product.category && <span className="text-[11px] text-slate-400">{product.category}</span>}
                  {product.year && <span className="text-[11px] text-slate-400">{product.year}</span>}
                  {product.is_dishwasher_safe && <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1.5 py-px">ПММ</span>}
                  {product.is_microwave_safe && <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1.5 py-px">СВЧ</span>}
                  {(() => {
                    const summary = productAvailabilitySummary(product)
                    return summary && <AvailabilityBadge kind={summary.kind} label={summary.label} title={availabilityHint(product.availability_checked_at || variantsCheckedAt(product))} />
                  })()}
                  {(() => {
                    const price = productPriceSummary(product)
                    return price && <span className="text-[11px] font-semibold text-slate-700" title="Цена на complexbar.ru">{price}</span>
                  })()}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{product.description}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); viewProduct(product); }}
                    className="text-xs font-medium text-[#9B1B1B] border border-[#9B1B1B] rounded-lg px-3 py-1.5 hover:bg-[#9B1B1B] hover:text-white transition-colors"
                  >
                    Подробнее
                  </button>
                  <div className="flex items-center gap-2">
                    {product.flyer_url && (
                      <a href={product.flyer_url} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); openFileInNewTab(product.flyer_url!) }}
                        className="text-[11px] font-medium text-slate-400 hover:text-[#9B1B1B] transition" title="Листовка">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </a>
                    )}
                    {safeHref(product.website_link) && (
                      <a href={localizeComplexbarLink(safeHref(product.website_link)!, cityHost)} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition" title="На сайте">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
                </div>
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
              {showYearDividers && (
                <div
                  className="sticky z-20 -mx-4 mb-4 flex items-center gap-4 bg-[var(--background)]/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
                  style={{ top: 'calc(var(--header-h, 0px) + var(--search-h, 0px))' }}
                >
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xl font-extrabold tracking-tight text-[#9B1B1B] select-none">{year || 'Без года'}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              )}
        <div className="bg-white overflow-hidden border border-slate-200 rounded-lg">
          {/* Мобильный режим: компактные карточки вместо широкой таблицы */}
          <div className="lg:hidden divide-y divide-slate-100">
            {yearProducts.map((product) => (
              <div key={product.id} onClick={() => viewProduct(product)} className="flex gap-3 p-3 cursor-pointer hover:bg-slate-50 transition">
                <div
                  className="relative w-16 h-16 shrink-0 overflow-hidden bg-slate-100 rounded-lg"
                  onClick={(e) => { e.stopPropagation(); product.image_url && setSelectedImage(product.image_url) }}
                >
                  <ImageWithFallback src={product.image_url} alt={product.name} label={product.brand || product.name} size="sm" className="object-contain bg-white p-0.5" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                      {isNewSince(product.created_at, lastVisit) && <span className="mr-1.5 inline-block rounded bg-[#9B1B1B] px-1 py-px align-middle text-[9px] font-semibold uppercase text-white">Новое</span>}
                      {product.name}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                      className={`shrink-0 p-1.5 transition ${compareProducts.find(p => p.id === product.id) ? 'bg-[#9B1B1B] text-white' : 'text-slate-300 hover:text-slate-600'}`}
                      title="Сравнить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </button>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedBrand(product.brand) }} className="text-[11px] font-medium text-slate-500 hover:text-[#9B1B1B] hover:underline underline-offset-2 transition">{product.brand}</button>
                    {product.is_dishwasher_safe && <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1">ПММ</span>}
                    {product.is_microwave_safe && <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1">СВЧ</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{product.description}</p>
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
                        className="relative w-20 h-20 overflow-hidden bg-slate-50 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); product.image_url && setSelectedImage(product.image_url) }}
                      >
                        <ImageWithFallback src={product.image_url} alt={product.name} label={product.brand || product.name} size="sm" className="object-contain bg-white p-0.5" loading="lazy" />
                      </div>
                    </td>
                    <td className="sticky left-[128px] z-10 bg-white group-hover:bg-slate-100 px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {isNewSince(product.created_at, lastVisit) && <span className="mr-1.5 inline-block rounded bg-[#9B1B1B] px-1 py-px align-middle text-[9px] font-semibold uppercase text-white">Новое</span>}
                        {product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedBrand(product.brand) }} className="text-sm font-medium text-slate-600 hover:text-[#9B1B1B] hover:underline underline-offset-2 transition">{product.brand}</button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.is_dishwasher_safe && <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1.5 py-px">ПММ</span>}
                        {product.is_microwave_safe && <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1.5 py-px">СВЧ</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                      <div className="line-clamp-2">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                      <div className="line-clamp-2">{product.advantages}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                      {product.attention_points && <div className="line-clamp-2">{product.attention_points}</div>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
                          className={`p-1.5 transition ${compareProducts.find(p => p.id === product.id) ? 'bg-[#9B1B1B] text-white' : 'text-slate-300 hover:text-slate-600'}`}
                          title="Сравнить"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
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
          <p className="mt-4 text-slate-400 text-lg">Ничего не найдено по запросу «{debouncedSearch}»</p>
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
      </div>

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200 cursor-pointer"
        >
          {/* inline-block wrapper hugs the rendered image box, so the close
              button (anchored to the wrapper's corner) always sits on the
              image's actual edge instead of floating at a fixed viewport spot */}
          <div onClick={(e) => e.stopPropagation()} className="relative inline-block cursor-default">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="Просмотр изображения"
              className="block max-w-[85vw] max-h-[85vh] w-auto h-auto rounded-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-white rounded-lg p-2 hover:bg-slate-100 transition shadow-md"
            >
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div onClick={closeProduct} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 cursor-default">
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
              <button
                onClick={() => copyProductLink(selectedProduct)}
                className="bg-white rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 transition shadow-md"
                title="Скопировать ссылку на товар"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" /></svg>
              </button>
              {isAdmin && (
                <button
                  onClick={() => router.push(`/admin?edit=${selectedProduct.id}`)}
                  className="bg-white rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 transition shadow-md"
                  title="Редактировать в админке"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              )}
              <button onClick={closeProduct} className="bg-white rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 transition shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="relative h-56 sm:h-72 bg-white shrink-0 border-b border-slate-100">
              <ImageCarousel
                images={selectedProduct.images?.length ? selectedProduct.images : (selectedProduct.image_url ? [selectedProduct.image_url] : [])}
                alt={selectedProduct.name}
                className="w-full h-full"
                onImageClick={(url) => setSelectedImage(url)}
                fallbackLabel={selectedProduct.brand || selectedProduct.name}
              />
            </div>
            <div className="p-5 sm:p-7 overflow-y-auto max-h-[calc(90vh-14rem)] sm:max-h-[calc(90vh-18rem)]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                <button onClick={() => { setSelectedBrand(selectedProduct.brand); closeProduct(); }} className="text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-[#9B1B1B] transition">{selectedProduct.brand}</button>
                {selectedProduct.is_dishwasher_safe && <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1.5 py-px">Подходит для ПММ</span>}
                {selectedProduct.is_microwave_safe && <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1.5 py-px">Подходит для СВЧ</span>}
                {(selectedProduct.temp_min != null || selectedProduct.temp_max != null) && (
                  <span className="text-[10px] font-medium text-blue-600 border border-blue-200 rounded px-1.5 py-px">
                    {selectedProduct.temp_min ?? '—'}…{selectedProduct.temp_max ?? '—'}°C
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-5 text-slate-900 leading-snug">{selectedProduct.name}</h2>
              <div className="divide-y divide-slate-100">
                {selectedProduct.description && (
                  <div className="pb-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Описание</p>
                    <p className="text-slate-700 leading-relaxed text-sm">{selectedProduct.description}</p>
                  </div>
                )}
                {selectedProduct.advantages && (
                  <div className="py-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Преимущества</p>
                    <p className="text-slate-700 leading-relaxed text-sm">{selectedProduct.advantages}</p>
                  </div>
                )}
                {selectedProduct.attention_points && (
                  <div className="py-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">На что обратить внимание</p>
                    <p className="text-slate-700 leading-relaxed text-sm">{selectedProduct.attention_points}</p>
                  </div>
                )}
                {selectedProduct.tags && (
                  <div className="py-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Теги</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                        <span key={idx} className="text-xs font-medium text-slate-600 bg-slate-100 rounded px-2 py-0.5">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedProduct.order_multiple && (
                  <div className="py-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Кратность</p>
                    <p className="text-slate-700 text-sm font-medium">{selectedProduct.order_multiple}</p>
                  </div>
                )}
                {(safeHref(selectedProduct.website_link) || selectedProduct.flyer_url || selectedProduct.price_list_url) && (
                  <div className="py-4 flex flex-wrap gap-4">
                    {selectedProduct.flyer_url && (
                      <a href={selectedProduct.flyer_url} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); openFileInNewTab(selectedProduct.flyer_url!) }} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9B1B1B] hover:text-[#7A1515]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Листовка
                      </a>
                    )}
                    {selectedProduct.price_list_url && (
                      <a href={selectedProduct.price_list_url} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); openFileInNewTab(selectedProduct.price_list_url!) }} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M14 4v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" /></svg>
                        Прайс-лист
                      </a>
                    )}
                    {safeHref(selectedProduct.website_link) && (
                      <a href={localizeComplexbarLink(safeHref(selectedProduct.website_link)!, cityHost)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Посмотреть товар
                      </a>
                    )}
                    {selectedProduct.link_broken ? (
                      <AvailabilityBadge variant="inline" kind="broken" label="Страница пропала с complexbar.ru" title={AVAILABILITY_SOURCE_HINT} />
                    ) : (
                      (selectedProduct.availability_label || selectedProduct.site_price) && (
                        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5" title={availabilityHint(selectedProduct.availability_checked_at)}>
                          {selectedProduct.availability && selectedProduct.availability_label && (
                            <AvailabilityBadge variant="inline" kind={selectedProduct.availability} label={selectedProduct.availability_label} />
                          )}
                          {formatPrice(selectedProduct.site_price, selectedProduct.site_currency) && (
                            <span className="text-sm font-semibold text-slate-800">{formatPrice(selectedProduct.site_price, selectedProduct.site_currency)}</span>
                          )}
                          {formatCheckedAt(selectedProduct.availability_checked_at) && (
                            <span className="text-[11px] text-slate-400">по состоянию на {formatCheckedAt(selectedProduct.availability_checked_at)}</span>
                          )}
                        </span>
                      )
                    )}
                  </div>
                )}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Варианты ({selectedProduct.variants.length})</p>
                      {selectedProduct.variants.some((v) => v.article_number) && (
                        <button
                          onClick={() => copyVariantArticles(selectedProduct)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-[#9B1B1B]"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Скопировать артикулы
                        </button>
                      )}
                    </div>
                    {formatCheckedAt(variantsCheckedAt(selectedProduct)) && (
                      <p className="-mt-2 mb-3 text-[11px] text-slate-400" title={availabilityHint(variantsCheckedAt(selectedProduct))}>
                        Наличие и цены — по состоянию на {formatCheckedAt(variantsCheckedAt(selectedProduct))}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {selectedProduct.variants.map((v, i) => {
                        const href = safeHref(v.website_link)
                        const shortName = selectedVariantNames[i]
                        // Карточку нашли поиском по артикулу варианта — подсвечиваем
                        // этот вариант, чтобы не искать его глазами среди остальных.
                        const isSearched = Boolean(searchedArticle && v.article_number?.includes(searchedArticle))
                        const content = (
                          <>
                            <div className={`relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100 ${isSearched ? 'ring-2 ring-[#9B1B1B] ring-offset-1' : ''}`}>
                              {v.image_url && <Image src={v.image_url} alt={v.name || v.article_number} fill className="object-cover" unoptimized />}
                            </div>
                            {shortName && (
                              <p className="mt-1 line-clamp-2 text-center text-[11px] leading-tight text-slate-700" title={v.name}>{shortName}</p>
                            )}
                            <p className={`mt-0.5 truncate text-center text-[11px] ${isSearched ? 'font-semibold text-[#9B1B1B]' : 'text-slate-400'}`}>{v.article_number || '—'}</p>
                            {(v.link_broken || v.availability_label) && (
                              <div className="mt-0.5 flex justify-center">
                                {v.link_broken ? (
                                  <AvailabilityBadge variant="inline" kind="broken" label="Нет на сайте" title="Страница этого товара пропала с complexbar.ru" />
                                ) : (
                                  <AvailabilityBadge variant="inline" kind={v.availability || 'other'} label={v.availability_label!} title={availabilityHint(v.checked_at || selectedProduct.link_checked_at)} />
                                )}
                              </div>
                            )}
                            {!v.link_broken && formatPrice(v.price, v.currency) && (
                              <p className="text-center text-[11px] font-semibold text-slate-700" title="Цена на complexbar.ru">{formatPrice(v.price, v.currency)}</p>
                            )}
                          </>
                        )
                        return href ? (
                          <a key={`${v.article_number}-${i}`} href={localizeComplexbarLink(href, cityHost)} target="_blank" rel="noopener noreferrer" className="block transition hover:opacity-80">
                            {content}
                          </a>
                        ) : (
                          <div key={`${v.article_number}-${i}`}>{content}</div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {selectedProductSimilar.length > 0 && (
                  <div className="pt-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Похожие товары</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProductSimilar.map(similar => (
                        <button
                          key={similar.id}
                          onClick={() => viewProduct(similar)}
                          className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition text-left"
                        >
                          <div className="relative w-10 h-10 overflow-hidden bg-slate-100 flex-shrink-0">
                            <ImageWithFallback src={similar.image_url} alt={similar.name} label={similar.brand || similar.name} size="md" className="object-contain bg-white p-0.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-900 line-clamp-2 leading-snug">{similar.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{similar.brand}</div>
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
          className="fixed bottom-6 right-6 z-40 bg-[#9B1B1B] p-3 text-white shadow-lg hover:bg-[#7A1515] transition"
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

function pluralNew(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'новинка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'новинки'
  return 'новинок'
}
