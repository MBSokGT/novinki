'use client'

import RequestForm from '@/components/RequestForm'

type Section = 'stock' | 'supplier' | 'vendors'

const ITEMS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'stock', label: 'Склад', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'supplier', label: 'Поставщики', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
  { id: 'vendors', label: 'Вендоры', icon: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 12h.01M9 15h.01' },
]

// Разделы каталога внизу экрана на телефоне — под большим пальцем, как в
// обычном приложении. На компьютере разделы остаются вкладками в шапке.
export default function MobileBottomNav({ activeSection, onSelect }: { activeSection: Section; onSelect: (section: Section) => void }) {
  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      {ITEMS.map((item) => {
        const active = activeSection === item.id
        return (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${active ? 'text-[#9B1B1B]' : 'text-slate-500'}`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2 : 1.6} d={item.icon} /></svg>
            {item.label}
          </button>
        )
      })}
      <RequestForm variant="bottom-nav" />
    </nav>
  )
}
