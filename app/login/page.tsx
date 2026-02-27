'use client'

import { useState } from 'react'
import { supabase, DEMO_MODE } from '@/lib/supabase'
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from '@/lib/demo-data'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="surface-card p-8 rounded-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" aria-label="На главную" className="inline-block">
            <Image src="/logo.png" alt="Logo" width={150} height={50} className="mx-auto mb-4" />
          </Link>
          <h2 className="text-2xl font-semibold text-slate-900">
            {showResetForm ? 'Восстановление пароля' : isLogin ? 'Вход' : 'Регистрация'}
          </h2>
            <p className="text-slate-500 mt-2">Новинки ассортимента</p>
        </div>

        {DEMO_MODE && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <p className="font-semibold text-amber-800 mb-2">🎭 Демо-режим</p>
            <div className="space-y-1 text-amber-700">
              <p>Администратор:</p>
              <button
                type="button"
                onClick={() => { setEmail(DEMO_ADMIN_EMAIL); setPassword(DEMO_ADMIN_PASSWORD) }}
                className="font-mono text-xs bg-amber-100 px-2 py-1 rounded hover:bg-amber-200 transition"
              >
                {DEMO_ADMIN_EMAIL} / {DEMO_ADMIN_PASSWORD}
              </button>
            </div>
          </div>
        )}

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
              className="text-slate-800 hover:text-slate-900 text-sm font-medium"
            >
              ← Назад к входу
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-slate-800 hover:text-slate-900 text-sm font-medium block w-full"
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
