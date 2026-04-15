/**
 * 微信云开发服务层
 * 封装云数据库的CRUD操作
 * 
 * 重要：CLI 模式下 uniCloud 可能不可用，
 * 本模块自动回退到本地存储（uni.getStorageSync）
 */

// 云数据库集合名称
export const COLLECTIONS = {
  USERS: 'users',
  TRAINING_LOGS: 'training_logs',
  TRAINING_PLANS: 'training_plans',
  EXERCISE_MAXES: 'exercise_maxes',
  BODY_METRICS: 'body_metrics',
} as const

// 云开发是否可用
let cloudAvailable: boolean | null = null

/**
 * 检测云开发是否可用
 */
function checkCloudAvailable(): boolean {
  if (cloudAvailable !== null) return cloudAvailable
  try {
    // @ts-ignore
    if (typeof uniCloud !== 'undefined' && uniCloud.database) {
      cloudAvailable = true
    } else {
      cloudAvailable = false
    }
  } catch {
    cloudAvailable = false
  }
  if (!cloudAvailable) {
    console.log('[CloudService] 云开发不可用，使用本地存储模式')
  }
  return cloudAvailable
}

/**
 * 获取云数据库引用
 */
function getDB(): any {
  if (!checkCloudAvailable()) return null
  try {
    // @ts-ignore
    return uniCloud.database()
  } catch {
    return null
  }
}

// ========== 本地存储辅助函数 ==========

function localKey(collection: string): string {
  return `wt_${collection}`
}

function localGetList(collection: string): any[] {
  try {
    const raw = uni.getStorageSync(localKey(collection))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function localSaveList(collection: string, list: any[]): void {
  try {
    uni.setStorageSync(localKey(collection), JSON.stringify(list))
  } catch (e) {
    console.error('[CloudService] 本地存储写入失败', e)
  }
}

// ========== 云开发服务对象 ==========

export const cloudService = {
  /** 初始化（本地模式下无需操作） */
  init() {
    checkCloudAvailable()
    return Promise.resolve()
  },

  /** 查询集合 */
  async query<T = any>(
    collection: string,
    where: Record<string, any> = {},
    orderBy: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
    limit: number = 20
  ): Promise<T[]> {
    const db = getDB()
    if (!db) return localQuery(collection, where, orderBy, order, limit)

    try {
      let q: any = db.collection(collection)
      if (Object.keys(where).length > 0) {
        q = q.where(where)
      }
      q = q.orderBy(orderBy, order).limit(limit)
      const result = await q.get()
      return (result.data || []) as T[]
    } catch (error) {
      console.error(`[CloudService] 查询 ${collection} 失败:`, error)
      return localQuery(collection, where, orderBy, order, limit)
    }
  },

  /** 添加文档 */
  async add(collection: string, data: any): Promise<string> {
    const db = getDB()
    if (!db) return localAdd(collection, data)

    try {
      const result = await db.collection(collection).add({ data })
      return result.id || result._id || ''
    } catch (error) {
      console.error(`[CloudService] 添加 ${collection} 失败:`, error)
      return localAdd(collection, data)
    }
  },

  /** 更新文档 */
  async update(collection: string, id: string, data: any): Promise<boolean> {
    const db = getDB()
    if (!db) return localUpdate(collection, id, data)

    try {
      await db.collection(collection).doc(id).update({ data })
      return true
    } catch (error) {
      console.error(`[CloudService] 更新 ${collection} 失败:`, error)
      return localUpdate(collection, id, data)
    }
  },

  /** 删除文档 */
  async remove(collection: string, id: string): Promise<boolean> {
    const db = getDB()
    if (!db) return localRemove(collection, id)

    try {
      await db.collection(collection).doc(id).remove()
      return true
    } catch (error) {
      console.error(`[CloudService] 删除 ${collection} 失败:`, error)
      return localRemove(collection, id)
    }
  },

  /** 获取单条文档 */
  async getById<T = any>(collection: string, id: string): Promise<T | null> {
    const db = getDB()
    if (!db) return localGetById(collection, id)

    try {
      const result = await db.collection(collection).doc(id).get()
      return (result.data || null) as T | null
    } catch (error) {
      console.error(`[CloudService] 获取 ${collection} 失败:`, error)
      return localGetById(collection, id)
    }
  },
}

// ========== 本地存储 CRUD 实现 ==========

function localQuery(
  collection: string,
  where: Record<string, any>,
  orderBy: string,
  order: 'asc' | 'desc',
  limit: number
): any[] {
  let list = localGetList(collection)

  // 简单 where 过滤
  if (where && Object.keys(where).length > 0) {
    list = list.filter((item: any) =>
      Object.entries(where).every(([key, value]) => item[key] === value)
    )
  }

  // 排序
  list.sort((a: any, b: any) => {
    const va = a[orderBy] || ''
    const vb = b[orderBy] || ''
    if (va < vb) return order === 'asc' ? -1 : 1
    if (va > vb) return order === 'asc' ? 1 : -1
    return 0
  })

  return list.slice(0, limit)
}

function localAdd(collection: string, data: any): string {
  const list = localGetList(collection)
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const item = { ...data, _id: id }
  list.unshift(item)
  localSaveList(collection, list)
  return id
}

function localUpdate(collection: string, id: string, data: any): boolean {
  const list = localGetList(collection)
  const index = list.findIndex((item: any) => item._id === id)
  if (index === -1) return false
  list[index] = { ...list[index], ...data }
  localSaveList(collection, list)
  return true
}

function localRemove(collection: string, id: string): boolean {
  const list = localGetList(collection)
  const filtered = list.filter((item: any) => item._id !== id)
  localSaveList(collection, filtered)
  return filtered.length < list.length
}

function localGetById(collection: string, id: string): any | null {
  const list = localGetList(collection)
  return list.find((item: any) => item._id === id) || null
}
