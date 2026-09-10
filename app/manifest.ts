import type { MetadataRoute } from 'next'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Новинки ассортимента — Комплекс-Бар',
    short_name: 'Новинки КБ',
    description: 'Каталог новинок ассортимента Комплекс-Бар',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#9B1B1B',
    lang: 'ru',
    icons: [
      { src: `${basePath}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${basePath}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${basePath}/icons/icon-maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: `${basePath}/icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
