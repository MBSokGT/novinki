import { Product } from '@/types/product'

export const exportToExcel = (products: Product[]) => {
  const headers = ['Название', 'Бренд', 'Артикул', 'Категория', 'Описание', 'Преимущества', 'Внимание', 'Рейтинг', 'Дата добавления']
  
  const rows = products.map(p => [
    p.name,
    p.brand,
    p.article_number || '',
    p.category || '',
    p.description,
    p.advantages,
    p.attention_points,
    p.rating || 0,
    new Date(p.created_at).toLocaleDateString('ru-RU')
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `novinki_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}
