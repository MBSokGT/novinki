'use client'

import { useEffect, useRef, useState } from 'react'
import { COMPLEXBAR_CITIES } from '@/lib/complexbar-cities'

interface CityBadgeProps {
  cityHost: string | null
  setCityHost: (host: string | null) => void
}

export default function CityBadge({ cityHost, setCityHost }: CityBadgeProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = COMPLEXBAR_CITIES.find((c) => c.host === (cityHost || 'complexbar.ru')) || COMPLEXBAR_CITIES[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Ваш город — ссылки «Посмотреть товар» будут вести на страницу этого города на complexbar.ru"
        className="inline-flex items-center gap-1 py-1 text-xs font-medium text-gray-400 transition hover:text-gray-200"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <span>Ваш город: <span className="text-gray-200">{current.name}</span></span>
        <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {COMPLEXBAR_CITIES.map((city) => (
            <button
              key={city.host}
              onClick={() => { setCityHost(city.host); setOpen(false) }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${city.host === current.host ? 'font-medium text-[#9B1B1B]' : 'text-slate-700'}`}
            >
              {city.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
