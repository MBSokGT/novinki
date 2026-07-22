'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/Toast'

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
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<{ userId: string; email: string } | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await apiClient.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: isAdmin } = await apiClient.rpc('check_admin_status', { user_id: user.id })
    if (!isAdmin) {
      router.push('/')
      return
    }

    setIsAdmin(true)
    setCurrentUserId(user.id)
    fetchUsers()
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await apiClient
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

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating) return
    setCreating(true)

    try {
      const { error } = await apiClient.auth.adminCreateUser({
        email: newEmail,
        password: newPassword,
        isAdmin: true,
      })
      if (error) throw new Error(error.message)

      showToast('Сотрудник добавлен', 'success')
      setNewEmail('')
      setNewPassword('')
      await fetchUsers()
    } catch (error: any) {
      showToast(error?.message || 'Ошибка при создании пользователя', 'error')
    } finally {
      setCreating(false)
    }
  }

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUserId && currentStatus) {
      showToast('Нельзя снять админку с самого себя', 'error')
      return
    }

    const { error } = await apiClient
      .from('user_profiles')
      .update({ is_admin: !currentStatus })
      .eq('id', userId)

    if (error) {
      showToast(`Ошибка изменения роли: ${error.message}`, 'error')
      return
    }

    fetchUsers()
  }

  const openResetPassword = (userId: string, email: string) => {
    setResetTarget({ userId, email })
    setResetPasswordValue('')
  }

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget || resetSaving) return
    if (resetPasswordValue.length < 8) {
      showToast('Пароль должен быть не короче 8 символов', 'error')
      return
    }

    setResetSaving(true)
    try {
      const { error } = await apiClient.auth.adminSetUserPassword({ userId: resetTarget.userId, password: resetPasswordValue })
      if (error) throw new Error(error.message)
      showToast('Пароль обновлён', 'success')
      setResetTarget(null)
      setResetPasswordValue('')
    } catch (error: any) {
      showToast(error?.message || 'Ошибка при смене пароля', 'error')
    } finally {
      setResetSaving(false)
    }
  }

  const toggleBlock = async (userId: string, currentStatus: boolean) => {
    const reason = currentStatus ? null : prompt('Причина блокировки:')
    if (!currentStatus && !reason) return

    const { error } = await apiClient
      .from('user_profiles')
      .update({
        is_blocked: !currentStatus,
        blocked_reason: reason,
        blocked_at: !currentStatus ? new Date().toISOString() : null
      })
      .eq('id', userId)

    if (error) {
      showToast(`Ошибка изменения статуса: ${error.message}`, 'error')
      return
    }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="На главную" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={120} height={40} className="object-contain" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Управление пользователями</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
              Панель администратора
            </Link>
            <Link href="/" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
              На главную
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h2 className="text-lg font-bold text-slate-900">Добавить сотрудника</h2>
            <p className="text-sm text-slate-500 mt-1">
              Создаёт админский аккаунт сразу с паролем — сотрудник может сразу войти и загружать новинки.
            </p>
          </div>
          <form onSubmit={createUser} className="p-6 grid gap-4 sm:grid-cols-3 items-end">
            <input
              type="email"
              placeholder="Email сотрудника"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
              required
            />
            <input
              type="password"
              placeholder="Пароль (мин. 8 символов)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-3 bg-[#9B1B1B] text-white rounded-xl hover:bg-[#7A1515] transition font-medium disabled:opacity-60"
            >
              {creating ? 'Создание...' : 'Создать'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Всего пользователей: {users.length}</h2>
            <button onClick={exportToCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Экспорт в CSV
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
                          Администратор
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          Пользователь
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_blocked ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-900">
                          Заблокирован
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-900">
                          Активен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        disabled={user.id === currentUserId && user.is_admin}
                        title={user.id === currentUserId && user.is_admin ? 'Нельзя снять админку с самого себя' : undefined}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
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
                            : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                      >
                        {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                      </button>
                      <button
                        onClick={() => openResetPassword(user.id, user.email)}
                        className="px-3 py-1 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                      >
                        Сменить пароль
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {resetTarget && (
        <div onClick={() => !resetSaving && setResetTarget(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Сменить пароль</h2>
            <p className="text-sm text-slate-500 mb-4">{resetTarget.email}</p>
            <form onSubmit={submitResetPassword} className="space-y-4">
              <input
                type="password"
                autoFocus
                placeholder="Новый пароль (мин. 8 символов)"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                minLength={8}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
                required
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={resetSaving}
                  className="flex-1 px-4 py-2.5 bg-[#9B1B1B] text-white rounded-xl hover:bg-[#7A1515] transition font-medium disabled:opacity-60"
                >
                  {resetSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  disabled={resetSaving}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
