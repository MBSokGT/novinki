'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/Toast'

interface DeletedProduct {
  id: string
  original_product_id: string
  name: string
  brand: string
  article_number?: string
  description: string
  image_url: string
  images?: string[]
  flyer_url?: string
  price_list_url?: string
  advantages: string
  attention_points: string
  website_link?: string
  category?: string
  year?: string
  tags?: string
  order_multiple?: string
  price?: number
  is_supplier_novelty?: boolean
  is_dishwasher_safe?: boolean
  is_microwave_safe?: boolean
  temp_min?: number
  temp_max?: number
  deleted_at: string
}

interface DeletedVendor {
  id: string
  original_vendor_id: string
  name: string
  image_url?: string
  product?: string
  website_link?: string
  max_discount?: string
  delivery_time?: string
  onec_products?: string
  files?: string[]
  deleted_at: string
}

export default function TrashPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'vendors'>('products')
  const [deletedProducts, setDeletedProducts] = useState<DeletedProduct[]>([])
  const [deletedVendors, setDeletedVendors] = useState<DeletedVendor[]>([])
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await apiClient.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    try {
      const { data: isAdmin } = await apiClient.rpc('check_admin_status', { user_id: user.id })
      if (isAdmin === true) {
        setIsAdmin(true)
        fetchDeletedProducts()
        fetchDeletedVendors()
      } else {
        setIsAdmin(false)
        setTimeout(() => router.push('/'), 500)
      }
    } catch (err) {
      setIsAdmin(false)
      setTimeout(() => router.push('/'), 500)
    }
  }

  const fetchDeletedProducts = async () => {
    const { data } = await apiClient
      .from('deleted_products')
      .select('*')
      .order('deleted_at', { ascending: false })
    if (data) setDeletedProducts(data)
  }

  const fetchDeletedVendors = async () => {
    const { data } = await apiClient
      .from('deleted_vendors')
      .select('*')
      .order('deleted_at', { ascending: false })
    if (data) setDeletedVendors(data)
  }

  const handleRestore = async (deletedProduct: DeletedProduct) => {
    if (!confirm('Восстановить этот товар?')) return
    try {
      const { error: insertError } = await apiClient.from('products').insert({
        name: deletedProduct.name,
        brand: deletedProduct.brand,
        article_number: deletedProduct.article_number,
        description: deletedProduct.description,
        image_url: deletedProduct.image_url,
        images: deletedProduct.images || [],
        flyer_url: deletedProduct.flyer_url || '',
        price_list_url: deletedProduct.price_list_url || '',
        advantages: deletedProduct.advantages,
        attention_points: deletedProduct.attention_points,
        website_link: deletedProduct.website_link,
        category: deletedProduct.category || '',
        year: deletedProduct.year || '',
        tags: deletedProduct.tags || '',
        order_multiple: deletedProduct.order_multiple || '',
        price: deletedProduct.price ?? null,
        is_supplier_novelty: Boolean(deletedProduct.is_supplier_novelty),
        is_dishwasher_safe: Boolean(deletedProduct.is_dishwasher_safe),
        is_microwave_safe: Boolean(deletedProduct.is_microwave_safe),
        temp_min: deletedProduct.temp_min ?? null,
        temp_max: deletedProduct.temp_max ?? null,
        is_archived: false
      })

      if (insertError) {
        showToast(`Ошибка восстановления: ${insertError.message}`, 'error')
        return
      }

      const { error: deleteError } = await apiClient.from('deleted_products').delete().eq('id', deletedProduct.id)
      if (deleteError) {
        showToast(`Товар восстановлен, но не удалён из корзины: ${deleteError.message}`, 'error')
      } else {
        showToast('Товар восстановлен', 'success')
      }
      fetchDeletedProducts()
    } catch (error: any) {
      showToast(error?.message || 'Ошибка восстановления товара', 'error')
    }
  }

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('ОКОНЧАТЕЛЬНО удалить товар? Это действие нельзя отменить!')) return
    try {
      const { error } = await apiClient.from('deleted_products').delete().eq('id', id)
      if (error) {
        showToast(`Ошибка удаления: ${error.message}`, 'error')
        return
      }
      fetchDeletedProducts()
    } catch (error: any) {
      showToast(error?.message || 'Ошибка удаления товара', 'error')
    }
  }

  const handleCleanup = async () => {
    if (!confirm('Очистить корзину от товаров старше 14 дней?')) return
    try {
      const { error } = await apiClient.rpc('cleanup_deleted_products')
      if (error) {
        showToast(`Ошибка очистки: ${error.message}`, 'error')
        return
      }
      showToast('Старые товары удалены', 'success')
      fetchDeletedProducts()
    } catch (error: any) {
      showToast(error?.message || 'Ошибка очистки корзины', 'error')
    }
  }

  const handleRestoreVendor = async (deletedVendor: DeletedVendor) => {
    if (!confirm('Восстановить этого вендора?')) return
    try {
      const { error: insertError } = await apiClient.from('vendors').insert({
        name: deletedVendor.name,
        image_url: deletedVendor.image_url || '',
        product: deletedVendor.product || '',
        website_link: deletedVendor.website_link || '',
        max_discount: deletedVendor.max_discount || '',
        delivery_time: deletedVendor.delivery_time || '',
        onec_products: deletedVendor.onec_products || '',
        files: deletedVendor.files || [],
      })

      if (insertError) {
        showToast(`Ошибка восстановления: ${insertError.message}`, 'error')
        return
      }

      const { error: deleteError } = await apiClient.from('deleted_vendors').delete().eq('id', deletedVendor.id)
      if (deleteError) {
        showToast(`Вендор восстановлен, но не удалён из корзины: ${deleteError.message}`, 'error')
      } else {
        showToast('Вендор восстановлен', 'success')
      }
      fetchDeletedVendors()
    } catch (error: any) {
      showToast(error?.message || 'Ошибка восстановления вендора', 'error')
    }
  }

  const handlePermanentDeleteVendor = async (id: string) => {
    if (!confirm('ОКОНЧАТЕЛЬНО удалить вендора? Это действие нельзя отменить!')) return
    try {
      const { error } = await apiClient.from('deleted_vendors').delete().eq('id', id)
      if (error) {
        showToast(`Ошибка удаления: ${error.message}`, 'error')
        return
      }
      fetchDeletedVendors()
    } catch (error: any) {
      showToast(error?.message || 'Ошибка удаления вендора', 'error')
    }
  }

  const handleCleanupVendors = async () => {
    if (!confirm('Очистить корзину от вендоров старше 14 дней?')) return
    try {
      const { error } = await apiClient.rpc('cleanup_deleted_vendors')
      if (error) {
        showToast(`Ошибка очистки: ${error.message}`, 'error')
        return
      }
      showToast('Старые вендоры удалены', 'success')
      fetchDeletedVendors()
    } catch (error: any) {
      showToast(error?.message || 'Ошибка очистки корзины', 'error')
    }
  }

  if (!user || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  if (isAdmin === false) {
    return null
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="truncate text-xl font-bold text-slate-700 sm:text-2xl">Корзина</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="inline-flex items-center gap-2 px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Панель администратора
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 inline-flex items-center rounded-lg bg-slate-200/70 p-1" role="tablist" aria-label="Раздел корзины">
          <button
            role="tab"
            aria-selected={activeTab === 'products'}
            onClick={() => setActiveTab('products')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Товары ({deletedProducts.length})
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'vendors'}
            onClick={() => setActiveTab('vendors')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === 'vendors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Вендоры ({deletedVendors.length})
          </button>
        </div>

        {activeTab === 'products' ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Удаленные товары ({deletedProducts.length})
            </h3>
            <button
              onClick={handleCleanup}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#9B1B1B] px-4 py-2 text-sm text-white transition hover:bg-[#7A1515] sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Очистить старые (14+ дней)
            </button>
          </div>

          {deletedProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <svg className="w-14 h-14 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <p className="text-lg">Корзина пуста</p>
            </div>
          ) : (
            <>
              <div className="lg:hidden divide-y divide-slate-100">
                {deletedProducts.map((product) => (
                  <div key={product.id} className="space-y-3 p-4">
                    <div className="space-y-1">
                      <div className="break-words font-medium text-slate-900">{product.name}</div>
                      <div className="break-words text-sm text-slate-600">{product.brand}</div>
                      <div className="text-sm text-slate-500">
                        Удален: {new Date(product.deleted_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => handleRestore(product)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a4 4 0 010 8h-4M3 10l4-4M3 10l4 4" /></svg>
                        Восстановить
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(product.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Удалить навсегда
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden lg:block">
                <table className="w-full table-fixed">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-[34%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Название</th>
                    <th className="w-[20%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Бренд</th>
                    <th className="w-[18%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Удален</th>
                    <th className="w-[28%] px-4 py-4 text-right text-sm font-semibold text-slate-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deletedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition">
                      <td className="break-words px-4 py-4 font-medium text-slate-900">{product.name}</td>
                      <td className="break-words px-4 py-4 text-slate-600">{product.brand}</td>
                      <td className="px-4 py-4 text-slate-500 text-sm">
                        {new Date(product.deleted_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => handleRestore(product)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a4 4 0 010 8h-4M3 10l4-4M3 10l4 4" /></svg>
                            Восстановить
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(product.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Удалить навсегда
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Удаленные вендоры ({deletedVendors.length})
            </h3>
            <button
              onClick={handleCleanupVendors}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#9B1B1B] px-4 py-2 text-sm text-white transition hover:bg-[#7A1515] sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Очистить старые (14+ дней)
            </button>
          </div>

          {deletedVendors.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <svg className="w-14 h-14 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <p className="text-lg">Корзина пуста</p>
            </div>
          ) : (
            <>
              <div className="lg:hidden divide-y divide-slate-100">
                {deletedVendors.map((vendor) => (
                  <div key={vendor.id} className="space-y-3 p-4">
                    <div className="space-y-1">
                      <div className="break-words font-medium text-slate-900">{vendor.name}</div>
                      {vendor.product && <div className="break-words text-sm text-slate-600">{vendor.product}</div>}
                      <div className="text-sm text-slate-500">
                        Удален: {new Date(vendor.deleted_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => handleRestoreVendor(vendor)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a4 4 0 010 8h-4M3 10l4-4M3 10l4 4" /></svg>
                        Восстановить
                      </button>
                      <button
                        onClick={() => handlePermanentDeleteVendor(vendor.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Удалить навсегда
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden lg:block">
                <table className="w-full table-fixed">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-[34%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Название</th>
                    <th className="w-[20%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Описание</th>
                    <th className="w-[18%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Удален</th>
                    <th className="w-[28%] px-4 py-4 text-right text-sm font-semibold text-slate-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deletedVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-slate-50 transition">
                      <td className="break-words px-4 py-4 font-medium text-slate-900">{vendor.name}</td>
                      <td className="break-words px-4 py-4 text-slate-600">{vendor.product}</td>
                      <td className="px-4 py-4 text-slate-500 text-sm">
                        {new Date(vendor.deleted_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => handleRestoreVendor(vendor)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a4 4 0 010 8h-4M3 10l4-4M3 10l4 4" /></svg>
                            Восстановить
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteVendor(vendor.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Удалить навсегда
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        )}
      </main>
    </div>
  )
}
