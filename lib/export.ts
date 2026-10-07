import * as XLSX from 'xlsx'
import { Product } from '@/types/product'
import { Vendor } from '@/types/vendor'

export function productRows(products: Product[]) {
  return products.map((p) => ({
    'Название': p.name,
    'Бренд': p.brand,
    'Артикул': p.article_number || '',
    'Артикулы вариантов': (p.variants || []).map((v) => v.article_number).filter(Boolean).join('\n'),
    'Категория': p.category || '',
    'Год': p.year || '',
    'Описание': p.description,
    'Преимущества': p.advantages,
    'На что обратить внимание': p.attention_points,
    'Ссылка на товар': p.website_link || '',
    'Теги': p.tags || '',
    'Кратность': p.order_multiple || '',
    'Можно мыть в посудомоечной машине': p.is_dishwasher_safe ? 'Да' : 'Нет',
    'Можно использовать в микроволновой печи': p.is_microwave_safe ? 'Да' : 'Нет',
    'Температура от, °C': p.temp_min ?? '',
    'Температура до, °C': p.temp_max ?? '',
  }))
}

// SheetJS (бесплатная версия) не записывает оформление ячеек, а без «переноса
// текста» Excel показывает многострочную ячейку одной строкой. Поэтому после
// записи дописываем стиль прямо в XML файла: всё прижато к верху, а ячейкам с
// переносами строк (артикулы вариантов) включаем перенос.
export function workbookToXlsx(workbook: XLSX.WorkBook): Uint8Array {
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const zip = XLSX.CFB.read(new Uint8Array(data), { type: 'array' })
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  zip.FullPaths.forEach((path: string, i: number) => {
    const entry = zip.FileIndex[i]
    if (!entry?.content) return
    if (path.endsWith('xl/styles.xml')) {
      const xml = decoder.decode(entry.content).replace(/<cellXfs count="1">(<xf [^>]*?)\/><\/cellXfs>/, (_: string, xf: string) =>
        `<cellXfs count="2">${xf} applyAlignment="1"><alignment vertical="top"/></xf>` +
        `${xf} applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>`
      )
      entry.content = encoder.encode(xml)
    } else if (/xl\/worksheets\/sheet\d+\.xml$/.test(path)) {
      // Стиль пишем каждой ячейке явно: LibreOffice не применяет стиль по умолчанию
      const xml = decoder
        .decode(entry.content)
        .replace(/<c r="([A-Z]+\d+)"((?:(?! s=")[^>])*)>(<v[^>]*>[^<]*\n[^<]*<\/v>)/g, '<c r="$1"$2 s="1">$3')
        .replace(/<c r="([A-Z]+\d+)"((?:(?! s=")[^>])*?)(\/?)>/g, '<c r="$1"$2 s="0"$3>')
      entry.content = encoder.encode(xml)
    }
  })
  return new Uint8Array(XLSX.CFB.write(zip, { fileType: 'zip', type: 'array' }) as ArrayLike<number>)
}

function saveWorkbook(workbook: XLSX.WorkBook, filename: string) {
  const blob = new Blob([workbookToXlsx(workbook) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportProductsToExcel(products: Product[], filename = 'novinki.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(productRows(products))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Новинки')
  saveWorkbook(workbook, filename)
}

/** Единый файл на весь каталог — по листу на "Склад", "Поставщики" и "Вендоры". */
export function exportCatalogToExcel(stockProducts: Product[], supplierProducts: Product[], vendors: Vendor[], filename = 'novinki_catalog.xlsx') {
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows(stockProducts)), 'Склад')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows(supplierProducts)), 'Поставщики')

  const vendorRows = vendors.map((v) => ({
    'Название': v.name,
    'Описание': v.product || '',
    'Ссылка на сайт': v.website_link || '',
    'Максимальная скидка': v.max_discount || '',
    'Срок поставки': v.delivery_time || '',
    'Товары в 1С': v.onec_products || '',
  }))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(vendorRows), 'Вендоры')

  saveWorkbook(workbook, filename)
}
