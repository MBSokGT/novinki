import type { PDFFont, PDFImage, PDFPage, RGB } from 'pdf-lib'

// Листовка-анонс или подборка в PDF в фирменном стиле «Комплекс-Бар»:
// обложка с заголовком и фото, необязательная страница с текстом и страницы
// с товарами по категориям (фото, название, артикулы). Собирается прямо в
// браузере из данных каталога — отдельного сервиса не нужно. Библиотеки
// подгружаются только в момент создания файла.

export interface FlyerItem {
  name: string
  brand?: string
  category?: string
  // Главный артикул и артикулы вариантов серии
  articles: string[]
  image_url?: string
}

export function productToFlyerItem(p: {
  name: string
  brand?: string
  category?: string
  article_number?: string
  image_url?: string
  images?: string[]
  variants?: Array<{ article_number?: string }>
}): FlyerItem {
  const articles = [p.article_number, ...(p.variants || []).map((v) => v.article_number)].map((a) => (a || '').trim()).filter(Boolean)
  return {
    name: p.name,
    brand: p.brand,
    category: p.category,
    articles: [...new Set(articles)],
    image_url: p.images?.[0] || p.image_url || undefined,
  }
}

export interface FlyerOptions {
  // Подпись в «таблетке» на обложке: «новинка», «подборка»
  badge: string
  title: string
  subtitle?: string
  // Текст отдельной страницы после обложки (необязательно)
  intro?: string
  items: FlyerItem[]
  onProgress?: (done: number, total: number) => void
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
const PAGE = { w: 595.28, h: 841.89 }
const MARGIN = 36
const CONTACTS = 'Т/Ф: +7 495 431-90-60    info@complexbar.ru    www.complexbar.ru'
const COLORS = {
  red: [0.608, 0.106, 0.106] as const,
  ink: [0.1, 0.1, 0.1] as const,
  gray: [0.42, 0.45, 0.5] as const,
  rule: [0.82, 0.84, 0.86] as const,
  tile: [0.935, 0.938, 0.945] as const,
  white: [1, 1, 1] as const,
}

// Размеры в названиях с complexbar.ru («,L=18,4,B=19,8см») в листовке только мешают
const DIMENSIONS = /\s*,?\s*\b[DHLWBВ]=\d+(?:[.,]\d+)?(?:\s*,\s*[DHLWBВ]=\d+(?:[.,]\d+)?)*\s*(?:мм|см|м)?\.?/gi
export const cleanProductName = (name: string) => name.replace(DIMENSIONS, ' ').replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').trim()

interface Fonts {
  regular: PDFFont
  bold: PDFFont
  heavy: PDFFont
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = Infinity): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    let last = kept[maxLines - 1]
    while (last.length > 1 && font.widthOfTextAtSize(`${last}…`, size) > maxWidth) last = last.slice(0, -1)
    kept[maxLines - 1] = `${last.trimEnd()}…`
    return kept
  }
  return lines
}

// Фото каталога — через оптимизатор сайта (тот же адрес, без проблем с CORS у
// внешних картинок), перерисовываем в JPEG: так подойдут и webp, и png.
async function loadPhoto(src: string): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  try {
    const response = await fetch(`${BASE_PATH}/_next/image?url=${encodeURIComponent(src)}&w=640&q=75`)
    if (!response.ok) return null
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
    if (!blob) return null
    return { bytes: new Uint8Array(await blob.arrayBuffer()), width: bitmap.width, height: bitmap.height }
  } catch {
    return null
  }
}

const rgb = (pdf: typeof import('pdf-lib'), c: readonly [number, number, number]): RGB => pdf.rgb(c[0], c[1], c[2])

function roundedRect(w: number, h: number, r: number): string {
  return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
}

const STAR = 'M 6 0 L 7.8 4.3 L 12 4.6 L 8.8 7.5 L 9.8 12 L 6 9.6 L 2.2 12 L 3.2 7.5 L 0 4.6 L 4.2 4.3 Z'

