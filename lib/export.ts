import * as XLSX from 'xlsx'
import { Product } from '@/types/product'
import { Vendor } from '@/types/vendor'

function productRows(products: Product[]) {
  return products.map((p) => ({
    'Название': p.name,
    'Бренд': p.brand,
    'Артикул': p.article_number || '',
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

export function exportProductsToExcel(products: Product[], filename = 'novinki.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(productRows(products))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Новинки')
  XLSX.writeFile(workbook, filename)
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

  XLSX.writeFile(workbook, filename)
}
