'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  is_admin: boolean
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      router.push('/')
      return
    }

    setIsAdmin(true)
    fetchUsers()
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
    setLoading(false)
  }

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    await supabase
      .from('user_profiles')
      .update({ is_admin: !currentStatus })
      .eq('id', userId)
    
    fetchUsers()
  }

  const toggleBlock = async (userId: string, currentStatus: boolean) => {
    const reason = currentStatus ? null : prompt('Причина блокировки:')
    if (!currentStatus && !reason) return

    await supabase
      .from('user_profiles')
      .update({ 
        is_blocked: !currentStatus,
        blocked_reason: reason,
        blocked_at: !currentStatus ? new Date().toISOString() : null
      })
      .eq('id', userId)
    
    fetchUsers()
  }

  const exportToCSV = () => {
    const csv = [
      ['Email', 'Роль', 'Дата регистрации', 'Статус'],
      ...users.map(u => [
        u.email,
        u.is_admin ? 'Админ' : 'Пользователь',
        new Date(u.created_at).toLocaleDateString('ru-RU'),
        u.is_blocked ? 'Заблокирован' : 'Активен'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading || !isAdmin) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
            <h1 className="text-2xl font-bold text-red-900">Управление пользователями</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
              Админ панель
            </Link>
            <Link href="/" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
              На главную
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Всего пользователей: {users.length}</h2>
            <button onClick={exportToCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              📄 Экспорт в CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Дата регистрации</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Роль</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Статус</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(user.created_at).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_admin ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-900">
                          👑 Администратор
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          👤 Пользователь
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_blocked ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-900">
                          🚫 Заблокирован
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-900">
                          ✅ Активен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          user.is_admin
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {user.is_admin ? 'Снять админа' : 'Дать админа'}
                      </button>
                      <button
                        onClick={() => toggleBlock(user.id, user.is_blocked)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          user.is_blocked
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                      </button>
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
