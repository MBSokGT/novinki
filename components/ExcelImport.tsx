'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { showToast } from './Toast'

interface ExcelImportProps {
  onSuccess: () => void
}

function mapRow(row: Record<string, any>): Record<string, any> {
  const product: Record<string, any> = {}
  for (const [header, rawVal] of Object.entries(row)) {
    const key = String(header).toLowerCase().trim()
    const val = String(rawVal ?? '').trim()
    if (key.includes('название') || key === 'name') product.name = val
    else if (key.includes('бренд') || key === 'brand') product.brand = val
    else if (key.includes('артикул') || key === 'article') product.article_number = val
    else if (key.includes('категория') || key === 'category') product.category = val
    else if (key.includes('описание') || key === 'description') product.description = val
    else if (key.includes('преимущества') || key === 'advantages') product.advantages = val
    else if (key.includes('внимание') || key === 'attention') product.attention_points = val
    else if (key.includes('цена') || key === 'price') product.price = parseFloat(val) || null
    else if (key.includes('ссылка') && key.includes('сайт')) product.website_link = val
    else if (key.includes('1с') || key.includes('1c')) product.onec_link = val
  }
  return product
}

async function parseFile(file: File): Promise<Record<string, any>[]> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name)

  if (isExcel) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          resolve(rows.map(mapRow))
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // CSV via PapaParse
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        resolve((results.data as Record<string, any>[]).map(mapRow))
      },
      error: (err: Error) => reject(err),
    })
  })
}

export default function ExcelImport({ onSuccess }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    try {
      const rows = await parseFile(file)
      const valid = rows.filter(p => p.name && p.brand && p.description && p.advantages && p.attention_points)

      if (valid.length === 0) {
        showToast('Не найдено валидных товаров. Проверьте формат файла', 'error')
        return
      }

      const withImages = valid.map(p => ({ ...p, image_url: p.image_url || '' }))
      const { error } = await supabase.from('products').insert(withImages)
      if (error) throw error

      showToast(`Успешно импортировано ${valid.length} товаров`, 'success')
      setShowModal(false)
      setFile(null)
      onSuccess()
    } catch (err) {
      console.error(err)
      showToast('Ошибка импорта. Проверьте формат файла', 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Название,Бренд,Артикул,Категория,Описание,Преимущества,Внимание,Цена,Ссылка на сайт,Ссылка 1С\nПример товара,Бренд А,ART-001,Электроника,Описание товара,Преимущества товара,На что обратить внимание,1500,https://example.com,https://1c.example.com`
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
                <p className="text-sm text-blue-800 mb-2">📋 Поддерживаемые форматы: <strong>CSV</strong>, <strong>XLSX</strong>, <strong>XLS</strong></p>
                <p className="text-xs text-blue-700 mb-1">Обязательные колонки:</p>
                <ul className="text-xs text-blue-700 space-y-0.5 ml-4">
                  <li>• Название, Бренд, Описание, Преимущества, Внимание</li>
                </ul>
                <p className="text-xs text-blue-700 mt-1">Опционально: Артикул, Категория, Цена, Ссылка на сайт, Ссылка 1С</p>
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
                    <div className="text-sm text-gray-600">{file ? file.name : 'Выберите CSV или Excel файл'}</div>
                  </div>
                </label>
              </div>

              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="w-full px-4 py-3 bg-[#8B1538] text-white rounded-lg hover:bg-[#6B0F2A] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
