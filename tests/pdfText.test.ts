import fs from 'fs'
import { describe, expect, it } from 'vitest'
import { parseArticleList } from '@/lib/articles'
import { PdfRejected, extractPdfText } from '@/lib/pdfText'

const fixture = () => new Uint8Array(fs.readFileSync('tests/fixtures/anons.pdf'))

describe('текст из PDF анонса', () => {
  it('достаёт русский текст, а из него — только артикулы товаров', async () => {
    const { text, pages } = await extractPdfText(fixture())
    expect(pages).toBe(1)
    expect(text).toContain('Стрейнер «Пробар Премиум Оникс»')
    // телефон, размеры, объёмы и коды производителя за артикулы не считаются
    expect(parseArticleList(text)).toEqual(['2030586', '2030587', '2110342', '3170876'])
  })

  it('отказывается от файла, который не PDF', async () => {
    await expect(extractPdfText(new TextEncoder().encode('это обычный текст'))).rejects.toBeInstanceOf(PdfRejected)
  })

  it('отказывается от слишком большого файла', async () => {
    const big = new Uint8Array(16 * 1024 * 1024)
    big.set(new TextEncoder().encode('%PDF-1.4'))
    await expect(extractPdfText(big)).rejects.toThrow(/больше 15/)
  })

  it('отказывается от повреждённого PDF с понятным сообщением', async () => {
    await expect(extractPdfText(new TextEncoder().encode('%PDF-1.4 обрезанный файл'))).rejects.toThrow(/не удалось прочитать/i)
  })
})
