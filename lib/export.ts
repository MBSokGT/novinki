import * as XLSX from 'xlsx'
import { Product } from '@/types/product'

export function exportProductsToExcel(products: Product[], filename = 'novinki.xlsx') {
  const rows = products.map((p) => ({
    'Название': p.name,
    'Бренд': p.brand,
    'Артикул': p.article_number || '',
    'Категория': p.category || '',
    'Год': p.year || '',
    'Цена': p.price ?? '',
    'Описание': p.description,
    'Преимущества': p.advantages,
    'На что обратить внимание': p.attention_points,
    'Ссылка на сайт': p.website_link || '',
    'Новинка поставщика': p.is_supplier_novelty ? 'Да' : 'Нет',
    'Можно мыть в посудомоечной машине': p.is_dishwasher_safe ? 'Да' : 'Нет',
    'Можно использовать в микроволновой печи': p.is_microwave_safe ? 'Да' : 'Нет',
    'Температура от, °C': p.temp_min ?? '',
    'Температура до, °C': p.temp_max ?? '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Новинки')
  XLSX.writeFile(workbook, filename)
}
