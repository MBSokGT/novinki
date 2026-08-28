'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { openFileInNewTab } from '@/lib/openFile'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { showToast } from '@/components/Toast'
import VendorsExcelImport from '@/components/VendorsExcelImport'
import ExportCatalogButton from '@/components/ExportCatalogButton'
import { normalizeLink } from '@/lib/url'
import { Vendor } from '@/types/vendor'

const EMPTY_FORM = {
  name: '',
  product: '',
  website_link: '',
  max_discount: '',
  delivery_time: '',
  onec_products: '',
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingPhoto, setExistingPhoto] = useState('')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [existingFiles, setExistingFiles] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLFormElement>(null)

  const filteredVendors = (() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter((v) => v.name.toLowerCase().includes(q) || (v.product || '').toLowerCase().includes(q))
  })()

  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    // Подставленный программно текст (например, при открытии карточки на
    // редактирование, или очистка формы после сохранения) не проходит через
    // onInput — пересчитываем высоту сами. Раньше это было завязано только
    // на editId, а при добавлении нового вендора (не редактировании) editId
    // как был null, так и остаётся null после сброса формы — эффект не
    // перезапускался, и поле оставалось растянутым даже после очистки.
    if (!formRef.current) return
    formRef.current.querySelectorAll('textarea').forEach((el) => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    })
  }, [editId, form.product, form.onec_products])

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
    await fetchVendors()
    setLoading(false)
  }

  const fetchVendors = async () => {
    const { data } = await apiClient.from('vendors').select('*').order('name', { ascending: true })
    if (data) setVendors(data as Vendor[])
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setExistingPhoto('')
    setNewPhoto(null)
    setExistingFiles([])
    setNewFiles([])
    setEditId(null)
  }

  const handleEdit = (vendor: Vendor) => {
    setForm({
      name: vendor.name,
      product: vendor.product || '',
      website_link: vendor.website_link || '',
      max_discount: vendor.max_discount || '',
      delivery_time: vendor.delivery_time || '',
      onec_products: vendor.onec_products || '',
    })
    setExistingPhoto(vendor.image_url || '')
    setNewPhoto(null)
    setExistingFiles(vendor.files || [])
    setNewFiles([])
    setEditId(vendor.id)
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Открытие формы на редактирование по ссылке ?edit=<id> — так на неё ведёт
  // кнопка-карандаш в карточке вендора на главной странице.
  useEffect(() => {
    const editRequestId = searchParams.get('edit')
    if (!editRequestId || vendors.length === 0) return
    const vendor = vendors.find((v) => v.id === editRequestId)
    if (vendor) handleEdit(vendor)
    router.replace('/admin/vendors')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendors, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLoading) return
    setSubmitLoading(true)

    try {
      let imageUrl = existingPhoto
      if (newPhoto) {
        const fileName = `${Date.now()}_${newPhoto.name}`
        const { data, error } = await apiClient.storage.from('vendors').upload(fileName, newPhoto)
        if (error) throw error
        imageUrl = data?.path || ''
      }

      const uploadedFiles: string[] = []
      for (const file of newFiles) {
        const fileName = `${Date.now()}_${file.name}`
        const { data, error } = await apiClient.storage.from('vendors').upload(fileName, file)
        if (error) throw error
        if (data) uploadedFiles.push(data.path)
      }

      const payload = {
        name: form.name,
        product: form.product,
        website_link: normalizeLink(form.website_link),
        max_discount: form.max_discount,
        delivery_time: form.delivery_time,
        onec_products: form.onec_products,
        image_url: imageUrl,
        files: [...existingFiles, ...uploadedFiles],
      }

      if (editId) {
        const { error } = await apiClient.from('vendors').update(payload).eq('id', editId).select()
        if (error) throw error
        showToast('Вендор обновлён', 'success')
      } else {
        const { error } = await apiClient.from('vendors').insert([payload]).select()
        if (error) throw error
        showToast('Вендор добавлен', 'success')
      }

      resetForm()
      await fetchVendors()
    } catch (error: any) {
      console.error('Vendor save error:', error)
      showToast(error?.message || 'Ошибка при сохранении вендора', 'error')
    } finally {
      setSubmitLoading(false)
    }
  }

  const moveVendorToTrash = async (vendor: Vendor) => {
    const { error: insertError } = await apiClient.from('deleted_vendors').insert({
      original_vendor_id: vendor.id,
      name: vendor.name,
      image_url: vendor.image_url,
      product: vendor.product,
      website_link: vendor.website_link,
      max_discount: vendor.max_discount,
      delivery_time: vendor.delivery_time,
      onec_products: vendor.onec_products,
      files: vendor.files || [],
      created_at: vendor.created_at,
      deleted_at: new Date().toISOString(),
    })
    if (insertError) throw insertError
    const { error: deleteError } = await apiClient.from('vendors').delete().eq('id', vendor.id)
    if (deleteError) throw deleteError
  }

  const handleDelete = async (id: string) => {
    const vendor = vendors.find((v) => v.id === id)
    if (!vendor) return
    if (!confirm(`Переместить вендора «${vendor.name}» в корзину? (автоочистка через 14 дней)`)) return
    try {
      await moveVendorToTrash(vendor)
      setVendors((prev) => prev.filter((v) => v.id !== id))
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      if (editId === id) resetForm()
      showToast('Вендор перемещён в корзину', 'success')
    } catch (error: any) {
      showToast(error?.message || 'Ошибка при удалении вендора', 'error')
    }
  }

  const handleDuplicateVendor = async (vendor: Vendor) => {
    try {
      const payload = {
        name: `${vendor.name} (копия)`,
        product: vendor.product || '',
        website_link: normalizeLink(vendor.website_link),
        max_discount: vendor.max_discount || '',
        delivery_time: vendor.delivery_time || '',
        onec_products: vendor.onec_products || '',
        image_url: vendor.image_url || '',
        files: vendor.files || [],
      }
      const { data, error } = await apiClient.from('vendors').insert([payload]).select()
      if (error) throw error
      if (data?.[0]) {
        setVendors((prev) => [...prev, data[0] as Vendor].sort((a, b) => a.name.localeCompare(b.name)))
      } else {
        await fetchVendors()
      }
      showToast('Копия вендора создана', 'success')
    } catch (error: any) {
      showToast(error?.message || 'Ошибка при копировании вендора', 'error')
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
      prev.size === filteredVendors.length ? new Set() : new Set(filteredVendors.map((v) => v.id))
    )
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Переместить выбранных вендоров (${selectedIds.size}) в корзину?`)) return
    const toDelete = vendors.filter((v) => selectedIds.has(v.id))
    const succeededIds = new Set<string>()
    let failedCount = 0
    for (const vendor of toDelete) {
      try {
        await moveVendorToTrash(vendor)
        succeededIds.add(vendor.id)
      } catch (error) {
        console.error('Bulk delete failed for vendor', vendor.id, error)
        failedCount++
      }
    }
    setVendors((prev) => prev.filter((v) => !succeededIds.has(v.id)))
    if (editId && succeededIds.has(editId)) resetForm()
    // Оставляем неудачные id отмеченными, чтобы админ мог сразу повторить попытку.
    setSelectedIds((prev) => {
      const next = new Set(prev)
      succeededIds.forEach((id) => next.delete(id))
      return next
    })
    if (failedCount === 0) showToast(`Перемещено в корзину: ${succeededIds.size}`, 'success')
    else if (succeededIds.size === 0) showToast(`Не удалось удалить ни одного вендора (${failedCount})`, 'error')
    else showToast(`Перемещено: ${succeededIds.size}, не удалось: ${failedCount}`, 'error')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/logo.png'} alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Вендоры</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <VendorsExcelImport onSuccess={fetchVendors} />
            <ExportCatalogButton variant="toolbar" />
            <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition w-fit">
              Назад
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#9B1B1B] rounded-lg flex items-center justify-center text-white">
              {editId ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">{editId ? 'Редактировать вендора' : 'Добавить вендора'}</h2>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Название <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Например: ILSA" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Описание <span className="text-slate-400 font-normal">— что поставляет вендор</span></label>
                <textarea placeholder="Например: профессиональный инвентарь для бара и кухни" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} onInput={autoResize} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" style={{ resize: 'none', overflow: 'hidden', minHeight: '48px' }} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ссылка на сайт</label>
                <input type="text" placeholder="https://..." value={form.website_link} onChange={(e) => setForm({ ...form, website_link: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Максимальная скидка</label>
                <input type="text" placeholder="Например: 15%" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Срок поставки</label>
                <input type="text" placeholder="Например: 2-3 недели" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Товары в 1С <span className="text-slate-400 font-normal">— какие позиции этого вендора есть в 1С, чтобы сотрудник знал, что искать при заказе</span></label>
              <textarea placeholder="Например: артикулы или названия позиций, как они значатся в 1С" value={form.onec_products} onChange={(e) => setForm({ ...form, onec_products: e.target.value })} onInput={autoResize} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition" style={{ resize: 'none', overflow: 'hidden', minHeight: '70px' }} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Фото</label>
                {(existingPhoto || newPhoto) && (
                  <div className="relative w-20 h-20 mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <Image src={newPhoto ? URL.createObjectURL(newPhoto) : existingPhoto} alt="Фото вендора" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => { setExistingPhoto(''); setNewPhoto(null) }}
                      className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5 shadow hover:bg-white"
                    >
                      <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewPhoto(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="vendor-photo-upload"
                  />
                  <label htmlFor="vendor-photo-upload" className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="text-sm text-slate-600">{newPhoto ? newPhoto.name : 'Загрузить фото'}</div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Файлы <span className="text-slate-400 font-normal">— каталоги, прайс, буклеты</span></label>
                {(existingFiles.length > 0 || newFiles.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {existingFiles.map((url, idx) => (
                      <span key={`ef-${idx}`} className="inline-flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1">
                        <button type="button" onClick={() => openFileInNewTab(url)} className="hover:text-[#9B1B1B] underline-offset-2 hover:underline">
                          {url.split('/').pop()?.slice(-20)}
                        </button>
                        <button type="button" onClick={() => setExistingFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-slate-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                    {newFiles.map((file, idx) => (
                      <span key={`nf-${idx}`} className="inline-flex items-center gap-1 text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1">
                        {file.name}
                        <button type="button" onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-slate-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,.xls,.xlsx,.doc,.docx,.ppt,.pptx"
                    onChange={(e) => setNewFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="vendor-files-upload"
                  />
                  <label htmlFor="vendor-files-upload" className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="text-sm text-slate-600">Добавить файлы (можно несколько)</div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitLoading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
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
                <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition border border-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex flex-col gap-3 bg-slate-50 px-6 py-4 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {filteredVendors.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredVendors.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[#9B1B1B]"
                  title="Выбрать всех"
                />
              )}
              <h3 className="text-lg font-semibold text-slate-800">
                {searchQuery.trim() ? `Найдено: ${filteredVendors.length} из ${vendors.length}` : `Все вендоры (${vendors.length})`}
              </h3>
            </div>
            <div className="flex flex-1 items-center gap-2 sm:justify-end">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs font-medium text-slate-500 shrink-0">Выбрано: {selectedIds.size}</span>
                  <button onClick={handleBulkDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Удалить выбранное
                  </button>
                </>
              )}
              <div className="relative w-full max-w-xs sm:w-56">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по названию..."
                  className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
                />
              </div>
            </div>
          </div>
          {vendors.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Вендоров пока нет</div>
          ) : filteredVendors.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Ничего не найдено по запросу «{searchQuery}»</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(vendor.id)}
                      onChange={() => toggleSelected(vendor.id)}
                      className="w-4 h-4 shrink-0 accent-[#9B1B1B]"
                    />
                    <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                      <Image src={vendor.image_url || (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/placeholder.svg'} alt={vendor.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{vendor.name}</div>
                      <div className="text-sm text-slate-500 truncate">{vendor.product}</div>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-400">
                        {vendor.max_discount && <span>Скидка до {vendor.max_discount}</span>}
                        {vendor.delivery_time && <span>· Поставка: {vendor.delivery_time}</span>}
                        {vendor.files && vendor.files.length > 0 && <span>· Файлов: {vendor.files.length}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <button onClick={() => handleEdit(vendor)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Изменить
                    </button>
                    <button onClick={() => handleDuplicateVendor(vendor)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Копировать
                    </button>
                    <button onClick={() => handleDelete(vendor.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
