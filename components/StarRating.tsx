'use client'

interface StarRatingProps {
  rating: number
  userRating?: number
  onRate?: (rating: number) => void
  readonly?: boolean
}

export default function StarRating({ rating, userRating, onRate, readonly }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => !readonly && onRate?.(star)}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition`}
        >
          <svg 
            className={`w-5 h-5 ${
              star <= (userRating || rating) 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-slate-300'
            }`} 
            fill={star <= (userRating || rating) ? 'currentColor' : 'none'}
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      ))}
      {rating > 0 && <span className="text-sm text-slate-600 ml-1">({rating.toFixed(1)})</span>}
    </div>
  )
}
