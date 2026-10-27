import { describe, expect, it } from 'vitest'
import { imageSources, pickCachedImage, planOfflineSync } from '@/lib/offlineSyncPlan'

const origin = 'https://shop.test'
const staticPrefix = `${origin}/_next/static/`
const imagePrefix = `${origin}/_next/image?`
const img = (src: string, w = 750) => `${imagePrefix}url=${encodeURIComponent(src)}&w=${w}&q=75`

const input = (over: Partial<Parameters<typeof planOfflineSync>[0]> = {}) => ({
  known: new Set<string>(),
  staticPrefix,
  imagePrefix,
  loadedStatic: [] as string[],
  wantedImages: new Map<string, string>(),
  onScreen: new Set<string>(),
  ...over,
})

describe('что синхронизировать для работы без сети', () => {
  it('скачивает только то, чего ещё нет, и убирает устаревшие файлы приложения', () => {
    const plan = planOfflineSync(
      input({
        known: new Set([`${staticPrefix}old.js`, `${staticPrefix}keep.js`, `${origin}/__offline/catalog.json`]),
        loadedStatic: [`${staticPrefix}keep.js`, `${staticPrefix}new.js`],
      })
    )
    expect(plan.deleteUrls).toEqual([`${staticPrefix}old.js`])
    expect(plan.fetchStatic).toEqual([`${staticPrefix}new.js`])
  })

  it('если страница файлов не загрузила, файлы приложения не трогает', () => {
    const plan = planOfflineSync(input({ known: new Set([`${staticPrefix}a.js`]), loadedStatic: [] }))
    expect(plan.deleteUrls).toEqual([])
    expect(plan.fetchStatic).toEqual([])
  })

  it('фото: оставляет нужные и те, что на экране, удаляет ушедшие товары', () => {
    const gone = img('/gone.png')
    const kept = img('/kept.png')
    const keptOtherWidth = img('/kept.png', 384)
    const logo = img('/logo.png', 128)
    const plan = planOfflineSync(
      input({
        known: new Set([gone, kept, keptOtherWidth, logo]),
        wantedImages: new Map([[kept, '/kept.png'], [img('/fresh.png'), '/fresh.png']]),
        onScreen: new Set([logo]),
      })
    )
    expect(plan.deleteUrls).toEqual([gone])
    expect(plan.fetchImages).toEqual([img('/fresh.png')])
  })

  it('фото страницы, которых ещё нет в хранилище, тоже скачивает — один раз', () => {
    const logo = img('/logo.png', 128)
    const plan = planOfflineSync(input({ wantedImages: new Map([[logo, '/logo.png']]), onScreen: new Set([logo, `${origin}/other.png`]) }))
    expect(plan.fetchImages).toEqual([logo])
  })
})

describe('фото товаров для сохранения', () => {
  it('берёт первое фото, без повторов и пустых, не больше лимита', () => {
    const products = [
      { image_url: '/a.png', images: ['/a1.png', '/a2.png'] },
      { image_url: '/b.png', images: [] },
      { image_url: '', images: [] },
      { image_url: '/b.png' },
      { image_url: '/c.png' },
    ]
    expect(imageSources(products, 10)).toEqual(['/a1.png', '/b.png', '/c.png'])
    expect(imageSources(products, 2)).toEqual(['/a1.png', '/b.png'])
  })
})

describe('поиск сохранённого фото', () => {
  it('находит точную ширину, а если её нет — любую другую для того же фото', () => {
    const keys = [img('/x.png', 384), img('/y.png', 750), `${origin}/api/other?url=%2Fx.png`]
    expect(pickCachedImage(keys, '/y.png', img('/y.png'))).toBe(img('/y.png', 750))
    expect(pickCachedImage(keys, '/x.png', img('/x.png', 750))).toBe(img('/x.png', 384))
    expect(pickCachedImage(keys, '/none.png', img('/none.png'))).toBeNull()
  })
})
