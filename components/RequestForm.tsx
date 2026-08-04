'use client'

import { useState } from 'react'
import { DEMO_MODE, apiClient } from '@/lib/api-client'

export default function RequestForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ name: '', product: '', article: '' })
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      if (DEMO_MODE) {
        // In demo mode, save via the demo client (no real HTTP needed)
        await apiClient.from('requests').insert({
          name: form.name,
          contact: '',
          product: form.product,
          article: form.article,
          delivered: false,
        })
      } else {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `Ошибка сервера: ${response.status}`)
        }
      }

      setSuccess(true)
      setForm({ name: '', product: '', article: '' })
      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (error: any) {
      alert(error?.message || 'Ошибка отправки. Попробуйте позже.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-sm bg-[#9B1B1B] text-white font-medium rounded-lg hover:bg-[#7A1515] transition shadow-sm"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        <span className="hidden lg:inline">Сообщить о новинке</span>
        <span className="lg:hidden">Сообщить</span>
      </button>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 cursor-default">
            <div className="p-6 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900">Не нашли нужную позицию?</h2>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="mt-2 text-slate-600">Напишите нам название или артикул, и мы обязательно добавим!</p>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Спасибо!</h3>
                <p className="text-slate-600">Ваш запрос отправлен</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <input
                  type="text"
                  placeholder="Ваше имя"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
                  required
                />
                <input
                  type="text"
                  placeholder="Название товара (Бренд и серия)"
                  value={form.product}
                  onChange={(e) => setForm({...form, product: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
                  required
                />
                <input
                  type="text"
                  placeholder="Артикул если известен"
                  value={form.article}
                  onChange={(e) => setForm({...form, article: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9B1B1B] transition"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full px-6 py-3 bg-[#9B1B1B] text-white font-medium rounded-xl hover:bg-[#7A1515] transition disabled:opacity-50"
                >
                  {sending ? 'Отправка...' : 'Отправить запрос'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
