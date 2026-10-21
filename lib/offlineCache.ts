import { useEffect, useState, useSyncExternalStore } from 'react'

import type { Product } from '@/types/product'

// Работа без сети. Телефон хранит копию каталога (список товаров), фото
// карточек и файлы самого приложения, чтобы на складе или в зале без связи
// можно было открыть Новинки и посмотреть товары. Всё лежит в одном
// хранилище браузера (Cache Storage) и перезаписывается при каждой удачной
// загрузке — со временем оно не разрастается: фото товаров, которых уже нет в
// каталоге, и старые файлы приложения удаляются при синхронизации.
//
// Копия каталога — это данные, видимые только после входа, поэтому при выходе
// из аккаунта хранилище очищается (clearOfflineData).

export const OFFLINE_CACHE = 'novinki-offline-v1'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
const MAX_IMAGES = 400
const IMAGE_WIDTH = 750

export interface SavedList<T> {
  data: T
  savedAt: string
}

const supported = () => typeof window !== 'undefined' && 'caches' in window

const absolute = (path: string) => new URL(path, window.location.origin).toString()

// Адрес фото так, как его запрашивает next/image: оптимизатор получает исходный
// адрес в параметре url — по нему же фото находится в хранилище без сети.
export function optimizedImageUrl(src: string, width = IMAGE_WIDTH): string {
  return `${BASE_PATH}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`
}

// Копия списка (каталога или вендоров) под своим именем
export async function saveOffline<T>(name: string, data: T): Promise<void> {
  if (!supported()) return
  try {
    const cache = await caches.open(OFFLINE_CACHE)
    const body: SavedList<T> = { data, savedAt: new Date().toISOString() }
    await cache.put(absolute(`${BASE_PATH}/__offline/${name}.json`), new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }))
  } catch {
    // нет места или хранилище недоступно — без сети этот список не откроется
  }
}

export async function loadOffline<T>(name: string): Promise<SavedList<T> | null> {
  if (!supported()) return null
  try {
    const cache = await caches.open(OFFLINE_CACHE)
    const hit = await cache.match(absolute(`${BASE_PATH}/__offline/${name}.json`))
    if (!hit) return null
    const saved = (await hit.json()) as SavedList<T>
    return saved && 'data' in saved ? saved : null
  } catch {
    return null
  }
}

export async function clearOfflineData(): Promise<void> {
  if (!supported()) return
  try {
    await caches.delete(OFFLINE_CACHE)
  } catch {
    // ничего страшного
  }
}

async function putResponse(cache: Cache, url: string, response: Response) {
  // Ответ с перенаправлением нельзя отдавать как страницу без сети — пересобираем
  const body = await response.blob()
  await cache.put(url, new Response(body, { status: 200, headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream' } }))
}

async function runPool<T>(items: T[], size: number, task: (item: T) => Promise<void>) {
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await task(items[next++])
    })
  )
}

// Докладывает в хранилище то, чего там ещё нет: сама страница и её файлы
// (чтобы приложение открылось без сети) и фото товаров. Запускается после
// каждой удачной загрузки каталога; повторно скачивает только новое.
export async function syncOfflineFiles(products: Product[]): Promise<void> {
  if (!supported() || !navigator.onLine) return
  // Режим экономии трафика — фото в запас не качаем
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return

  try {
    const cache = await caches.open(OFFLINE_CACHE)
    const known = new Set((await cache.keys()).map((request) => request.url))

    // 1. Файлы приложения, которые страница уже загрузила (скрипты, стили, шрифты)
    const staticPrefix = absolute(`${BASE_PATH}/_next/static/`)
    const loaded = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.startsWith(staticPrefix))
    const currentStatic = new Set(loaded)
    if (currentStatic.size > 0) {
      for (const url of known) if (url.startsWith(staticPrefix) && !currentStatic.has(url)) await cache.delete(url)
      await runPool(
        loaded.filter((url) => !known.has(url)),
        4,
        async (url) => {
          const response = await fetch(url).catch(() => null)
          if (response?.ok) await putResponse(cache, url, response)
        }
      )
    }

    // 2. Сама страница — каждый раз заново: после обновления сайта в ней новые адреса файлов
    const home = absolute(BASE_PATH || '/')
    const page = await fetch(home, { credentials: 'include' }).catch(() => null)
    if (page?.ok) await putResponse(cache, home, page)

    // 3. Фото карточек — по одному главному фото на товар
    const sources = [...new Set(products.map((p) => p.images?.[0] || p.image_url).filter((s): s is string => Boolean(s)))].slice(0, MAX_IMAGES)
    const wanted = new Map(sources.map((src) => [absolute(optimizedImageUrl(src)), src]))
    // фото, которые сейчас на экране (логотип и т.п.), тоже оставляем
    const onScreen = new Set([...document.images].map((img) => img.currentSrc).filter(Boolean))
    const imagePrefix = absolute(`${BASE_PATH}/_next/image?`)
    for (const url of known) {
      if (url.startsWith(imagePrefix) && !wanted.has(url) && !onScreen.has(url)) {
        const stillUsed = [...wanted.keys()].some((w) => new URL(w).searchParams.get('url') === new URL(url).searchParams.get('url'))
        if (!stillUsed) await cache.delete(url)
      }
    }
    // логотип и другие фото страницы, которые оптимизатор уже отдал, тоже сохраняем
    const pageImages = [...onScreen].filter((url) => url.startsWith(imagePrefix))
    await runPool(
      [...new Set([...wanted.keys(), ...pageImages])].filter((url) => !known.has(url)),
      3,
      async (url) => {
        const response = await fetch(url).catch(() => null)
        if (response?.ok) await cache.put(url, response)
      }
    )
  } catch {
    // синхронизация — дополнение, сайт работает и без неё
  }
}

// Фото из хранилища по исходному адресу — в любой ширине, какая там есть
async function findCachedImage(src: string): Promise<Response | null> {
  if (!supported()) return null
  const cache = await caches.open(OFFLINE_CACHE)
  const exact = await cache.match(absolute(optimizedImageUrl(src)), { ignoreVary: true })
  if (exact) return exact
  for (const request of await cache.keys()) {
    const url = new URL(request.url)
    if (url.pathname.endsWith('/_next/image') && url.searchParams.get('url') === src) return (await cache.match(request, { ignoreVary: true })) || null
  }
  return null
}

// --- Режим «нет связи» -------------------------------------------------

let offlineMode = false
const listeners = new Set<() => void>()

export function setOfflineMode(on: boolean) {
  if (offlineMode === on) return
  offlineMode = on
  listeners.forEach((listener) => listener())
}

export function useOfflineMode(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    () => offlineMode,
    () => false
  )
}

// В режиме «нет связи» подменяет адрес фото на копию из хранилища. В обычном
// режиме возвращает адрес как есть и ничего не делает.
export function useOfflineImage(src?: string | null): { src?: string | null; unoptimized: boolean } {
  const offline = useOfflineMode()
  const [local, setLocal] = useState<{ for: string; url: string } | null>(null)

  useEffect(() => {
    if (!offline || !src) return
    let objectUrl: string | null = null
    let cancelled = false
    findCachedImage(src)
      .then(async (response) => {
        if (!response || cancelled) return
        objectUrl = URL.createObjectURL(await response.blob())
        setLocal({ for: src, url: objectUrl })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [offline, src])

  if (offline && src && local?.for === src) return { src: local.url, unoptimized: true }
  return { src, unoptimized: false }
}
