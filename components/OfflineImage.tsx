'use client'

import Image, { type ImageProps } from 'next/image'

import { useOfflineImage } from '@/lib/offlineCache'

// next/image, который без сети берёт фото из сохранённой копии
export default function OfflineImage({ src, alt, unoptimized, ...props }: ImageProps & { src: string }) {
  const offline = useOfflineImage(src)
  return <Image {...props} src={offline.src || src} alt={alt} unoptimized={unoptimized || offline.unoptimized} />
}
