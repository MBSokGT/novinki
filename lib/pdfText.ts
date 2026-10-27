import { extractText, getDocumentProxy } from 'unpdf'

// Текст из PDF (анонс или прайс поставщика) — чтобы вытащить из него артикулы.
// Работает на сервере: файл приходит из админки, там же проверяется размер.
export const MAX_PDF_BYTES = 15 * 1024 * 1024
const MAX_PAGES = 100

// Ошибка, текст которой можно показывать админу как есть
export class PdfRejected extends Error {}

const isPdf = (bytes: Uint8Array) => bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-'

export async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  if (bytes.length > MAX_PDF_BYTES) throw new PdfRejected(`Файл больше ${MAX_PDF_BYTES / 1024 / 1024} МБ — выберите поменьше`)
  if (!isPdf(bytes)) throw new PdfRejected('Это не PDF-файл')
  try {
    const pdf = await getDocumentProxy(bytes)
    if (pdf.numPages > MAX_PAGES) throw new PdfRejected(`В файле больше ${MAX_PAGES} страниц — выберите нужные и сохраните отдельно`)
    const { text } = await extractText(pdf, { mergePages: true })
    return { text, pages: pdf.numPages }
  } catch (error) {
    if (error instanceof PdfRejected) throw error
    throw new PdfRejected('Не удалось прочитать PDF — возможно, файл повреждён или защищён паролем')
  }
}
