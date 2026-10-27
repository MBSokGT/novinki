import { useEffect, useState, useSyncExternalStore } from 'react'

import type { Product } from '@/types/product'
import { imageSources, pickCachedImage, planOfflineSync } from '@/lib/offlineSyncPlan'

// Работа без сети. Телефон хранит копию каталога (список товаров), фото
// карточек и файлы самого приложения, чтобы на складе или в зале без связи
// можно было открыть Новинки и посмотреть товары. Всё лежит в одном
// хранилище браузера (Cache Storage) и перезаписывается при каждой удачной
// загрузке — со временем оно не разрастается: фото товаров, которых уже нет в
// каталоге, и старые файлы приложения удаляются при синхронизации.
//
// Каталог на сайте открыт без входа, так что копия — те же данные, что видит
// любой посетитель. При выходе из аккаунта хранилище всё равно очищается
// (clearOfflineData) — на случай, если часть данных когда-нибудь закроют.

export const OFFLINE_CACHE = 'novinki-offline-v1'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
const MAX_IMAGES = 400
const IMAGE_WIDTH = 750

export interface SavedList<T> {
  data: T
  savedAt: string
}

// Меняется при выходе из аккаунта: загрузки, начатые до выхода, не должны
// дописать в хранилище ничего после очистки.
let epoch = 0

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
  const startedAt = epoch
  try {
    const cache = await caches.open(OFFLINE_CACHE)
    if (startedAt !== epoch) return
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
  epoch++
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

  const startedAt = epoch
  const stale = () => startedAt !== epoch
  try {
    const cache = await caches.open(OFFLINE_CACHE)
    if (stale()) return
    const known = new Set((await cache.keys()).map((request) => request.url))
    const staticPrefix = absolute(`${BASE_PATH}/_next/static/`)
    const imagePrefix = absolute(`${BASE_PATH}/_next/image?`)
    const onScreen = new Set([...document.images].map((img) => img.currentSrc).filter(Boolean))

    // Что скачать и что удалить — решает чистая функция (lib/offlineSyncPlan.ts)
    const plan = planOfflineSync({
      known,
      staticPrefix,
      imagePrefix,
      loadedStatic: performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => name.startsWith(staticPrefix)),
      wantedImages: new Map(imageSources(products, MAX_IMAGES).map((src) => [absolute(optimizedImageUrl(src)), src])),
      onScreen,
    })
    for (const url of plan.deleteUrls) await cache.delete(url)

    // Файлы приложения (скрипты, стили, шрифты) — чтобы оно открылось без сети
    await runPool(plan.fetchStatic, 4, async (url) => {
      const response = await fetch(url).catch(() => null)
      if (response?.ok && !stale()) await putResponse(cache, url, response)
    })

    // Сама страница — каждый раз заново: после обновления сайта в ней новые адреса файлов
    const home = absolute(BASE_PATH || '/')
    const page = await fetch(home, { credentials: 'include' }).catch(() => null)
    if (page?.ok && !stale()) await putResponse(cache, home, page)

    // Фото карточек, логотип и другие фото страницы
    await runPool(plan.fetchImages, 3, async (url) => {
      const response = await fetch(url).catch(() => null)
      if (response?.ok && !stale()) await cache.put(url, response)
    })
  } catch {
    // синхронизация — дополнение, сайт работает и без неё
  }
}

// Фото из хранилища по исходному адресу — в любой ширине, какая там есть
async function findCachedImage(src: string): Promise<Response | null> {
  if (!supported()) return null
  const cache = await caches.open(OFFLINE_CACHE)
  const exact = absolute(optimizedImageUrl(src))
  const found = pickCachedImage((await cache.keys()).map((request) => request.url), src, exact)
  return found ? (await cache.match(found, { ignoreVary: true })) || null : null
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
