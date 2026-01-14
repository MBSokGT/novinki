'use client'

import { useState } from 'react'

export default function RequestForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', product: '', article: '' })
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (response.ok) {
        setSuccess(true)
        setForm({ name: '', contact: '', product: '', article: '' })
        setTimeout(() => {
          setIsOpen(false)
          setSuccess(false)
        }, 2000)
      }
    } catch (error) {
      alert('Ошибка отправки. Попробуйте позже.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-red-800 text-white font-medium rounded-lg hover:bg-red-900 transition shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Сообщить о новинке
      </button>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
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
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                  required
                />
                <input
                  type="text"
                  placeholder="Телефон или Email"
                  value={form.contact}
                  onChange={(e) => setForm({...form, contact: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                  required
                />
                <input
                  type="text"
                  placeholder="Название товара"
                  value={form.product}
                  onChange={(e) => setForm({...form, product: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                  required
                />
                <input
                  type="text"
                  placeholder="Артикул (если известен)"
                  value={form.article}
                  onChange={(e) => setForm({...form, article: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
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
