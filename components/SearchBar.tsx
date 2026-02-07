'use client'

import { useState, useEffect, useRef } from 'react'
import { Product } from '@/types/product'

interface SearchBarProps {
  products: Product[]
  search: string
  setSearch: (value: string) => void
  onSelectProduct?: (product: Product) => void
}

export default function SearchBar({ products, search, setSearch, onSelectProduct }: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (search.length > 1) {
      const filtered = products
        .filter(p => 
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.brand.toLowerCase().includes(search.toLowerCase()) ||
          p.article_number?.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [search, products])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Голосовой поиск не поддерживается в вашем браузере')
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setSearch(transcript)
    }

    recognition.start()
  }

  return (
    <div ref={searchRef} className="relative flex-1">
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Поиск по названию, бренду или артикулу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="w-full pl-12 pr-24 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] focus:border-transparent transition shadow-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button
            onClick={startVoiceSearch}
            className={`p-2 rounded-lg transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title="Голосовой поиск"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          {search && (
            <button onClick={() => setSearch('')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
          {suggestions.map(product => (
            <button
              key={product.id}
              onClick={() => {
                onSelectProduct?.(product)
                setShowSuggestions(false)
              }}
              className="w-full px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-100 last:border-0"
            >
              <div className="font-medium text-gray-900">{product.name}</div>
              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-[#8B1538] text-white rounded text-xs">{product.brand}</span>
                {product.article_number && <span className="text-xs">Арт: {product.article_number}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
