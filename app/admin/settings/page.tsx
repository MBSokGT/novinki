'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    site_name: '',
    primary_color: '',
    logo_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await apiClient.auth.getUser()

    if (!user) {
      router.push('/login')
      setLoading(false)
      return
    }

    const { data: adminStatus } = await apiClient.rpc('check_admin_status', { user_id: user.id })
    if (!adminStatus) {
      router.push('/')
      setLoading(false)
      return
    }

    setIsAdmin(true)
    await fetchSettings()
    setLoading(false)
  }

  const fetchSettings = async () => {
    const { data } = await apiClient.from('site_settings').select('*')
    if (data) {
      const settingsObj: any = {}
      data.forEach((s: any) => {
        settingsObj[s.key] = s.value
      })
      setSettings(settingsObj)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    await apiClient.from('site_settings').upsert({ key, value, updated_by: (await apiClient.auth.getUser()).data.user?.id })
    fetchSettings()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-[#1A1A1A] shadow-lg border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <a href="https://complexbar.ru" aria-label="complexbar.ru" className="inline-flex items-center">
              <Image src={(process.env.NEXT_PUBLIC_BASE_PATH||"")+ "/logo.png"} alt="Logo" width={120} height={40} className="object-contain" />
            </a>
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">⚙️ Настройки</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Название сайта</label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => setSettings({...settings, site_name: e.target.value})}
              onBlur={(e) => saveSetting('site_name', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Основной цвет</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                onBlur={(e) => saveSetting('primary_color', e.target.value)}
                className="h-10 w-full sm:w-20"
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                onBlur={(e) => saveSetting('primary_color', e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">URL логотипа</label>
            <input
              type="text"
              value={settings.logo_url}
              onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
              onBlur={(e) => saveSetting('logo_url', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="pt-4 border-t">
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
              ✅ Настройки сохранены автоматически
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
