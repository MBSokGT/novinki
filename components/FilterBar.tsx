'use client'

import { exportToExcel } from '@/lib/export'
import { Product } from '@/types/product'

interface FilterBarProps {
  products: Product[]
  selectedCategory: string | null
  setSelectedCategory: (cat: string | null) => void
  selectedYear: string | null
  setSelectedYear: (year: string | null) => void
  supplierNoveltiesOnly: boolean
  setSupplierNoveltiesOnly: (value: boolean) => void
  sortBy: string
  setSortBy: (sort: 'date' | 'name' | 'rating') => void
  viewMode: 'table' | 'cards'
  setViewMode: (mode: 'table' | 'cards') => void
  activeFiltersCount: number
  totalCount: number
  currentPage: number
  totalPages: number
  onClearFilters: () => void
}

export default function FilterBar({
  products,
  selectedCategory,
  setSelectedCategory,
  selectedYear,
  setSelectedYear,
  supplierNoveltiesOnly,
  setSupplierNoveltiesOnly,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  activeFiltersCount,
  totalCount,
  currentPage,
  totalPages,
  onClearFilters,
}: FilterBarProps) {
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  const years = Array.from(new Set(products.map(p => p.year).filter(Boolean))).sort().reverse()

  return (
    <div className="mb-5 bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 0 && (
            <div className="relative">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-slate-700"
              >
                <option value="">Все категории</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          )}

          {years.length > 0 && (
            <div className="relative">
              <select
                value={selectedYear || ''}
                onChange={(e) => setSelectedYear(e.target.value || null)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-slate-700"
              >
                <option value="">Все годы</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          )}

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-slate-700"
            >
              <option value="date">По дате</option>
              <option value="name">По названию</option>
              <option value="rating">По рейтингу</option>
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>

          <button
            onClick={() => setSupplierNoveltiesOnly(!supplierNoveltiesOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all font-medium ${supplierNoveltiesOnly ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            Новинки поставщиков
          </button>

          <div className="flex gap-1">
            <button onClick={() => setViewMode('cards')} className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="Карточки">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} title="Таблица">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Сбросить
              <span className="rounded bg-slate-200 px-1 py-0.5 text-[10px]">{activeFiltersCount}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{totalCount}</span> товаров
            {totalPages > 1 && (
              <span className="ml-1.5 text-slate-400">· стр. {currentPage}/{totalPages}</span>
            )}
          </p>
          <button onClick={() => exportToExcel(products)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition text-xs font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Экспорт
          </button>
        </div>
      </div>
    </div>
  )
}
