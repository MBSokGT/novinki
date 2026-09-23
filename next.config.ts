import type { NextConfig } from 'next'
import { execSync } from 'child_process'

// Короткий хэш коммита виден в футере и в /api/health — чтобы после деплоя
// сразу было видно, какая версия реально запущена.
function resolveAppVersion() {
  if (process.env.APP_VERSION) return process.env.APP_VERSION
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://nominatim.openstreetmap.org; frame-ancestors 'none'",
  },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  basePath: publicBasePath || undefined,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: publicBasePath,
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      // Товары, спарсенные с complexbar.ru (см. "Добавить серию по ссылке"),
      // хранят ссылку на их картиночный CDN, а не на сам complexbar.ru.
      { protocol: 'https', hostname: '**.scalesta-cdn.com' },
    ],
  },
  async headers() {
    return [
      { source: '/', headers: securityHeaders },
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
}

export default nextConfig
