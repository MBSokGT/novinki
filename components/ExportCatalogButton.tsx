'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { exportCatalogToExcel } from '@/lib/export'
import { showToast } from './Toast'
import { Product } from '@/types/product'
import { Vendor } from '@/types/vendor'

interface ExportCatalogButtonProps {
  variant?: 'footer' | 'toolbar'
}

// Самодостаточная кнопка — сама тянет весь опубликованный каталог (не
// зависит от текущей вкладки/фильтров/поиска) и собирает файл с тремя
// листами: Склад, Поставщики, Вендоры. Используется и на главной
// странице (Footer), и в админке — оба раза один и тот же результат.
export default function ExportCatalogButton({ variant = 'footer' }: ExportCatalogButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const [{ data: products }, { data: vendors }] = await Promise.all([
        apiClient.from('products').select('*').eq('is_archived', false),
        apiClient.from('vendors').select('*'),
      ])
      const all = (products || []) as Product[]
      const stock = all.filter((p) => !p.is_supplier_novelty)
      const supplier = all.filter((p) => p.is_supplier_novelty)
      exportCatalogToExcel(stock, supplier, (vendors || []) as Vendor[])
      showToast('Файл Excel сформирован', 'success')
    } catch (error: any) {
      showToast(error?.message || 'Ошибка при выгрузке в Excel', 'error')
    } finally {
      setExporting(false)
    }
  }

  const icon = exporting ? (
    <span className={`w-3.5 h-3.5 rounded-full border-2 animate-spin ${variant === 'footer' ? 'border-[#C23B3B]/40 border-t-[#C23B3B]' : 'border-white/40 border-t-white'}`} />
  ) : (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  )

  if (variant === 'toolbar') {
    return (
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition disabled:opacity-60 disabled:cursor-wait"
      >
        {icon}
        {exporting ? 'Выгрузка...' : 'Выгрузить в Excel'}
      </button>
    )
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C23B3B] hover:text-[#9B1B1B] transition disabled:opacity-60 disabled:cursor-wait"
    >
      {icon}
      {exporting ? 'Выгрузка...' : 'Выгрузить в Excel'}
    </button>
  )
}
