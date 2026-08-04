'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { apiClient } from '@/lib/api-client'
import { openFileInNewTab } from '@/lib/openFile'
import { Vendor } from '@/types/vendor'

function fileLabel(url: string) {
  const name = url.split('/').pop() || 'Файл'
  const ext = name.slice(name.lastIndexOf('.') + 1).toUpperCase()
  return ext.length <= 5 ? ext : 'Файл'
}

export default function VendorsList() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchVendors = async () => {
      const { data } = await apiClient.from('vendors').select('*').order('name', { ascending: true })
      if (!cancelled && data) setVendors(data as Vendor[])
      if (!cancelled) setLoading(false)
    }
    fetchVendors()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  if (vendors.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 12h.01M9 15h.01" /></svg>
        <p className="mt-4 text-slate-400 text-lg">Вендоров пока нет</p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        Товары этих вендоров транслируются на сайте, но не хранятся у нас на складе — заказ идёт напрямую по ссылке.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200">
            <div className="relative h-40 bg-slate-50 overflow-hidden shrink-0">
              <Image src={vendor.image_url || (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/placeholder.svg'} alt={vendor.name} fill className="object-cover" loading="lazy" />
            </div>
            <div className="flex flex-col flex-1 p-4">
              <h3 className="font-bold text-slate-900 leading-snug">{vendor.name}</h3>
              {vendor.product && (
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{vendor.product}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {vendor.max_discount && (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                    Скидка до {vendor.max_discount}
                  </span>
                )}
                {vendor.delivery_time && (
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                    Поставка: {vendor.delivery_time}
                  </span>
                )}
              </div>
              <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-slate-100 mt-3">
                {vendor.website_link ? (
                  <a
                    href={vendor.website_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[#9B1B1B] border border-[#9B1B1B] rounded-lg px-3 py-1.5 hover:bg-[#9B1B1B] hover:text-white transition-colors"
                  >
                    Заказать на сайте
                  </a>
                ) : <span />}
                {vendor.files && vendor.files.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {vendor.files.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => openFileInNewTab(url)}
                        title={fileLabel(url)}
                        className="text-[11px] font-medium text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 hover:text-[#9B1B1B] hover:border-[#9B1B1B] transition-colors"
                      >
                        {fileLabel(url)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
