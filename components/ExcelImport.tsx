'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { apiClient } from '@/lib/api-client'
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
    else if (key.includes('год') || key === 'year') product.year = val
    else if (key.includes('ссылка') || key === 'website_link') product.website_link = val
    else if (key.includes('новинка поставщика') || key.includes('supplier')) product.is_supplier_novelty = val.toLowerCase() === 'да' || val === '1' || val.toLowerCase() === 'true'
    else if (key.includes('посудомо') || key.includes('dishwasher')) product.is_dishwasher_safe = val.toLowerCase() === 'да' || val === '1' || val.toLowerCase() === 'true'
    else if (key.includes('микроволн') || key.includes('microwave')) product.is_microwave_safe = val.toLowerCase() === 'да' || val === '1' || val.toLowerCase() === 'true'
    else if (key.includes('температура от') || key.includes('temp_min')) product.temp_min = parseFloat(val) || null
    else if (key.includes('температура до') || key.includes('temp_max')) product.temp_max = parseFloat(val) || null
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

      // Импортированные товары попадают как черновики (архив) — публично их
      // не видно, пока админ не проверит карточки и не опубликует вручную.
      const withImages = valid.map(p => ({ ...p, image_url: p.image_url || '', is_archived: true }))
      const { error } = await apiClient.from('products').insert(withImages)
      if (error) throw error

      showToast(`Импортировано ${valid.length} товаров как черновики. Проверьте их в статусе «Архив» и опубликуйте`, 'success')
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
    const template = `Название,Бренд,Артикул,Категория,Год,Описание,Преимущества,Внимание,Ссылка на товар,Новинка поставщика,Можно мыть в посудомоечной машине,Можно использовать в микроволновой печи,Температура от °C,Температура до °C\nПример товара,Бренд А,ART-001,Посуда,2026,Описание товара,Преимущества товара,На что обратить внимание,https://example.com/product,Нет,Да,Нет,,`
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
        className="flex items-center gap-2 px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" /></svg>
        Импорт из Excel
      </button>

      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full p-6 cursor-default">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Импорт товаров</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">Поддерживаемые форматы: <strong>CSV</strong>, <strong>XLSX</strong>, <strong>XLS</strong></p>
                <p className="text-xs text-blue-700 mb-1">Обязательные колонки:</p>
                <ul className="text-xs text-blue-700 space-y-0.5 ml-4">
                  <li>• Название, Бренд, Описание, Преимущества</li>
                </ul>
                <p className="text-xs text-blue-700 mt-1">Опционально: Артикул, Категория, Год, Ссылка на товар, Новинка поставщика, ПММ, СВЧ, Температура</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800">
                  Импортированные товары попадают в раздел со статусом «Архив» и <strong>не видны посетителям сайта</strong>,
                  пока вы их не проверите и не опубликуете вручную (кнопка «Опубликовать» у карточки или «Опубликовать выбранное» для нескольких сразу).
                </p>
              </div>

              <button
                onClick={downloadTemplate}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Скачать шаблон CSV
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
                    <svg className="w-6 h-6 mx-auto mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <div className="text-sm text-gray-600">{file ? file.name : 'Выберите CSV или Excel файл'}</div>
                  </div>
                </label>
              </div>

              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="w-full px-4 py-3 bg-[#9B1B1B] text-white rounded-lg hover:bg-[#7A1515] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
