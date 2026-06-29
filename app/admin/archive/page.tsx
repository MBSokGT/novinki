'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function ArchivePage() {
  const [archived, setArchived] = useState<any[]>([])
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
    await fetchArchived()
    setLoading(false)
  }

  const fetchArchived = async () => {
    const { data } = await apiClient.from('archived_products').select('*').order('deleted_at', { ascending: false })
    setArchived(data || [])
  }

  const restore = async (product: any) => {
    if (confirm('Восстановить эту новинку?')) {
      await apiClient.from('products').insert({
        name: product.name,
        brand: product.brand,
        description: product.description,
        image_url: product.image_url,
        advantages: product.advantages,
        attention_points: product.attention_points,
        category_id: product.category_id
      })
      await apiClient.from('archived_products').delete().eq('id', product.id)
      fetchArchived()
    }
  }

  const permanentDelete = async (id: string) => {
    if (confirm('Удалить навсегда? Это действие нельзя отменить!')) {
      await apiClient.from('archived_products').delete().eq('id', id)
      fetchArchived()
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
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">🗄️ Архив</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="lg:hidden divide-y divide-slate-100">
            {archived.map((product) => (
              <div key={product.id} className="space-y-3 p-4">
                <div className="space-y-1">
                  <div className="break-words font-medium text-slate-900">{product.name}</div>
                  <div className="break-words text-sm text-slate-600">{product.brand}</div>
                  <div className="text-sm text-slate-500">
                    Удалено: {new Date(product.deleted_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => restore(product)} className="rounded-lg bg-green-50 px-4 py-2 font-medium text-green-700">
                    Восстановить
                  </button>
                  <button onClick={() => permanentDelete(product.id)} className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700">
                    Удалить навсегда
                  </button>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden w-full table-fixed lg:table">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[36%] px-4 py-4 text-left text-sm font-semibold">Название</th>
                <th className="w-[20%] px-4 py-4 text-left text-sm font-semibold">Бренд</th>
                <th className="w-[18%] px-4 py-4 text-left text-sm font-semibold">Удалено</th>
                <th className="w-[26%] px-4 py-4 text-right text-sm font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {archived.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="break-words px-4 py-4 font-medium">{product.name}</td>
                  <td className="break-words px-4 py-4">{product.brand}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {new Date(product.deleted_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                    <button onClick={() => restore(product)} className="text-green-600 hover:text-green-700 font-medium">
                      Восстановить
                    </button>
                    <button onClick={() => permanentDelete(product.id)} className="text-slate-600 hover:text-slate-700 font-medium">
                      Удалить навсегда
                    </button>
                    </div>
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
