'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await apiClient.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          throw new Error('Слишком много попыток входа. Подождите немного.')
        }
        throw error
      }
      router.push('/admin')
    } catch (error: any) {
      setMessage(error.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await apiClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          throw new Error('Слишком много запросов. Попробуйте через 15 минут.')
        }
        throw error
      }
      setMessage('Ссылка для восстановления сформирована. Если почтовый шлюз настроен, письмо будет отправлено')
      setShowResetForm(false)
    } catch (error: any) {
      setMessage(error.message || 'Ошибка отправки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="surface-card p-8 rounded-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" aria-label="На главную" className="inline-block">
            <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={150} height={50} className="mx-auto mb-4" />
          </Link>
          <h2 className="text-2xl font-semibold text-slate-900">
            {showResetForm ? 'Восстановление пароля' : 'Вход'}
          </h2>
        </div>

        {showResetForm ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-neutral w-full px-4 py-3 rounded-xl"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-neutral w-full px-6 py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-neutral w-full px-4 py-3 rounded-xl"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-neutral w-full px-4 py-3 rounded-xl"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-neutral w-full px-6 py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
        )}

        {message && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm text-center">
            {message}
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          {showResetForm ? (
            <button
              onClick={() => setShowResetForm(false)}
              className="text-slate-800 hover:text-slate-900 text-sm font-medium"
            >
              ← Назад к входу
            </button>
          ) : (
            <button
              onClick={() => setShowResetForm(true)}
              className="text-slate-600 hover:text-slate-800 text-sm"
            >
              Забыли пароль?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
