import type { Product } from '@/types/product'

// Решения «что сохранить, а что удалить» для работы без сети — чистые функции
// без обращений к браузеру, чтобы их можно было проверить тестами. Сами
// скачивания и записи делает lib/offlineCache.ts.

export interface SyncInput {
  // Адреса, которые уже лежат в хранилище
  known: ReadonlySet<string>
  staticPrefix: string
  imagePrefix: string
  // Файлы приложения, которые страница сейчас загрузила
  loadedStatic: readonly string[]
  // Нужные фото каталога: адрес оптимизатора → исходный адрес фото
  wantedImages: ReadonlyMap<string, string>
  // Адреса картинок, которые сейчас на экране
  onScreen: ReadonlySet<string>
}

export interface SyncPlan {
  deleteUrls: string[]
  fetchStatic: string[]
  fetchImages: string[]
}

// Исходный адрес фото из адреса оптимизатора (параметр url)
const sourceOf = (optimizerUrl: string) => new URL(optimizerUrl).searchParams.get('url')

export function planOfflineSync(input: SyncInput): SyncPlan {
  const { known, staticPrefix, imagePrefix, loadedStatic, wantedImages, onScreen } = input
  const deleteUrls: string[] = []

  // Файлы приложения: пока страница ничего не загрузила, не судим, что устарело
  const currentStatic = new Set(loadedStatic)
  if (currentStatic.size > 0) {
    for (const url of known) if (url.startsWith(staticPrefix) && !currentStatic.has(url)) deleteUrls.push(url)
  }
  const fetchStatic = currentStatic.size > 0 ? loadedStatic.filter((url) => !known.has(url)) : []

  // Фото: нужное и то, что на экране, оставляем — в любой ширине
  const wantedSources = new Set(wantedImages.values())
  for (const url of known) {
    if (!url.startsWith(imagePrefix) || wantedImages.has(url) || onScreen.has(url)) continue
    const source = sourceOf(url)
    if (source === null || !wantedSources.has(source)) deleteUrls.push(url)
  }
  const pageImages = [...onScreen].filter((url) => url.startsWith(imagePrefix))
  const fetchImages = [...new Set([...wantedImages.keys(), ...pageImages])].filter((url) => !known.has(url))

  return { deleteUrls, fetchStatic, fetchImages }
}

// По одному главному фото на товар, без повторов и пустых, не больше max
export function imageSources(products: Array<Pick<Product, 'image_url' | 'images'>>, max: number): string[] {
  const sources = products.map((p) => p.images?.[0] || p.image_url).filter((s): s is string => Boolean(s))
  return [...new Set(sources)].slice(0, max)
}

// Какое сохранённое фото отдать: точно такой же адрес, а если его нет —
// то же фото в другой ширине
export function pickCachedImage(cachedUrls: readonly string[], source: string, exactUrl: string): string | null {
  if (cachedUrls.includes(exactUrl)) return exactUrl
  const sameImage = cachedUrls.find((url) => {
    const parsed = new URL(url)
    return parsed.pathname.endsWith('/_next/image') && parsed.searchParams.get('url') === source
  })
  return sameImage === undefined ? null : sameImage
}
