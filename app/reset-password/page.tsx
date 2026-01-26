'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Проверяем есть ли токен восстановления в URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    if (!accessToken) {
      setError('Недействительная ссылка восстановления')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setMessage('Пароль успешно изменен! Перенаправляем на страницу входа...')
      
      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } catch (error: any) {
      setError(error.message || 'Ошибка при изменении пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Logo" width={150} height={50} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Новый пароль</h2>
          <p className="text-slate-600 mt-2">Введите новый пароль для вашего аккаунта</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Новый пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading || !!error}
            className="w-full bg-red-800 text-white px-6 py-3 rounded-xl hover:bg-red-900 transition font-medium disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-red-800 hover:text-red-900 text-sm font-medium"
          >
            ← Вернуться к входу
          </button>
        </div>
      </div>
    </div>
  )
}