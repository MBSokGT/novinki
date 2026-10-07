import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { productRows, workbookToXlsx } from '@/lib/export'
import type { Product } from '@/types/product'

describe('Excel export', () => {
  it('puts variant articles one per line with text wrapping on', () => {
    const product = {
      name: 'Сироп', brand: 'ODK', article_number: '05032182',
      variants: [{ article_number: '05032182' }, { article_number: '05032183' }],
    } as unknown as Product
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows([product])), 'Новинки')

    const file = workbookToXlsx(workbook)
    const zip = XLSX.CFB.read(file, { type: 'array' })
    const text = (suffix: string) => new TextDecoder().decode(zip.FileIndex[zip.FullPaths.findIndex((p: string) => p.endsWith(suffix))].content)

    expect(text('xl/styles.xml')).toContain('<alignment vertical="top" wrapText="1"/>')
    expect(text('xl/worksheets/sheet1.xml')).toMatch(/<c r="D2"[^>]* s="1"><v[^>]*>05032182\n05032183<\/v>/)

    const back = XLSX.read(file, { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(back.Sheets['Новинки'])
    expect(rows[0]['Артикулы вариантов']).toBe('05032182\n05032183')
  })
})
