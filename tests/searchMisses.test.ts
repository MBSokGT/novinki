import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { normalizeMissQuery } from '@/lib/searchMissQuery'

describe('запрос, по которому ничего не нашлось', () => {
  it('приводит к нормальному виду: регистр, пробелы, края', () => {
    expect(normalizeMissQuery('  Сифон   ДЛЯ  сливок ')).toBe('сифон для сливок')
    expect(normalizeMissQuery('«Пробар кружка»!')).toBe('пробар кружка')
  })

  it('слишком короткое, слишком длинное и пустое не записывает', () => {
    expect(normalizeMissQuery('ко')).toBeNull()
    expect(normalizeMissQuery('   ')).toBeNull()
    expect(normalizeMissQuery('а'.repeat(81))).toBeNull()
    expect(normalizeMissQuery('а'.repeat(80))).toHaveLength(80)
  })

  it('неподходящее по составу (ссылки, служебные символы) не записывает', () => {
    expect(normalizeMissQuery('http://x.ru/a')).toBeNull()
    expect(normalizeMissQuery('<script>alert(1)</script>')).toBeNull()
    expect(normalizeMissQuery('<script>')).toBeNull()
  })

  it('артикул, которого нет, — тоже ценный запрос', () => {
    expect(normalizeMissQuery('2030586')).toBe('2030586')
  })
})

describe('журнал «не нашли»', () => {
  let dir: string
  let store: typeof import('@/lib/searchMisses')

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novinki-misses-'))
    process.env.SQLITE_DB_PATH = path.join(dir, 'test.db')
    vi.resetModules()
    store = await import('@/lib/searchMisses')
  })
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

  const day = 24 * 60 * 60 * 1000
  const now = Date.UTC(2026, 9, 27)

  it('повтор того же запроса увеличивает счётчик, а не добавляет строку', async () => {
    await store.recordSearchMiss('сифон', now)
    await store.recordSearchMiss('Сифон ', now + 1000)
    await store.recordSearchMiss('пробар кружка', now + 2000)
    const list = await store.listSearchMisses(now + 3000)
    expect(list.map((r) => [r.query, r.count])).toEqual([['сифон', 2], ['пробар кружка', 1]])
  })

  it('пустое и некорректное молча игнорируется', async () => {
    expect(await store.recordSearchMiss('  ', now)).toBe(false)
    expect(await store.recordSearchMiss('сифон', now)).toBe(true)
  })

  it('в списке только свежие запросы (30 дней), частые — выше', async () => {
    await store.recordSearchMiss('старый запрос', now - 40 * day)
    for (let i = 0; i < 3; i++) await store.recordSearchMiss('шейкер бостон', now + 4000 + i)
    const list = await store.listSearchMisses(now + 5000)
    expect(list.map((r) => r.query)).toEqual(['шейкер бостон', 'сифон', 'пробар кружка'])
  })

  it('журнал не растёт бесконечно: остаются самые свежие', async () => {
    await store.recordSearchMiss('новый запрос 1', now + 6000, 3)
    await store.recordSearchMiss('новый запрос 2', now + 7000, 3)
    const left = (await store.listSearchMisses(now + 8000, 30, 100)).map((r) => r.query)
    expect(left).toHaveLength(3)
    expect(left).toContain('новый запрос 2')
    expect(left).not.toContain('пробар кружка')
  })

  it('запрос можно убрать из списка, а список — очистить целиком', async () => {
    await store.deleteSearchMiss('новый запрос 2')
    expect((await store.listSearchMisses(now + 9000)).map((r) => r.query)).not.toContain('новый запрос 2')
    await store.clearSearchMisses()
    expect(await store.listSearchMisses(now + 9000)).toEqual([])
  })
})