export async function buildFlyerPdf(options: FlyerOptions): Promise<Uint8Array> {
  const pdf = await import('pdf-lib')
  const fontkit = (await import('@pdf-lib/fontkit')).default
  const doc = await pdf.PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(options.title)
  doc.setAuthor('Комплекс-Бар')

  const loadFont = async (file: string) => doc.embedFont(await (await fetch(`${BASE_PATH}/fonts/${file}`)).arrayBuffer(), { subset: true })
  const fonts: Fonts = {
    regular: await loadFont('Manrope-Regular.ttf'),
    bold: await loadFont('Manrope-Bold.ttf'),
    heavy: await loadFont('Manrope-ExtraBold.ttf'),
  }
  const color = (c: readonly [number, number, number]) => rgb(pdf, c)

  // Фото: грузим по порядку, чтобы не нагружать сайт и показывать прогресс
  const photos = new Map<string, PDFImage>()
  const unique = [...new Set(options.items.map((i) => i.image_url).filter((s): s is string => Boolean(s)))]
  for (const [i, src] of unique.entries()) {
    const photo = await loadPhoto(src)
    if (photo) photos.set(src, await doc.embedJpg(photo.bytes))
    options.onProgress?.(i + 1, unique.length)
  }

  const drawFooter = (page: PDFPage, pageNumber?: number) => {
    const y = 26
    // Логотип: чёрная плашка «КОМПЛЕКС» и красная «БАР»
    page.drawRectangle({ x: MARGIN, y: y - 3, width: 58, height: 13, color: color(COLORS.ink) })
    page.drawText('КОМПЛЕКС', { x: MARGIN + 4, y: y + 0.5, size: 7, font: fonts.heavy, color: color(COLORS.white) })
    page.drawRectangle({ x: MARGIN + 58, y: y - 3, width: 20, height: 13, color: color(COLORS.red) })
    page.drawText('БАР', { x: MARGIN + 61, y: y + 0.5, size: 7, font: fonts.heavy, color: color(COLORS.white) })
    const width = fonts.regular.widthOfTextAtSize(CONTACTS, 7.5)
    page.drawText(CONTACTS, { x: PAGE.w - MARGIN - width - (pageNumber ? 20 : 0), y: y + 0.5, size: 7.5, font: fonts.regular, color: color(COLORS.gray) })
    if (pageNumber) page.drawText(String(pageNumber), { x: PAGE.w - MARGIN - 8, y: y + 0.5, size: 7.5, font: fonts.bold, color: color(COLORS.ink) })
    page.drawLine({ start: { x: MARGIN, y: y + 16 }, end: { x: PAGE.w - MARGIN, y: y + 16 }, thickness: 0.5, color: color(COLORS.rule) })
  }

  const drawPhoto = (page: PDFPage, src: string | undefined, x: number, y: number, w: number, h: number, label: string) => {
    page.drawRectangle({ x, y, width: w, height: h, color: color(COLORS.tile) })
    const image = src ? photos.get(src) : undefined
    if (image) {
      const pad = Math.min(w, h) * 0.04
      const scale = Math.min((w - pad * 2) / image.width, (h - pad * 2) / image.height)
      // Multiply: белый фон фото растворяется в сером фоне плашки, остаётся только предмет
      page.drawImage(image, { x: x + (w - image.width * scale) / 2, y: y + (h - image.height * scale) / 2, width: image.width * scale, height: image.height * scale, blendMode: pdf.BlendMode.Multiply })
      return
    }
    // Нет фото — инициалы на мягкой плашке, как на сайте
    const letters = label.replace(/[«»"'()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
    const size = Math.min(w, h) * 0.3
    page.drawText(letters, { x: x + (w - fonts.heavy.widthOfTextAtSize(letters, size)) / 2, y: y + h / 2 - size * 0.35, size, font: fonts.heavy, color: color(COLORS.rule) })
  }

  // --- Обложка ---------------------------------------------------------
  const cover = doc.addPage([PAGE.w, PAGE.h])
  let y = PAGE.h - MARGIN - 6
  const badgeW = fonts.bold.widthOfTextAtSize(options.badge, 10) + 52
  cover.drawSvgPath(roundedRect(badgeW, 24, 12), { x: MARGIN, y: y + 15.5, borderColor: color(COLORS.ink), borderWidth: 1 })
  cover.drawText(options.badge, { x: MARGIN + 16, y: y - 3, size: 10, font: fonts.bold, color: color(COLORS.ink) })
  cover.drawSvgPath(STAR, { x: MARGIN + badgeW - 28, y: y + 9.5, borderColor: color(COLORS.ink), borderWidth: 1 })

  y -= 62
  for (const line of wrapText(options.title, fonts.heavy, 31, PAGE.w - MARGIN * 2, 4)) {
    cover.drawText(line, { x: MARGIN, y, size: 31, font: fonts.heavy, color: color(COLORS.ink) })
    y -= 37
  }
  if (options.subtitle?.trim()) {
    y -= 2
    for (const line of wrapText(options.subtitle.trim(), fonts.regular, 17, PAGE.w - MARGIN * 2, 3)) {
      cover.drawText(line, { x: MARGIN, y, size: 17, font: fonts.regular, color: color(COLORS.ink) })
      y -= 23
    }
  }

  // Коллаж из фото товаров под заголовком
  const pictured = options.items.filter((i) => i.image_url && photos.has(i.image_url)).slice(0, 5)
  const area = { x: MARGIN, y: 70, w: PAGE.w - MARGIN * 2, h: y - 70 - 6 }
  if (area.h > 120) {
    const gap = 10
    const tiles: Array<[number, number, number, number]> = []
    const n = pictured.length
    const half = (area.w - gap) / 2
    if (n === 1) tiles.push([area.x, area.y, area.w, area.h])
    else if (n === 2) tiles.push([area.x, area.y, half, area.h], [area.x + half + gap, area.y, half, area.h])
    else if (n === 3) {
      const small = (area.h - gap) / 2
      tiles.push([area.x, area.y, half, area.h], [area.x + half + gap, area.y + small + gap, half, small], [area.x + half + gap, area.y, half, small])
    } else if (n === 4) {
      const small = (area.h - gap) / 2
      for (const [col, row] of [[0, 1], [1, 1], [0, 0], [1, 0]]) tiles.push([area.x + col * (half + gap), area.y + row * (small + gap), half, small])
    } else if (n >= 5) {
      const big = area.w * 0.5
      const cell = (area.w - big - gap * 2) / 2
      const small = (area.h - gap) / 2
      tiles.push([area.x, area.y, big, area.h])
      for (const [col, row] of [[0, 1], [1, 1], [0, 0], [1, 0]]) tiles.push([area.x + big + gap + col * (cell + gap), area.y + row * (small + gap), cell, small])
    }
    tiles.forEach(([x, ty, w, h], i) => drawPhoto(cover, pictured[i]?.image_url, x, ty, w, h, pictured[i]?.name || ''))
  }
  drawFooter(cover)

  // --- Страница с текстом -----------------------------------------------
  if (options.intro?.trim()) {
    const page = doc.addPage([PAGE.w, PAGE.h])
    const paragraphs = options.intro.trim().split(/\n{1,}/).filter(Boolean)
    let ty = PAGE.h - MARGIN - 20
    page.drawText('Комплекс-Бар', { x: MARGIN, y: ty, size: 11, font: fonts.heavy, color: color(COLORS.red) })
    ty -= 46
    const [lead, ...rest] = paragraphs
    for (const line of wrapText(lead, fonts.bold, 15, PAGE.w - MARGIN * 2)) {
      page.drawText(line, { x: MARGIN, y: ty, size: 15, font: fonts.bold, color: color(COLORS.ink) })
      ty -= 22
    }
    ty -= 12
    for (const paragraph of rest) {
      for (const line of wrapText(paragraph, fonts.regular, 10.5, PAGE.w - MARGIN * 2)) {
        if (ty < 80) break
        page.drawText(line, { x: MARGIN, y: ty, size: 10.5, font: fonts.regular, color: color(COLORS.ink) })
        ty -= 15
      }
      ty -= 9
    }
    drawFooter(page)
  }

  // --- Страницы с товарами ----------------------------------------------
  const columns = 4
  const gap = 14
  const cellW = (PAGE.w - MARGIN * 2 - gap * (columns - 1)) / columns
  const photoH = 104
  const nameLines = 4
  const cellH = photoH + 10 + nameLines * 9.6 + 12 + 24
  const topY = PAGE.h - 64
  const bottomY = 62

  const groups = new Map<string, FlyerItem[]>()
  for (const item of options.items) {
    const key = (item.category || '').trim()
    groups.set(key, [...(groups.get(key) || []), item])
  }

  let page: PDFPage | null = null
  let cursor = 0
  let pageNumber = doc.getPageCount()
  const newPage = () => {
    if (page) drawFooter(page, pageNumber)
    page = doc.addPage([PAGE.w, PAGE.h])
    pageNumber = doc.getPageCount()
    page.drawText(options.title, { x: MARGIN, y: PAGE.h - 38, size: 8.5, font: fonts.bold, color: color(COLORS.gray) })
    cursor = topY
    return page
  }
  newPage()

  for (const [category, items] of groups) {
    const headingH = category ? 30 : 0
    if (cursor - headingH - cellH < bottomY) newPage()
    const current = () => page as PDFPage
    if (category) {
      current().drawText(category, { x: MARGIN, y: cursor - 12, size: 12, font: fonts.bold, color: color(COLORS.ink) })
      current().drawLine({ start: { x: MARGIN, y: cursor - 20 }, end: { x: PAGE.w - MARGIN, y: cursor - 20 }, thickness: 0.6, color: color(COLORS.rule) })
      cursor -= headingH
    }
    for (let i = 0; i < items.length; i += columns) {
      if (cursor - cellH < bottomY) {
        newPage()
        if (category) {
          current().drawText(category, { x: MARGIN, y: cursor - 12, size: 12, font: fonts.bold, color: color(COLORS.ink) })
          current().drawLine({ start: { x: MARGIN, y: cursor - 20 }, end: { x: PAGE.w - MARGIN, y: cursor - 20 }, thickness: 0.6, color: color(COLORS.rule) })
          cursor -= headingH
        }
      }
      items.slice(i, i + columns).forEach((item, col) => {
        const x = MARGIN + col * (cellW + gap)
        const top = cursor - 4
        drawPhoto(current(), item.image_url, x, top - photoH, cellW, photoH, item.brand || item.name)
        let ty = top - photoH - 14
        for (const line of wrapText(cleanProductName(item.name), fonts.bold, 7.6, cellW, nameLines)) {
          current().drawText(line, { x, y: ty, size: 7.6, font: fonts.bold, color: color(COLORS.ink) })
          ty -= 9.6
        }
        ty = top - photoH - 14 - nameLines * 9.6 - 4
        if (item.brand) {
          current().drawText(wrapText(item.brand, fonts.regular, 7, cellW, 1)[0], { x, y: ty, size: 7, font: fonts.regular, color: color(COLORS.gray) })
          ty -= 11
        }
        const shown = item.articles.slice(0, 6)
        const articleText = shown.join('  ·  ') + (item.articles.length > shown.length ? `  и ещё ${item.articles.length - shown.length}` : '')
        for (const line of wrapText(articleText, fonts.bold, 7.8, cellW, 2)) {
          current().drawText(line, { x, y: ty, size: 7.8, font: fonts.bold, color: color(COLORS.red) })
          ty -= 10
        }
      })
      cursor -= cellH
    }
    cursor -= 6
  }
  if (page) drawFooter(page, pageNumber)

  return doc.save()
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
