'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types/product'
import Link from 'next/link'

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({ name: '', brand: '', description: '', advantages: '', attention_points: '' })
  const [image, setImage] = useState<File | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    checkAuth()
    fetchProducts()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let imageUrl = ''

    if (image) {
      const fileName = `${Date.now()}_${image.name}`
      const { data } = await supabase.storage.from('products').upload(fileName, image)
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)
        imageUrl = publicUrl
      }
    }

    const productData = { ...form, image_url: imageUrl || (editId ? products.find(p => p.id === editId)?.image_url : '') }

    if (editId) {
      await supabase.from('products').update(productData).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('products').insert([productData])
    }

    setForm({ name: '', brand: '', description: '', advantages: '', attention_points: '' })
    setImage(null)
    fetchProducts()
  }

  const handleEdit = (product: Product) => {
    setForm({ name: product.name, brand: product.brand, description: product.description, advantages: product.advantages, attention_points: product.attention_points })
    setEditId(product.id)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Удалить этот товар?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts()
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) checkAuth()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">🔐 Вход в админ панель</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
              required
            />
            <button type="submit" className="w-full bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition font-medium">
              Войти
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-900">Админ панель</h1>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
              На главную
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
              Выйти
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-xl font-bold mb-6">{editId ? '✏️ Редактировать' : '➕ Добавить новинку'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input type="text" placeholder="Название" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition" required />
              <input type="text" placeholder="Бренд" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition" required />
            </div>
            <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition" rows={3} required />
            <textarea placeholder="Преимущества" value={form.advantages} onChange={(e) => setForm({...form, advantages: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition" rows={3} required />
            <textarea placeholder="На что обратить внимание" value={form.attention_points} onChange={(e) => setForm({...form, attention_points: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition" rows={3} required />
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition" />
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition font-medium">
                {editId ? 'Обновить' : 'Добавить'}
              </button>
              {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', brand: '', description: '', advantages: '', attention_points: '' }) }} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition">Отмена</button>}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Название</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Бренд</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                    <td className="px-6 py-4 text-slate-600">{product.brand}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(product)} className="text-red-800 hover:text-red-900 font-medium mr-4">Редактировать</button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-700 font-medium">Удалить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
