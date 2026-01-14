const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimit.get(identifier)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimit.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (userLimit.count >= maxRequests) {
    return false
  }

  userLimit.count++
  return true
}

export function clearRateLimit(identifier: string): void {
  rateLimit.delete(identifier)
}

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimit.entries()) {
    if (now > value.resetTime) {
      rateLimit.delete(key)
    }
  }
}, 300000)
