import crypto from 'crypto'

const otpStore = new Map<string, { code: string; expires: number; attempts: number }>()

export function generateOTP(userId: string): string {
  const code = crypto.randomInt(100000, 999999).toString()
  const expires = Date.now() + 300000 // 5 минут
  
  otpStore.set(userId, { code, expires, attempts: 0 })
  
  console.log(`[2FA] OTP для ${userId}: ${code}`)
  return code
}

export function verifyOTP(userId: string, code: string): boolean {
  const stored = otpStore.get(userId)
  
  if (!stored) return false
  
  // Проверка истечения срока
  if (Date.now() > stored.expires) {
    otpStore.delete(userId)
    return false
  }
  
  // Защита от брутфорса
  stored.attempts++
  if (stored.attempts > 3) {
    otpStore.delete(userId)
    console.warn(`[2FA] Too many attempts for ${userId}`)
    return false
  }
  
  // Проверка кода
  if (stored.code === code) {
    otpStore.delete(userId)
    return true
  }
  
  return false
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return codes
}

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}
