'use client'

import { useState } from 'react'
import { Product } from '@/types/product'
import Image from 'next/image'

interface CompareBarProps {
  compareProducts: Product[]
  onRemove: (id: string) => void
  onClear: () => void
}

export default function CompareBar({ compareProducts, onRemove, onClear }: CompareBarProps) {
  const [showModal, setShowModal] = useState(false)

  if (compareProducts.length === 0) return null

  return (
    <>
      <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-40 min-w-[220px] max-w-md">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <h3 className="font-semibold text-gray-900 text-sm">Сравнение ({compareProducts.length})</h3>
          <button onClick={onClear} className="text-xs text-gray-500 hover:text-slate-600 shrink-0">Очистить</button>
        </div>
        <div className="flex gap-2 mb-2.5 overflow-x-auto">
          {compareProducts.map(p => (
            <div key={p.id} className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
                <Image src={p.image_url} alt={p.name} width={56} height={56} className="object-cover" />
              </div>
              <button onClick={() => onRemove(p.id)} className="absolute -top-2 -right-2 bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
            </div>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} disabled={compareProducts.length < 2} className="w-full px-4 py-1.5 bg-[#9B1B1B] text-white text-sm rounded-lg hover:bg-[#7A1515] transition disabled:opacity-50 disabled:cursor-not-allowed">
          Сравнить
        </button>
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto cursor-default">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Сравнение товаров</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-4 bg-gray-50">Параметр</th>
                    {compareProducts.map(p => (
                      <th key={p.id} className="p-4 bg-gray-50">
                        <Image src={p.image_url} alt={p.name} width={100} height={100} className="object-cover rounded-lg mx-auto mb-2" />
                        <div className="font-bold text-sm">{p.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-4 font-medium">Бренд</td>
                    {compareProducts.map(p => <td key={p.id} className="p-4">{p.brand}</td>)}
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="p-4 font-medium">Артикул</td>
                    {compareProducts.map(p => <td key={p.id} className="p-4">{p.article_number || '—'}</td>)}
                  </tr>
                  <tr className="border-t">
                    <td className="p-4 font-medium">Категория</td>
                    {compareProducts.map(p => <td key={p.id} className="p-4">{p.category || '—'}</td>)}
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="p-4 font-medium">Описание</td>
                    {compareProducts.map(p => <td key={p.id} className="p-4 text-sm">{p.description}</td>)}
                  </tr>
                  <tr className="border-t">
                    <td className="p-4 font-medium">Преимущества</td>
                    {compareProducts.map(p => <td key={p.id} className="p-4 text-sm text-green-700">{p.advantages}</td>)}
                  </tr>
                  <tr className="border-t bg-gray-50">
                    <td className="p-4 font-medium">Внимание</td>
                    {compareProducts.map(p => <td key={p.id} className="p-4 text-sm text-slate-700">{p.attention_points}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
