import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
const publicBasePath = staticExport ? process.env.NEXT_PUBLIC_BASE_PATH || '' : ''

if (!staticExport && process.env.NODE_ENV === 'development') {
  void initOpenNextCloudflareForDev()
}

const nextConfig: NextConfig = {
  output: staticExport ? 'export' : 'standalone',
  outputFileTracingRoot: process.cwd(),
  basePath: publicBasePath || undefined,
  trailingSlash: staticExport,
  env: {
    NEXT_PUBLIC_BASE_PATH: publicBasePath,
  },
  images: {
    unoptimized: staticExport,
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },
  ...(staticExport
    ? {}
    : {
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
      }),
}

export default nextConfig
