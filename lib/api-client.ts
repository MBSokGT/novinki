import {
  DEMO_ADMIN_PASSWORD,
  DEMO_PRODUCTS_INITIAL,
  DEMO_USERS,
  type DemoProduct,
} from './demo-data'

type QueryOperation = 'select' | 'insert' | 'update' | 'upsert' | 'delete'
type FilterOperator = 'eq' | 'ilike'

type QueryResult<T = unknown> = {
  data: T
  error: { message: string } | null
  count?: number | null
}

type DataFilter = {
  field: string
  op: FilterOperator
  value: string | number | boolean | null
}

type DataRequestPayload = {
  collection: string
  operation: QueryOperation
  selectColumns?: string
  filters?: DataFilter[]
  orFilters?: DataFilter[]
  sort?: {
    field: string
    ascending?: boolean
  }
  rangeStart?: number
  rangeEnd?: number
  limitValue?: number
  wantsCount?: boolean
  expectSingle?: boolean
  expectMaybeSingle?: boolean
  returnOnWrite?: boolean
  writePayload?: Record<string, unknown> | Array<Record<string, unknown>>
}

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

async function safeJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    return { data: null, error: { message: `HTTP ${response.status}` } } as T
  }
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

async function callInternalApi<T>(path: string, body?: Record<string, unknown>, method = 'POST'): Promise<T> {
  const response = await fetch(`${BASE_PATH}${path}`, {
    method,
    credentials: 'include',
    headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    cache: 'no-store',
  })

  const payload = await safeJson<T>(response)
  return payload
}

function parseOrExpression(expression: string): DataFilter[] {
  return expression
    .split(',')
    .map((token) => token.trim())
    .map((token) => {
      const ilikeMatch = token.match(/^([a-zA-Z0-9_]+)\.ilike\.%(.*)%$/)
      if (ilikeMatch) {
        return {
          field: ilikeMatch[1],
          op: 'ilike' as const,
          value: ilikeMatch[2],
        }
      }

      const eqMatch = token.match(/^([a-zA-Z0-9_]+)\.eq\.(.*)$/)
      if (eqMatch) {
        return {
          field: eqMatch[1],
          op: 'eq' as const,
          value: eqMatch[2],
        }
      }

      return null
    })
    .filter(Boolean) as DataFilter[]
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (event) => resolve(String(event.target?.result || ''))
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (event) => {
      const image = new Image()
      image.onerror = () => reject(new Error('Failed to load image'))
      image.onload = () => {
        const maxSize = 800
        let { width, height } = image
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context is unavailable'))
          return
        }

        ctx.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      image.src = String(event.target?.result || '')
    }
    reader.readAsDataURL(file)
  })
}

class RemoteQueryBuilder implements PromiseLike<QueryResult<unknown>> {
  private operation: QueryOperation = 'select'
  private selectColumns = '*'
  private filters: DataFilter[] = []
  private orFilters: DataFilter[] = []
  private sort?: {
    field: string
    ascending?: boolean
  }
  private rangeStart?: number
  private rangeEnd?: number
  private limitValue?: number
  private wantsCount = false
  private expectSingle = false
  private expectMaybeSingle = false
  private returnOnWrite = false
  private writePayload: Record<string, unknown> | Array<Record<string, unknown>> | null = null

  constructor(private readonly collection: string) {}

  select(columns = '*', options?: { count?: 'exact' }) {
    if (this.operation !== 'select') {
      this.returnOnWrite = true
      return this
    }

    this.selectColumns = columns
    this.wantsCount = options?.count === 'exact'
    return this
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.operation = 'insert'
    this.writePayload = payload
    return this
  }

  update(payload: Record<string, unknown>) {
    this.operation = 'update'
    this.writePayload = payload
    return this
  }

  upsert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.operation = 'upsert'
    this.writePayload = payload
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(field: string, value: string | number | boolean | null) {
    this.filters.push({ field, op: 'eq', value })
    return this
  }

  or(expression: string) {
    this.orFilters.push(...parseOrExpression(expression))
    return this
  }

  order(field: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.sort = {
      field,
      ascending: options?.ascending,
    }
    return this
  }

