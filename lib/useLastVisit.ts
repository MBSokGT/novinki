'use client'

import { useEffect, useState } from 'react'

const LAST_VISIT_KEY = 'novinki_last_visit'
const SESSION_KEY = 'novinki_prev_visit'

// Время прошлого визита этого браузера — для бейджа "Новое". Внутри одной
// сессии значение фиксируется в sessionStorage, чтобы бейджи не пропадали
// от перезагрузки страницы или перехода между вкладками каталога; при
// следующем заходе "прошлым визитом" станет последний заход этой сессии.
// При самом первом визите возвращает null — иначе новым считалось бы всё.
export function useLastVisit(): string | null {
  const [since, setSince] = useState<string | null>(null)

  useEffect(() => {
    try {
      let previous = sessionStorage.getItem(SESSION_KEY)
      if (previous === null) {
        previous = localStorage.getItem(LAST_VISIT_KEY) || ''
        sessionStorage.setItem(SESSION_KEY, previous)
      }
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString())
      // eslint-disable-next-line react-hooks/set-state-in-effect -- значение из браузерного хранилища доступно только после монтирования
      setSince(previous || null)
    } catch {
      // хранилище недоступно (приватный режим и т.п.) — просто без бейджей
    }
  }, [])

  return since
}

export function isNewSince(createdAt: string | undefined, since: string | null): boolean {
  return Boolean(since && createdAt && createdAt > since)
}
