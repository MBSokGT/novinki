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
  is_blocked: boolean
  blocked_reason?: string
  blocked_at?: string
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

    const { data: isAdmin } = await supabase.rpc('check_admin_status', { user_id: user.id })
    if (!isAdmin) {
      router.push('/')
      return
    }

    setIsAdmin(true)
    fetchUsers()
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, is_admin, is_blocked, blocked_reason, blocked_at, created_at')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      if (data) setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
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
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
    </div>
  )

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Управление пользователями</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
              Админ панель
            </Link>
            <Link href="/" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
              На главную
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b bg-slate-50 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-bold text-slate-900">Всего пользователей: {users.length}</h2>
            <button onClick={exportToCSV} className="w-full rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 sm:w-auto">
              📄 Экспорт в CSV
            </button>
          </div>
          <div className="lg:hidden divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="space-y-3 p-4">
                <div className="space-y-1">
                  <div className="break-all font-medium text-slate-900">{user.email}</div>
                  <div className="text-sm text-slate-600">
                    {new Date(user.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.is_admin ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-900">
                      👑 Администратор
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      👤 Пользователь
                    </span>
                  )}
                  {user.is_blocked ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-900">
                      🚫 Заблокирован
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-900">
                      ✅ Активен
                    </span>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      user.is_admin
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {user.is_admin ? 'Снять админа' : 'Дать админа'}
                  </button>
                  <button
                    onClick={() => toggleBlock(user.id, user.is_blocked)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      user.is_blocked
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                    }`}
                  >
                    {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="w-[28%] px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
                  <th className="w-[18%] px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Дата регистрации</th>
                  <th className="w-[16%] px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Роль</th>
                  <th className="w-[16%] px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Статус</th>
                  <th className="w-[22%] px-4 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="break-all px-4 py-4 font-medium text-slate-900">{user.email}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(user.created_at).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4">
                      {user.is_blocked ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-900">
                          🚫 Заблокирован
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-900">
                          ✅ Активен
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="grid gap-2 xl:grid-cols-2">
                        <button
                          onClick={() => toggleAdmin(user.id, user.is_admin)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            user.is_admin
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {user.is_admin ? 'Снять админа' : 'Дать админа'}
                        </button>
                        <button
                          onClick={() => toggleBlock(user.id, user.is_blocked)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            user.is_blocked
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-slate-700 text-white hover:bg-slate-600'
                          }`}
                        >
                          {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                      </div>
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
