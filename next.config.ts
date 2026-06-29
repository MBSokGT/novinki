import type { NextConfig } from 'next'

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
  },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  basePath: publicBasePath || undefined,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: publicBasePath,
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
  async headers() {
    return [
      { source: '/', headers: securityHeaders },
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
}

export default nextConfig
