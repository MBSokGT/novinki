'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { openFileInNewTab } from '@/lib/openFile'
import { Vendor } from '@/types/vendor'

interface VendorsListProps {
  isAdmin?: boolean
}

function fileLabel(url: string) {
  const name = url.split('/').pop() || 'Файл'
  const ext = name.slice(name.lastIndexOf('.') + 1).toUpperCase()
  return ext.length <= 5 ? ext : 'Файл'
}

export default function VendorsList({ isAdmin }: VendorsListProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const router = useRouter()

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => setSelectedVendor(vendor)}
            className="relative flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="relative h-40 bg-slate-50 overflow-hidden shrink-0">
              <Image src={vendor.image_url || (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/placeholder.svg'} alt={vendor.name} fill className="object-cover" loading="lazy" />
            </div>
            <div className="flex flex-col flex-1 p-4">
              <h3 className="font-bold text-slate-900 leading-snug">{vendor.name}</h3>
              {vendor.product && (
                <p className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-2">{vendor.product}</p>
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
              <div className="mt-auto pt-3 border-t border-slate-100 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedVendor(vendor) }}
                  className="text-xs font-medium text-[#9B1B1B] border border-[#9B1B1B] rounded-lg px-3 py-1.5 hover:bg-[#9B1B1B] hover:text-white transition-colors"
                >
                  Подробнее
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedVendor && (
        <div onClick={() => setSelectedVendor(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 cursor-default">
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
              {isAdmin && (
                <button
                  onClick={() => router.push(`/admin/vendors?edit=${selectedVendor.id}`)}
                  className="bg-white rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 transition shadow-md"
                  title="Редактировать в админке"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              )}
              <button onClick={() => setSelectedVendor(null)} className="bg-white rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 transition shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="relative h-36 sm:h-44 bg-slate-100 shrink-0">
              <Image src={selectedVendor.image_url || (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/placeholder.svg'} alt={selectedVendor.name} fill className="object-cover" />
            </div>
            <div className="p-5 sm:p-7 overflow-y-auto max-h-[calc(90vh-9rem)] sm:max-h-[calc(90vh-11rem)]">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Вендор</p>
              <h2 className="text-xl sm:text-2xl font-bold mb-5 text-slate-900 leading-snug">{selectedVendor.name}</h2>
              <div className="divide-y divide-slate-100">
                {selectedVendor.product && (
                  <div className="pb-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Описание</p>
                    <p className="text-slate-700 leading-relaxed text-sm">{selectedVendor.product}</p>
                  </div>
                )}
                {(selectedVendor.max_discount || selectedVendor.delivery_time) && (
                  <div className="py-4 flex flex-wrap gap-4">
                    {selectedVendor.max_discount && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Максимальная скидка</p>
                        <p className="text-slate-700 text-sm font-medium">{selectedVendor.max_discount}</p>
                      </div>
                    )}
                    {selectedVendor.delivery_time && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Срок поставки</p>
                        <p className="text-slate-700 text-sm font-medium">{selectedVendor.delivery_time}</p>
                      </div>
                    )}
                  </div>
                )}
                {selectedVendor.onec_products && (
                  <div className="py-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Товары в 1С</p>
                    <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-line">{selectedVendor.onec_products}</p>
                  </div>
                )}
                {(selectedVendor.website_link || (selectedVendor.files && selectedVendor.files.length > 0)) && (
                  <div className="py-4 flex flex-wrap items-center gap-4">
                    {selectedVendor.website_link && (
                      <a
                        href={selectedVendor.website_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Заказать на сайте
                      </a>
                    )}
                    {selectedVendor.files && selectedVendor.files.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => openFileInNewTab(url)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9B1B1B] hover:text-[#7A1515]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {fileLabel(url)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
