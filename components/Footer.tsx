import ExportCatalogButton from './ExportCatalogButton'

export default function Footer() {
  return (
    <footer className="mt-12 bg-[#1A1A1A] border-t border-[#333]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} Комплекс-Бар · Внутренний каталог новинок ассортимента
          <span className="ml-2 font-mono text-xs text-gray-600" title="Версия приложения">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
        </p>
        <div className="flex items-center gap-4">
          <ExportCatalogButton variant="footer" />
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
