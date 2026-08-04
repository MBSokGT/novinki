interface FooterProps {
  onExport?: (() => void) | null
}

export default function Footer({ onExport }: FooterProps) {
  return (
    <footer className="mt-12 bg-[#1A1A1A] border-t border-[#333]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} Комплекс-Бар · Внутренний каталог новинок ассортимента
        </p>
        <div className="flex items-center gap-4">
          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C23B3B] hover:text-[#9B1B1B] transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Выгрузить в Excel
            </button>
          )}
          <a
            href="https://complexbar.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-gray-200 transition"
          >
            complexbar.ru
          </a>
        </div>
      </div>
    </footer>
  )
}
