import { describe, expect, it } from 'vitest'
import { findOrphanFiles } from '@/lib/maintenance'

const DAY = 1000 * 60 * 60 * 24
const now = Date.UTC(2026, 8, 23)

describe('findOrphanFiles', () => {
  const files = [
    { bucket: 'products', name: 'used.jpg', mtimeMs: now - 30 * DAY },
    { bucket: 'products', name: 'old-orphan.jpg', mtimeMs: now - 30 * DAY },
    { bucket: 'products', name: 'fresh-orphan.jpg', mtimeMs: now - 1 * DAY },
    { bucket: 'flyers', name: 'in-variants.pdf', mtimeMs: now - 30 * DAY },
  ]
  const references = JSON.stringify([
    { image_url: '/novinki/api/uploads/products/used.jpg' },
    { variants: '[{"image_url":"/api/uploads/flyers/in-variants.pdf"}]' },
  ])

  it('удаляет только старые файлы, на которые нигде нет ссылок', () => {
    expect(findOrphanFiles(files, references, now).map((f) => f.name)).toEqual(['old-orphan.jpg'])
  })

  it('не трогает свежие файлы — они могут быть в ещё не сохранённой форме', () => {
    expect(findOrphanFiles(files, references, now).map((f) => f.name)).not.toContain('fresh-orphan.jpg')
  })
})
