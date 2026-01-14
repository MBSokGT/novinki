'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

export default function ArchivePage() {
  const [archived, setArchived] = useState<any[]>([])

  useEffect(() => {
    fetchArchived()
  }, [])

  const fetchArchived = async () => {
    const { data } = await supabase.from('archived_products').select('*').order('deleted_at', { ascending: false })
    setArchived(data || [])
  }

  const restore = async (product: any) => {
    if (confirm('Восстановить эту новинку?')) {
      await supabase.from('products').insert({
        name: product.name,
        brand: product.brand,
        description: product.description,
        image_url: product.image_url,
        advantages: product.advantages,
        attention_points: product.attention_points,
        category_id: product.category_id
      })
      await supabase.from('archived_products').delete().eq('id', product.id)
      fetchArchived()
    }
  }

  const permanentDelete = async (id: string) => {
    if (confirm('Удалить навсегда? Это действие нельзя отменить!')) {
      await supabase.from('archived_products').delete().eq('id', id)
      fetchArchived()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
            <h1 className="text-2xl font-bold text-red-900">🗄️ Архив</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Название</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Бренд</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Удалено</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {archived.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{product.name}</td>
                  <td className="px-6 py-4">{product.brand}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(product.deleted_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => restore(product)} className="text-green-600 hover:text-green-700 font-medium">
                      Восстановить
                    </button>
                    <button onClick={() => permanentDelete(product.id)} className="text-red-600 hover:text-red-700 font-medium">
                      Удалить навсегда
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {archived.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              Архив пуст
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
