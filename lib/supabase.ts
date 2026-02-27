import PocketBase, { ClientResponseError, RecordModel } from 'pocketbase'
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_PRODUCTS_INITIAL,
  DEMO_USERS,
  type DemoProduct,
} from './demo-data'

type QueryOperation = 'select' | 'insert' | 'update' | 'upsert' | 'delete'

interface QueryResult<T = any> {
  data: T
  error: any
  count?: number | null
}

// ---------- Demo mode detection ----------
// Demo mode activates automatically when the PocketBase URL is not provided.
const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL
export const DEMO_MODE = !pocketBaseUrl || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// ---------- PocketBase client (only when NOT in demo mode) ----------
let pb: PocketBase | null = null

if (!DEMO_MODE && pocketBaseUrl) {
  pb = new PocketBase(pocketBaseUrl)

  if (typeof window !== 'undefined') {
    pb.authStore.loadFromCookie(document.cookie || '')
    pb.authStore.onChange(() => {
      document.cookie = pb!.authStore.exportToCookie({
        httpOnly: false,
        sameSite: 'Lax',
        secure: window.location.protocol === 'https:',
        path: '/',
      })
    })
  }
}

// ---------- PocketBase helpers ----------
function normalizeError(error: unknown) {
  if (!error) return null
  if (error instanceof ClientResponseError) {
    return { message: error.message, status: error.status, response: error.response }
  }
  if (error instanceof Error) return { message: error.message }
  return { message: String(error) }
}

function escapeFilterValue(value: unknown) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return `"${String(value).replace(/"/g, '\\"')}"`
}

function parseOrToken(token: string) {
  const trimmed = token.trim()
  const ilikeMatch = trimmed.match(/^([a-zA-Z0-9_]+)\.ilike\.%(.*)%$/)
  if (ilikeMatch) {
    const [, field, value] = ilikeMatch
    return `${field}~${escapeFilterValue(value)}`
  }
  const eqMatch = trimmed.match(/^([a-zA-Z0-9_]+)\.eq\.(.*)$/)
  if (eqMatch) {
    const [, field, value] = eqMatch
    return `${field}=${escapeFilterValue(value)}`
  }
  return trimmed
}

function stripRecord(record: RecordModel) {
  const { expand, ...rest } = record
  return rest
}

function normalizeAuthUser(record: RecordModel | null) {
  if (!record) return null
  const { id, email, ...rest } = record as Record<string, any>
  return { ...rest, id, email }
}

function compactObject<T extends Record<string, any>>(value: T) {
  const next: Record<string, any> = {}
  Object.entries(value).forEach(([key, item]) => {
    if (item !== undefined) next[key] = item
  })
  return next as T
}

