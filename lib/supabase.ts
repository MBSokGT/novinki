import PocketBase, { ClientResponseError, RecordModel } from 'pocketbase'

type QueryOperation = 'select' | 'insert' | 'update' | 'upsert' | 'delete'

interface QueryResult<T = any> {
  data: T
  error: any
  count?: number | null
}

const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

if (!pocketBaseUrl) {
  throw new Error(
    'Missing PocketBase URL. Set NEXT_PUBLIC_POCKETBASE_URL (or temporary fallback NEXT_PUBLIC_SUPABASE_URL).'
  )
}

const pb = new PocketBase(pocketBaseUrl)

if (typeof window !== 'undefined') {
  pb.authStore.loadFromCookie(document.cookie || '')
  pb.authStore.onChange(() => {
    // Keep auth token available for middleware checks.
    document.cookie = pb.authStore.exportToCookie({
      httpOnly: false,
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:',
      path: '/',
    })
  })
}

function normalizeError(error: unknown) {
  if (!error) return null
  if (error instanceof ClientResponseError) {
    return {
      message: error.message,
      status: error.status,
      response: error.response,
    }
  }
  if (error instanceof Error) {
    return { message: error.message }
  }
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
  return {
    ...rest,
    id,
    email,
  }
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function compactObject<T extends Record<string, any>>(value: T) {
  const next: Record<string, any> = {}
  Object.entries(value).forEach(([key, item]) => {
    if (item !== undefined) next[key] = item
  })
  return next as T
}

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
    if (this.operation !== 'select') {
      this.returnOnWrite = true
      return this
    }

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

  update(payload: any) {
    this.operation = 'update'
    this.writePayload = payload
    return this
  }

  upsert(payload: any) {
    this.operation = 'upsert'
    this.writePayload = Array.isArray(payload) ? payload : [payload]
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(field: string, value: any) {
    this.filters.push(`${field}=${escapeFilterValue(value)}`)
    return this
  }

  or(expression: string) {
    expression
      .split(',')
      .map(parseOrToken)
      .filter(Boolean)
      .forEach((item) => this.orFilters.push(item))
    return this
  }

  order(field: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    const ascending = options?.ascending ?? true
    this.sort = ascending ? field : `-${field}`
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

  then<TResult1 = QueryResult<any>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private buildFilterString() {
    const chunks: string[] = []

    if (this.filters.length > 0) {
      chunks.push(this.filters.length > 1 ? `(${this.filters.join(' && ')})` : this.filters[0])
    }

    if (this.orFilters.length > 0) {
      chunks.push(this.orFilters.length > 1 ? `(${this.orFilters.join(' || ')})` : this.orFilters[0])
    }

    return chunks.join(' && ')
  }

  private parseExpandFields() {
    const matches = [...this.selectColumns.matchAll(/([a-zA-Z0-9_]+)\(\*\)/g)]
    return matches.map((match) => match[1])
  }

  private parseFields() {
    if (this.selectColumns.trim() === '*') return undefined
    const fields = this.selectColumns
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part && !part.endsWith('(*)'))

    return fields.length > 0 ? fields.join(',') : undefined
  }

  private async fetchAll(options: {
    filter?: string
    sort?: string
    expand?: string
    fields?: string
  }) {
    const pageSize = 200
    let page = 1
    let totalPages = 1
    const items: RecordModel[] = []

    while (page <= totalPages) {
      const response = await pb.collection(this.collectionName).getList(page, pageSize, options)
      items.push(...response.items)
      totalPages = response.totalPages
      page += 1
    }

    return items
  }

  private async attachExpandedProducts(records: any[]) {
    if (this.collectionName !== 'bookmarks' || !this.selectColumns.includes('products(*)')) {
      return records
    }

    const ids = Array.from(
      new Set(
        records
          .map((item) => item.product_id || item.product)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    )

    if (ids.length === 0) return records

    const filter = ids.map((id) => `id=${escapeFilterValue(id)}`).join(' || ')
    const products = await pb.collection('products').getFullList({
      filter,
      sort: '-created',
    })

    const productsById = new Map(products.map((item) => [item.id, stripRecord(item)]))

    return records.map((item) => {
      if (item.products) return item
      const productId = item.product_id || item.product
      return {
        ...item,
        products: productsById.get(productId) || null,
      }
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
        const list = await pb.collection(this.collectionName).getList(page, perPage, options)
        rawItems = list.items
        count = list.totalItems
      } else if (typeof this.limitValue === 'number') {
        const list = await pb.collection(this.collectionName).getList(1, this.limitValue, options)
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
              next[field] = Array.isArray(expandedValue)
                ? expandedValue.map((entry) => stripRecord(entry))
                : stripRecord(expandedValue)
            }
          })
        }
        return next
      })

      records = await this.attachExpandedProducts(records)

      if (this.expectSingle) {
        const single = records[0] || null
        if (!single) {
          return { data: null, error: { message: 'No rows returned' }, count }
        }
        return { data: single, error: null, count }
      }

      if (this.expectMaybeSingle) {
        return { data: records[0] || null, error: null, count }
      }

      return { data: records, error: null, count: this.wantsCount ? count : null }
    } catch (error) {
      return { data: null, error: normalizeError(error), count: null }
    }
  }

  private async resolveTargets() {
    const filter = this.buildFilterString()
    if (!filter) return []

    const list = await pb.collection(this.collectionName).getFullList({
      filter,
      sort: this.sort || '-created',
    })

    return list
  }

  private async executeInsert(): Promise<QueryResult<any>> {
    try {
      const payloads = this.writePayload as any[]
      const created = []
      for (const item of payloads) {
        created.push(await pb.collection(this.collectionName).create(compactObject(item)))
      }
      const data = created.map(stripRecord)
      return { data, error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  }

  private async executeUpdate(): Promise<QueryResult<any>> {
    try {
      const targets = await this.resolveTargets()
      const updated = []
      for (const target of targets) {
        updated.push(
          await pb.collection(this.collectionName).update(target.id, compactObject(this.writePayload || {}))
        )
      }

      const data = updated.map(stripRecord)
      return { data: this.returnOnWrite ? data : null, error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  }

  private async executeDelete(): Promise<QueryResult<any>> {
    try {
      const targets = await this.resolveTargets()
      for (const target of targets) {
        await pb.collection(this.collectionName).delete(target.id)
      }
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  }

  private async findOneByFilter(filter: string) {
    const response = await pb.collection(this.collectionName).getList(1, 1, { filter })
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
          try {
            target = await pb.collection(this.collectionName).getOne(cleanPayload.id)
          } catch {
            target = null
          }
        } else if (cleanPayload.key) {
          target = await this.findOneByFilter(`key=${escapeFilterValue(cleanPayload.key)}`)
        } else if (cleanPayload.user_id && cleanPayload.product_id) {
          target = await this.findOneByFilter(
            `user_id=${escapeFilterValue(cleanPayload.user_id)} && product_id=${escapeFilterValue(
              cleanPayload.product_id
            )}`
          )
        }

        if (target) {
          result.push(await pb.collection(this.collectionName).update(target.id, cleanPayload))
        } else {
          result.push(await pb.collection(this.collectionName).create(cleanPayload))
        }
      }

      return { data: result.map(stripRecord), error: null }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  }

  private async execute() {
    switch (this.operation) {
      case 'insert':
        return this.executeInsert()
      case 'update':
        return this.executeUpdate()
      case 'upsert':
        return this.executeUpsert()
      case 'delete':
        return this.executeDelete()
      case 'select':
      default:
        return this.executeSelect()
    }
  }
}

export const supabase = {
  auth: {
    async signInWithPassword({
      email,
      password,
    }: {
      email: string
      password: string
    }): Promise<{ data: { user: any | null }; error: any }> {
      try {
        const authData = await pb.collection('users').authWithPassword(email, password)
        return { data: { user: normalizeAuthUser(authData.record) }, error: null }
      } catch (error) {
        return { data: { user: null }, error: normalizeError(error) }
      }
    },

    async signUp({
      email,
      password,
    }: {
      email: string
      password: string
    }): Promise<{ data: { user: any | null }; error: any }> {
      try {
        const created = await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          emailVisibility: true,
        })
        return { data: { user: normalizeAuthUser(created) }, error: null }
      } catch (error) {
        return { data: { user: null }, error: normalizeError(error) }
      }
    },

    async resetPasswordForEmail(
      email: string,
      _options?: { redirectTo?: string }
    ): Promise<{ data: null; error: any }> {
      try {
        await pb.collection('users').requestPasswordReset(email)
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: normalizeError(error) }
      }
    },

    async confirmPasswordReset(
      token: string,
      password: string,
      passwordConfirm: string
    ): Promise<{ data: null; error: any }> {
      try {
        await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: normalizeError(error) }
      }
    },

    async updateUser({
      password,
    }: {
      password: string
    }): Promise<{ data: { user: any | null }; error: any }> {
      if (!pb.authStore.record) {
        return { data: { user: null }, error: { message: 'Not authenticated' } }
      }

      try {
        const updated = await pb.collection('users').update(pb.authStore.record.id, {
          password,
          passwordConfirm: password,
        })
        pb.authStore.save(pb.authStore.token, updated)
        return { data: { user: normalizeAuthUser(updated) }, error: null }
      } catch (error) {
        return { data: { user: null }, error: normalizeError(error) }
      }
    },

    async getUser(): Promise<{ data: { user: any | null }; error: any }> {
      try {
        if (pb.authStore.isValid && pb.authStore.record) {
          return { data: { user: normalizeAuthUser(pb.authStore.record) }, error: null }
        }
        return { data: { user: null }, error: null }
      } catch (error) {
        return { data: { user: null }, error: normalizeError(error) }
      }
    },

    async signOut(): Promise<{ error: any }> {
      pb.authStore.clear()
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

        const byId = await pb.collection('user_profiles').getList(1, 1, {
          filter: `id=${escapeFilterValue(userId)}`,
        })
        const profileById = byId.items[0]
        if (profileById) {
          return { data: Boolean(profileById.is_admin), error: null }
        }

        const byRelation = await pb.collection('user_profiles').getList(1, 1, {
          filter: `user=${escapeFilterValue(userId)}`,
        })
        return { data: Boolean(byRelation.items[0]?.is_admin), error: null }
      }

      if (functionName === 'cleanup_deleted_products') {
        const threshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        const records = await pb.collection('deleted_products').getFullList({
          sort: '-deleted_at',
        })

        for (const record of records) {
          const deletedAt = record.deleted_at || record.created
          if (!deletedAt) continue
          const date = new Date(deletedAt)
          if (date <= threshold) {
            await pb.collection('deleted_products').delete(record.id)
          }
        }

        return { data: true, error: null }
      }

      return { data: null, error: { message: `Unknown rpc function: ${functionName}` } }
    } catch (error) {
      return { data: null, error: normalizeError(error) }
    }
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(fileName: string, file: File) {
          try {
            const dataUrl = await fileToDataUrl(file)
            return { data: { path: dataUrl }, error: null }
          } catch (error) {
            return { data: null, error: normalizeError(error) }
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

export { pb as pocketbase }
