'use client'

import { useState } from 'react'
import Image from 'next/image'
import ImageWithFallback from '@/components/ImageWithFallback'

interface ImageCarouselProps {
  images: string[]
  alt: string
  className?: string
  onImageClick?: (url: string) => void
  // Инициалы на фоне вместо серой заглушки, если фото нет
  fallbackLabel?: string
}

export default function ImageCarousel({ images, alt, className, onImageClick, fallbackLabel }: ImageCarouselProps) {
  const [index, setIndex] = useState(0)
  if (images.length === 0) {
    return (
      <div className={`relative ${className || ''}`}>
        <ImageWithFallback alt={alt} label={fallbackLabel || alt} />
      </div>
    )
  }
  const slides = images
  const current = slides[Math.min(index, slides.length - 1)]

  const goTo = (next: number) => {
    setIndex((next + slides.length) % slides.length)
  }

  return (
    <div className={`relative ${className || ''}`}>
      <Image
        src={current}
        alt={alt}
        fill
        className="object-contain cursor-pointer bg-white p-2"
        onClick={() => onImageClick?.(current)}
      />
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goTo(index - 1) }}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur rounded-full p-2 hover:bg-white transition shadow-lg"
            aria-label="Предыдущее фото"
          >
            <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goTo(index + 1) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur rounded-full p-2 hover:bg-white transition shadow-lg"
            aria-label="Следующее фото"
          >
            <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(dotIndex) }}
                className={`w-1.5 h-1.5 rounded-full transition ${dotIndex === index ? 'bg-white' : 'bg-white/50'}`}
                aria-label={`Фото ${dotIndex + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
