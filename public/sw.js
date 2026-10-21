// Service worker: делает сайт устанавливаемым как приложение (PWA) и открывает
// его без сети — из копии, которую сама страница кладёт в хранилище
// 'novinki-offline-v1' (см. lib/offlineCache.ts).
//
// Важно: раньше здесь стоял обработчик 'fetch', который пропускал ВСЕ запросы
// через respondWith(fetch(event.request)) — на Safari это ломало загрузку
// картинок ("Load failed" даже на собственных файлах). Поэтому теперь:
//  - обычные запросы (фото, файлы, данные) service worker не трогает вообще,
//    они идут напрямую в сеть, как без него;
//  - перехватываются только открытие страницы и, когда связи нет, файлы
//    приложения и фото — и отвечает на них только копия из хранилища,
//    через fetch(event.request) мы никогда не проксируем.
const CACHE_VERSION = 'v3'
const CACHE_NAME = `novinki-shell-${CACHE_VERSION}`
const OFFLINE_CACHE = 'novinki-offline-v1'
// Адрес приложения: '/novinki' на тестовом сервере и '' на основном
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '')
// Сколько ждать сайт при открытии страницы, прежде чем показать копию
const NAVIGATION_TIMEOUT_MS = 6000

// Сеть пропала, пока service worker жив: файлы и фото берём из копии
let networkLost = false

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // Старые версии оболочки удаляем; хранилище с каталогом и фото не трогаем
      Promise.all(keys.filter((key) => key.startsWith('novinki-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('offline', () => {
  networkLost = true
})
self.addEventListener('online', () => {
  networkLost = false
})

async function cachedPage(request) {
  const cache = await caches.open(OFFLINE_CACHE)
  const url = new URL(request.url)
  const home = `${self.location.origin}${BASE || '/'}`
  return (
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match(`${url.origin}${url.pathname.replace(/\/$/, '')}`)) ||
    (await cache.match(home))
  )
}

async function cachedFile(request) {
  const cache = await caches.open(OFFLINE_CACHE)
  const url = new URL(request.url)
  const exact = await cache.match(request, { ignoreVary: true })
  if (exact) return exact
  if (url.pathname === `${BASE}/_next/image`) {
    // то же фото в другой ширине
    const source = url.searchParams.get('url')
    for (const key of await cache.keys()) {
      const candidate = new URL(key.url)
      if (candidate.pathname === url.pathname && candidate.searchParams.get('url') === source) {
        return cache.match(key, { ignoreVary: true })
      }
    }
  }
  return undefined
}

async function openPage(request) {
  const saved = await cachedPage(request)
  // Копии нет — открываем как обычно, браузер сам покажет свою ошибку
  if (!saved) return fetch(request)
  if (self.navigator.onLine === false) return saved

  const network = fetch(request)
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAVIGATION_TIMEOUT_MS))
  try {
    const first = await Promise.race([network, timeout])
    if (first) {
      networkLost = false
      return first
    }
  } catch {
    // сайт не отвечает — ниже отдадим копию
  }
  networkLost = true
  // Медленный ответ, который всё же придёт, никуда не денется — просто его не ждём
  network.catch(() => {})
  return saved
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(openPage(request))
    return
  }

  const isAppFile = url.pathname.startsWith(`${BASE}/_next/static/`)
  const isPhoto = url.pathname === `${BASE}/_next/image`
  if ((isAppFile || isPhoto) && (networkLost || self.navigator.onLine === false)) {
    event.respondWith(cachedFile(request).then((hit) => hit || Response.error()))
  }
})
