import { useSyncExternalStore } from 'react'

// Подборка для клиента: идентификаторы отмеченных товаров. Хранятся в самом
// браузере (до 60 штук — это несколько сотен байт), пока менеджер не очистит
// подборку или не создаст по ней ссылку.
const KEY = 'novinki:selection'
export const MAX_SELECTION = 60

let ids: string[] = []
let loaded = false
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, MAX_SELECTION) : []
  } catch {
    return []
  }
}

function commit(next: string[]) {
  ids = next
  try {
    if (next.length > 0) window.localStorage.setItem(KEY, JSON.stringify(next))
    else window.localStorage.removeItem(KEY)
  } catch {
    // браузер не даёт писать — подборка живёт до перезагрузки страницы
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true
    ids = read()
    window.addEventListener('storage', (event) => {
      if (event.key === KEY) {
        ids = read()
        listeners.forEach((l) => l())
      }
    })
  }
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

const EMPTY: string[] = []

export function useSelection() {
  const current = useSyncExternalStore(subscribe, () => ids, () => EMPTY)
  return {
    ids: current,
    has: (id: string) => current.includes(id),
    toggle: (id: string): 'added' | 'removed' | 'full' => {
      if (ids.includes(id)) {
        commit(ids.filter((x) => x !== id))
        return 'removed'
      }
      if (ids.length >= MAX_SELECTION) return 'full'
      commit([...ids, id])
      return 'added'
    },
    remove: (id: string) => commit(ids.filter((x) => x !== id)),
    clear: () => commit([]),
  }
}
