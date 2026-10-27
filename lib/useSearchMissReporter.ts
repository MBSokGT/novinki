import { useEffect, useRef } from 'react'

import { normalizeMissQuery } from '@/lib/searchMissQuery'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
// Ждём, пока человек закончит печатать: «си», «сиф», «сифо» — не запросы
const SETTLE_MS = 1500

// Сообщает серверу, что по запросу ничего не нашлось ни в одном разделе
// каталога. Один и тот же запрос за визит отправляется один раз.
export function useSearchMissReporter(query: string, foundAnywhere: boolean, enabled: boolean) {
  const sent = useRef(new Set<string>())

  useEffect(() => {
    const normalized = normalizeMissQuery(query)
    if (!enabled || foundAnywhere || !normalized || sent.current.has(normalized)) return
    const timer = setTimeout(() => {
      sent.current.add(normalized)
      fetch(`${BASE_PATH}/api/internal/search-miss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: normalized }),
      }).catch(() => {
        // журнал — дополнение, на поиск не влияет
      })
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [query, foundAnywhere, enabled])
}
