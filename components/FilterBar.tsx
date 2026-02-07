'use client'

import { exportToExcel } from '@/lib/export'
import { Product } from '@/types/product'
import { useTheme } from '@/lib/theme'

interface FilterBarProps {
  products: Product[]
  selectedCategory: string | null
  setSelectedCategory: (cat: string | null) => void
  sortBy: string
  setSortBy: (sort: 'date' | 'name' | 'rating') => void
  viewMode: 'table' | 'cards'
  setViewMode: (mode: 'table' | 'cards') => void
}

export default function FilterBar({ products, selectedCategory, setSelectedCategory, sortBy, setSortBy, viewMode, setViewMode }: FilterBarProps) {
  const { theme, toggleTheme } = useTheme()
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  return (
    <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap gap-2">
        {categories.length > 0 && (
          <select 
            value={selectedCategory || ''} 
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 bg-white"
          >
            <option value="">Все категории</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
        
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 bg-white"
        >
          <option value="date">По дате</option>
          <option value="name">По названию</option>
          <option value="rating">По рейтингу</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button onClick={() => exportToExcel(products)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
          📥 Экспорт
        </button>
        
        <button onClick={toggleTheme} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        
        <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-red-800 text-white' : 'bg-slate-100'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </button>
        
        <button onClick={() => setViewMode('cards')} className={`p-2 rounded-lg transition ${viewMode === 'cards' ? 'bg-red-800 text-white' : 'bg-slate-100'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        </button>
      </div>
    </div>
  )
}
