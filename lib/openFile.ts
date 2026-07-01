// Browsers block navigating a new tab directly to a data: URL (results in
// about:blank), which is how flyers/photos are stored when
// NEXT_PUBLIC_STORAGE_DRIVER=base64. Converting to a Blob URL first works
// reliably in all browsers; regular URLs (filesystem storage mode) are
// opened as-is. We decode the base64 manually with atob() rather than
// fetch(dataUrl) — fetch() is subject to the app's connect-src CSP and gets
// silently blocked there, which defeats the whole point of this helper.
export function openFileInNewTab(url: string) {
  if (!url) return

  if (!url.startsWith('data:')) {
    window.open(url, '_blank', 'noopener')
    return
  }

  try {
    const commaIndex = url.indexOf(',')
    const header = url.slice(5, commaIndex)
    const base64 = url.slice(commaIndex + 1)
    const mime = header.split(';')[0] || 'application/octet-stream'

    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    const blob = new Blob([bytes], { type: mime })
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}
