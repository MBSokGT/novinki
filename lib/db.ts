import crypto from 'crypto'
import type { NextRequest } from 'next/server'
import { hashPassword, sanitizeInput, verifyPassword } from './security'
import { getLocalD1, type LocalD1Database } from './sqlite'

export const SESSION_COOKIE_NAME = 'novinki_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60

function isSingleAdminModeEnabled() {
  return process.env.SINGLE_ADMIN_MODE !== 'false'
}

type DataOperation = 'select' | 'insert' | 'update' | 'upsert' | 'delete'
type FilterOperator = 'eq' | 'ilike' | 'gte' | 'lte'

type DataFilter = {
  field: string
  op: FilterOperator
  value: string | number | boolean | null
}

export type DataRequestPayload = {
  collection: string
  operation: DataOperation
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

type QueryResult<T = unknown> = {
  data: T
  error: { message: string } | null
  count?: number | null
}

type AppDatabase = LocalD1Database

export type SessionUser = {
  id: string
  email: string
  is_admin: boolean
  is_blocked: boolean
  blocked_reason: string | null
  blocked_at: string | null
}

type CollectionConfig = {
  table: string
  columns: string[]
  booleanFields?: string[]
  publicRead?: boolean
  requiresAdmin?: boolean
  ownableByUserField?: string
  allowSelfProfileRead?: boolean
  readOnly?: boolean
  upsertKeys?: string[][]
}

const PRODUCT_COLUMNS = [
  'id',
  'name',
  'brand',
  'article_number',
  'description',
  'image_url',
  'images',
  'flyer_url',
  'price_list_url',
  'advantages',
  'attention_points',
  'website_link',
  'is_archived',
  'is_supplier_novelty',
  'is_dishwasher_safe',
  'is_microwave_safe',
  'temp_min',
  'temp_max',
  'category',
  'year',
  'rating',
  'price',
  'created_by',
  'updated_by',
  'bumped_at',
  'created_at',
  'updated_at',
] as const

const JSON_FIELDS = new Set(['images'])

const COLLECTIONS: Record<string, CollectionConfig> = {
  products: {
    table: 'products',
    columns: [...PRODUCT_COLUMNS],
    booleanFields: ['is_archived', 'is_supplier_novelty', 'is_dishwasher_safe', 'is_microwave_safe'],
    publicRead: true,
    requiresAdmin: true,
  },
  user_profiles: {
    table: 'user_profiles',
    columns: ['id', 'email', 'is_admin', 'is_blocked', 'blocked_reason', 'blocked_at', 'created_at', 'updated_at'],
    booleanFields: ['is_admin', 'is_blocked'],
    requiresAdmin: true,
    allowSelfProfileRead: true,
  },
  bookmarks: {
    table: 'bookmarks',
    columns: ['id', 'user_id', 'product_id', 'created_at'],
    ownableByUserField: 'user_id',
  },
  product_ratings: {
    table: 'product_ratings',
    columns: ['id', 'user_id', 'product_id', 'rating', 'created_at', 'updated_at'],
    ownableByUserField: 'user_id',
    upsertKeys: [['user_id', 'product_id']],
  },
  view_history: {
    table: 'view_history',
    columns: ['id', 'user_id', 'product_id', 'created_at'],
    ownableByUserField: 'user_id',
  },
  product_views: {
    table: 'product_views',
    columns: ['id', 'user_id', 'product_id', 'created_at'],
    requiresAdmin: true,
  },
  deleted_products: {
    table: 'deleted_products',
    columns: [
      'id',
      'original_product_id',
      ...PRODUCT_COLUMNS.filter((column) => column !== 'id' && column !== 'updated_at' && column !== 'is_archived'),
      'deleted_at',
    ],
    booleanFields: ['is_supplier_novelty', 'is_dishwasher_safe', 'is_microwave_safe'],
    requiresAdmin: true,
  },
  archived_products: {
    table: 'archived_products',
    columns: [
      'id',
      ...PRODUCT_COLUMNS.filter((column) => column !== 'id' && column !== 'updated_at' && column !== 'is_archived'),
      'deleted_at',
    ],
    booleanFields: ['is_supplier_novelty', 'is_dishwasher_safe', 'is_microwave_safe'],
    requiresAdmin: true,
  },
  categories: {
    table: 'categories',
    columns: ['id', 'name', 'created_at'],
    publicRead: true,
    requiresAdmin: true,
  },
  years: {
    table: 'years',
    columns: ['id', 'name', 'created_at'],
    publicRead: true,
    requiresAdmin: true,
  },
  requests: {
    table: 'requests',
    columns: ['id', 'name', 'contact', 'product', 'article', 'delivered', 'created_at'],
    booleanFields: ['delivered'],
    requiresAdmin: true,
  },
  product_statistics: {
    table: 'product_statistics',
    columns: ['id', 'name', 'brand', 'view_count', 'bookmark_count'],
    requiresAdmin: true,
    readOnly: true,
  },
}

function nowIso() {
  return new Date().toISOString()
}

function addTime(ms: number) {
  return new Date(Date.now() + ms).toISOString()
}

function createId() {
  return crypto.randomUUID()
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function normalizeEmail(value: string) {
  return sanitizeInput(value).toLowerCase()
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return false
}

function normalizeRow(collection: string, row: Record<string, unknown> | null) {
  if (!row) return row
  const booleanFields = COLLECTIONS[collection]?.booleanFields || []
  const next = { ...row }
  for (const field of booleanFields) {
    if (field in next) {
      next[field] = normalizeBoolean(next[field])
    }
  }
  for (const field of JSON_FIELDS) {
    if (typeof next[field] === 'string') {
      try {
        next[field] = JSON.parse(next[field] as string)
      } catch {
        next[field] = []
      }
    }
  }
  return next
}

function prepareFieldValue(collection: string, field: string, value: unknown) {
  if (COLLECTIONS[collection]?.booleanFields?.includes(field)) {
    return normalizeBoolean(value) ? 1 : 0
  }
  if (JSON_FIELDS.has(field) && value && typeof value !== 'string') {
    return JSON.stringify(value)
  }
  return value
}

function ensureCollection(collection: string) {
  const config = COLLECTIONS[collection]
  if (!config) {
    throw new Error(`Unsupported collection: ${collection}`)
  }
  return config
}

function quoteIdentifier(identifier: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`)
  }
  return `"${identifier}"`
}

function parseSelectedColumns(collection: string, selectColumns = '*') {
  const config = ensureCollection(collection)
  if (selectColumns.trim() === '*') return [...config.columns]

  const columns = selectColumns
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !item.endsWith('(*)'))

  if (columns.length === 0) return [...config.columns]

  for (const column of columns) {
    if (!config.columns.includes(column)) {
      throw new Error(`Unsupported column "${column}" for collection "${collection}"`)
    }
  }

  return columns
}

function buildWhereClause(collection: string, filters: DataFilter[] = [], orFilters: DataFilter[] = []) {
  const config = ensureCollection(collection)
  const params: Array<string | number | null> = []
  const clauses: string[] = []
  const allowed = new Set(config.columns)

  const buildClause = (filter: DataFilter) => {
    if (!allowed.has(filter.field)) {
      throw new Error(`Unsupported filter field "${filter.field}" for collection "${collection}"`)
    }

    const column = quoteIdentifier(filter.field)
    if (filter.op === 'eq') {
      if (filter.value === null) {
        return `${column} IS NULL`
      }
      params.push(prepareFieldValue(collection, filter.field, filter.value) as string | number | null)
      return `${column} = ?`
    }

    if (filter.op === 'ilike') {
      params.push(`%${String(filter.value ?? '').toLowerCase()}%`)
      return `LOWER(${column}) LIKE ?`
    }

    if (filter.op === 'gte' || filter.op === 'lte') {
      params.push(prepareFieldValue(collection, filter.field, filter.value) as string | number | null)
      return `${column} ${filter.op === 'gte' ? '>=' : '<='} ?`
    }

    throw new Error(`Unsupported filter operator "${filter.op}"`)
  }

  if (filters.length > 0) {
    clauses.push(filters.map(buildClause).join(' AND '))
  }

  if (orFilters.length > 0) {
    clauses.push(`(${orFilters.map(buildClause).join(' OR ')})`)
  }

  return {
    whereSql: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
    params,
  }
}

async function getDb(): Promise<AppDatabase> {
  return getLocalD1()
}

export async function getAppEnv() {
  return process.env as Record<string, string | undefined>
}

export async function getCurrentUser(request: NextRequest): Promise<SessionUser | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!sessionToken) return null

  const db = await getDb()
  const tokenHash = sha256Hex(sessionToken)
  const row = await db
    .prepare(
      `
        SELECT
          users.id,
          users.email,
          COALESCE(user_profiles.is_admin, 0) AS is_admin,
          COALESCE(user_profiles.is_blocked, 0) AS is_blocked,
          user_profiles.blocked_reason,
          user_profiles.blocked_at
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        LEFT JOIN user_profiles ON user_profiles.id = users.id
        WHERE sessions.token_hash = ?
          AND sessions.expires_at > ?
        LIMIT 1
      `
    )
    .bind(tokenHash, nowIso())
    .first<Record<string, unknown>>()

  const user = row ? (normalizeRow('user_profiles', row) as SessionUser) : null
  if (!user) return null
  if (user.is_blocked) return null
  if (isSingleAdminModeEnabled() && !user.is_admin) {
    return null
  }
  return user
}

async function getUserProfile(db: AppDatabase, userId: string) {
  const row = await db
    .prepare('SELECT id, email, is_admin, is_blocked, blocked_reason, blocked_at, created_at, updated_at FROM user_profiles WHERE id = ? LIMIT 1')
    .bind(userId)
    .first<Record<string, unknown>>()

  return row ? normalizeRow('user_profiles', row) : null
}

async function isAdminUser(db: AppDatabase, userId: string) {
  const profile = await getUserProfile(db, userId)
  return Boolean(profile && normalizeBoolean(profile.is_admin))
}

function getSelfFilterValue(filters: DataFilter[], field: string) {
  return filters.find((filter) => filter.op === 'eq' && filter.field === field)?.value
}

function assertAccess(collection: string, operation: DataOperation, user: SessionUser | null, payload: DataRequestPayload) {
  const config = ensureCollection(collection)

  if (operation === 'select') {
    if (config.publicRead) return

    if (!user) {
      throw new Error('Authentication required')
    }

    if (config.allowSelfProfileRead) {
      const idFilter = getSelfFilterValue(payload.filters || [], 'id')
      if (idFilter === user.id || user.is_admin) return
    }

    if (config.ownableByUserField) {
      const ownerValue = getSelfFilterValue(payload.filters || [], config.ownableByUserField)
      if (ownerValue === user.id) return
    }

    if (config.requiresAdmin && user.is_admin) return

    throw new Error('Forbidden')
  }

  if (!user) {
    throw new Error('Authentication required')
  }

  if (config.readOnly) {
    throw new Error(`Collection "${collection}" is read-only`)
  }

  if (config.ownableByUserField) {
    const key = config.ownableByUserField
    const payloadItems = Array.isArray(payload.writePayload) ? payload.writePayload : payload.writePayload ? [payload.writePayload] : []
    const allOwnedByUser = payloadItems.every((item) => item?.[key] === user.id)
    const filteredOwner = getSelfFilterValue(payload.filters || [], key)
    if (allOwnedByUser || filteredOwner === user.id) return
  }

  if (config.requiresAdmin && user.is_admin) return

  throw new Error('Forbidden')
}

async function recalculateProductRating(db: AppDatabase, productId: string) {
  const ratingRow = await db
    .prepare('SELECT AVG(rating) AS avg_rating FROM product_ratings WHERE product_id = ?')
    .bind(productId)
    .first<{ avg_rating: number | null }>()

  await db
    .prepare('UPDATE products SET rating = ?, updated_at = ? WHERE id = ?')
    .bind(ratingRow?.avg_rating ?? null, nowIso(), productId)
    .run()
}

async function attachBookmarkProducts(rows: Array<Record<string, unknown>>, selectedColumns: string[]) {
  if (!selectedColumns.includes('product_id')) return rows

  const productIds = Array.from(
    new Set(
      rows
        .map((row) => String(row.product_id || ''))
        .filter((value) => value.length > 0)
    )
  )

  if (productIds.length === 0) return rows

  const db = await getDb()
  const placeholders = productIds.map(() => '?').join(', ')
  const result = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS.map(quoteIdentifier).join(', ')} FROM products WHERE id IN (${placeholders})`)
    .bind(...productIds)
    .all<Record<string, unknown>>()

  const productsById = new Map(
    (result.results || []).map((row) => [String(row.id), normalizeRow('products', row)])
  )

  return rows.map((row) => ({
    ...row,
    products: productsById.get(String(row.product_id || '')) || null,
  }))
}

async function runSelect(payload: DataRequestPayload, user: SessionUser | null): Promise<QueryResult<unknown>> {
  const config = ensureCollection(payload.collection)
  const selectedColumns = parseSelectedColumns(payload.collection, payload.selectColumns)
  const { whereSql, params } = buildWhereClause(payload.collection, payload.filters, payload.orFilters)

  let orderSql = ''
  if (payload.sort) {
    if (!config.columns.includes(payload.sort.field)) {
      throw new Error(`Unsupported sort field "${payload.sort.field}" for collection "${payload.collection}"`)
    }
    const direction = payload.sort.ascending === false ? 'DESC' : 'ASC'
    // Продвинутые ("bumped") товары всплывают в начало своей группы —
    // сортировка по дате добавления фактически сортирует по COALESCE(bumped_at, created_at).
    if (payload.collection === 'products' && payload.sort.field === 'created_at' && config.columns.includes('bumped_at')) {
      orderSql = ` ORDER BY COALESCE(${quoteIdentifier('bumped_at')}, ${quoteIdentifier('created_at')}) ${direction}`
    } else {
      orderSql = ` ORDER BY ${quoteIdentifier(payload.sort.field)} ${direction}`
    }
  }

  let limitSql = ''
  const rangeParams: Array<number> = []
  if (typeof payload.rangeStart === 'number' && typeof payload.rangeEnd === 'number') {
    const limit = payload.rangeEnd - payload.rangeStart + 1
    limitSql = ' LIMIT ? OFFSET ?'
    rangeParams.push(limit, payload.rangeStart)
  } else if (typeof payload.limitValue === 'number') {
    limitSql = ' LIMIT ?'
    rangeParams.push(payload.limitValue)
  }

  const db = await getDb()
  const rowsResult = await db
    .prepare(
      `SELECT ${selectedColumns.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(config.table)}${whereSql}${orderSql}${limitSql}`
    )
    .bind(...params, ...rangeParams)
    .all<Record<string, unknown>>()

  let rows = (rowsResult.results || []).map((row) => normalizeRow(payload.collection, row) as Record<string, unknown>)

  if (payload.collection === 'bookmarks' && payload.selectColumns?.includes('products(*)')) {
    rows = await attachBookmarkProducts(rows, selectedColumns)
  }

  // created_by/updated_by hold the acting admin's email — only admins may see them.
  if (payload.collection === 'products' && !user?.is_admin) {
    rows = rows.map((row) => {
      const { created_by, updated_by, ...rest } = row
      return rest
    })
  }

  let count: number | null = null
  if (payload.wantsCount) {
    const countRow = await db
      .prepare(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(config.table)}${whereSql}`)
      .bind(...params)
      .first<{ total: number }>()
    count = countRow?.total ?? 0
  }

  if (payload.expectSingle) {
    if (!rows[0]) {
      return { data: null, error: { message: 'No rows returned' }, count }
    }
    return { data: rows[0], error: null, count }
  }

  if (payload.expectMaybeSingle) {
    return { data: rows[0] || null, error: null, count }
  }

  return { data: rows, error: null, count }
}

function withDefaultFields(collection: string, item: Record<string, unknown>, isInsert: boolean) {
  const next = { ...item }
  const now = nowIso()
  const config = ensureCollection(collection)

  if (config.columns.includes('updated_at')) next.updated_at = now

  // Поля ниже относятся только к созданию строки — на UPDATE их подстановка
  // по умолчанию перезаписывала бы created_at и незаметно снимала бы
  // архивный статус у товаров, если он не передан в теле запроса.
  if (isInsert) {
    if (config.columns.includes('id') && !next.id) next.id = createId()
    if (config.columns.includes('created_at') && !next.created_at) next.created_at = now
    if (collection === 'deleted_products' && !next.deleted_at) next.deleted_at = now
    if (collection === 'archived_products' && !next.deleted_at) next.deleted_at = now
    if (collection === 'products' && next.is_archived === undefined) next.is_archived = false
    if (collection === 'requests' && next.delivered === undefined) next.delivered = false
  }

  return next
}

async function insertRows(collection: string, payloads: Array<Record<string, unknown>>) {
  const db = await getDb()
  const config = ensureCollection(collection)
  const createdRows: Array<Record<string, unknown>> = []
  const insertedIds: string[] = []

  try {
    for (const input of payloads) {
      const row = withDefaultFields(collection, input, true)
      const columnEntries: Array<[string, unknown]> = config.columns
        .filter((column) => row[column] !== undefined)
        .map((column) => [column, prepareFieldValue(collection, column, row[column])])

      const columns = columnEntries.map(([column]) => quoteIdentifier(column))
      const placeholders = columnEntries.map(() => '?')
      const values = columnEntries.map(([, value]) => value)

      await db
        .prepare(`INSERT INTO ${quoteIdentifier(config.table)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
        .bind(...values)
        .run()

      if (config.columns.includes('id') && row.id) insertedIds.push(String(row.id))

      if (collection === 'view_history') {
        await db
          .prepare('INSERT INTO product_views (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?)')
          .bind(createId(), row.user_id as string, row.product_id as string, row.created_at as string)
          .run()
      }

      if (collection === 'product_ratings') {
        await recalculateProductRating(db, String(row.product_id))
      }

      createdRows.push(normalizeRow(collection, row) as Record<string, unknown>)
    }
  } catch (error) {
    // Батч-вставка (например, импорт из Excel) не атомарна на уровне БД — если
    // строка N не вставилась, строки 1..N-1 уже физически в таблице. Без этой
    // компенсации администратор получил бы сообщение об ошибке импорта, но часть
    // товаров уже молча появилась бы в базе без предупреждения.
    if (insertedIds.length > 0 && config.columns.includes('id')) {
      const placeholders = insertedIds.map(() => '?').join(', ')
      await db
        .prepare(`DELETE FROM ${quoteIdentifier(config.table)} WHERE id IN (${placeholders})`)
        .bind(...insertedIds)
        .run()
    }
    throw error
  }

  return createdRows
}

async function findMatchingIds(collection: string, filters: DataFilter[] = [], orFilters: DataFilter[] = []) {
  const config = ensureCollection(collection)
  const { whereSql, params } = buildWhereClause(collection, filters, orFilters)
  const db = await getDb()
  const result = await db
    .prepare(`SELECT id FROM ${quoteIdentifier(config.table)}${whereSql}`)
    .bind(...params)
    .all<{ id: string }>()

  return (result.results || []).map((row) => row.id)
}

async function fetchByIds(collection: string, ids: string[], selectedColumns?: string) {
  if (ids.length === 0) return []
  const config = ensureCollection(collection)
  const fields = parseSelectedColumns(collection, selectedColumns)
  const placeholders = ids.map(() => '?').join(', ')
  const db = await getDb()
  const result = await db
    .prepare(`SELECT ${fields.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(config.table)} WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<Record<string, unknown>>()

  const rowsById = new Map(
    (result.results || []).map((row) => [String(row.id), normalizeRow(collection, row)])
  )
  return ids.map((id) => rowsById.get(id)).filter(Boolean) as Array<Record<string, unknown>>
}

async function runUpdate(payload: DataRequestPayload): Promise<QueryResult<unknown>> {
  const updateData = payload.writePayload as Record<string, unknown>
  const ids = await findMatchingIds(payload.collection, payload.filters, payload.orFilters)
  if (ids.length === 0) return { data: payload.returnOnWrite ? [] : null, error: null }

  const db = await getDb()
  const config = ensureCollection(payload.collection)
  const row = withDefaultFields(payload.collection, updateData, false)
  const assignments = config.columns
    .filter((column) => column !== 'id' && row[column] !== undefined)
    .map((column) => `${quoteIdentifier(column)} = ?`)
  const values = config.columns
    .filter((column) => column !== 'id' && row[column] !== undefined)
    .map((column) => prepareFieldValue(payload.collection, column, row[column]))

  for (const id of ids) {
    await db
      .prepare(`UPDATE ${quoteIdentifier(config.table)} SET ${assignments.join(', ')} WHERE id = ?`)
      .bind(...values, id)
      .run()
  }

  // A newly-blocked user must not keep using an already-issued session.
  if (payload.collection === 'user_profiles' && normalizeBoolean(updateData.is_blocked)) {
    for (const id of ids) {
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
    }
  }

  const updatedRows = payload.returnOnWrite ? await fetchByIds(payload.collection, ids, payload.selectColumns || '*') : null
  return { data: updatedRows, error: null }
}

async function runDelete(payload: DataRequestPayload): Promise<QueryResult<null>> {
  const ids = await findMatchingIds(payload.collection, payload.filters, payload.orFilters)
  if (ids.length === 0) return { data: null, error: null }

  const config = ensureCollection(payload.collection)
  const db = await getDb()
  const placeholders = ids.map(() => '?').join(', ')
  await db
    .prepare(`DELETE FROM ${quoteIdentifier(config.table)} WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run()

  return { data: null, error: null }
}

async function runUpsert(payload: DataRequestPayload): Promise<QueryResult<unknown>> {
  const config = ensureCollection(payload.collection)
  const items = Array.isArray(payload.writePayload) ? payload.writePayload : [payload.writePayload as Record<string, unknown>]
  const db = await getDb()
  const results: Array<Record<string, unknown>> = []

  for (const rawItem of items) {
    const item = withDefaultFields(payload.collection, rawItem, true)
    const uniqueKeySet =
      config.upsertKeys?.find((keySet) => keySet.every((key) => item[key] !== undefined)) ||
      (item.id ? ['id'] : null)

    if (!uniqueKeySet) {
      throw new Error(`No upsert key available for collection "${payload.collection}"`)
    }

    const where = uniqueKeySet.map((key) => `${quoteIdentifier(key)} = ?`).join(' AND ')
    const existing = await db
      .prepare(`SELECT id FROM ${quoteIdentifier(config.table)} WHERE ${where} LIMIT 1`)
      .bind(...uniqueKeySet.map((key) => prepareFieldValue(payload.collection, key, item[key])))
      .first<{ id: string }>()

    if (existing?.id) {
      const updatePayload: Record<string, unknown> = { ...item }
      delete updatePayload.id
      delete updatePayload.created_at
      const updated = await runUpdate({
        ...payload,
        filters: [{ field: 'id', op: 'eq', value: existing.id }],
        orFilters: [],
        writePayload: updatePayload,
        returnOnWrite: true,
        expectSingle: false,
        expectMaybeSingle: false,
      })
      const row = Array.isArray(updated.data) ? updated.data[0] : null
      if (row) results.push(row as Record<string, unknown>)
    } else {
      const created = await insertRows(payload.collection, [item])
      if (created[0]) results.push(created[0])
    }

    if (payload.collection === 'product_ratings' && item.product_id) {
      await recalculateProductRating(db, String(item.product_id))
    }
  }

  return { data: results, error: null }
}

function withProductAttribution(operation: DataOperation, user: SessionUser | null, writePayload: DataRequestPayload['writePayload']) {
  const actor = user?.email || null

  if (operation === 'insert') {
    const items = Array.isArray(writePayload) ? writePayload : [writePayload as Record<string, unknown>]
    return items.map((item) => ({ ...item, created_by: actor, updated_by: actor }))
  }

  if (operation === 'update') {
    return { ...(writePayload as Record<string, unknown>), updated_by: actor }
  }

  return writePayload
}

export async function executeDataRequest(request: NextRequest, payload: DataRequestPayload): Promise<QueryResult<unknown>> {
  const user = await getCurrentUser(request)
  try {
    assertAccess(payload.collection, payload.operation, user, payload)

    if (payload.collection === 'products' && (payload.operation === 'insert' || payload.operation === 'update')) {
      payload = { ...payload, writePayload: withProductAttribution(payload.operation, user, payload.writePayload) }
    }

    switch (payload.operation) {
      case 'select':
        return await runSelect(payload, user)
      case 'insert':
        return {
          data: await insertRows(
            payload.collection,
            Array.isArray(payload.writePayload) ? payload.writePayload : [payload.writePayload as Record<string, unknown>]
          ),
          error: null,
        }
      case 'update':
        return await runUpdate(payload)
      case 'upsert':
        return await runUpsert(payload)
      case 'delete':
        return await runDelete(payload)
      default:
        return { data: null, error: { message: 'Unsupported operation' } }
    }
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Unknown D1 error' },
      count: null,
    }
  }
}

export async function executeRpc(request: NextRequest, functionName: string, params?: Record<string, unknown>) {
  const user = await getCurrentUser(request)
  const db = await getDb()

  try {
    if (functionName === 'check_admin_status') {
      if (!user) return { data: false, error: null }
      const targetUserId = String(params?.user_id || '')
      if (!targetUserId || targetUserId !== user.id) return { data: false, error: null }
      return { data: await isAdminUser(db, targetUserId), error: null }
    }

    if (functionName === 'cleanup_deleted_products') {
      if (!user || !user.is_admin) {
        return { data: null, error: { message: 'Forbidden' } }
      }

      const threshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString()
      await db.prepare('DELETE FROM deleted_products WHERE deleted_at <= ?').bind(threshold).run()
      return { data: true, error: null }
    }

    return { data: null, error: { message: `Unknown rpc function: ${functionName}` } }
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown RPC error' } }
  }
}

export async function adminCreateUser(
  requestingUserId: string,
  emailInput: string,
  password: string,
  isAdmin: boolean
) {
  const db = await getDb()
  const requesterIsAdmin = await isAdminUser(db, requestingUserId)
  if (!requesterIsAdmin) {
    throw new Error('Forbidden')
  }

  const email = normalizeEmail(emailInput)
  if (!validateEmail(email)) throw new Error('Неверный формат email')
  if (password.length < 8) throw new Error('Пароль должен быть не короче 8 символов')

  const existing = await db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first<{ id: string }>()
  if (existing?.id) throw new Error('Пользователь с таким email уже существует')

  const userId = createId()
  const now = nowIso()

  await db
    .prepare('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, email, hashPassword(password), now, now)
    .run()

  await db
    .prepare(
      'INSERT INTO user_profiles (id, email, is_admin, is_blocked, blocked_reason, blocked_at, created_at, updated_at) VALUES (?, ?, ?, 0, NULL, NULL, ?, ?)'
    )
    .bind(userId, email, isAdmin ? 1 : 0, now, now)
    .run()

  return {
    user: {
      id: userId,
      email,
      is_admin: isAdmin,
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
    },
  }
}

export async function signInUser(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput)
  const db = await getDb()

  const userRow = await db
    .prepare(
      `
        SELECT
          users.id,
          users.email,
          users.password_hash,
          COALESCE(user_profiles.is_admin, 0) AS is_admin,
          COALESCE(user_profiles.is_blocked, 0) AS is_blocked,
          user_profiles.blocked_reason,
          user_profiles.blocked_at
        FROM users
        LEFT JOIN user_profiles ON user_profiles.id = users.id
        WHERE users.email = ?
        LIMIT 1
      `
    )
    .bind(email)
    .first<Record<string, unknown>>()

  if (!userRow || !verifyPassword(password, String(userRow.password_hash || ''))) {
    throw new Error('Неверный email или пароль')
  }

  if (isSingleAdminModeEnabled() && !normalizeBoolean(userRow.is_admin)) {
    throw new Error('Вход разрешен только администратору')
  }

  if (normalizeBoolean(userRow.is_blocked)) {
    throw new Error(String(userRow.blocked_reason || 'Пользователь заблокирован'))
  }

  const sessionToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = sha256Hex(sessionToken)
  const now = nowIso()

  // Opportunistic housekeeping: expired sessions and stale reset tokens
  // would otherwise accumulate forever (there is no scheduled job).
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run()
  await db.prepare('DELETE FROM password_reset_tokens WHERE expires_at <= ? OR used_at IS NOT NULL').bind(now).run()

  await db
    .prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(createId(), String(userRow.id), tokenHash, addTime(SESSION_TTL_MS), now)
    .run()

  return {
    sessionToken,
    user: {
      id: String(userRow.id),
      email: String(userRow.email),
      is_admin: normalizeBoolean(userRow.is_admin),
      is_blocked: normalizeBoolean(userRow.is_blocked),
      blocked_reason: (userRow.blocked_reason as string | null) || null,
      blocked_at: (userRow.blocked_at as string | null) || null,
    },
  }
}

export async function signOutUser(sessionToken: string | undefined) {
  if (!sessionToken) return
  const db = await getDb()
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(sha256Hex(sessionToken)).run()
}

export async function requestPasswordReset(emailInput: string, redirectTo?: string) {
  const email = normalizeEmail(emailInput)
  const db = await getDb()
  const user = await db
    .prepare(
      `
        SELECT
          users.id,
          users.email,
          COALESCE(user_profiles.is_admin, 0) AS is_admin
        FROM users
        LEFT JOIN user_profiles ON user_profiles.id = users.id
        WHERE users.email = ?
        LIMIT 1
      `
    )
    .bind(email)
    .first<{ id: string; email: string; is_admin: number | string | boolean }>()
  if (!user?.id) return { resetUrl: null }
  if (isSingleAdminModeEnabled() && !normalizeBoolean(user.is_admin)) {
    return { resetUrl: null }
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = sha256Hex(rawToken)
  const now = nowIso()

  await db
    .prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at, used_at) VALUES (?, ?, ?, ?, ?, NULL)')
    .bind(createId(), user.id, tokenHash, addTime(RESET_TOKEN_TTL_MS), now)
    .run()

  const env = await getAppEnv()
  const appUrl = env.APP_URL || redirectTo || 'http://localhost:3000/reset-password'
  const resetUrl = appUrl.includes('?') ? `${appUrl}&token=${rawToken}` : `${appUrl}?token=${rawToken}`

  if (env.PASSWORD_RESET_WEBHOOK_URL) {
    await fetch(env.PASSWORD_RESET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        resetUrl,
      }),
    }).catch(() => null)
  } else {
    console.log('[password-reset]', { email, resetUrl })
  }

  return { resetUrl }
}

