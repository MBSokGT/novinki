'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { openFileInNewTab } from '@/lib/openFile'
import { isTemperatureCategory } from '@/lib/constants'
import { Product } from '@/types/product'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import ExcelImport from '@/components/ExcelImport'
import { showToast } from '@/components/Toast'

const EMPTY_FORM = {
  name: '',
  brand: '',
  article_number: '',
  description: '',
  advantages: '',
  attention_points: '',
  website_link: '',
  price: '',
  category: '',
  year: '',
  is_supplier_novelty: false,
  is_dishwasher_safe: false,
  is_microwave_safe: false,
  temp_min: '',
  temp_max: '',
}

const ADMIN_DRAFT_KEY = 'novinki:adminFormDraft'

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [years, setYears] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [flyer, setFlyer] = useState<File | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [tableSearch, setTableSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null) // null = загрузка, false = не админ, true = админ
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const { data: { user } } = await apiClient.auth.getUser()
        if (cancelled) return
        if (!user) {
          router.push('/login')
          return
        }
        setUser(user)

        const { data: profile } = await apiClient
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return

        if (profile?.is_admin === true) {
          setIsAdmin(true)
          fetchProducts()
          fetchCategories()
          fetchYears()
        } else {
          setIsAdmin(false)
          router.push('/')
        }
      } catch (err) {
        if (cancelled) return
        setIsAdmin(false)
        router.push('/')
      }
    }

    checkAuth()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const rawDraft = window.localStorage.getItem(ADMIN_DRAFT_KEY)
    if (!rawDraft) return

    try {
      const draft = JSON.parse(rawDraft)
      if (draft && typeof draft === 'object') {
        setForm((prev) => ({
          ...prev,
          ...draft,
        }))
      }
    } catch {
      window.localStorage.removeItem(ADMIN_DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || editId) return

    const hasData = Object.values(form).some((value) => typeof value === 'string' && value.trim() !== '')
    if (hasData) {
      window.localStorage.setItem(ADMIN_DRAFT_KEY, JSON.stringify(form))
    } else {
      window.localStorage.removeItem(ADMIN_DRAFT_KEY)
    }
  }, [form, editId])

  const fetchProducts = async () => {
    const { data } = await apiClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProducts(data)
  }

  const fetchCategories = async () => {
    const { data } = await apiClient.from('categories').select('*').order('name', { ascending: true })
    if (data) setCategories(data)
  }

  const fetchYears = async () => {
    const { data } = await apiClient.from('years').select('*').order('name', { ascending: false })
    if (data) setYears(data)
  }

  const normalizeLink = (link?: string) => {
    const trimmed = (link || '').trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setExistingImages([])
    setNewImages([])
    setFlyer(null)
    setEditId(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_DRAFT_KEY)
    }
  }

  const filteredProducts = products.filter((product) => {
    const searchText = tableSearch.trim().toLowerCase()
    const isArchived = Boolean(product.is_archived)

    const statusMatch =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !isArchived) ||
      (statusFilter === 'archived' && isArchived)

    if (!statusMatch) return false

    if (!searchText) return true

    return (
      product.name.toLowerCase().includes(searchText) ||
      product.brand.toLowerCase().includes(searchText) ||
      (product.article_number || '').toLowerCase().includes(searchText)
    )
  })

  const activeCount = products.filter((product) => !product.is_archived).length
  const archivedCount = products.filter((product) => Boolean(product.is_archived)).length

  const uploadProductImages = async (files: File[]): Promise<string[]> => {
    const uploaded: string[] = []
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name}`
      const { data, error } = await apiClient.storage.from('products').upload(fileName, file)
      if (error) throw error
      if (data) uploaded.push(data.path)
    }
    return uploaded
  }

  const uploadFlyerFile = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}_${file.name}`
    const { data, error } = await apiClient.storage.from('flyers').upload(fileName, file)
    if (error) throw error
    return data?.path || ''
  }

  const buildProductPayload = (images: string[], flyerUrl: string) => ({
    name: form.name,
    brand: form.brand,
    article_number: form.article_number,
    description: form.description,
    advantages: form.advantages,
    attention_points: form.attention_points,
    website_link: normalizeLink(form.website_link),
    category: form.category,
    year: form.year,
    is_supplier_novelty: form.is_supplier_novelty,
    is_dishwasher_safe: form.is_dishwasher_safe,
    is_microwave_safe: form.is_microwave_safe,
    temp_min: isTemperatureCategory(form.category) && form.temp_min ? parseFloat(form.temp_min) : null,
    temp_max: isTemperatureCategory(form.category) && form.temp_max ? parseFloat(form.temp_max) : null,
    price: form.price ? parseFloat(form.price) : null,
    images,
    image_url: images[0] || '',
    flyer_url: flyerUrl || (editId ? products.find(p => p.id === editId)?.flyer_url : ''),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLoading) return
    setSubmitLoading(true)

    try {
      const uploadedImages = await uploadProductImages(newImages)
      const images = [...existingImages, ...uploadedImages]
      const flyerUrl = flyer ? await uploadFlyerFile(flyer) : ''
      const productData = buildProductPayload(images, flyerUrl)

      if (editId) {
        const { data, error } = await apiClient.from('products').update(productData).eq('id', editId).select()
        if (error) throw error
        if (data?.[0]) {
          setProducts((prev) => prev.map((p) => (p.id === editId ? (data[0] as Product) : p)))
        } else {
          await fetchProducts()
        }
        showToast('Товар обновлён', 'success')
      } else {
        const { data, error } = await apiClient.from('products').insert([productData]).select()
        if (error) throw error
        if (data?.[0]) {
          setProducts((prev) => [data[0] as Product, ...prev])
        } else {
          await fetchProducts()
        }
        showToast('Товар добавлен', 'success')
      }

      resetForm()
    } catch (error: any) {
      console.error('Save error:', error)
      showToast(error?.message || 'Ошибка при сохранении товара', 'error')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      brand: product.brand,
      article_number: product.article_number || '',
      description: product.description,
      advantages: product.advantages,
      attention_points: product.attention_points,
      website_link: product.website_link || '',
      price: product.price != null ? String(product.price) : '',
      category: (product as any).category || '',
      year: product.year || '',
      is_supplier_novelty: Boolean(product.is_supplier_novelty),
      is_dishwasher_safe: Boolean(product.is_dishwasher_safe),
      is_microwave_safe: Boolean(product.is_microwave_safe),
      temp_min: product.temp_min != null ? String(product.temp_min) : '',
      temp_max: product.temp_max != null ? String(product.temp_max) : '',
    })
    setExistingImages(product.images?.length ? product.images : (product.image_url ? [product.image_url] : []))
    setNewImages([])
    setFlyer(null)
    setEditId(product.id)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_DRAFT_KEY)
    }
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    showToast('Товар загружен для редактирования', 'success')
  }

  const handleDuplicate = async (product: Product) => {
    try {
      const images = product.images?.length ? product.images : (product.image_url ? [product.image_url] : [])
      const payload = {
        name: `${product.name} (копия)`,
        brand: product.brand,
        article_number: '',
        description: product.description,
        images,
        image_url: images[0] || '',
        flyer_url: product.flyer_url || '',
        advantages: product.advantages,
        attention_points: product.attention_points,
        website_link: product.website_link || '',
        category: (product as any).category || '',
        year: product.year || '',
        price: product.price ?? null,
        is_archived: false,
        is_supplier_novelty: Boolean(product.is_supplier_novelty),
        is_dishwasher_safe: Boolean(product.is_dishwasher_safe),
        is_microwave_safe: Boolean(product.is_microwave_safe),
        temp_min: product.temp_min ?? null,
        temp_max: product.temp_max ?? null,
      }

      const { data, error } = await apiClient.from('products').insert([payload]).select()
      if (error) throw error

      if (data?.[0]) {
        setProducts((prev) => [data[0] as Product, ...prev])
      } else {
        await fetchProducts()
      }
      showToast('Копия товара создана', 'success')
    } catch (error: any) {
      console.error('Duplicate error:', error)
      showToast(error?.message || 'Ошибка при копировании товара', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Переместить товар в корзину? (автоочистка через 14 дней)')) {
      try {
        const product = products.find(p => p.id === id)
        if (product) {
          console.log('Deleting product:', product)

          // Перемещаем в корзину
          const { error: insertError } = await apiClient.from('deleted_products').insert({
            original_product_id: product.id,
            name: product.name,
            brand: product.brand,
            article_number: product.article_number,
            description: product.description,
            image_url: product.image_url,
            images: product.images || [],
            flyer_url: product.flyer_url,
            advantages: product.advantages,
            attention_points: product.attention_points,
            website_link: product.website_link,
            category: (product as any).category || '',
            year: product.year || '',
            price: product.price ?? null,
            is_supplier_novelty: Boolean(product.is_supplier_novelty),
            is_dishwasher_safe: Boolean(product.is_dishwasher_safe),
            is_microwave_safe: Boolean(product.is_microwave_safe),
            temp_min: product.temp_min ?? null,
            temp_max: product.temp_max ?? null,
            deleted_at: new Date().toISOString(),
          })
          
          if (insertError) {
            console.error('Error inserting to deleted_products:', insertError)
            showToast('Ошибка перемещения в корзину', 'error')
            return
          }

          // Удаляем из основной таблицы
          const { error: deleteError } = await apiClient.from('products').delete().eq('id', id)

          if (deleteError) {
            console.error('Error deleting from products:', deleteError)
            showToast('Ошибка удаления товара', 'error')
            return
          }
          
          console.log('Product moved to trash successfully')
          setProducts((prev) => prev.filter((p) => p.id !== id))
          setSelectedIds((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      } catch (error) {
        console.error('Delete operation failed:', error)
        showToast('Ошибка операции удаления', 'error')
      }
    }
  }

  const handleArchive = async (id: string, isArchived: boolean) => {
    const action = isArchived ? 'разархивировать' : 'архивировать'
    if (confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} этот товар?`)) {
      try {
        console.log('Archiving product:', { id, isArchived, newStatus: !isArchived })
        
        // Используем service role для обхода RLS
        const { data, error } = await apiClient
          .from('products')
          .update({ is_archived: !isArchived })
          .eq('id', id)
          .select()
        
        if (error) {
          console.error('Archive error:', error)
          showToast(`Ошибка архивирования: ${error.message}`, 'error')
          return
        }
        
        console.log('Archive result:', data)
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_archived: !isArchived } : p)))
      } catch (error) {
        console.error('Archive operation failed:', error)
        showToast('Ошибка операции архивирования', 'error')
      }
    }
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map((p) => p.id))
    )
  }

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Архивировать выбранные товары (${selectedIds.size})?`)) return

    try {
      const ids = Array.from(selectedIds)
      await Promise.all(
        ids.map((id) => apiClient.from('products').update({ is_archived: true }).eq('id', id))
      )
      setProducts((prev) => prev.map((p) => (selectedIds.has(p.id) ? { ...p, is_archived: true } : p)))
      setSelectedIds(new Set())
      showToast('Товары архивированы', 'success')
    } catch (error) {
      console.error('Bulk archive failed:', error)
      showToast('Ошибка массового архивирования', 'error')
    }
  }

  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Опубликовать выбранные товары (${selectedIds.size})? Они станут видны на сайте.`)) return

    try {
      const ids = Array.from(selectedIds)
      await Promise.all(
        ids.map((id) => apiClient.from('products').update({ is_archived: false }).eq('id', id))
      )
      setProducts((prev) => prev.map((p) => (selectedIds.has(p.id) ? { ...p, is_archived: false } : p)))
      setSelectedIds(new Set())
      showToast('Товары опубликованы', 'success')
    } catch (error) {
      console.error('Bulk publish failed:', error)
      showToast('Ошибка массовой публикации', 'error')
    }
  }

  const handleImportSuccess = async () => {
    setSelectedIds(new Set())
    setStatusFilter('archived')
    await fetchProducts()
  }

  const handleLogout = async () => {
    await apiClient.auth.signOut()
    router.push('/login')
  }

  if (!user || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  if (isAdmin === false) {
    return null // Не отображаем ничего при редиректе
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Панель администратора</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ExcelImport onSuccess={handleImportSuccess} />
            <Link href="/admin/trash" className="inline-flex items-center gap-2 px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Корзина
            </Link>
            <Link href="/" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
              На главную
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
              Выйти
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Меню функций */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Link href="/admin/analytics" className="group p-3 bg-white rounded-xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="mb-1 flex justify-center text-[#9B1B1B] group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Аналитика</div>
            <div className="text-sm text-slate-500 mt-1">Отчеты и статистика</div>
          </Link>
          <Link href="/admin/categories" className="group p-3 bg-white rounded-xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="mb-1 flex justify-center text-[#9B1B1B] group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5.586a1 1 0 01.707.293l7.414 7.414a1 1 0 010 1.414l-7.586 7.586a1 1 0 01-1.414 0L4.293 12.293A1 1 0 014 11.586V6a3 3 0 013-3z" /></svg>
            </div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Категории</div>
            <div className="text-sm text-slate-500 mt-1">Управление категориями</div>
          </Link>
          <Link href="/admin/users" className="group p-3 bg-white rounded-xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="mb-1 flex justify-center text-[#9B1B1B] group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-3.13a4 4 0 100-8 4 4 0 000 8zm6 3.13a4 4 0 00-2.5-3.71M7 9.13a4 4 0 00-2.5 3.71" /></svg>
            </div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Пользователи</div>
            <div className="text-sm text-slate-500 mt-1">Сотрудники и админы</div>
          </Link>
          <Link href="/admin/archive" className="group p-3 bg-white rounded-xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="mb-1 flex justify-center text-[#9B1B1B] group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            </div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Архив</div>
            <div className="text-sm text-slate-500 mt-1">Архивные записи</div>
          </Link>
          <Link href="/admin/requests" className="group p-3 bg-white rounded-xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="mb-1 flex justify-center text-[#9B1B1B] group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Запросы новинок</div>
            <div className="text-sm text-slate-500 mt-1">Заявки от сотрудников</div>
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-[#9B1B1B] to-[#7A1515] rounded-xl flex items-center justify-center text-white">
              {editId ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{editId ? 'Редактировать новинку' : 'Добавить новинку'}</h2>
          </div>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <input type="text" placeholder="Название" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" required />
              <input type="text" placeholder="Бренд" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" required />
              <input type="text" placeholder="Артикул" value={form.article_number} onChange={(e) => setForm({...form, article_number: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <input type="number" min="0" step="0.01" placeholder="Цена (руб.)" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" />
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition bg-white">
                <option value="">Категория...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <select value={form.year} onChange={(e) => setForm({...form, year: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition bg-white">
                <option value="">Год...</option>
                {years.map((year) => (
                  <option key={year.id} value={year.name}>{year.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition w-fit">
              <input
                type="checkbox"
                checked={form.is_supplier_novelty}
                onChange={(e) => setForm({ ...form, is_supplier_novelty: e.target.checked })}
                className="w-4 h-4 accent-[#9B1B1B]"
              />
              <span className="text-sm font-medium text-slate-700">Это новинка поставщика</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition w-fit">
                <input
                  type="checkbox"
                  checked={form.is_dishwasher_safe}
                  onChange={(e) => setForm({ ...form, is_dishwasher_safe: e.target.checked })}
                  className="w-4 h-4 accent-[#9B1B1B]"
                />
                <span className="text-sm font-medium text-slate-700">Можно мыть в посудомоечной машине</span>
              </label>
              <label className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition w-fit">
                <input
                  type="checkbox"
                  checked={form.is_microwave_safe}
                  onChange={(e) => setForm({ ...form, is_microwave_safe: e.target.checked })}
                  className="w-4 h-4 accent-[#9B1B1B]"
                />
                <span className="text-sm font-medium text-slate-700">Можно использовать в микроволновой печи</span>
              </label>
            </div>
            {isTemperatureCategory(form.category) && (
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Температура от, °C"
                  value={form.temp_min}
                  onChange={(e) => setForm({ ...form, temp_min: e.target.value })}
                  className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Температура до, °C"
                  value={form.temp_max}
                  onChange={(e) => setForm({ ...form, temp_max: e.target.value })}
                  className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
                />
              </div>
            )}
            <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" rows={2} required />
            <textarea placeholder="Преимущества" value={form.advantages} onChange={(e) => setForm({...form, advantages: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" rows={2} required />
            <textarea placeholder="На что обратить внимание" value={form.attention_points} onChange={(e) => setForm({...form, attention_points: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" rows={2} required />
            <input type="text" placeholder="Ссылка на товар на сайте" value={form.website_link} onChange={(e) => setForm({...form, website_link: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" />
            <div className="space-y-2">
              {(existingImages.length > 0 || newImages.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {existingImages.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      <Image src={url} alt={`Фото ${idx + 1}`} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => setExistingImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5 shadow hover:bg-white"
                      >
                        <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  {newImages.map((file, idx) => (
                    <div key={`new-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      <Image src={URL.createObjectURL(file)} alt={file.name} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5 shadow hover:bg-white"
                      >
                        <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setNewImages((prev) => [...prev, ...Array.from(e.target.files || [])])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="text-center">
                    <svg className="w-6 h-6 mx-auto mb-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <div className="text-sm text-slate-600">Добавить фото (можно несколько)</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFlyer(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="flyer-upload"
              />
              <label
                htmlFor="flyer-upload"
                className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <div className="text-sm text-slate-600">
                    {flyer ? flyer.name : 'Добавить листовку (PDF)'}
                  </div>
                </div>
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitLoading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9B1B1B] to-[#7A1515] text-white rounded-xl hover:from-[#7A1515] hover:to-[#9B1B1B] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitLoading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : editId ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                )}
                {submitLoading ? 'Сохранение...' : editId ? 'Обновить' : 'Добавить'}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all duration-200 border border-slate-300 hover:border-slate-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              Управление новинками
            </h3>
          </div>
          <div className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Поиск по названию, бренду или артикулу"
                className="w-full min-w-0 flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] sm:min-w-[260px]"
              />
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'archived')}
                  className="appearance-none pl-4 pr-9 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]"
                >
                  <option value="all">Все статусы</option>
                  <option value="active">Только активные</option>
                  <option value="archived">Только архив</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              {(tableSearch || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setTableSearch('')
                    setStatusFilter('all')
                  }}
                  className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200"
                >
                  Сбросить
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Показано {filteredProducts.length} из {products.length}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Активные: {activeCount}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                Архив: {archivedCount}
              </span>
            </div>
            {filteredProducts.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-[#9B1B1B]"
                  />
                  Выбрать все
                </label>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={handleBulkPublish}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Опубликовать выбранное ({selectedIds.size})
                    </button>
                    <button
                      onClick={handleBulkArchive}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      Архивировать выбранное ({selectedIds.size})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Mobile card list — visible below md */}
          <div className="xl:hidden divide-y divide-slate-100">
            {filteredProducts.map((product) => (
              <div key={product.id} className={`p-4 ${product.is_archived ? 'opacity-60 bg-slate-50' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2 pr-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelected(product.id)}
                      className="mt-1 w-4 h-4 shrink-0 accent-[#9B1B1B]"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{product.name}</div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {product.brand}{product.article_number ? ` · ${product.article_number}` : ''}
                      </div>
                      {(product.created_by || product.updated_by) && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {product.created_by && <>Добавил: {product.created_by}</>}
                          {product.updated_by && product.updated_by !== product.created_by && <> · Изменил: {product.updated_by}</>}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    product.is_archived ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {product.is_archived ? 'Архив' : 'Активный'}
                  </span>
                </div>
                {(product.website_link || product.flyer_url) && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {product.flyer_url && (
                      <a href={product.flyer_url} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); openFileInNewTab(product.flyer_url!) }} className="inline-flex items-center gap-1 text-[#9B1B1B] text-sm">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Листовка
                      </a>
                    )}
                    {product.website_link && (
                      <a href={product.website_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 text-sm">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z" /></svg>
                        Сайт
                      </a>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <button onClick={() => handleEdit(product)} className="flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs font-medium leading-tight text-blue-700 bg-blue-50 border border-blue-200 rounded-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Изменить
                  </button>
                  <button onClick={() => handleDuplicate(product)} className="flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs font-medium leading-tight text-violet-700 bg-violet-50 border border-violet-200 rounded-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Копия
                  </button>
                  <button onClick={() => handleArchive(product.id, product.is_archived || false)} className={`flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs leading-tight font-medium rounded-md border ${
                    product.is_archived
                      ? 'text-green-700 bg-green-50 border-green-200'
                      : 'text-slate-700 bg-slate-100 border-slate-200'
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    {product.is_archived ? 'Разархив.' : 'Архив'}
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs font-medium leading-tight text-red-700 bg-red-50 border border-red-200 rounded-md">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="px-6 py-10 text-center text-slate-500">
                По текущим фильтрам товары не найдены
              </div>
            )}
          </div>

          {/* Desktop table — hidden below md */}
          <div className="hidden xl:block overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-[3%] px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-[#9B1B1B]"
                    />
                  </th>
                  <th className="w-[22%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Название</th>
                  <th className="w-[13%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Бренд</th>
                  <th className="w-[13%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Артикул</th>
                  <th className="w-[13%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Ссылки</th>
                  <th className="w-[12%] px-4 py-4 text-left text-sm font-semibold text-slate-700">Статус</th>
                  <th className="w-[24%] px-4 py-4 text-right text-sm font-semibold text-slate-700">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={`hover:bg-slate-50 transition ${product.is_archived ? 'opacity-60 bg-slate-50' : ''}`}>
                    <td className="px-4 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelected(product.id)}
                        className="w-4 h-4 accent-[#9B1B1B]"
                      />
                    </td>
                    <td className="break-words px-4 py-4 align-top font-medium text-slate-900">
                      {product.name}
                      {(product.created_by || product.updated_by) && (
                        <div className="text-xs font-normal text-slate-400 mt-0.5">
                          {product.created_by && <>Добавил: {product.created_by}</>}
                          {product.updated_by && product.updated_by !== product.created_by && <> · Изменил: {product.updated_by}</>}
                        </div>
                      )}
                    </td>
                    <td className="break-words px-4 py-4 align-top text-slate-600">{product.brand}</td>
                    <td className="break-words px-4 py-4 align-top text-sm text-slate-500">{product.article_number || '—'}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1 break-words">
                        {product.flyer_url && (
                          <a href={product.flyer_url} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); openFileInNewTab(product.flyer_url!) }} className="text-[#9B1B1B] hover:text-[#7A1515] text-sm flex items-center gap-1 break-all">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Листовка
                          </a>
                        )}
                        {product.website_link && (
                          <a href={product.website_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 break-all">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z" /></svg>
                            Сайт
                          </a>
                        )}
                        {!product.website_link && !product.flyer_url && (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.is_archived
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.is_archived ? 'Архив' : 'Активный'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right align-top">
                      <div className="ml-auto grid max-w-[13rem] grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleEdit(product)}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Изменить
                        </button>
                        <button
                          onClick={() => handleDuplicate(product)}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-md hover:bg-violet-100 hover:border-violet-300 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Копия
                        </button>
                        <button
                          onClick={() => handleArchive(product.id, product.is_archived || false)}
                          className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs font-medium rounded-md border transition ${
                            product.is_archived
                              ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                              : 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                          {product.is_archived ? 'Разархив.' : 'Архив'}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                      По текущим фильтрам товары не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
