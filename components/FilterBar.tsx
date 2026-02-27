'use client'

import { exportToExcel } from '@/lib/export'
import { Product } from '@/types/product'

interface FilterBarProps {
  products: Product[]
  selectedCategory: string | null
  setSelectedCategory: (cat: string | null) => void
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

  return (
    <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Найдено: <span className="font-semibold text-slate-900">{totalCount}</span>
          {totalPages > 1 && (
            <span className="ml-2">
              Страница <span className="font-semibold text-slate-900">{currentPage}</span> из{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </span>
          )}
        </p>
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Сбросить фильтры
            <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs">{activeFiltersCount}</span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap gap-2">
        {categories.length > 0 && (
          <select 
            value={selectedCategory || ''} 
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-gray-700 font-medium"
          >
            <option value="">🏷️ Все категории</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
        
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] focus:border-transparent bg-white text-gray-700 font-medium"
        >
          <option value="date">📅 По дате</option>
          <option value="name">🔤 По названию</option>
          <option value="rating">⭐ По рейтингу</option>
        </select>

        <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#9B1B1B] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </button>
        
        <button onClick={() => setViewMode('cards')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-[#9B1B1B] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        </button>
      </div>

      <button onClick={() => exportToExcel(products)} className="flex items-center gap-2 px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition-all shadow-md text-sm font-medium">
        📥 Экспорт
      </button>
      </div>
    </div>
  )
}
