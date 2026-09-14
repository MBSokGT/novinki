// Минимальный service worker — нужен только чтобы браузер считал сайт
// устанавливаемым как приложение (PWA). Никакого офлайн-кэша каталога и
// никакого перехвата запросов: раньше здесь стоял обработчик 'fetch',
// который на Safari ломал загрузку картинок (FetchEvent.respondWith
// падал с "Load failed" даже на собственных, локальных файлах). Без него
// все запросы идут напрямую в сеть, как без service worker'а вообще —
// современным браузерам обработчик fetch для установки PWA не обязателен.
const CACHE_VERSION = 'v2'
const CACHE_NAME = `novinki-shell-${CACHE_VERSION}`

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})
