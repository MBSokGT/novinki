import { saveUploadedFile } from './storage'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const CONCURRENCY = 6

// Сервер скачивает по этим ссылкам сам, поэтому пускаем только complexbar.ru
// и его CDN — иначе админка превращается в прокси на любой адрес (SSRF).
export function isMirrorableImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return host === 'complexbar.ru' || host.endsWith('.complexbar.ru') || host.endsWith('.scalesta-cdn.com')
}

async function readLimited(response: Response, limit: number): Promise<Buffer | null> {
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > limit) return null
  if (!response.body) return null
  const chunks: Uint8Array[] = []
  let total = 0
  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

// Ссылки на картинки с CDN complexbar.ru подписанные и со временем перестают
// открываться сами по себе, поэтому храним копию у себя, как и обычное фото
// товара. При любой неудаче возвращаем исходную ссылку — лучше живая внешняя
// ссылка, чем пустое место вместо фото.
export async function mirrorImage(url: string): Promise<string> {
  if (!url) return url
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if (parsed.protocol !== 'https:' || !isMirrorableImageHost(parsed.hostname)) return url

  try {
    const response = await fetch(parsed, { signal: AbortSignal.timeout(10000), redirect: 'error' })
    if (!response.ok) return url
    const contentType = response.headers.get('content-type') || ''
    if (contentType && !contentType.startsWith('image/')) return url
    const buffer = await readLimited(response, MAX_IMAGE_BYTES)
    if (!buffer || buffer.length === 0) return url
    const ext = parsed.pathname.split('.').pop()?.toLowerCase() || 'jpg'
    return await saveUploadedFile('products', `variant.${/^[a-z0-9]{2,4}$/.test(ext) ? ext : 'jpg'}`, buffer)
  } catch {
    return url
  }
}

export async function mirrorImages(urls: string[]): Promise<string[]> {
  const result = [...urls]
  let cursor = 0
  async function worker() {
    while (cursor < result.length) {
      const i = cursor++
      result[i] = await mirrorImage(result[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, result.length) }, worker))
  return result
}
