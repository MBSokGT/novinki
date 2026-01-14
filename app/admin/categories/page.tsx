'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: cats } = await supabase.from('categories').select('*')
    const { data: tgs } = await supabase.from('tags').select('*')
    setCategories(cats || [])
    setTags(tgs || [])
  }

  const addCategory = async () => {
    if (!newCategory.trim()) return
    await supabase.from('categories').insert({ name: newCategory })
    setNewCategory('')
    fetchData()
  }

  const addTag = async () => {
    if (!newTag.trim()) return
    await supabase.from('tags').insert({ name: newTag })
    setNewTag('')
    fetchData()
  }

  const deleteCategory = async (id: string) => {
    if (confirm('Удалить категорию?')) {
      await supabase.from('categories').delete().eq('id', id)
      fetchData()
    }
  }

  const deleteTag = async (id: string) => {
    if (confirm('Удалить тег?')) {
      await supabase.from('tags').delete().eq('id', id)
      fetchData()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
            <h1 className="text-2xl font-bold text-red-900">🏷️ Категории и теги</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Категории */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">📁 Категории</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Новая категория"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button onClick={addCategory} className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900">
                Добавить
              </button>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium">{cat.name}</span>
                  <button onClick={() => deleteCategory(cat.id)} className="text-red-600 hover:text-red-700">
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Теги */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">🏷️ Теги</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Новый тег"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button onClick={addTag} className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900">
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
