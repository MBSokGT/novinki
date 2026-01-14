interface ThreatSignature {
  pattern: RegExp
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

const threatSignatures: ThreatSignature[] = [
  {
    pattern: /<script|javascript:|onerror=|onload=/gi,
    severity: 'critical',
    description: 'XSS attempt detected'
  },
  {
    pattern: /union.*select|drop.*table|insert.*into|delete.*from/gi,
    severity: 'critical',
    description: 'SQL injection attempt detected'
  },
  {
    pattern: /\.\.\/|\.\.\\|%2e%2e/gi,
    severity: 'high',
    description: 'Path traversal attempt detected'
  },
  {
    pattern: /eval\(|exec\(|system\(|passthru\(/gi,
    severity: 'critical',
    description: 'Code injection attempt detected'
  },
  {
    pattern: /<iframe|<embed|<object/gi,
    severity: 'medium',
    description: 'Suspicious HTML tag detected'
  }
]

export function scanForThreats(input: string): { 
  isThreat: boolean
  threats: Array<{ severity: string; description: string }>
} {
  const threats: Array<{ severity: string; description: string }> = []
  
  for (const signature of threatSignatures) {
    if (signature.pattern.test(input)) {
      threats.push({
        severity: signature.severity,
        description: signature.description
      })
    }
  }
  
  return {
    isThreat: threats.length > 0,
    threats
  }
}

export function sanitizeDeep(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/eval\(/gi, '')
      .trim()
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDeep)
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {}
    for (const key in obj) {
      sanitized[key] = sanitizeDeep(obj[key])
    }
    return sanitized
  }
  
  return obj
}

export function detectBruteForce(identifier: string, maxAttempts: number = 5): boolean {
  // Реализация в rateLimit.ts
  return false
}

export function blockMaliciousIP(ip: string, reason: string) {
  console.error(`[IDS] Blocking IP ${ip}: ${reason}`)
  // Здесь можно добавить запись в firewall или WAF
}
