'use client'

import { Product } from '@/types/product'

interface FilterBarProps {
  products: Product[]
  selectedCategory: string | null
  setSelectedCategory: (cat: string | null) => void
  selectedYear: string | null
  setSelectedYear: (year: string | null) => void
  supplierNoveltiesOnly: boolean
  setSupplierNoveltiesOnly: (value: boolean) => void
  dishwasherSafeOnly: boolean
  setDishwasherSafeOnly: (value: boolean) => void
  microwaveSafeOnly: boolean
  setMicrowaveSafeOnly: (value: boolean) => void
  tempMin: string
  setTempMin: (value: string) => void
  tempMax: string
  setTempMax: (value: string) => void
  showTemperatureFilter: boolean
  sortBy: string
  setSortBy: (sort: 'date' | 'name') => void
  viewMode: 'table' | 'cards'
  setViewMode: (mode: 'table' | 'cards') => void
  activeFiltersCount: number
  totalCount: number
  currentPage: number
  totalPages: number
  onClearFilters: () => void
  onExport: () => void
}

export default function FilterBar({
  products,
  selectedCategory,
  setSelectedCategory,
  selectedYear,
  setSelectedYear,
  supplierNoveltiesOnly,
  setSupplierNoveltiesOnly,
  dishwasherSafeOnly,
  setDishwasherSafeOnly,
  microwaveSafeOnly,
  setMicrowaveSafeOnly,
  tempMin,
  setTempMin,
  tempMax,
  setTempMax,
  showTemperatureFilter,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  activeFiltersCount,
  totalCount,
  currentPage,
  totalPages,
  onClearFilters,
  onExport,
}: FilterBarProps) {
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  const years = Array.from(new Set(products.map(p => p.year).filter(Boolean))).sort().reverse()

  return (
    <div className="mb-5 bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {categories.length > 0 && (
            <div className="relative">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="appearance-none pl-2.5 pr-7 py-1 sm:pl-3 sm:pr-8 sm:py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-slate-700"
              >
                <option value="">Все категории</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          )}

          {years.length > 0 && (
            <div className="relative">
              <select
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value || null)}
                className="appearance-none pl-2.5 pr-7 py-1 sm:pl-3 sm:pr-8 sm:py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-slate-700"
              >
                <option value="">Все годы</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          )}

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-2.5 pr-7 py-1 sm:pl-3 sm:pr-8 sm:py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-slate-700"
            >
              <option value="date">По дате</option>
              <option value="name">По названию</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>

          <button
            onClick={() => setSupplierNoveltiesOnly(!supplierNoveltiesOnly)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all font-medium ${supplierNoveltiesOnly ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <span className="hidden sm:inline">Новинки поставщиков</span>
            <span className="sm:hidden">Новинки</span>
          </button>

          <button
            onClick={() => setDishwasherSafeOnly(!dishwasherSafeOnly)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all font-medium ${dishwasherSafeOnly ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
            <span className="hidden sm:inline">Можно мыть в посудомоечной машине</span>
            <span className="sm:hidden">ПММ</span>
          </button>

          <button
            onClick={() => setMicrowaveSafeOnly(!microwaveSafeOnly)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all font-medium ${microwaveSafeOnly ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM8 10a2 2 0 104 0 2 2 0 00-4 0z" /></svg>
            <span className="hidden sm:inline">Можно в микроволновой печи</span>
            <span className="sm:hidden">СВЧ</span>
          </button>

          {showTemperatureFilter && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                placeholder="от, °C"
                value={tempMin}
                onChange={(e) => setTempMin(e.target.value)}
                className="w-20 px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-slate-700"
              />
              <span className="text-xs text-slate-400">—</span>
              <input
                type="number"
                step="0.1"
                placeholder="до, °C"
                value={tempMax}
                onChange={(e) => setTempMax(e.target.value)}
                className="w-20 px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-slate-700"
              />
            </div>
          )}

          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="hidden sm:inline">Выгрузить в Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Сбросить
              <span className="rounded bg-slate-200 px-1 py-0.5 text-[10px]">{activeFiltersCount}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <p className="text-xs text-slate-500 whitespace-nowrap">
            <span className="font-semibold text-slate-700">{totalCount}</span> товаров
            {totalPages > 1 && (
              <span className="ml-1.5 text-slate-400">· стр. {currentPage}/{totalPages}</span>
            )}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setViewMode('cards')} className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="Карточки">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button onClick={() => setViewMode('table')} className={`p-1.5 sm:p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="Таблица">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