  range(start: number, end: number) {
    this.rangeStart = start
    this.rangeEnd = end
    return this
  }

  limit(limit: number) {
    this.limitValue = limit
    return this
  }

  single() {
    this.expectSingle = true
    return this
  }

  maybeSingle() {
    this.expectMaybeSingle = true
    return this
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined)
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<QueryResult<unknown> | TResult> {
    return this.execute().catch(onrejected ?? undefined)
  }

  finally(onfinally?: (() => void) | null): Promise<QueryResult<unknown>> {
    return this.execute().finally(onfinally ?? undefined)
  }

  private async execute() {
    return callInternalApi<QueryResult<unknown>>('/api/internal/data', {
      collection: this.collection,
      operation: this.operation,
      selectColumns: this.selectColumns,
      filters: this.filters,
      orFilters: this.orFilters,
      sort: this.sort,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
      limitValue: this.limitValue,
      wantsCount: this.wantsCount,
      expectSingle: this.expectSingle,
      expectMaybeSingle: this.expectMaybeSingle,
      returnOnWrite: this.returnOnWrite,
      writePayload: this.writePayload || undefined,
    })
  }
}

const remoteClient = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      return callInternalApi<{ data: { user: unknown | null }; error: { message: string } | null }>('/api/internal/auth', {
        action: 'signInWithPassword',
        email,
        password,
      })
    },

    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
      return callInternalApi<{ data: { resetUrl?: string | null } | null; error: { message: string } | null }>('/api/internal/auth', {
        action: 'resetPasswordForEmail',
        email,
        options,
      })
    },

    async confirmPasswordReset(token: string, password: string, passwordConfirm: string) {
      return callInternalApi<{ data: null; error: { message: string } | null }>('/api/internal/auth', {
        action: 'confirmPasswordReset',
        token,
        password,
        passwordConfirm,
      })
    },

    async updateUser({ password }: { password: string }) {
      return callInternalApi<{ data: { user: unknown | null }; error: { message: string } | null }>('/api/internal/auth', {
        action: 'updateUser',
        password,
      })
    },

    async getUser() {
      return callInternalApi<{ data: { user: unknown | null }; error: { message: string } | null }>('/api/internal/auth', undefined, 'GET')
    },

    async adminCreateUser({ email, password, isAdmin }: { email: string; password: string; isAdmin: boolean }) {
      return callInternalApi<{ data: { user: unknown | null }; error: { message: string } | null }>('/api/internal/auth', {
        action: 'adminCreateUser',
        email,
        password,
        isAdmin,
      })
    },

    async signOut() {
      return callInternalApi<{ error: { message: string } | null }>('/api/internal/auth', {
        action: 'signOut',
      })
    },
  },

  from(collection: string) {
    return new RemoteQueryBuilder(collection)
  },

  async rpc(functionName: string, params?: Record<string, unknown>) {
    return callInternalApi<{ data: unknown; error: { message: string } | null }>('/api/internal/rpc', {
      functionName,
      params,
    })
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(_fileName: string, file: File) {
          try {
            const dataUrl = bucket === 'flyers' ? await readFileAsDataUrl(file) : await compressImage(file)
            return { data: { path: dataUrl }, error: null }
          } catch (error) {
            return {
              data: null,
              error: { message: error instanceof Error ? error.message : 'Failed to process file' },
            }
          }
        },

        getPublicUrl(filePath: string) {
          return {
            data: {
              publicUrl: filePath,
            },
          }
        },
      }
    },
  },
}

const DEMO_SESSION_KEY = 'novinki:demo_session'

let demoProducts: DemoProduct[] = JSON.parse(JSON.stringify(DEMO_PRODUCTS_INITIAL))
let demoBookmarks: Array<{ id: string; user_id: string; product_id: string; created_at: string }> = []
let demoRatings: Array<{ id: string; user_id: string; product_id: string; rating: number; created_at: string; updated_at: string }> = []
let demoDeleted: Array<Record<string, unknown>> = []
let demoRequests: Array<Record<string, unknown>> = []
let demoProductRequests: Array<Record<string, unknown>> = []
let demoCategories: Array<Record<string, unknown>> = []
let demoTags: Array<Record<string, unknown>> = []
const demoSiteSettings: Array<Record<string, unknown>> = [
  { id: 'site-name', key: 'site_name', value: 'Новинки ассортимента', updated_at: new Date().toISOString() },
  { id: 'primary-color', key: 'primary_color', value: '#9B1B1B', updated_at: new Date().toISOString() },
]

function getDemoSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setDemoSession(user: (typeof DEMO_USERS)[number] | null) {
  if (typeof window === 'undefined') return
  if (user) {
    window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ user }))
  } else {
    window.localStorage.removeItem(DEMO_SESSION_KEY)
  }
}

class DemoQueryBuilder implements PromiseLike<QueryResult<unknown>> {
  private operation: QueryOperation = 'select'
  private eqFilters: Array<{ field: string; value: unknown }> = []
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
  private writePayload: Record<string, unknown> | Array<Record<string, unknown>> | null = null
  private selectColumns = '*'

  constructor(private readonly collection: string) {}

  select(columns = '*', options?: { count?: 'exact' }) {
    if (this.operation !== 'select') {
      this.returnOnWrite = true
      return this
    }
    this.selectColumns = columns
    this.wantsCount = options?.count === 'exact'
    return this
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.operation = 'insert'
    this.writePayload = payload
    return this
  }

  update(payload: Record<string, unknown>) {
    this.operation = 'update'
    this.writePayload = payload
    return this
  }

  upsert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.operation = 'upsert'
    this.writePayload = payload
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(field: string, value: unknown) {
    this.eqFilters.push({ field, value })
    return this
  }

  or(expression: string) {
    this.orSearch = expression
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.sortField = field
    this.sortAsc = options?.ascending ?? true
    return this
  }

  range(start: number, end: number) {
    this.rangeStart = start
    this.rangeEnd = end
    return this
  }

  limit(limit: number) {
    this.limitValue = limit
    return this
  }

  single() {
    this.expectSingle = true
    return this
  }

