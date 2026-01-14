'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    site_name: '',
    primary_color: '',
    logo_url: ''
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*')
    if (data) {
      const settingsObj: any = {}
      data.forEach((s: any) => {
        settingsObj[s.key] = s.value
      })
      setSettings(settingsObj)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    await supabase.from('site_settings').upsert({ key, value, updated_by: (await supabase.auth.getUser()).data.user?.id })
    fetchSettings()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Logo" width={120} height={40} className="object-contain" />
            <h1 className="text-2xl font-bold text-red-900">⚙️ Настройки</h1>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
            Назад
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
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
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                onBlur={(e) => saveSetting('primary_color', e.target.value)}
                className="h-10 w-20"
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
