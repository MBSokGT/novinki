'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/Toast'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [years, setYears] = useState<any[]>([])
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>({})
  const [yearUsage, setYearUsage] = useState<Record<string, number>>({})
  const [newCategory, setNewCategory] = useState('')
  const [newYear, setNewYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await apiClient.auth.getUser()

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
    await fetchData()
    setLoading(false)
  }

  const fetchData = async () => {
    const { data: cats } = await apiClient.from('categories').select('*')
    const { data: yrs } = await apiClient.from('years').select('*')
    const { data: products } = await apiClient.from('products').select('category, year')
    setCategories(cats || [])
    setYears((yrs || []).slice().sort((a: any, b: any) => a.name.localeCompare(b.name)))

    const catUsage: Record<string, number> = {}
    const yrUsage: Record<string, number> = {}
    ;(products || []).forEach((p: any) => {
      if (p.category) catUsage[p.category] = (catUsage[p.category] || 0) + 1
      if (p.year) yrUsage[p.year] = (yrUsage[p.year] || 0) + 1
    })
    setCategoryUsage(catUsage)
    setYearUsage(yrUsage)
  }

  const addCategory = async () => {
    const name = newCategory.trim()
    if (!name) return
    if (categories.some((cat) => cat.name.trim().toLowerCase() === name.toLowerCase())) {
      alert('Такая категория уже существует')
      return
    }
    const { error } = await apiClient.from('categories').insert({ name })
    if (error) {
      showToast(`Ошибка добавления категории: ${error.message}`, 'error')
      return
    }
    setNewCategory('')
    showToast(`Категория «${name}» добавлена`, 'success')
    fetchData()
  }

  const addYear = async () => {
    const name = newYear.trim()
    if (!name) return
    if (years.some((year) => year.name.trim().toLowerCase() === name.toLowerCase())) {
      alert('Такой год уже добавлен')
      return
    }
    const { error } = await apiClient.from('years').insert({ name })
    if (error) {
      showToast(`Ошибка добавления года: ${error.message}`, 'error')
      return
    }
    setNewYear('')
    showToast(`Год «${name}» добавлен`, 'success')
    fetchData()
  }

  const deleteCategory = async (id: string, name: string) => {
    const inUse = categoryUsage[name] || 0
    const warning = inUse > 0
      ? `Категория "${name}" используется в ${inUse} товар(ах). Они не потеряют категорию, но она пропадёт из списка для выбора. Удалить?`
      : 'Удалить категорию?'
    if (!confirm(warning)) return
    const { error } = await apiClient.from('categories').delete().eq('id', id)
    if (error) {
      showToast(`Ошибка удаления категории: ${error.message}`, 'error')
      return
    }
    fetchData()
  }

  const deleteYear = async (id: string, name: string) => {
    const inUse = yearUsage[name] || 0
    const warning = inUse > 0
      ? `Год "${name}" используется в ${inUse} товар(ах). Они не потеряют год, но он пропадёт из списка для выбора. Удалить?`
      : 'Удалить год?'
    if (!confirm(warning)) return
    const { error } = await apiClient.from('years').delete().eq('id', id)
    if (error) {
      showToast(`Ошибка удаления года: ${error.message}`, 'error')
      return
    }
    fetchData()
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
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Категории и годы</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Категории */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Категории</h2>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Новая категория"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button onClick={addCategory} className="px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] sm:w-auto">
                Добавить
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium">
                    {cat.name}
                    {categoryUsage[cat.name] > 0 && (
                      <span className="ml-2 text-xs font-normal text-slate-400">{categoryUsage[cat.name]} тов.</span>
                    )}
                  </span>
                  <button onClick={() => deleteCategory(cat.id, cat.name)} className="text-slate-600 hover:text-slate-700">
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Годы */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Годы</h2>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Новый год, например 2028"
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button onClick={addYear} className="px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] sm:w-auto">
                Добавить
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <div key={year.id} className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full">
                  <span>
                    {year.name}
                    {yearUsage[year.name] > 0 && (
                      <span className="ml-1 text-xs text-amber-700/70">({yearUsage[year.name]})</span>
                    )}
                  </span>
                  <button onClick={() => deleteYear(year.id, year.name)} className="text-amber-700 hover:text-amber-900">
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
