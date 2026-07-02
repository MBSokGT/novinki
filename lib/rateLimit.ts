// Simple in-memory sliding-window rate limiter. Suitable for the single
// Node process this app runs as (PM2 fork mode); counters reset on restart,
// which is acceptable for brute-force/spam protection.
const buckets = new Map<string, number[]>()

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs)

  if (timestamps.length >= maxAttempts) {
    buckets.set(key, timestamps)
    return false
  }

  timestamps.push(now)
  buckets.set(key, timestamps)

  // Prevent unbounded growth from many distinct keys.
  if (buckets.size > 10_000) {
    for (const [k, ts] of buckets) {
      if (ts.every((t) => now - t >= windowMs)) buckets.delete(k)
    }
  }

  return true
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
