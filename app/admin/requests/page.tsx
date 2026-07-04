'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/Toast'

interface ProductRequest {
  id: string
  name: string
  product: string
  article?: string
  delivered: boolean
  created_at: string
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered'>('all')
  const router = useRouter()

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
    await fetchRequests()
    setLoading(false)
  }

  const fetchRequests = async () => {
    const { data } = await apiClient.from('requests').select('*').order('created_at', { ascending: false })
    setRequests(data || [])
  }

  const removeRequest = async (id: string) => {
    if (!confirm('Удалить этот запрос?')) return
    await apiClient.from('requests').delete().eq('id', id)
    await fetchRequests()
    showToast('Запрос удалён', 'success')
  }

  const toggleDelivered = async (request: ProductRequest) => {
    const { error } = await apiClient.from('requests').update({ delivered: !request.delivered }).eq('id', request.id)
    if (error) {
      showToast('Ошибка обновления статуса', 'error')
      return
    }
    setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, delivered: !r.delivered } : r)))
    showToast(request.delivered ? 'Отмечено как необработанное' : 'Отмечено как обработанное', 'success')
  }

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === 'pending') return !request.delivered
    if (statusFilter === 'delivered') return request.delivered
    return true
  })

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
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Запросы новинок</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex gap-2">
          {([
            ['all', 'Все'],
            ['pending', 'Не доставлено'],
            ['delivered', 'Доставлено'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${statusFilter === value ? 'bg-[#9B1B1B] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredRequests.map((request) => (
              <div key={request.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="break-words font-medium text-slate-900">{request.product}</div>
                  <button
                    onClick={() => toggleDelivered(request)}
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition ${request.delivered ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {request.delivered ? 'Доставлено' : 'Не доставлено'}
                  </button>
                </div>
                {request.article && <div className="text-sm text-slate-500">Артикул: {request.article}</div>}
                <div className="text-sm text-slate-600">{request.name}</div>
                <div className="text-xs text-slate-400">{new Date(request.created_at).toLocaleString('ru-RU')}</div>
                <button onClick={() => removeRequest(request.id)} className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-700">
                  Удалить
                </button>
              </div>
            ))}
          </div>
          <table className="hidden w-full table-fixed lg:table">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[20%] px-4 py-4 text-left text-sm font-semibold">Имя</th>
                <th className="w-[26%] px-4 py-4 text-left text-sm font-semibold">Товар</th>
                <th className="w-[12%] px-4 py-4 text-left text-sm font-semibold">Артикул</th>
                <th className="w-[14%] px-4 py-4 text-left text-sm font-semibold">Дата</th>
                <th className="w-[14%] px-4 py-4 text-left text-sm font-semibold">Статус</th>
                <th className="w-[14%] px-4 py-4 text-right text-sm font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="break-words px-4 py-4 font-medium">{request.name}</td>
                  <td className="break-words px-4 py-4">{request.product}</td>
                  <td className="break-words px-4 py-4 text-sm text-slate-500">{request.article || '—'}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {new Date(request.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleDelivered(request)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition ${request.delivered ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {request.delivered ? 'Доставлено' : 'Не доставлено'}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => removeRequest(request.id)} className="text-slate-600 hover:text-slate-700 font-medium">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRequests.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              {requests.length === 0 ? 'Запросов пока нет' : 'Нет запросов с таким статусом'}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
