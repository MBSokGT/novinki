import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

if (process.env.NODE_ENV === 'development') {
  void initOpenNextCloudflareForDev()
}

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  env: {
    NEXT_PUBLIC_BASE_PATH: '',
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
