import JSZip from 'jszip'

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

function extFromUrl(url: string): string {
  if (url.startsWith('data:')) {
    const mime = url.slice(5, url.indexOf(';') !== -1 ? url.indexOf(';') : url.indexOf(','))
    return MIME_TO_EXT[mime] || 'bin'
  }
  const clean = url.split('?')[0].split('#')[0]
  const dot = clean.lastIndexOf('.')
  return dot >= 0 && dot > clean.lastIndexOf('/') ? clean.slice(dot + 1) : 'bin'
}

// data: URL — распаковываем вручную через atob(), а не fetch(): fetch() на
// data: подпадает под connect-src CSP и тихо блокируется (см. lib/openFile.ts).
async function fileToBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith('data:')) {
    const commaIndex = url.indexOf(',')
    const base64 = url.slice(commaIndex + 1)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

function sanitizeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'файл'
}

export interface ZipFileEntry {
  url: string
  name: string
}

/**
 * Скачивает набор файлов (листовки, прайс-листы и т.п.) одним ZIP-архивом.
 * Файлы, которые не удалось загрузить, пропускаются — один битый файл не
 * должен срывать скачивание всех остальных.
 */
export async function downloadFilesAsZip(files: ZipFileEntry[], zipFilename: string): Promise<{ downloaded: number; failed: number }> {
  const zip = new JSZip()
  const usedNames = new Set<string>()
  let downloaded = 0
  let failed = 0

  for (const file of files) {
    if (!file.url) continue
    try {
      const bytes = await fileToBytes(file.url)
      const ext = extFromUrl(file.url)
      const base = sanitizeName(file.name)
      let filename = `${base}.${ext}`
      let counter = 2
      while (usedNames.has(filename)) {
        filename = `${base} (${counter}).${ext}`
        counter += 1
      }
      usedNames.add(filename)
      zip.file(filename, bytes)
      downloaded += 1
    } catch {
      failed += 1
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipFilename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)

  return { downloaded, failed }
}
