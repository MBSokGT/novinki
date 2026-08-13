'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { openFileInNewTab } from '@/lib/openFile'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Product } from '@/types/product'
import { Vendor } from '@/types/vendor'

function fileLabel(url: string) {
  const name = url.split('/').pop() || 'Файл'
  const ext = name.slice(name.lastIndexOf('.') + 1).toUpperCase()
  return ext.length <= 5 ? ext : 'Файл'
}

export default function FlyersLibraryPage() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'stock' | 'supplier' | 'vendors'>('stock')
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await apiClient.auth.getUser()
    if (!user) {
      router.push('/login')
      setLoading(false)
      return
    }
    const { data: adminStatus } = await apiClient.rpc('check_admin_status', { user_id: user.id })
    if (!adminStatus) {
      router.push('/')
      setLoading(false)
      return
    }
    setIsAdmin(true)
    const [{ data: productsData }, { data: vendorsData }] = await Promise.all([
      apiClient.from('products').select('*').eq('is_archived', false),
      apiClient.from('vendors').select('*'),
    ])
    if (productsData) setProducts(productsData as Product[])
    if (vendorsData) setVendors(vendorsData as Vendor[])
    setLoading(false)
  }

  const stockProducts = products.filter((p) => p.flyer_url && !p.is_supplier_novelty)
  const supplierProducts = products.filter((p) => p.flyer_url && p.is_supplier_novelty)
  const vendorsWithFiles = vendors.filter((v) => v.files && v.files.length > 0)

  const q = search.trim().toLowerCase()
  const filteredStock = q ? stockProducts.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)) : stockProducts
  const filteredSupplier = q ? supplierProducts.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)) : supplierProducts
  const filteredVendors = q ? vendorsWithFiles.filter((v) => v.name.toLowerCase().includes(q)) : vendorsWithFiles

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  if (!isAdmin) return null

  const tabCounts = { stock: stockProducts.length, supplier: supplierProducts.length, vendors: vendorsWithFiles.length }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/logo.png'} alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Библиотека листовок</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition w-fit">
            Назад
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="mb-4 text-sm text-slate-500">
          Только для внутреннего пользования — все листовки и материалы вендоров в одном месте, чтобы быстро найти нужное.
        </p>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center rounded-lg bg-slate-200/70 p-1" role="tablist" aria-label="Раздел">
            <button
              role="tab"
              aria-selected={activeTab === 'stock'}
              onClick={() => setActiveTab('stock')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'stock' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Склад ({tabCounts.stock})
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'supplier'}
              onClick={() => setActiveTab('supplier')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'supplier' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Поставщики ({tabCounts.supplier})
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'vendors'}
              onClick={() => setActiveTab('vendors')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'vendors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Вендоры ({tabCounts.vendors})
            </button>
          </div>
          <div className="relative w-full max-w-xs">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
            />
          </div>
        </div>

        {activeTab === 'vendors' ? (
          filteredVendors.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
              {q ? `Ничего не найдено по запросу «${search}»` : 'У вендоров пока нет прикреплённых файлов'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                      <Image src={vendor.image_url || (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/placeholder.svg'} alt={vendor.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 font-medium text-slate-900 truncate">{vendor.name}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(vendor.files || []).map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => openFileInNewTab(url)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9B1B1B] bg-red-50 border border-red-200 rounded px-2 py-1 hover:bg-red-100 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        {fileLabel(url)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          (() => {
            const list = activeTab === 'stock' ? filteredStock : filteredSupplier
            return list.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
                {q ? `Ничего не найдено по запросу «${search}»` : 'Листовок в этом разделе пока нет'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {list.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="relative h-32 bg-slate-50">
                      <Image src={product.image_url || (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/placeholder.svg'} alt={product.name} fill className="object-cover" />
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-slate-900 text-sm truncate">{product.name}</div>
                      <div className="text-xs text-slate-500 truncate mb-2">{product.brand}</div>
                      <div className="flex flex-wrap gap-2">
                        {product.flyer_url && (
                          <button
                            onClick={() => openFileInNewTab(product.flyer_url!)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9B1B1B] bg-red-50 border border-red-200 rounded px-2 py-1 hover:bg-red-100 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Листовка
                          </button>
                        )}
                        {product.price_list_url && (
                          <button
                            onClick={() => openFileInNewTab(product.price_list_url!)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-100 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M14 4v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" /></svg>
                            Прайс-лист
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()
        )}
      </main>
    </div>
  )
}
