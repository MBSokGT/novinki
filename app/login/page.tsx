'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
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
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.includes('rate limit') || error.message.includes('too many')) {
            throw new Error('Слишком много попыток входа. Подождите немного.')
          }
          throw error
        }
        router.push('/')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          if (error.message.includes('rate limit') || error.message.includes('too many')) {
            throw new Error('Слишком много регистраций. Попробуйте позже.')
          }
          throw error
        }
        setMessage('Проверьте email для подтверждения регистрации')
      }
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          throw new Error('Слишком много запросов. Попробуйте через 15 минут.')
        }
        throw error
      }
      setMessage('Ссылка для восстановления пароля отправлена на email')
      setShowResetForm(false)
    } catch (error: any) {
      setMessage(error.message || 'Ошибка отправки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Logo" width={150} height={50} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">
            {showResetForm ? 'Восстановление пароля' : isLogin ? 'Вход' : 'Регистрация'}
          </h2>
          <p className="text-slate-600 mt-2">Новинки ассортимента</p>
        </div>

        {showResetForm ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-800 text-white px-6 py-3 rounded-xl hover:bg-red-900 transition font-medium disabled:opacity-50"
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
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-800 text-white px-6 py-3 rounded-xl hover:bg-red-900 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
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
              className="text-red-800 hover:text-red-900 text-sm font-medium"
            >
              ← Назад к входу
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-red-800 hover:text-red-900 text-sm font-medium block w-full"
              >
                {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
              </button>
              {isLogin && (
                <button
                  onClick={() => setShowResetForm(true)}
                  className="text-slate-600 hover:text-slate-800 text-sm"
                >
                  Забыли пароль?
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
