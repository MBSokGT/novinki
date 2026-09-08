'use client'

import { useEffect, useState } from 'react'

// Город хранится у каждого сотрудника локально в браузере — это чисто
// клиентское удобство (подстановка городского поддомена в ссылку на товар),
// без него ссылки просто ведут на московский complexbar.ru как раньше.
const STORAGE_KEY = 'complexbar_city_host'

export function useComplexbarCity() {
  const [cityHost, setCityHostState] = useState<string | null>(null)

  useEffect(() => {
    try {
      setCityHostState(localStorage.getItem(STORAGE_KEY))
    } catch {
      // localStorage недоступен (приватный режим и т.п.) — остаёмся без города
    }
  }, [])

  const setCityHost = (host: string | null) => {
    setCityHostState(host)
    try {
      if (host) localStorage.setItem(STORAGE_KEY, host)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return { cityHost, setCityHost }
}
