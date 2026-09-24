import Image from 'next/image'

// Мягкие фоны в гамме бренда: цвет выбирается по названию, чтобы одинаковые
// бренды выглядели одинаково, а соседние карточки без фото не сливались.
const PALETTE: Array<[string, string]> = [
  ['#F5ECEC', '#9B1B1B'],
  ['#EEF1F4', '#475569'],
  ['#F4EFE7', '#8A6A3B'],
  ['#ECF2EE', '#3F6B52'],
  ['#F1EDF3', '#6B4E7A'],
]

const SIZES = {
  sm: 'text-sm',
  md: 'text-2xl',
  lg: 'text-4xl',
}

export function monogram(label: string): string {
  const words = label
    .replace(/[«»"'“”„()[\].,:;!?/\\-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\d]/u.test(w))
  return ((words[0]?.[0] || '?') + (words[1]?.[0] || '')).toUpperCase()
}

function colorFor(label: string): [string, string] {
  let hash = 0
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

interface ImageWithFallbackProps {
  src?: string | null
  alt: string
  // По чему строить инициалы, если фото нет: для товара — бренд, для вендора — название.
  label: string
  size?: keyof typeof SIZES
  className?: string
  loading?: 'lazy' | 'eager'
  // Реальная ширина показа — без неё браузер качает фото под ширину всего экрана
  sizes?: string
}

// Сетка карточек: 1 колонка на телефоне, 2 на планшете, 3–4 на компьютере
const CARD_SIZES = '(min-width: 1280px) 320px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'

export default function ImageWithFallback({ src, alt, label, size = 'lg', className = 'object-cover', loading, sizes }: ImageWithFallbackProps) {
  if (src) return <Image src={src} alt={alt} fill className={className} loading={loading} sizes={sizes ?? (size === 'lg' ? CARD_SIZES : '96px')} />
  const [bg, fg] = colorFor(label)
  return (
    <div
      role="img"
      aria-label={alt}
      className={`absolute inset-0 flex select-none items-center justify-center font-bold tracking-wide ${SIZES[size]}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      {monogram(label)}
    </div>
  )
}
