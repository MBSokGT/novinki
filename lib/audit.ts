import { supabase } from './supabase'

interface AuditLog {
  user_id?: string
  action: string
  resource: string
  ip_address: string
  user_agent: string
  status: 'success' | 'failure' | 'suspicious'
  details?: any
}

export async function logAudit(log: AuditLog) {
  try {
    const timestamp = new Date().toISOString()
    
    // Логирование в консоль для мониторинга
    console.log(`[AUDIT ${timestamp}]`, {
      user: log.user_id || 'anonymous',
      action: log.action,
      resource: log.resource,
      status: log.status,
      ip: log.ip_address
    })

    // Сохранение в базу данных (если таблица создана)
    await supabase.from('audit_logs').insert({
      ...log,
      timestamp
    })

    // Алерт при подозрительной активности
    if (log.status === 'suspicious') {
      console.error(`[SECURITY ALERT] Suspicious activity detected:`, log)
      // Здесь можно добавить отправку email/SMS админу
    }
  } catch (error) {
    console.error('[AUDIT ERROR]', error)
  }
}

export function detectAnomalies(userId: string, action: string): boolean {
  // Детекция аномалий: слишком много действий за короткое время
  const key = `${userId}:${action}`
  const now = Date.now()
  
  // Простая проверка (можно расширить)
  return false
}

export async function logSecurityEvent(event: {
  type: 'login_attempt' | 'failed_auth' | 'admin_access' | 'data_export' | 'suspicious_query'
  userId?: string
  ip: string
  details: any
}) {
  await logAudit({
    user_id: event.userId,
    action: event.type,
    resource: 'security',
    ip_address: event.ip,
    user_agent: event.details.userAgent || 'unknown',
    status: event.type.includes('failed') ? 'failure' : 'success',
    details: event.details
  })
}
