'use client'

import { useState, useRef, useEffect } from 'react'
import { Product } from '@/types/product'

interface FilterBarProps {
  products: Product[]
  selectedBrand: string | null
  setSelectedBrand: (brand: string | null) => void
  selectedCategory: string | null
  setSelectedCategory: (cat: string | null) => void
  selectedYear: string | null
  setSelectedYear: (year: string | null) => void
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
  onClearFilters: () => void
}

export default function FilterBar({
  products,
  selectedBrand,
  setSelectedBrand,
  selectedCategory,
  setSelectedCategory,
  selectedYear,
  setSelectedYear,
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
  onClearFilters,
}: FilterBarProps) {
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  const years = Array.from(new Set(products.map(p => p.year).filter(Boolean))).sort().reverse()
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort((a, b) => a!.localeCompare(b!))

  const [catInput, setCatInput] = useState(selectedCategory || '')
  const [showCatDrop, setShowCatDrop] = useState(false)
  const catRef = useRef<HTMLDivElement>(null)

  const [brandInput, setBrandInput] = useState(selectedBrand || '')
  const [showBrandDrop, setShowBrandDrop] = useState(false)
  const brandRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCatInput(selectedCategory || '')
  }, [selectedCategory])

  useEffect(() => {
    setBrandInput(selectedBrand || '')
  }, [selectedBrand])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCatDrop(false)
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) setShowBrandDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredCats = categories.filter(c => c!.toLowerCase().includes(catInput.toLowerCase()))
  const filteredBrands = brands.filter(b => b!.toLowerCase().includes(brandInput.toLowerCase()))

  return (
    <div className="mb-5 bg-white px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {categories.length > 0 && (
            <div className="relative" ref={catRef}>
              <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#9B1B1B]">
                <input
                  type="text"
                  value={catInput}
                  onChange={(e) => { setCatInput(e.target.value); setShowCatDrop(true) }}
                  onFocus={() => setShowCatDrop(true)}
                  placeholder="Все категории"
                  className="pl-2.5 pr-1 py-1 sm:pl-3 sm:py-1.5 text-xs sm:text-sm bg-transparent outline-none text-slate-700 w-32 sm:w-40"
                />
                {catInput && (
                  <button onClick={() => { setCatInput(''); setSelectedCategory(null); setShowCatDrop(false) }} className="pr-1 text-slate-400 hover:text-slate-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                <button onClick={() => setShowCatDrop(v => !v)} className="pr-2 text-slate-400">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              {showCatDrop && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto min-w-[160px]">
                  <button
                    onMouseDown={() => { setSelectedCategory(null); setCatInput(''); setShowCatDrop(false) }}
                    className="w-full text-left px-3 py-2 text-xs sm:text-sm text-slate-500 hover:bg-slate-50"
                  >Все категории</button>
                  {filteredCats.map(cat => (
                    <button
                      key={cat}
                      onMouseDown={() => { setSelectedCategory(cat!); setCatInput(cat!); setShowCatDrop(false) }}
                      className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-50 ${selectedCategory === cat ? 'font-medium text-[#9B1B1B]' : 'text-slate-700'}`}
                    >{cat}</button>
                  ))}
                  {filteredCats.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">Не найдено</div>}
                </div>
              )}
            </div>
          )}

          {brands.length > 0 && (
            <div className="relative" ref={brandRef}>
              <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#9B1B1B]">
                <input
                  type="text"
                  value={brandInput}
                  onChange={(e) => { setBrandInput(e.target.value); setShowBrandDrop(true) }}
                  onFocus={() => setShowBrandDrop(true)}
                  placeholder="Все бренды"
                  className="pl-2.5 pr-1 py-1 sm:pl-3 sm:py-1.5 text-xs sm:text-sm bg-transparent outline-none text-slate-700 w-32 sm:w-40"
                />
                {brandInput && (
                  <button onClick={() => { setBrandInput(''); setSelectedBrand(null); setShowBrandDrop(false) }} className="pr-1 text-slate-400 hover:text-slate-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                <button onClick={() => setShowBrandDrop(v => !v)} className="pr-2 text-slate-400">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              {showBrandDrop && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto min-w-[160px]">
                  <button
                    onMouseDown={() => { setSelectedBrand(null); setBrandInput(''); setShowBrandDrop(false) }}
                    className="w-full text-left px-3 py-2 text-xs sm:text-sm text-slate-500 hover:bg-slate-50"
                  >Все бренды</button>
                  {filteredBrands.map(brand => (
                    <button
                      key={brand}
                      onMouseDown={() => { setSelectedBrand(brand!); setBrandInput(brand!); setShowBrandDrop(false) }}
                      className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-50 ${selectedBrand === brand ? 'font-medium text-[#9B1B1B]' : 'text-slate-700'}`}
                    >{brand}</button>
                  ))}
                  {filteredBrands.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">Не найдено</div>}
                </div>
              )}
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
            onClick={() => setDishwasherSafeOnly(!dishwasherSafeOnly)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all font-medium ${dishwasherSafeOnly ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-8 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
            Подходит для ПММ
          </button>

          <button
            onClick={() => setMicrowaveSafeOnly(!microwaveSafeOnly)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-all font-medium ${microwaveSafeOnly ? 'bg-[#9B1B1B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM8 10a2 2 0 104 0 2 2 0 00-4 0z" /></svg>
            Подходит для СВЧ
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
