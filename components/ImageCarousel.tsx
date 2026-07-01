'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ImageCarouselProps {
  images: string[]
  alt: string
  className?: string
  onImageClick?: (url: string) => void
}

export default function ImageCarousel({ images, alt, className, onImageClick }: ImageCarouselProps) {
  const [index, setIndex] = useState(0)
  const slides = images.length > 0 ? images : [(process.env.NEXT_PUBLIC_BASE_PATH || '') + '/placeholder.svg']
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
        className="object-cover cursor-pointer"
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