export async function confirmPasswordReset(token: string, password: string, passwordConfirm: string) {
  if (password !== passwordConfirm) throw new Error('Пароли не совпадают')
  if (password.length < 8) throw new Error('Пароль должен быть не короче 8 символов')

  const db = await getDb()
  const tokenRow = await db
    .prepare(
      'SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1'
    )
    .bind(sha256Hex(token), nowIso())
    .first<{ id: string; user_id: string }>()

  if (!tokenRow?.id) throw new Error('Недействительная ссылка восстановления')

  const now = nowIso()
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(hashPassword(password), now, tokenRow.user_id).run()
  await db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').bind(now, tokenRow.id).run()
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(tokenRow.user_id).run()
}

export async function updateUserPassword(userId: string, password: string) {
  if (password.length < 8) throw new Error('Пароль должен быть не короче 8 символов')
  const db = await getDb()
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(hashPassword(password), nowIso(), userId).run()
}

export async function adminSetUserPassword(requestingUserId: string, targetUserId: string, password: string) {
  const db = await getDb()
  const requesterIsAdmin = await isAdminUser(db, requestingUserId)
  if (!requesterIsAdmin) {
    throw new Error('Forbidden')
  }

  await updateUserPassword(targetUserId, password)
  // Force the target user to log in again with the new password.
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(targetUserId).run()
}

export async function insertRequest(payload: {
  name: string
  contact: string
  product: string
  article?: string
  delivered: boolean
}) {
  const rows = await insertRows('requests', [
    {
      ...payload,
    },
  ])
  return rows[0] || null
}
