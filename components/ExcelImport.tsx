'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { showToast } from './Toast'

interface ExcelImportProps {
  onSuccess: () => void
}

export default function ExcelImport({ onSuccess }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const parseExcel = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          
          const products = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
            const product: any = {}
            
            headers.forEach((header, index) => {
              const key = header.toLowerCase()
              if (key.includes('название') || key === 'name') product.name = values[index]
              else if (key.includes('бренд') || key === 'brand') product.brand = values[index]
              else if (key.includes('артикул') || key === 'article') product.article_number = values[index]
              else if (key.includes('категория') || key === 'category') product.category = values[index]
              else if (key.includes('описание') || key === 'description') product.description = values[index]
              else if (key.includes('преимущества') || key === 'advantages') product.advantages = values[index]
              else if (key.includes('внимание') || key === 'attention') product.attention_points = values[index]
              else if (key.includes('цена') || key === 'price') product.price = parseFloat(values[index]) || 0
              else if (key.includes('ссылка') && key.includes('сайт')) product.website_link = values[index]
              else if (key.includes('1с')) product.onec_link = values[index]
            })
            
            return product
          })
          
          resolve(products)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsText(file, 'UTF-8')
    })
  }

  const handleImport = async () => {
    if (!file) return
    
    setLoading(true)
    try {
      const products = await parseExcel(file) as any[]
      
      // Валидация
      const valid = products.filter(p => p.name && p.brand && p.description && p.advantages && p.attention_points)
      
      if (valid.length === 0) {
        showToast('Не найдено валидных товаров. Проверьте формат файла', 'error')
        setLoading(false)
        return
      }
      
      // Добавляем placeholder для изображения
      const withImages = valid.map(p => ({
        ...p,
        image_url: 'https://via.placeholder.com/400x300?text=No+Image'
      }))
      
      const { error } = await supabase.from('products').insert(withImages)
      
      if (error) throw error
      
      showToast(`Успешно импортировано ${valid.length} товаров`, 'success')
      setShowModal(false)
      setFile(null)
      onSuccess()
    } catch (error) {
      console.error(error)
      showToast('Ошибка импорта. Проверьте формат файла', 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Название,Бренд,Артикул,Категория,Описание,Преимущества,Внимание,Цена,Ссылка на сайт,Ссылка 1С
Пример товара,Бренд А,ART-001,Электроника,Описание товара,Преимущества товара,На что обратить внимание,1500,https://example.com,https://1c.example.com`
    
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'template_import.csv'
    link.click()
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
      >
        📥 Импорт из Excel
      </button>

      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Импорт товаров</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  📋 Формат CSV файла должен содержать колонки:
                </p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4">
                  <li>• Название (обязательно)</li>
                  <li>• Бренд (обязательно)</li>
                  <li>• Описание (обязательно)</li>
                  <li>• Преимущества (обязательно)</li>
                  <li>• Внимание (обязательно)</li>
                  <li>• Артикул, Категория, Цена, Ссылки (опционально)</li>
                </ul>
              </div>

              <button
                onClick={downloadTemplate}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                📄 Скачать шаблон CSV
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">📁</div>
                    <div className="text-sm text-gray-600">
                      {file ? file.name : 'Выберите CSV файл'}
                    </div>
                  </div>
                </label>
              </div>

              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Импорт...' : 'Импортировать товары'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
