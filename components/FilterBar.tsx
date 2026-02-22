'use client'

import { exportToExcel } from '@/lib/export'
import { Product } from '@/types/product'

interface FilterBarProps {
  products: Product[]
  selectedCategory: string | null
  setSelectedCategory: (cat: string | null) => void
  sortBy: string
  setSortBy: (sort: 'date' | 'name' | 'rating' | 'price-asc' | 'price-desc') => void
  viewMode: 'table' | 'cards'
  setViewMode: (mode: 'table' | 'cards') => void
}

export default function FilterBar({ products, selectedCategory, setSelectedCategory, sortBy, setSortBy, viewMode, setViewMode }: FilterBarProps) {
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  const hasPrice = products.some(p => p.price && p.price > 0)

  return (
    <div className="mb-4 flex flex-wrap gap-2 items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-wrap gap-2 items-center">
        {categories.length > 0 && (
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B1538] focus:border-transparent bg-white text-sm text-gray-700 font-medium cursor-pointer"
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
          className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B1538] focus:border-transparent bg-white text-sm text-gray-700 font-medium cursor-pointer"
        >
          <option value="date">📅 По дате</option>
          <option value="name">🔤 По названию</option>
          <option value="rating">⭐ По рейтингу</option>
          {hasPrice && <option value="price-asc">💰 Цена: дешевле</option>}
          {hasPrice && <option value="price-desc">💎 Цена: дороже</option>}
        </select>

        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-[#8B1538] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            title="Карточки"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-[#8B1538] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            title="Таблица"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
        </div>
      </div>

      <button
        onClick={() => exportToExcel(products)}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#8B1538] text-white rounded-lg hover:bg-[#6B0F2A] transition text-sm font-medium shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        Экспорт
      </button>
    </div>
  )
}
