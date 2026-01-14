'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Product } from '@/types/product'
import Image from 'next/image'

export default function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) setProducts(data)
    setLoading(false)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-center py-8">Загрузка...</div>

  return (
    <div>
      <input
        type="text"
        placeholder="Поиск по названию, бренду или описанию..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 border rounded-lg mb-6"
      />
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Фото</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Название</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Бренд</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Описание</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Преимущества</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">На что обратить внимание</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Image src={product.image_url} alt={product.name} width={80} height={80} className="rounded" />
                </td>
                <td className="px-6 py-4 font-medium">{product.name}</td>
                <td className="px-6 py-4">{product.brand}</td>
                <td className="px-6 py-4 text-sm">{product.description}</td>
                <td className="px-6 py-4 text-sm">{product.advantages}</td>
                <td className="px-6 py-4 text-sm">{product.attention_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">Ничего не найдено</div>
        )}
      </div>
    </div>
  )
}
