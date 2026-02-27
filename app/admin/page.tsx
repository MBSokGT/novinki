'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
  onec_link: '',
  price: '',
  category: '',
}

const ADMIN_DRAFT_KEY = 'novinki:adminFormDraft'

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [image, setImage] = useState<File | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [tableSearch, setTableSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null) // null = загрузка, false = не админ, true = админ
  const router = useRouter()

  useEffect(() => {
    checkAuth()
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

    const hasData = Object.values(form).some((value) => value.trim() !== '')
    if (hasData) {
      window.localStorage.setItem(ADMIN_DRAFT_KEY, JSON.stringify(form))
    } else {
      window.localStorage.removeItem(ADMIN_DRAFT_KEY)
    }
  }, [form, editId])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    
    try {
      // Используем RPC функцию для проверки прав админа
      const { data: adminCheck, error: rpcError } = await supabase.rpc('check_admin_status', { user_id: user.id })
      console.log('Admin check result:', { adminCheck, rpcError, userId: user.id })
      
      if (adminCheck === true) {
        setIsAdmin(true)
        fetchProducts()
      } else {
        setIsAdmin(false)
        setTimeout(() => router.push('/'), 500)
      }
      
    } catch (err) {
      console.error('Auth check error:', err)
      setIsAdmin(false)
      setTimeout(() => router.push('/'), 500)
    }
  }

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProducts(data)
  }

  const normalizeLink = (link?: string) => {
    const trimmed = (link || '').trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setImage(null)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLoading) return
    setSubmitLoading(true)

    try {
      let imageUrl = ''

      if (image) {
        const fileName = `${Date.now()}_${image.name}`
        const { data, error: uploadError } = await supabase.storage.from('products').upload(fileName, image)
        if (uploadError) {
          throw uploadError
        }
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)
          imageUrl = publicUrl
        }
      }

      const productData = {
        name: form.name,
        brand: form.brand,
        article_number: form.article_number,
        description: form.description,
        advantages: form.advantages,
        attention_points: form.attention_points,
        website_link: normalizeLink(form.website_link),
        onec_link: normalizeLink(form.onec_link),
        category: form.category,
        price: form.price ? parseFloat(form.price) : null,
        image_url: imageUrl || (editId ? products.find(p => p.id === editId)?.image_url : ''),
      }

      if (editId) {
        const { error } = await supabase.from('products').update(productData).eq('id', editId)
        if (error) throw error
        showToast('Товар обновлён', 'success')
      } else {
        const { error } = await supabase.from('products').insert([productData])
        if (error) throw error
        showToast('Товар добавлен', 'success')
      }

      resetForm()
      await fetchProducts()
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
      onec_link: product.onec_link || '',
      price: product.price != null ? String(product.price) : '',
      category: (product as any).category || '',
    })
    setImage(null)
    setEditId(product.id)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_DRAFT_KEY)
    }
  }

  const handleDuplicate = async (product: Product) => {
    try {
      const payload = {
        name: `${product.name} (копия)`,
        brand: product.brand,
        article_number: '',
        description: product.description,
        image_url: product.image_url,
        advantages: product.advantages,
        attention_points: product.attention_points,
        website_link: product.website_link || '',
        onec_link: product.onec_link || '',
        is_archived: false,
      }

      const { error } = await supabase.from('products').insert([payload])
      if (error) throw error

      await fetchProducts()
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
          const { error: insertError } = await supabase.from('deleted_products').insert({
            original_product_id: product.id,
            name: product.name,
            brand: product.brand,
            article_number: product.article_number,
            description: product.description,
            image_url: product.image_url,
            advantages: product.advantages,
            attention_points: product.attention_points,
            website_link: product.website_link,
            onec_link: product.onec_link,
            deleted_at: new Date().toISOString(),
          })
          
          if (insertError) {
            console.error('Error inserting to deleted_products:', insertError)
            showToast('Ошибка перемещения в корзину', 'error')
            return
          }

          // Удаляем из основной таблицы
          const { error: deleteError } = await supabase.from('products').delete().eq('id', id)

          if (deleteError) {
            console.error('Error deleting from products:', deleteError)
            showToast('Ошибка удаления товара', 'error')
            return
          }
          
          console.log('Product moved to trash successfully')
          fetchProducts()
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
        const { data, error } = await supabase
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
        fetchProducts()
      } catch (error) {
        console.error('Archive operation failed:', error)
        showToast('Ошибка операции архивирования', 'error')
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Админ панель</h1>
          </div>
          <div className="flex gap-3">
            <ExcelImport onSuccess={fetchProducts} />
            <Link href="/admin/trash" className="px-4 py-2 bg-[#8B1538] text-white rounded-lg hover:bg-[#6B0F2A] transition">
              🗑️ Корзина
            </Link>
            <Link href="/admin/users" className="px-4 py-2 bg-[#8B1538] text-white rounded-lg hover:bg-[#6B0F2A] transition">
              👥 Пользователи
            </Link>
            <Link href="/" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
              На главную
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition">
              Выйти
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Меню функций */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link href="/admin/analytics" className="group p-6 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">📊</div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Аналитика</div>
            <div className="text-sm text-slate-500 mt-1">Отчеты и статистика</div>
          </Link>
          <Link href="/admin/categories" className="group p-6 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">🏷️</div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Категории</div>
            <div className="text-sm text-slate-500 mt-1">Управление категориями</div>
          </Link>
          <Link href="/admin/settings" className="group p-6 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">⚙️</div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Настройки</div>
            <div className="text-sm text-slate-500 mt-1">Конфигурация системы</div>
          </Link>
          <Link href="/admin/archive" className="group p-6 bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl hover:border-slate-200 transition-all duration-300 text-center transform hover:-translate-y-1">
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">🗄️</div>
            <div className="font-bold text-slate-800 group-hover:text-slate-800 transition-colors">Архив</div>
            <div className="text-sm text-slate-500 mt-1">Архивные записи</div>
          </Link>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-[#8B1538] to-[#6B0F2A] rounded-xl flex items-center justify-center text-white text-xl">
              {editId ? '✏️' : '➕'}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{editId ? 'Редактировать новинку' : 'Добавить новинку'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <input type="text" placeholder="Название" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" required />
              <input type="text" placeholder="Бренд" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" required />
              <input type="text" placeholder="Артикул" value={form.article_number} onChange={(e) => setForm({...form, article_number: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <input type="number" min="0" step="0.01" placeholder="Цена (руб.)" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" />
              <input type="text" placeholder="Категория" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" />
            </div>
            <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" rows={3} required />
            <textarea placeholder="Преимущества" value={form.advantages} onChange={(e) => setForm({...form, advantages: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" rows={3} required />
            <textarea placeholder="На что обратить внимание" value={form.attention_points} onChange={(e) => setForm({...form, attention_points: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" rows={3} required />
            <input type="text" placeholder="Ссылка на товар на сайте" value={form.website_link} onChange={(e) => setForm({...form, website_link: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" />
            <input type="text" placeholder="Ссылка на товар в 1С" value={form.onec_link} onChange={(e) => setForm({...form, onec_link: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538] transition" />
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setImage(e.target.files?.[0] || null)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                id="file-upload"
              />
              <label 
                htmlFor="file-upload" 
                className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">📁</div>
                  <div className="text-sm text-slate-600">
                    {image ? image.name : 'Добавить фото'}
                  </div>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitLoading}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#8B1538] to-[#6B0F2A] text-white rounded-xl hover:from-[#6B0F2A] hover:to-[#8B1538] transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="mr-2">{submitLoading ? '⏳' : editId ? '✨' : '➕'}</span>
                {submitLoading ? 'Сохранение...' : editId ? 'Обновить' : 'Добавить'}
              </button>
              {editId && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="inline-flex items-center px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all duration-200 border border-slate-300 hover:border-slate-400"
                >
                  <span className="mr-2">❌</span>
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-xl">📋</span>
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
                className="flex-1 min-w-[260px] px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B1538]"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'archived')}
                className="px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B1538]"
              >
                <option value="all">Все статусы</option>
                <option value="active">Только активные</option>
                <option value="archived">Только архив</option>
              </select>
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
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Название</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Бренд</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Артикул</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ссылки</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Статус</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={`hover:bg-slate-50 transition ${product.is_archived ? 'opacity-60 bg-slate-50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                    <td className="px-6 py-4 text-slate-600">{product.brand}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{product.article_number || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {product.website_link && (
                          <a href={product.website_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                            🌐 Сайт
                          </a>
                        )}
                        {product.onec_link && (
                          <a href={product.onec_link} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1">
                            📊 1С
                          </a>
                        )}
                        {!product.website_link && !product.onec_link && (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.is_archived 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.is_archived ? '🗄️ Архив' : '✅ Активный'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(product)} 
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                          <span className="mr-1.5">✏️</span>
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDuplicate(product)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 hover:border-violet-300 hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                          <span className="mr-1.5">📄</span>
                          Копия
                        </button>
                        <button 
                          onClick={() => handleArchive(product.id, product.is_archived || false)} 
                          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md ${
                            product.is_archived
                              ? 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300'
                              : 'text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="mr-1.5">{product.is_archived ? '📄' : '🗄️'}</span>
                          {product.is_archived ? 'Разархивировать' : 'Архивировать'}
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)} 
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                          <span className="mr-1.5">🗑️</span>
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
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
