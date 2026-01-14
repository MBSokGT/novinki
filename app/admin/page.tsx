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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">Вход в админ панель</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded"
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">
              Войти
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Админ панель</h1>
          <div className="flex gap-4">
            <Link href="/" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
              На главную
            </Link>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Выйти
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">{editId ? 'Редактировать' : 'Добавить новинку'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Название" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full p-2 border rounded" required />
            <input type="text" placeholder="Бренд" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} className="w-full p-2 border rounded" required />
            <textarea placeholder="Описание" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full p-2 border rounded" rows={3} required />
            <textarea placeholder="Преимущества" value={form.advantages} onChange={(e) => setForm({...form, advantages: e.target.value})} className="w-full p-2 border rounded" rows={3} required />
            <textarea placeholder="На что обратить внимание" value={form.attention_points} onChange={(e) => setForm({...form, attention_points: e.target.value})} className="w-full p-2 border rounded" rows={3} required />
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="w-full p-2 border rounded" />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
              {editId ? 'Обновить' : 'Добавить'}
            </button>
            {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', brand: '', description: '', advantages: '', attention_points: '' }) }} className="ml-2 bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700">Отмена</button>}
          </form>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Бренд</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4">{product.name}</td>
                  <td className="px-6 py-4">{product.brand}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleEdit(product)} className="text-blue-600 hover:underline mr-4">Редактировать</button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:underline">Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
