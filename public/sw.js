// Минимальный service worker — нужен только чтобы браузер считал сайт
// устанавливаемым как приложение (PWA). Никакого офлайн-кэша каталога:
// данные всегда идут напрямую в сеть, поэтому кэш не разрастается и
// карточки никогда не показываются устаревшими.
const CACHE_VERSION = 'v1'
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

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