  maybeSingle() {
    this.expectMaybeSingle = true
    return this
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<QueryResult<unknown> | TResult> {
    return Promise.resolve(this.execute()).catch(onrejected ?? undefined)
  }

  finally(onfinally?: (() => void) | null): Promise<QueryResult<unknown>> {
    return Promise.resolve(this.execute()).finally(onfinally ?? undefined)
  }

  private getStore() {
    switch (this.collection) {
      case 'products':
        return demoProducts
      case 'bookmarks':
        return demoBookmarks
      case 'product_ratings':
        return demoRatings
      case 'deleted_products':
        return demoDeleted
      case 'requests':
        return demoRequests
      case 'product_requests':
        return demoProductRequests
      case 'categories':
        return demoCategories
      case 'tags':
        return demoTags
      case 'site_settings':
        return demoSiteSettings
      case 'user_profiles':
        return DEMO_USERS.map((user) => ({
          id: user.id,
          email: user.email,
          is_admin: user.is_admin,
          is_blocked: false,
          blocked_reason: null,
          blocked_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      case 'view_history':
      case 'product_views':
      case 'product_statistics':
      case 'audit_logs':
      default:
        return []
    }
  }

  private applyFilters(items: Array<Record<string, unknown>>) {
    let result = [...items]
    for (const filter of this.eqFilters) {
      result = result.filter((item) => String(item[filter.field]) === String(filter.value))
    }

    if (this.orSearch) {
      const terms = parseOrExpression(this.orSearch)
      result = result.filter((item) =>
        terms.some((term) =>
          String(item[term.field] || '')
            .toLowerCase()
            .includes(String(term.value || '').toLowerCase())
        )
      )
    }

    return result
  }

  private applySort(items: Array<Record<string, unknown>>) {
    if (!this.sortField) return items
    return [...items].sort((a, b) => {
      const left = a[this.sortField!]
      const right = b[this.sortField!]
      if (left == null && right == null) return 0
      if (left == null) return 1
      if (right == null) return -1
      if (typeof left === 'string' && typeof right === 'string') {
        return this.sortAsc ? left.localeCompare(right) : right.localeCompare(left)
      }
      if (left === right) return 0
      return this.sortAsc ? (left > right ? 1 : -1) : (left < right ? 1 : -1)
    })
  }

  private execute(): QueryResult<unknown> {
    switch (this.operation) {
      case 'select':
        return this.executeSelect()
      case 'insert':
        return this.executeInsert()
      case 'update':
        return this.executeUpdate()
      case 'upsert':
        return this.executeUpsert()
      case 'delete':
        return this.executeDelete()
      default:
        return { data: null, error: { message: 'Unsupported operation' } }
    }
  }

  private executeSelect(): QueryResult<unknown> {
    let items = this.applyFilters(this.getStore() as Array<Record<string, unknown>>)

    if (this.collection === 'bookmarks' && this.selectColumns.includes('products(*)')) {
      items = items.map((bookmark) => ({
        ...bookmark,
        products: demoProducts.find((product) => product.id === bookmark.product_id) || null,
      }))
    }

    if (this.collection === 'product_statistics') {
      items = demoProducts.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        view_count: 0,
        bookmark_count: demoBookmarks.filter((bookmark) => bookmark.product_id === product.id).length,
      }))
    }

    items = this.applySort(items)
    const total = items.length

    if (typeof this.rangeStart === 'number' && typeof this.rangeEnd === 'number') {
      items = items.slice(this.rangeStart, this.rangeEnd + 1)
    } else if (typeof this.limitValue === 'number') {
      items = items.slice(0, this.limitValue)
    }

    if (this.expectSingle) {
      return {
        data: items[0] || null,
        error: items[0] ? null : { message: 'No rows returned' },
        count: total,
      }
    }

    if (this.expectMaybeSingle) {
      return {
        data: items[0] || null,
        error: null,
        count: total,
      }
    }

    return {
      data: items,
      error: null,
      count: this.wantsCount ? total : null,
    }
  }

  private executeInsert(): QueryResult<unknown> {
    const payloads = (Array.isArray(this.writePayload) ? this.writePayload : [this.writePayload || {}]).map((payload) => ({
      id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    }))

    switch (this.collection) {
      case 'products':
        demoProducts = [...demoProducts, ...(payloads as unknown as DemoProduct[])]
        break
      case 'bookmarks':
        demoBookmarks = [...demoBookmarks, ...(payloads as unknown as typeof demoBookmarks)]
        break
      case 'product_ratings':
        demoRatings = [...demoRatings, ...(payloads as unknown as typeof demoRatings)]
        break
      case 'deleted_products':
        demoDeleted = [...demoDeleted, ...payloads]
        break
      case 'requests':
        demoRequests = [...demoRequests, ...payloads]
        break
      case 'product_requests':
        demoProductRequests = [...demoProductRequests, ...payloads]
        break
      case 'categories':
        demoCategories = [...demoCategories, ...payloads]
        break
      case 'tags':
        demoTags = [...demoTags, ...payloads]
        break
    }

    return {
      data: payloads,
      error: null,
    }
  }

  private executeUpdate(): QueryResult<unknown> {
    const ids = new Set(this.applyFilters(this.getStore() as Array<Record<string, unknown>>).map((item) => item.id))
    const updated: Array<Record<string, unknown>> = []

    if (this.collection === 'products') {
      demoProducts = demoProducts.map((product) => {
        if (!ids.has(product.id)) return product
        const next = { ...product, ...(this.writePayload || {}), updated_at: new Date().toISOString() }
        updated.push(next)
        return next
      })
    } else if (this.collection === 'user_profiles') {
      const nextPayload = (this.writePayload || {}) as Record<string, unknown>
      DEMO_USERS.forEach((user) => {
        if (ids.has(user.id)) {
          if (typeof nextPayload.is_admin === 'boolean') user.is_admin = nextPayload.is_admin
        }
      })
    }

    return {
      data: this.returnOnWrite ? updated : null,
      error: null,
    }
  }

  private executeUpsert(): QueryResult<unknown> {
    const items = Array.isArray(this.writePayload) ? this.writePayload : [this.writePayload || {}]
    const results: Array<Record<string, unknown>> = []

    for (const item of items) {
      if (this.collection === 'product_ratings') {
        const existing = demoRatings.find(
          (rating) => rating.user_id === item.user_id && rating.product_id === item.product_id
        )
        if (existing) {
          existing.rating = Number(item.rating)
          existing.updated_at = new Date().toISOString()
          results.push(existing)
        } else {
          const created = {
            id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            user_id: String(item.user_id),
            product_id: String(item.product_id),
            rating: Number(item.rating),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          demoRatings = [...demoRatings, created]
          results.push(created)
        }

        const productRatings = demoRatings.filter((rating) => rating.product_id === item.product_id)
        const average = productRatings.reduce((sum, rating) => sum + rating.rating, 0) / productRatings.length
        demoProducts = demoProducts.map((product) =>
          product.id === item.product_id ? { ...product, rating: Math.round(average * 10) / 10 } : product
        )
      }

      if (this.collection === 'site_settings') {
        const index = demoSiteSettings.findIndex((setting) => setting.key === item.key)
        const next = {
          id: index >= 0 ? String(demoSiteSettings[index].id) : `demo-setting-${Date.now()}`,
          key: item.key,
          value: item.value,
          updated_by: item.updated_by || null,
          updated_at: new Date().toISOString(),
        }
        if (index >= 0) {
          demoSiteSettings[index] = next
        } else {
          demoSiteSettings.push(next)
        }
        results.push(next)
      }
    }

    return {
      data: results,
      error: null,
    }
  }

  private executeDelete(): QueryResult<unknown> {
    const ids = new Set(this.applyFilters(this.getStore() as Array<Record<string, unknown>>).map((item) => item.id))

    switch (this.collection) {
      case 'products':
        demoProducts = demoProducts.filter((product) => !ids.has(product.id))
        break
      case 'bookmarks':
        demoBookmarks = demoBookmarks.filter((bookmark) => !ids.has(bookmark.id))
        break
      case 'deleted_products':
        demoDeleted = demoDeleted.filter((item) => !ids.has(item.id))
        break
      case 'categories':
        demoCategories = demoCategories.filter((item) => !ids.has(item.id))
        break
      case 'tags':
        demoTags = demoTags.filter((item) => !ids.has(item.id))
        break
    }

    return {
      data: null,
      error: null,
    }
  }
}

const demoClient = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const user = DEMO_USERS.find(
        (item) => item.is_admin && item.email === email && password === DEMO_ADMIN_PASSWORD
      )

      if (!user) {
        return { data: { user: null }, error: { message: 'Неверный email или пароль' } }
      }

      setDemoSession(user)
      return { data: { user }, error: null }
    },

