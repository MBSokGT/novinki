'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SecurityMonitor() {
  const [suspiciousActivity, setSuspiciousActivity] = useState<any[]>([])

  useEffect(() => {
    fetchSuspiciousActivity()
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(fetchSuspiciousActivity, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchSuspiciousActivity = async () => {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('status', 'suspicious')
        .order('timestamp', { ascending: false })
        .limit(10)
      
      if (data) setSuspiciousActivity(data)
    } catch (error) {
      console.error('Error fetching suspicious activity:', error)
    }
  }

  if (suspiciousActivity.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <span className="font-bold text-red-900">Подозрительная активность</span>
      </div>
      <div className="text-sm text-red-800">
        Обнаружено {suspiciousActivity.length} подозрительных действий
      </div>
    </div>
  )
}