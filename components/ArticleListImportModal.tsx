'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'

import { apiClient } from '@/lib/api-client'
import { buildDuplicateIndex, findDuplicate, parseArticleList, type DuplicateHit } from '@/lib/articles'
import { buildNewProduct, pickExactMatch, preselected } from '@/lib/articleImport'
import { suggestCategory } from '@/lib/suggestCategory'
import { showToast } from '@/components/Toast'
import type { ScrapedProduct } from '@/lib/complexbarParser'
import type { FieldsFromFeatures } from '@/lib/featuresToFields'
import type { Product } from '@/types/product'

interface ArticleListImportModalProps {
  existingProducts: Product[]
  categoryWordIndex: Map<string, Map<string, number>>
  years: { id: string; name: string }[]
  onClose: () => void
  onOpenProduct: (product: Product) => void
  // Вызывается после создания карточек — админка перечитывает список товаров
  onCreated: () => void | Promise<void>
}

type Stage = 'input' | 'searching' | 'preview' | 'creating' | 'done'

interface Row {
  article: string
  // found — нашли товар; missing — на сайте такого артикула нет; error — сайт не ответил
  status: 'found' | 'missing' | 'error'
  item?: ScrapedProduct
  duplicate?: DuplicateHit | null
  category?: string | null
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
const SEARCH_URL = 'https://complexbar.ru/index.php?dispatch=products.search&search_performed=Y&q='
const PAUSE_MS = 400

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type ApiJson = { data?: { products?: ScrapedProduct[]; urls?: string[]; fields?: FieldsFromFeatures }; error?: { message: string } }

async function post(path: string, body: unknown): Promise<{ ok: boolean; json: ApiJson }> {
  const response = await fetch(`${BASE_PATH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { ok: response.ok, json: (await response.json().catch(() => ({}))) as ApiJson }
}

// Текст из файла: PDF читает сервер (там же проверяются размер и тип), простой
// текст — сам браузер. Ошибка несёт понятное админу сообщение.
async function readSourceFile(file: File): Promise<string> {
  if (/\.(txt|csv)$/i.test(file.name)) return file.text()
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('Подходят PDF и текстовые файлы (.txt, .csv)')
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${BASE_PATH}/api/internal/pdf-text`, { method: 'POST', body })
  const json = await response.json().catch(() => ({}))
  if (!response.ok || !json.data) throw new Error(json.error?.message || 'Не удалось прочитать файл')
  return json.data.text as string
}

export default function ArticleListImportModal({ existingProducts, categoryWordIndex, years, onClose, onOpenProduct, onCreated }: ArticleListImportModalProps) {
  const [stage, setStage] = useState<Stage>('input')
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [year, setYear] = useState(() => {
    const current = String(new Date().getFullYear())
    return years.some((y) => y.name === current) ? current : ''
  })
  const [publishNow, setPublishNow] = useState(false)
  const [failed, setFailed] = useState<string[]>([])
  const [createdCount, setCreatedCount] = useState(0)
  // Загрузка файла с артикулами: идёт ли чтение, что получилось, тащат ли файл над окном
  const [reading, setReading] = useState(false)
  const [fileNote, setFileNote] = useState<{ ok: boolean; message: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const cancelRef = useRef(false)

  const articles = useMemo(() => parseArticleList(text), [text])
  const duplicateIndex = useMemo(() => buildDuplicateIndex(existingProducts), [existingProducts])

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setReading(true)
    setFileNote(null)
    try {
      let added = ''
      for (const file of Array.from(files)) added += `\n${await readSourceFile(file)}`
      const found = parseArticleList(added).length
      setText((prev) => `${prev.trim()}\n${added}`.trim())
      setFileNote(
        found > 0
          ? { ok: true, message: `Из ${files.length === 1 ? `«${files[0].name}»` : `файлов (${files.length})`} добавлено артикулов: ${found}` }
          : { ok: false, message: 'В файле не нашлось артикулов. Если это скан или картинка, текст из него достать не получится — вставьте артикулы вручную.' }
      )
    } catch (error) {
      setFileNote({ ok: false, message: error instanceof Error ? error.message : 'Не удалось прочитать файл' })
    } finally {
      setReading(false)
    }
  }

  const close = () => {
    cancelRef.current = true
    onClose()
  }

  const search = async () => {
    if (articles.length === 0) return
    cancelRef.current = false
    setStage('searching')
    setProgress({ done: 0, total: articles.length })
    const result: Row[] = []

    for (const [i, article] of articles.entries()) {
      if (cancelRef.current) return
      if (i > 0) await wait(PAUSE_MS)
      let row: Row = { article, status: 'error' }
      // Сайт иногда отвечает не с первого раза — не нашли, пробуем ещё раз
      for (let attempt = 0; attempt < 2 && row.status !== 'found'; attempt++) {
        if (attempt > 0) await wait(1200)
        try {
          const { ok, json } = await post('/api/internal/scrape-complexbar', { url: `${SEARCH_URL}${encodeURIComponent(article)}` })
          const found: ScrapedProduct[] = json.data?.products || []
          const item = pickExactMatch(found, article)
          if (item) {
            row = {
              article,
              status: 'found',
              item,
              duplicate: findDuplicate(duplicateIndex, { article: item.article_number || article, link: item.website_link }),
              category: suggestCategory(item.name, categoryWordIndex),
            }
          } else if (ok) {
            row = { article, status: 'missing' }
          }
        } catch {
          // остаётся status: 'error'
        }
      }
      result.push(row)
      setProgress({ done: i + 1, total: articles.length })
    }

    setRows(result)
    setSelected(new Set(preselected(result)))
    setStage('preview')
  }

  const toggle = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  const selectableCount = rows.filter((r) => r.status === 'found').length

  const toggleAll = () =>
    setSelected((prev) => (prev.size === selectableCount ? new Set() : new Set(rows.flatMap((r, i) => (r.status === 'found' ? [i] : [])))))

  const createOne = async (row: Row) => {
    const item = row.item as ScrapedProduct
    // В поиске только миниатюра — крупное фото берём со страницы самого товара
    const page = await post('/api/internal/scrape-complexbar', { url: item.website_link }).catch(() => null)
    const image: string = page?.json.data?.products?.[0]?.image_url || item.image_url

    const mirrored: string = image ? (await post('/api/internal/mirror-images', { urls: [image] }).catch(() => null))?.json.data?.urls?.[0] || '' : ''
    const details = await post('/api/internal/complexbar-details', { urls: [item.website_link] }).catch(() => null)
    const fields: FieldsFromFeatures = details?.json.data?.fields || {}

    const product = buildNewProduct({ item, article: row.article, fields, category: row.category ?? null, year, photo: mirrored, publish: publishNow })
    const { error } = await apiClient.from('products').insert([product])
    if (error) throw new Error(error.message)
  }

  const create = async () => {
    const chosen = rows.filter((_, i) => selected.has(i))
    if (chosen.length === 0) return
    cancelRef.current = false
    setStage('creating')
    setProgress({ done: 0, total: chosen.length })
    const problems: string[] = []
    let created = 0

    for (const [i, row] of chosen.entries()) {
      if (cancelRef.current) break
      try {
        await createOne(row)
        created++
      } catch (error) {
        problems.push(`${row.article}: ${error instanceof Error ? error.message : 'не удалось сохранить'}`)
      }
      setProgress({ done: i + 1, total: chosen.length })
    }

    await onCreated()
    setCreatedCount(created)
    setFailed(problems)
    setStage('done')
    if (created > 0) showToast(`Создано карточек: ${created}`, 'success')
  }

  const notFound = rows.filter((r) => r.status !== 'found')
  const busy = stage === 'searching' || stage === 'creating'
  const minutesLeft = Math.max(1, Math.ceil(((progress.total - progress.done) * (stage === 'searching' ? 1 : 4)) / 60))

  return (
    <div onClick={busy ? undefined : close} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Создать карточки по списку артикулов</h3>
            <p className="mt-0.5 text-xs text-slate-500">Каждый артикул станет отдельной карточкой: фото, название, бренд, ссылка, теги и описание подтянутся с complexbar.ru.</p>
          </div>
          <button onClick={close} aria-label="Закрыть" className="shrink-0 text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {stage === 'input' && (
          <div
            className={`overflow-y-auto p-5 transition ${dragOver ? 'bg-red-50/60' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
          >
            <p className="mb-3 text-sm text-slate-500">
              Вставьте артикулы — через запятую, пробел или с новой строки — или перетащите сюда PDF (анонс, прайс поставщика): артикулы найдём сами. Лишний текст пропустим, повторы уберём.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              autoFocus
              placeholder="2030586, 2030587, 2110341, 2110342..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9B1B1B]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <label className={`inline-flex cursor-pointer items-center gap-1.5 font-medium text-[#9B1B1B] hover:underline ${reading ? 'pointer-events-none opacity-60' : ''}`}>
                <input type="file" accept=".pdf,.txt,.csv,application/pdf" multiple className="sr-only" aria-label="Выбрать файл с артикулами" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                {reading ? 'Читаю файл…' : 'Выбрать PDF или файл'}
              </label>
              {fileNote && <span className={fileNote.ok ? 'text-emerald-700' : 'text-red-600'}>{fileNote.message}</span>}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {articles.length > 0 ? <>Найдено артикулов: <span className="font-semibold text-slate-800">{articles.length}</span></> : 'Артикулы — это 5–8 цифр, например 2030586'}
            </p>
            <button
              onClick={search}
              disabled={articles.length === 0}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#9B1B1B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-50"
            >
              Найти на complexbar.ru
            </button>
          </div>
        )}

        {busy && (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#9B1B1B]" />
            <p className="text-sm font-medium text-slate-800">
              {stage === 'searching' ? 'Ищу на complexbar.ru' : 'Создаю карточки'}: {progress.done} из {progress.total}
            </p>
            <div className="mx-auto mt-3 h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-[#9B1B1B] transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            <p className="mt-3 text-xs text-slate-400">Не закрывайте окно — осталось около {minutesLeft} мин.</p>
            <button
              onClick={() => {
                cancelRef.current = true
                if (stage === 'searching') setStage('input')
              }}
              className="mt-4 text-sm text-slate-500 underline hover:text-slate-700"
            >
              Остановить
            </button>
          </div>
        )}

        {stage === 'preview' && (
          <>
            <div className="border-b border-slate-100 px-5 py-3">
              <div className="flex items-center justify-between">
                <button onClick={toggleAll} className="text-sm font-medium text-[#9B1B1B] hover:underline">
                  {selected.size === selectableCount ? 'Снять выделение' : 'Выбрать все'}
                </button>
                <span className="text-sm text-slate-500">Найдено: {selectableCount} из {rows.length}, выбрано: {selected.size}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-2">
                {rows.map((row, i) =>
                  row.status === 'found' && row.item ? (
                    <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${selected.has(i) ? 'border-[#9B1B1B]/30 bg-red-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="h-4 w-4 shrink-0 accent-[#9B1B1B]" />
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {row.item.image_url && <Image src={row.item.image_url} alt={row.item.name} fill className="object-cover" unoptimized />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{row.item.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {row.item.brand} · Арт. {row.item.article_number || row.article}
                          {row.category ? ` · ${row.category}` : ''}
                        </p>
                        {row.duplicate && (
                          <p className="mt-0.5 text-xs text-amber-700">
                            Уже есть: «{row.duplicate.name}»{row.duplicate.isArchived ? ' (в архиве)' : ''}
                            {row.duplicate.via === 'variant' ? ', как вариант серии' : ''}.{' '}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                const product = existingProducts.find((p) => p.id === row.duplicate?.id)
                                if (product) onOpenProduct(product)
                              }}
                              className="font-medium underline hover:text-amber-900"
                            >
                              Открыть
                            </button>
                          </p>
                        )}
                      </div>
                    </label>
                  ) : (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 p-2.5 text-sm text-slate-500">
                      <span className="font-mono text-slate-700">{row.article}</span>
                      <span>{row.status === 'missing' ? 'на complexbar.ru не найден' : 'сайт не ответил — попробуйте позже'}</span>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="space-y-3 border-t border-slate-100 p-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  Год
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm">
                    <option value="">Без года</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.name}>{y.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-slate-600" title="Если не отмечено, карточки создаются в архиве — сотрудники их не видят, пока вы не нажмёте «Опубликовать»">
                  <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="h-4 w-4 accent-[#9B1B1B]" />
                  Сразу показывать сотрудникам
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={create}
                  disabled={selected.size === 0}
                  className="flex-1 rounded-xl bg-[#9B1B1B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515] disabled:opacity-50"
                >
                  Создать карточки: {selected.size}
                </button>
                <button onClick={() => setStage('input')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                  Назад
                </button>
              </div>
            </div>
          </>
        )}

        {stage === 'done' && (
          <div className="overflow-y-auto p-5">
            <p className="text-base font-semibold text-slate-900">Создано карточек: {createdCount}</p>
            {!publishNow && createdCount > 0 && (
              <p className="mt-2 text-sm text-slate-600">
                Они в архиве, сотрудники их пока не видят. Проверьте описания и категории, потом отметьте карточки в списке и нажмите «Опубликовать».
              </p>
            )}
            {notFound.length > 0 && <p className="mt-3 text-sm text-slate-600">Не нашлись на сайте: {notFound.map((r) => r.article).join(', ')}</p>}
            {failed.length > 0 && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Не удалось сохранить:
                <ul className="mt-1 list-disc pl-5">{failed.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}
            <button onClick={onClose} className="mt-5 rounded-xl bg-[#9B1B1B] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7A1515]">
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
