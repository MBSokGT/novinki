'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface DeletedProduct {
  id: string
  original_product_id: string
  name: string
  brand: string
  article_number?: string
  description: string
  image_url: string
  advantages: string
  attention_points: string
  website_link?: string
  onec_link?: string
  deleted_at: string
}

export default function TrashPage() {
  const [deletedProducts, setDeletedProducts] = useState<DeletedProduct[]>([])
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      if (profile?.is_admin === true) {
        setIsAdmin(true)
        fetchDeletedProducts()
      } else {
        setIsAdmin(false)
        setTimeout(() => router.push('/'), 500)
      }
    } catch (err) {
      setIsAdmin(false)
      setTimeout(() => router.push('/'), 500)
    }
  }

  const fetchDeletedProducts = async () => {
    const { data } = await supabase
      .from('deleted_products')
      .select('*')
      .order('deleted_at', { ascending: false })
    if (data) setDeletedProducts(data)
  }

  const handleRestore = async (deletedProduct: DeletedProduct) => {
    if (confirm('Восстановить этот товар?')) {
      await supabase.from('products').insert({
        name: deletedProduct.name,
        brand: deletedProduct.brand,
        article_number: deletedProduct.article_number,
        description: deletedProduct.description,
        image_url: deletedProduct.image_url,
        advantages: deletedProduct.advantages,
        attention_points: deletedProduct.attention_points,
        website_link: deletedProduct.website_link,
        onec_link: deletedProduct.onec_link,
        is_archived: false
      })
      
      await supabase.from('deleted_products').delete().eq('id', deletedProduct.id)
      fetchDeletedProducts()
    }
  }

  const handlePermanentDelete = async (id: string) => {
    if (confirm('ОКОНЧАТЕЛЬНО удалить товар? Это действие нельзя отменить!')) {
      await supabase.from('deleted_products').delete().eq('id', id)
      fetchDeletedProducts()
    }
  }

  const handleCleanup = async () => {
    if (confirm('Очистить корзину от товаров старше 14 дней?')) {
      await supabase.rpc('cleanup_deleted_products')
      fetchDeletedProducts()
    }
  }

  if (!user || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
      </div>
    )
  }

  if (isAdmin === false) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
            <h1 className="text-2xl font-bold text-orange-700">🗑️ Корзина</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition">
              ← Админ панель
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-orange-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-orange-800 flex items-center gap-2">
              <span className="text-xl">🗑️</span>
              Удаленные товары ({deletedProducts.length})
            </h3>
            <button 
              onClick={handleCleanup}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
            >
              🧹 Очистить старые (14+ дней)
            </button>
          </div>
          
          {deletedProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <div className="text-6xl mb-4">🗑️</div>
              <p className="text-lg">Корзина пуста</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Название</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Бренд</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Удален</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deletedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 text-slate-600">{product.brand}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(product.deleted_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleRestore(product)}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-all"
                          >
                            <span className="mr-1.5">↩️</span>
                            Восстановить
                          </button>
                          <button 
                            onClick={() => handlePermanentDelete(product.id)}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all"
                          >
                            <span className="mr-1.5">💀</span>
                            Удалить навсегда
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}