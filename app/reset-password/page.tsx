'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [invalidLink, setInvalidLink] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const tokenFromQuery = queryParams.get('token')
    if (tokenFromQuery) {
      setResetToken(tokenFromQuery)
      return
    }

    // Fallback: если нет токена, разрешаем смену только авторизованному пользователю.
    apiClient.auth.getUser().then(({ data }: { data: any }) => {
      if (!data.user) {
        setInvalidLink(true)
        setError('Недействительная ссылка восстановления')
      }
    })
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

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      setLoading(false)
      return
    }

    try {
      const result = resetToken
        ? await apiClient.auth.confirmPasswordReset(resetToken, password, confirmPassword)
        : await apiClient.auth.updateUser({ password })

      if (result.error) throw result.error

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
          <Link href="/" aria-label="На главную" className="inline-block">
            <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={150} height={50} className="mx-auto mb-4" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Новый пароль</h2>
          <p className="text-slate-600 mt-2">Введите новый пароль для вашего аккаунта</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-slate-100 text-slate-800 rounded-lg text-sm text-center">
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
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
            required
            minLength={8}
          />
          <input
            type="password"
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={loading || invalidLink}
            className="w-full bg-[#9B1B1B] text-white px-6 py-3 rounded-xl hover:bg-[#7A1515] transition font-medium disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-slate-800 hover:text-slate-900 text-sm font-medium"
          >
            ← Вернуться к входу
          </button>
        </div>
      </div>
    </div>
  )
}