// Compress image to a smaller JPEG File (for FormData upload)
export async function compressImageToBlob(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => {
      const img = new window.Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        const MAX = 800
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
          else { width = Math.round((width * MAX) / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('No canvas context')); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Failed to create blob')); return }
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.75)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// Image compression: resize to max 800px, JPEG 75% quality → base64 dataURL
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to load image'))
      img.onload = () => {
        const MAX = 800
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width)
            width = MAX
          } else {
            width = Math.round((width * MAX) / height)
            height = MAX
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('No canvas context')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ---------- PocketBase query builder ----------
class PocketBaseQueryBuilder implements PromiseLike<QueryResult<any>> {
  private operation: QueryOperation = 'select'
  private selectColumns = '*'
  private filters: string[] = []
  private orFilters: string[] = []
  private sort?: string
  private rangeStart?: number
  private rangeEnd?: number
  private limitValue?: number
  private wantsCount = false
  private expectSingle = false
  private expectMaybeSingle = false
  private returnOnWrite = false
  private writePayload: any = null

  constructor(private readonly collectionName: string) {}

  select(columns = '*', options?: { count?: 'exact' }) {
    if (this.operation !== 'select') { this.returnOnWrite = true; return this }
    this.selectColumns = columns
    this.wantsCount = options?.count === 'exact'
    this.operation = 'select'
    return this
  }

  insert(payload: any | any[]) {
    this.operation = 'insert'
    this.writePayload = Array.isArray(payload) ? payload : [payload]
    return this
  }

  update(payload: any) { this.operation = 'update'; this.writePayload = payload; return this }
  upsert(payload: any) { this.operation = 'upsert'; this.writePayload = Array.isArray(payload) ? payload : [payload]; return this }
  delete() { this.operation = 'delete'; return this }

  eq(field: string, value: any) {
    this.filters.push(`${field}=${escapeFilterValue(value)}`)
    return this
  }

  or(expression: string) {
    expression.split(',').map(parseOrToken).filter(Boolean).forEach((item) => this.orFilters.push(item))
    return this
  }

  order(field: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    const ascending = options?.ascending ?? true
    this.sort = ascending ? field : `-${field}`
    return this
  }

  range(start: number, end: number) { this.rangeStart = start; this.rangeEnd = end; return this }
  limit(limit: number) { this.limitValue = limit; return this }
  single() { this.expectSingle = true; return this }
  maybeSingle() { this.expectMaybeSingle = true; return this }

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private buildFilterString() {
    const chunks: string[] = []
    if (this.filters.length > 0) chunks.push(this.filters.length > 1 ? `(${this.filters.join(' && ')})` : this.filters[0])
    if (this.orFilters.length > 0) chunks.push(this.orFilters.length > 1 ? `(${this.orFilters.join(' || ')})` : this.orFilters[0])
    return chunks.join(' && ')
  }

  private parseExpandFields() {
    const matches = [...this.selectColumns.matchAll(/([a-zA-Z0-9_]+)\(\*\)/g)]
    return matches.map((match) => match[1])
  }

  private parseFields() {
    if (this.selectColumns.trim() === '*') return undefined
    const fields = this.selectColumns.split(',').map((part) => part.trim()).filter((part) => part && !part.endsWith('(*)'))
    return fields.length > 0 ? fields.join(',') : undefined
  }

  private async fetchAll(options: { filter?: string; sort?: string; expand?: string; fields?: string }) {
    const pageSize = 200
    let page = 1
    let totalPages = 1
    const items: RecordModel[] = []
    while (page <= totalPages) {
      const response = await pb!.collection(this.collectionName).getList(page, pageSize, options)
      items.push(...response.items)
      totalPages = response.totalPages
      page += 1
    }
    return items
  }

  private async attachExpandedProducts(records: any[]) {
    if (this.collectionName !== 'bookmarks' || !this.selectColumns.includes('products(*)')) return records
    const ids = Array.from(new Set(records.map((item) => item.product_id || item.product).filter((value): value is string => typeof value === 'string' && value.length > 0)))
    if (ids.length === 0) return records
    const filter = ids.map((id) => `id=${escapeFilterValue(id)}`).join(' || ')
    const products = await pb!.collection('products').getFullList({ filter, sort: '-created' })
    const productsById = new Map(products.map((item) => [item.id, stripRecord(item)]))
    return records.map((item) => {
      if (item.products) return item
      const productId = item.product_id || item.product
      return { ...item, products: productsById.get(productId) || null }
    })
  }

  private async executeSelect(): Promise<QueryResult<any>> {
    try {
      const expandFields = this.parseExpandFields()
      const filter = this.buildFilterString()
      const fields = this.parseFields()
      const options = {
        ...(filter ? { filter } : {}),
        ...(this.sort ? { sort: this.sort } : {}),
        ...(expandFields.length > 0 ? { expand: expandFields.join(',') } : {}),
        ...(fields ? { fields } : {}),
      }

      let rawItems: RecordModel[] = []
      let count: number | null = null

      if (typeof this.rangeStart === 'number' && typeof this.rangeEnd === 'number') {
        const perPage = this.rangeEnd - this.rangeStart + 1
        const page = Math.floor(this.rangeStart / perPage) + 1
        const list = await pb!.collection(this.collectionName).getList(page, perPage, options)
        rawItems = list.items
        count = list.totalItems
      } else if (typeof this.limitValue === 'number') {
        const list = await pb!.collection(this.collectionName).getList(1, this.limitValue, options)
        rawItems = list.items
        count = list.totalItems
      } else {
        rawItems = await this.fetchAll(options)
        count = rawItems.length
      }

      let records = rawItems.map((item) => {
        const next = stripRecord(item)
        if (expandFields.length > 0 && item.expand) {
          expandFields.forEach((field) => {
            const expandedValue = (item.expand as any)[field]
            if (expandedValue) {
              next[field] = Array.isArray(expandedValue) ? expandedValue.map((entry) => stripRecord(entry)) : stripRecord(expandedValue)
            }
          })
        }
        return next
      })

      records = await this.attachExpandedProducts(records)

      if (this.expectSingle) {
        const single = records[0] || null
        if (!single) return { data: null, error: { message: 'No rows returned' }, count }
        return { data: single, error: null, count }
      }
      if (this.expectMaybeSingle) return { data: records[0] || null, error: null, count }
      return { data: records, error: null, count: this.wantsCount ? count : null }
    } catch (error) {
      return { data: null, error: normalizeError(error), count: null }
    }
  }

  private async resolveTargets() {
    const filter = this.buildFilterString()
    if (!filter) return []
    return pb!.collection(this.collectionName).getFullList({ filter, sort: this.sort || '-created' })
  }

  private async executeInsert(): Promise<QueryResult<any>> {
    try {
      const payloads = this.writePayload as any[]
      const created = []
      for (const item of payloads) created.push(await pb!.collection(this.collectionName).create(compactObject(item)))
      return { data: created.map(stripRecord), error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  }

  private async executeUpdate(): Promise<QueryResult<any>> {
    try {
      const targets = await this.resolveTargets()
      const updated = []
      for (const target of targets) updated.push(await pb!.collection(this.collectionName).update(target.id, compactObject(this.writePayload || {})))
      const data = updated.map(stripRecord)
      return { data: this.returnOnWrite ? data : null, error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  }

  private async executeDelete(): Promise<QueryResult<any>> {
    try {
      const targets = await this.resolveTargets()
      for (const target of targets) await pb!.collection(this.collectionName).delete(target.id)
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  }

  private async findOneByFilter(filter: string) {
    const response = await pb!.collection(this.collectionName).getList(1, 1, { filter })
    return response.items[0] || null
  }

  private async executeUpsert(): Promise<QueryResult<any>> {
    try {
      const payloads = this.writePayload as any[]
      const result: RecordModel[] = []
      for (const payload of payloads) {
        const cleanPayload = compactObject(payload)
        let target: RecordModel | null = null
        if (cleanPayload.id) {
          try { target = await pb!.collection(this.collectionName).getOne(cleanPayload.id) } catch { target = null }
        } else if (cleanPayload.key) {
          target = await this.findOneByFilter(`key=${escapeFilterValue(cleanPayload.key)}`)
        } else if (cleanPayload.user_id && cleanPayload.product_id) {
          target = await this.findOneByFilter(`user_id=${escapeFilterValue(cleanPayload.user_id)} && product_id=${escapeFilterValue(cleanPayload.product_id)}`)
        }
        if (target) result.push(await pb!.collection(this.collectionName).update(target.id, cleanPayload))
        else result.push(await pb!.collection(this.collectionName).create(cleanPayload))
      }
      return { data: result.map(stripRecord), error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  }

  private async execute() {
    switch (this.operation) {
      case 'insert': return this.executeInsert()
      case 'update': return this.executeUpdate()
      case 'upsert': return this.executeUpsert()
      case 'delete': return this.executeDelete()
      case 'select': default: return this.executeSelect()
    }
  }
}

// ---------- PocketBase supabase-compat client ----------
const pbClient = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }): Promise<{ data: { user: any | null }; error: any }> {
      try {
        const authData = await pb!.collection('users').authWithPassword(email, password)
        return { data: { user: normalizeAuthUser(authData.record) }, error: null }
      } catch (error) {
        return { data: { user: null }, error: normalizeError(error) }
      }
    },

    async signUp({ email, password }: { email: string; password: string }): Promise<{ data: { user: any | null }; error: any }> {
      try {
        const created = await pb!.collection('users').create({ email, password, passwordConfirm: password, emailVisibility: true })
        return { data: { user: normalizeAuthUser(created) }, error: null }
      } catch (error) {
        return { data: { user: null }, error: normalizeError(error) }
      }
    },

    async resetPasswordForEmail(email: string, _options?: { redirectTo?: string }): Promise<{ data: null; error: any }> {
      try {
        await pb!.collection('users').requestPasswordReset(email)
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: normalizeError(error) }
      }
    },

    async confirmPasswordReset(token: string, password: string, passwordConfirm: string): Promise<{ data: null; error: any }> {
      try {
        await pb!.collection('users').confirmPasswordReset(token, password, passwordConfirm)
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: normalizeError(error) }
      }
    },

    async updateUser({ password }: { password: string }): Promise<{ data: { user: any | null }; error: any }> {
      if (!pb!.authStore.record) return { data: { user: null }, error: { message: 'Not authenticated' } }
      try {
        const updated = await pb!.collection('users').update(pb!.authStore.record.id, { password, passwordConfirm: password })
        pb!.authStore.save(pb!.authStore.token, updated)
        return { data: { user: normalizeAuthUser(updated) }, error: null }
      } catch (error) {
        return { data: { user: null }, error: normalizeError(error) }
      }
    },

    async getUser(): Promise<{ data: { user: any | null }; error: any }> {
      try {
        if (pb!.authStore.isValid && pb!.authStore.record) return { data: { user: normalizeAuthUser(pb!.authStore.record) }, error: null }
        return { data: { user: null }, error: null }
      } catch (error) {
        return { data: { user: null }, error: normalizeError(error) }
      }
    },

    async signOut(): Promise<{ error: any }> {
      pb!.authStore.clear()
      return { error: null }
    },
  },

  from(collection: string) {
    return new PocketBaseQueryBuilder(collection)
  },

  async rpc(functionName: string, params?: Record<string, any>) {
    try {
      if (functionName === 'check_admin_status') {
        const userId = params?.user_id
        if (!userId) return { data: false, error: null }
        const byId = await pb!.collection('user_profiles').getList(1, 1, { filter: `id=${escapeFilterValue(userId)}` })
        const profileById = byId.items[0]
        if (profileById) return { data: Boolean(profileById.is_admin), error: null }
        const byRelation = await pb!.collection('user_profiles').getList(1, 1, { filter: `user=${escapeFilterValue(userId)}` })
        return { data: Boolean(byRelation.items[0]?.is_admin), error: null }
      }
      if (functionName === 'cleanup_deleted_products') {
        const threshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        const records = await pb!.collection('deleted_products').getFullList({ sort: '-deleted_at' })
        for (const record of records) {
          const deletedAt = record.deleted_at || record.created
          if (!deletedAt) continue
          if (new Date(deletedAt) <= threshold) await pb!.collection('deleted_products').delete(record.id)
        }
        return { data: true, error: null }
      }
      return { data: null, error: { message: `Unknown rpc function: ${functionName}` } }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  },

  storage: {
    from(_bucket: string) {
      return {
        async upload(_fileName: string, file: File) {
          try {
            const dataUrl = await compressImage(file)
            return { data: { path: dataUrl }, error: null }
          } catch (error) {
            return { data: null, error: normalizeError(error) }
          }
        },
        getPublicUrl(filePath: string) {
          return { data: { publicUrl: filePath } }
        },
      }
    },
  },
}

// ================================================================
// DEMO MODE CLIENT
// ================================================================

const DEMO_SESSION_KEY = 'novinki:demo_session'

// In-memory mutable demo state (persists within the browser session)
let _demoProducts: DemoProduct[] = JSON.parse(JSON.stringify(DEMO_PRODUCTS_INITIAL))
let _demoBookmarks: Array<{ id: string; user_id: string; product_id: string; created_at: string }> = []
let _demoRatings: Array<{ id: string; user_id: string; product_id: string; rating: number }> = []
let _demoDeleted: Array<any> = []
let _demoRequests: Array<any> = []

function getDemoSession(): { user: (typeof DEMO_USERS)[0] } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function setDemoSession(user: (typeof DEMO_USERS)[0] | null) {
  if (typeof window === 'undefined') return
  if (user) window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ user }))
  else window.localStorage.removeItem(DEMO_SESSION_KEY)
}

class DemoQueryBuilder implements PromiseLike<QueryResult<any>> {
  private operation: QueryOperation = 'select'
  private eqFilters: Array<{ field: string; value: any }> = []
  private orSearch: string | null = null
  private sortField: string | null = null
  private sortAsc = true
  private rangeStart?: number
  private rangeEnd?: number
  private limitValue?: number
  private wantsCount = false
  private expectSingle = false
  private expectMaybeSingle = false
  private returnOnWrite = false
  private writePayload: any = null
  private selectColumns = '*'

  constructor(private readonly collection: string) {}

  select(columns = '*', opts?: { count?: 'exact' }) {
    if (this.operation !== 'select') { this.returnOnWrite = true; return this }
    this.selectColumns = columns
    this.wantsCount = opts?.count === 'exact'
    return this
  }
  insert(payload: any | any[]) { this.operation = 'insert'; this.writePayload = Array.isArray(payload) ? payload : [payload]; return this }
  update(payload: any) { this.operation = 'update'; this.writePayload = payload; return this }
  upsert(payload: any) { this.operation = 'upsert'; this.writePayload = Array.isArray(payload) ? payload : [payload]; return this }
  delete() { this.operation = 'delete'; return this }
  eq(field: string, value: any) { this.eqFilters.push({ field, value }); return this }
  or(expr: string) { this.orSearch = expr; return this }
  order(field: string, opts?: { ascending?: boolean }) { this.sortField = field; this.sortAsc = opts?.ascending ?? true; return this }
  range(start: number, end: number) { this.rangeStart = start; this.rangeEnd = end; return this }
  limit(n: number) { this.limitValue = n; return this }
  single() { this.expectSingle = true; return this }
  maybeSingle() { this.expectMaybeSingle = true; return this }

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private getStore(): any[] {
    switch (this.collection) {
      case 'products': return _demoProducts
      case 'bookmarks': return _demoBookmarks
      case 'product_ratings': return _demoRatings
      case 'deleted_products': return _demoDeleted
      case 'requests': return _demoRequests
      case 'user_profiles': return DEMO_USERS.map(u => ({ ...u }))
      case 'view_history': return []
      case 'product_views': return []
      case 'product_statistics': return []
      default: return []
    }
  }

  private applyFilters(items: any[]): any[] {
    let result = [...items]
    for (const { field, value } of this.eqFilters) {
      result = result.filter(item => String(item[field]) === String(value))
    }
    if (this.orSearch) {
      const terms: Array<{ field: string; value: string }> = []
      for (const token of this.orSearch.split(',')) {
        const m = token.trim().match(/^([a-zA-Z0-9_]+)\.ilike\.%(.*)%$/)
        if (m) terms.push({ field: m[1], value: m[2].toLowerCase() })
      }
      if (terms.length > 0) {
        result = result.filter(item =>
          terms.some(({ field, value }) => String(item[field] || '').toLowerCase().includes(value))
        )
      }
    }
    return result
  }

  private applySort(items: any[]): any[] {
    if (!this.sortField) return items
    const field = this.sortField
    const asc = this.sortAsc
    return [...items].sort((a, b) => {
      const av = a[field]
      const bv = b[field]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string') return asc ? av.localeCompare(bv) : bv.localeCompare(av)
      return asc ? (av > bv ? 1 : av < bv ? -1 : 0) : (bv > av ? 1 : bv < av ? -1 : 0)
    })
  }

  private execute(): QueryResult<any> {
    switch (this.operation) {
      case 'select': return this.execSelect()
      case 'insert': return this.execInsert()
      case 'update': return this.execUpdate()
      case 'upsert': return this.execUpsert()
      case 'delete': return this.execDelete()
      default: return { data: null, error: null }
    }
  }

  private execSelect(): QueryResult<any> {
    try {
      let items = this.applyFilters(this.getStore())

      if (this.collection === 'bookmarks' && this.selectColumns.includes('products(*)')) {
        items = items.map(b => ({
          ...b,
          products: _demoProducts.find(p => p.id === b.product_id) || null,
        }))
      }

      items = this.applySort(items)
      const total = items.length

      if (typeof this.rangeStart === 'number' && typeof this.rangeEnd === 'number') {
        items = items.slice(this.rangeStart, this.rangeEnd + 1)
      } else if (typeof this.limitValue === 'number') {
        items = items.slice(0, this.limitValue)
      }

      if (this.expectSingle) return { data: items[0] || null, error: items[0] ? null : { message: 'No rows' }, count: total }
      if (this.expectMaybeSingle) return { data: items[0] || null, error: null, count: total }
      return { data: items, error: null, count: this.wantsCount ? total : null }
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Demo error' }, count: null }
    }
  }

  private execInsert(): QueryResult<any> {
    const payloads = (this.writePayload as any[]).map(p => ({
      id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: new Date().toISOString(),
      ...p,
    }))
    switch (this.collection) {
      case 'products': _demoProducts = [..._demoProducts, ...payloads]; break
      case 'bookmarks': _demoBookmarks = [..._demoBookmarks, ...payloads]; break
      case 'product_ratings': _demoRatings = [..._demoRatings, ...payloads]; break
      case 'deleted_products': _demoDeleted = [..._demoDeleted, ...payloads]; break
      case 'requests': _demoRequests = [..._demoRequests, ...payloads]; break
    }
    return { data: payloads, error: null }
  }

  private execUpdate(): QueryResult<any> {
    const filtered = this.applyFilters(this.getStore())
    const ids = new Set(filtered.map(i => i.id))
    const updated: any[] = []
    switch (this.collection) {
      case 'products':
        _demoProducts = _demoProducts.map(p => {
          if (!ids.has(p.id)) return p
          const next = { ...p, ...this.writePayload }
          updated.push(next)
          return next
        })
        break
      case 'deleted_products':
        _demoDeleted = _demoDeleted.map(p => {
          if (!ids.has(p.id)) return p
          const next = { ...p, ...this.writePayload }
          updated.push(next)
          return next
        })
        break
    }
    return { data: this.returnOnWrite ? updated : null, error: null }
  }

  private execUpsert(): QueryResult<any> {
    const results: any[] = []
    for (const payload of this.writePayload as any[]) {
      if (this.collection === 'product_ratings') {
        const existing = _demoRatings.find(r => r.user_id === payload.user_id && r.product_id === payload.product_id)
        if (existing) {
          _demoRatings = _demoRatings.map(r => r === existing ? { ...r, ...payload } : r)
        } else {
          const newRecord = { id: `demo-${Date.now()}`, created_at: new Date().toISOString(), ...payload }
          _demoRatings = [..._demoRatings, newRecord]
        }
        const productRatings = _demoRatings.filter(r => r.product_id === payload.product_id)
        const avg = productRatings.reduce((s, r) => s + r.rating, 0) / productRatings.length
        _demoProducts = _demoProducts.map(p => p.id === payload.product_id ? { ...p, rating: Math.round(avg * 10) / 10 } : p)
        results.push(payload)
      }
    }
    return { data: results, error: null }
  }

  private execDelete(): QueryResult<any> {
    const filtered = this.applyFilters(this.getStore())
    const ids = new Set(filtered.map(i => i.id))
    switch (this.collection) {
      case 'products': _demoProducts = _demoProducts.filter(p => !ids.has(p.id)); break
      case 'bookmarks': _demoBookmarks = _demoBookmarks.filter(b => !ids.has(b.id)); break
      case 'deleted_products': _demoDeleted = _demoDeleted.filter(d => !ids.has(d.id)); break
    }
    return { data: null, error: null }
  }
}

const demoClient = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }): Promise<{ data: { user: any }; error: any }> {
      const found = DEMO_USERS.find(u => u.email === email && password === (u.is_admin ? DEMO_ADMIN_PASSWORD : 'user1234'))
      if (!found) return { data: { user: null }, error: { message: 'Неверный email или пароль' } }
      setDemoSession(found)
      return { data: { user: found }, error: null }
    },
    async signUp(): Promise<{ data: { user: any }; error: any }> {
      return { data: { user: null }, error: { message: 'Регистрация недоступна в демо-режиме. Используйте: ' + DEMO_ADMIN_EMAIL + ' / ' + DEMO_ADMIN_PASSWORD } }
    },
    async resetPasswordForEmail(): Promise<{ data: null; error: any }> {
      return { data: null, error: { message: 'Сброс пароля недоступен в демо-режиме' } }
    },
    async confirmPasswordReset(): Promise<{ data: null; error: any }> {
      return { data: null, error: null }
    },
    async updateUser(): Promise<{ data: { user: any }; error: any }> {
      return { data: { user: null }, error: { message: 'Смена пароля недоступна в демо-режиме' } }
    },
    async getUser(): Promise<{ data: { user: any }; error: any }> {
      const session = getDemoSession()
      return { data: { user: session?.user || null }, error: null }
    },
    async signOut(): Promise<{ error: any }> {
      setDemoSession(null)
      return { error: null }
    },
  },

  from(collection: string) {
    return new DemoQueryBuilder(collection)
  },

  async rpc(functionName: string, params?: Record<string, any>) {
    if (functionName === 'check_admin_status') {
      const userId = params?.user_id
      const user = DEMO_USERS.find(u => u.id === userId)
      return { data: Boolean(user?.is_admin), error: null }
    }
    if (functionName === 'cleanup_deleted_products') {
      const threshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      _demoDeleted = _demoDeleted.filter(d => new Date(d.deleted_at || d.created_at) > threshold)
      return { data: true, error: null }
    }
    return { data: null, error: null }
  },

  storage: {
    from(_bucket: string) {
      return {
        async upload(_fileName: string, file: File) {
          try {
            const dataUrl = await compressImage(file)
            return { data: { path: dataUrl }, error: null }
          } catch (error) {
            return { data: null, error: { message: String(error) } }
          }
        },
        getPublicUrl(filePath: string) {
          return { data: { publicUrl: filePath } }
        },
      }
    },
  },
}

// ---------- Exports ----------
export const supabase = DEMO_MODE ? (demoClient as any) : (pbClient as any)
export { pb as pocketbase }
