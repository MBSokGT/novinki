'use client'

import ProductsTable from '@/components/ProductsTable'
import RequestForm from '@/components/RequestForm'
import SecurityMonitor from '@/components/SecurityMonitor'
import ToastContainer from '@/components/Toast'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle()
      
      if (profile?.is_admin === true) {
        setIsAdmin(true)
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#9B1B1B] text-white rounded-lg">
            Повторить
          </button>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="На главную" className="inline-flex items-center">
                <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={100} height={33} className="object-contain sm:w-[120px]" priority />
              </Link>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <RequestForm />
              {isAdmin ? (
                <Link href="/admin" className="flex items-center gap-2 px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition shadow-md" title="Админ панель">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="hidden md:inline">Админ</span>
                </Link>
              ) : (
                <Link href="/bookmarks" className="flex items-center gap-2 px-4 py-2 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition shadow-md" title="Закладки">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  <span className="hidden md:inline">Закладки</span>
                </Link>
              )}
              <button onClick={handleLogout} className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition text-sm font-medium">
                Выйти
              </button>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 text-gray-300 hover:bg-white/10 rounded-lg transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
          {menuOpen && (
            <div className="sm:hidden mt-4 pb-2 space-y-2 border-t border-white/10 pt-4">
              <RequestForm />
              {isAdmin ? (
                <Link href="/admin" className="flex items-center gap-2 w-full px-4 py-3 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition text-center font-medium">
                  Админ панель
                </Link>
              ) : (
                <Link href="/bookmarks" className="flex items-center gap-2 w-full px-4 py-3 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition text-center font-medium">
                  Закладки
                </Link>
              )}
              <button onClick={handleLogout} className="w-full px-4 py-3 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition font-medium">
                Выйти
              </button>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ProductsTable isAdmin={isAdmin} />
      </main>
      {isAdmin && <SecurityMonitor />}
      <ToastContainer />
    </div>
  )
}