    async resetPasswordForEmail() {
      return { data: null, error: { message: 'Сброс пароля недоступен в демо-режиме' } }
    },

    async confirmPasswordReset() {
      return { data: null, error: null }
    },

    async updateUser() {
      return { data: { user: null }, error: { message: 'Смена пароля недоступна в демо-режиме' } }
    },

    async getUser() {
      return { data: { user: getDemoSession()?.user || null }, error: null }
    },

    async adminCreateUser() {
      return { data: { user: null }, error: { message: 'Недоступно в демо-режиме' } }
    },

    async signOut() {
      setDemoSession(null)
      return { error: null }
    },
  },

  from(collection: string) {
    return new DemoQueryBuilder(collection)
  },

  async rpc(functionName: string, params?: Record<string, unknown>) {
    if (functionName === 'check_admin_status') {
      const user = DEMO_USERS.find((item) => item.id === params?.user_id)
      return { data: Boolean(user?.is_admin), error: null }
    }

    if (functionName === 'cleanup_deleted_products') {
      const threshold = Date.now() - 1000 * 60 * 60 * 24 * 14
      demoDeleted = demoDeleted.filter((item) => {
        const deletedAt = new Date(String(item.deleted_at || item.created_at || '')).getTime()
        return Number.isFinite(deletedAt) && deletedAt > threshold
      })
      return { data: true, error: null }
    }

    return { data: null, error: { message: `Unknown rpc function: ${functionName}` } }
  },

  storage: remoteClient.storage,
}

export const apiClient = DEMO_MODE ? (demoClient as any) : (remoteClient as any)
