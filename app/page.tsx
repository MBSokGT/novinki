'use client'

import ProductsTable from '@/components/ProductsTable'
import RequestForm from '@/components/RequestForm'
import Footer from '@/components/Footer'
import ToastContainer from '@/components/Toast'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [exportProducts, setExportProducts] = useState<(() => void) | null>(null)
  const [supplierNoveltiesOnly, setSupplierNoveltiesOnly] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const { data: { user } } = await apiClient.auth.getUser()
        if (cancelled) return

        if (!user) {
          setUser(null)
          setIsAdmin(false)
          return
        }

        setUser(user)

        const { data: profile } = await apiClient
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle()
        if (cancelled) return

        if (profile?.is_admin === true) {
          setIsAdmin(true)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Auth error:', err)
        setUser(null)
        setIsAdmin(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkAuth()
    return () => { cancelled = true }
  }, [])

  const handleLogout = async () => {
    await apiClient.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setMenuOpen(false)
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex justify-between items-center gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link href="/" aria-label="На главную" className="inline-flex min-w-0 flex-1 items-center gap-3">
                <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={100} height={33} className="object-contain shrink-0 sm:w-[120px]" priority />
                <span className="hidden truncate text-2xl font-bold uppercase tracking-tight text-white sm:block">Новинки Ассортимента</span>
              </Link>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex lg:gap-2">
              <div className="inline-flex shrink-0 items-center rounded-lg bg-white/10 p-0.5" role="tablist" aria-label="Раздел новинок">
                <button
                  role="tab"
                  aria-selected={!supplierNoveltiesOnly}
                  onClick={() => setSupplierNoveltiesOnly(false)}
                  className={`whitespace-nowrap rounded-md px-2 lg:px-3 py-1.5 text-sm font-medium transition ${!supplierNoveltiesOnly ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-300 hover:text-white'}`}
                >
                  <span className="hidden lg:inline">Новинки на складе</span>
                  <span className="lg:hidden">Склад</span>
                </button>
                <button
                  role="tab"
                  aria-selected={supplierNoveltiesOnly}
                  onClick={() => setSupplierNoveltiesOnly(true)}
                  className={`whitespace-nowrap rounded-md px-2 lg:px-3 py-1.5 text-sm font-medium transition ${supplierNoveltiesOnly ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-300 hover:text-white'}`}
                >
                  <span className="hidden lg:inline">Новинки поставщиков</span>
                  <span className="lg:hidden">Поставщики</span>
                </button>
              </div>
              <RequestForm />
              {exportProducts && (
                <button
                  onClick={exportProducts}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-sm bg-[#9B1B1B] text-white font-medium rounded-lg hover:bg-[#7A1515] transition shadow-sm"
                  title="Выгрузить в Excel"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="hidden lg:inline">Выгрузить в Excel</span>
                  <span className="lg:hidden">Excel</span>
                </button>
              )}
              {isAdmin && (
                <Link href="/admin" className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-sm bg-[#9B1B1B] text-white font-medium rounded-lg hover:bg-[#7A1515] transition shadow-sm" title="Панель администратора">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="hidden md:inline">Админ</span>
                </Link>
              )}
              {user && (
                <button onClick={handleLogout} className="px-3 py-1.5 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition text-sm font-medium">
                  Выйти
                </button>
              )}
              {!user && (
                <Link
                  href="/login"
                  aria-label="Вход"
                  className="p-2 text-gray-500/40 hover:text-gray-300 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </Link>
              )}
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 text-gray-300 hover:bg-white/10 rounded-lg transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
          {menuOpen && (
            <div className="sm:hidden mt-4 pb-2 space-y-2 border-t border-white/10 pt-4">
              <div className="flex items-center rounded-lg bg-white/10 p-0.5" role="tablist" aria-label="Раздел новинок">
                <button
                  role="tab"
                  aria-selected={!supplierNoveltiesOnly}
                  onClick={() => setSupplierNoveltiesOnly(false)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${!supplierNoveltiesOnly ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-300 hover:text-white'}`}
                >
                  Новинки на складе
                </button>
                <button
                  role="tab"
                  aria-selected={supplierNoveltiesOnly}
                  onClick={() => setSupplierNoveltiesOnly(true)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${supplierNoveltiesOnly ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-300 hover:text-white'}`}
                >
                  Новинки поставщиков
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 [&>button]:w-full">
                  <RequestForm />
                </div>
                {!user && (
                  <Link href="/login" aria-label="Вход" className="shrink-0 p-2 text-gray-500/40 hover:text-gray-300 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </Link>
                )}
              </div>
              {exportProducts && (
                <button
                  onClick={exportProducts}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Выгрузить в Excel
                </button>
              )}
              {isAdmin && (
                <Link href="/admin" className="flex items-center gap-2 w-full px-4 py-3 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition text-center font-medium">
                  Панель администратора
                </Link>
              )}
              {user && (
                <button onClick={handleLogout} className="w-full px-4 py-3 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition font-medium">
                  Выйти
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <ProductsTable
          isAdmin={isAdmin}
          onExportReady={(fn) => setExportProducts(() => fn)}
          supplierNoveltiesOnly={supplierNoveltiesOnly}
          setSupplierNoveltiesOnly={setSupplierNoveltiesOnly}
        />
      </main>
      <Footer />
      <ToastContainer />
    </div>
  )
}
