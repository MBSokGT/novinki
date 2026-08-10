'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { apiClient } from '@/lib/api-client'
import { showToast } from './Toast'

interface VendorsExcelImportProps {
  onSuccess: () => void
}

function mapRow(row: Record<string, any>): Record<string, any> {
  const vendor: Record<string, any> = {}
  for (const [header, rawVal] of Object.entries(row)) {
    const key = String(header).toLowerCase().trim()
    const val = String(rawVal ?? '').trim()
    if (key.includes('название') || key === 'name') vendor.name = val
    else if (key.includes('описание') || key === 'product' || key === 'description') vendor.product = val
    else if (key.includes('ссылка') || key === 'website_link') vendor.website_link = val
    else if (key.includes('скидка') || key === 'max_discount') vendor.max_discount = val
    else if (key.includes('срок') || key === 'delivery_time') vendor.delivery_time = val
    else if (key.includes('1с') || key.includes('товары в') || key === 'onec_products') vendor.onec_products = val
  }
  return vendor
}

// Найти строку с настоящими заголовками (та, где больше всего непустых ячеек)
function findHeaderRow(rawRows: any[][]): { headerIdx: number; headers: string[] } {
  let best = { idx: 0, count: 0 }
  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    const row = rawRows[i] || []
    const nonEmpty = row.filter((v: any) => v !== '' && v != null).length
    if (nonEmpty > best.count) best = { idx: i, count: nonEmpty }
  }
  return { headerIdx: best.idx, headers: (rawRows[best.idx] || []).map(String) }
}

function rowsFromRaw(rawRows: any[][]): Record<string, any>[] {
  const { headerIdx, headers } = findHeaderRow(rawRows)
  const result: Record<string, any>[] = []
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    if (!row || row.every((v: any) => v === '' || v == null)) continue
    const obj: Record<string, any> = {}
    headers.forEach((h, idx) => { obj[h] = row[idx] ?? '' })
    result.push(mapRow(obj))
  }
  return result
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
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
          resolve(rowsFromRaw(rawRows))
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const rawRows = results.data as any[][]
        resolve(rowsFromRaw(rawRows))
      },
      error: (err: Error) => reject(err),
    })
  })
}

export default function VendorsExcelImport({ onSuccess }: VendorsExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    try {
      const rows = await parseFile(file)
      const valid = rows.filter(v => v.name)

      if (valid.length === 0) {
        const first = rows[0] || {}
        const keys = Object.keys(first)
        showToast(`Не найдено валидных строк (всего строк: ${rows.length}, колонки: ${keys.join(', ') || 'не определены'})`, 'error')
        return
      }

      const { error } = await apiClient.from('vendors').insert(valid)
      if (error) throw error

      showToast(`Импортировано вендоров: ${valid.length}`, 'success')
      setShowModal(false)
      setFile(null)
      onSuccess()
    } catch (err: any) {
      console.error('[VendorsImport] error:', err)
      showToast(`Ошибка импорта: ${err?.message || String(err)}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `Название,Описание,Ссылка на сайт,Максимальная скидка,Срок поставки,Товары в 1С\nПример вендора,Что поставляет вендор,https://example.com,15%,2-3 недели,"Кружки, тарелки, лопаты"`
    const blob = new Blob(['﻿' + template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'template_vendors_import.csv'
    link.click()
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" /></svg>
        Импорт из Excel
      </button>

      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-lg w-full p-6 cursor-default">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Импорт вендоров</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">Поддерживаемые форматы: <strong>CSV</strong>, <strong>XLSX</strong>, <strong>XLS</strong></p>
                <p className="text-xs text-blue-700 mb-1">Обязательная колонка:</p>
                <ul className="text-xs text-blue-700 space-y-0.5 ml-4">
                  <li>• Название</li>
                </ul>
                <p className="text-xs text-blue-700 mt-1">Опционально: Описание, Ссылка на сайт, Максимальная скидка, Срок поставки, Товары в 1С</p>
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
                  id="vendors-excel-upload"
                />
                <label
                  htmlFor="vendors-excel-upload"
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
                {loading ? 'Импорт...' : 'Импортировать вендоров'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
