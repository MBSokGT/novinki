'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newTag, setNewTag] = useState('')
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
    const { data: tgs } = await apiClient.from('tags').select('*')
    setCategories(cats || [])
    setTags(tgs || [])
  }

  const addCategory = async () => {
    if (!newCategory.trim()) return
    await apiClient.from('categories').insert({ name: newCategory })
    setNewCategory('')
    fetchData()
  }

  const addTag = async () => {
    if (!newTag.trim()) return
    await apiClient.from('tags').insert({ name: newTag })
    setNewTag('')
    fetchData()
  }

  const deleteCategory = async (id: string) => {
    if (confirm('Удалить категорию?')) {
      await apiClient.from('categories').delete().eq('id', id)
      fetchData()
    }
  }

  const deleteTag = async (id: string) => {
    if (confirm('Удалить тег?')) {
      await apiClient.from('tags').delete().eq('id', id)
      fetchData()
    }
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
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">🏷️ Категории и теги</h1>
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
            <h2 className="text-xl font-bold mb-4">📁 Категории</h2>
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
                  <span className="font-medium">{cat.name}</span>
                  <button onClick={() => deleteCategory(cat.id)} className="text-slate-600 hover:text-slate-700">
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Теги */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">🏷️ Теги</h2>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Новый тег"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button onClick={addTag} className="px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] sm:w-auto">
                Добавить
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div key={tag.id} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-full">
                  <span>{tag.name}</span>
                  <button onClick={() => deleteTag(tag.id)} className="text-blue-600 hover:text-blue-800">
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
