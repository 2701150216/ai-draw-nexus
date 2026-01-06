// Toolbox 数据文档服务
import type { ToolboxDocument, ToolboxRecord } from '@/types/dataflow'
import { getAuthToken } from './authService'

// 开发环境使用相对路径通过 Vite 代理，生产环境使用环境变量
// 注意：生产环境的 VITE_TOOLBOX_API_URL 应该是完整的域名（如 http://mufengmufeng.cn）
const TOOLBOX_BASE_URL = import.meta.env.DEV 
  ? '' 
  : (import.meta.env.VITE_TOOLBOX_API_URL || window.location.origin)

// 文档缓存（避免重复请求）
const documentCache = new Map<string, { document: ToolboxDocument; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 获取请求头，包含认证信息
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  }
  
  return headers
}

export const toolboxService = {
  /**
   * 清除文档缓存
   */
  clearCache(documentId?: string) {
    if (documentId) {
      documentCache.delete(documentId)
      console.log(`清除文档缓存: ${documentId}`)
    } else {
      documentCache.clear()
      console.log('清除所有文档缓存')
    }
  },

  /**
   * 获取数据文档列表
   */
  async listDocuments(): Promise<ToolboxDocument[]> {
    try {
      const response = await fetch(`${TOOLBOX_BASE_URL}/api/km/data-documents?pageSize=1000`, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'include', // 携带 cookie 用于权限验证
      })
      
      if (!response.ok) {
        console.error('Failed to fetch documents, status:', response.status)
        return []
      }
      
      const data = await response.json()
      // 后端返回格式: { total, rows } 或 { documents }
      const documents = data.rows || data.documents || []
      
      // 转换为统一格式，添加记录数
      return documents.map((doc: any) => ({
        ...doc,
        recordCount: Array.isArray(doc.data) ? doc.data.length : 0,
      }))
    } catch (error) {
      console.error('Error fetching toolbox documents:', error)
      return []
    }
  },

  /**
   * 获取单个文档详情（带缓存）
   */
  async getDocument(id: string, useCache: boolean = true): Promise<ToolboxDocument | null> {
    try {
      // 检查缓存
      if (useCache) {
        const cached = documentCache.get(id)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log(`使用缓存的文档: ${id}`)
          return cached.document
        }
      }

      console.log(`从服务器获取文档: ${id}`)
      const response = await fetch(`${TOOLBOX_BASE_URL}/api/km/data-documents/${id}`, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'include',
      })
      
      if (!response.ok) {
        console.error('Failed to fetch document, status:', response.status)
        return null
      }
      
      const document = await response.json()
      const result = {
        ...document,
        recordCount: Array.isArray(document.data) ? document.data.length : 0,
      }

      // 存入缓存
      documentCache.set(id, {
        document: result,
        timestamp: Date.now(),
      })

      return result
    } catch (error) {
      console.error('Error fetching toolbox document:', error)
      return null
    }
  },

  /**
   * 获取文档的数据记录（调用专门的 records API）
   */
  async getDocumentRecords(
    id: string,
    params?: { page?: number; pageSize?: number; search?: string }
  ): Promise<{ records: ToolboxRecord[]; total: number; fields?: any[] }> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.page) queryParams.append('page', String(params.page))
      if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize))
      if (params?.search) queryParams.append('search', params.search)
      
      const url = `${TOOLBOX_BASE_URL}/api/km/data-documents/${id}/records?${queryParams}`
      console.log(`获取记录: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'include',
      })
      
      if (!response.ok) {
        console.error('Failed to fetch records, status:', response.status)
        return { records: [], total: 0 }
      }
      
      const data = await response.json()
      console.log('后端返回数据:', data)
      
      // 后端返回格式: { total, rows: [{id, documentId, data: {...}}], code, msg }
      // rows 中的每条记录的实际数据在 data 字段中
      const records = (data.rows || []).map((row: any) => ({
        _id: row.id,
        ...row.data, // 展开实际的记录数据
      }))
      
      return {
        records,
        total: data.total || 0,
        fields: data.fields || []
      }
    } catch (error) {
      console.error('Error fetching toolbox records:', error)
      return { records: [], total: 0 }
    }
  },

  /**
   * 搜索文档
   */
  async searchDocuments(query: string): Promise<ToolboxDocument[]> {
    try {
      const response = await fetch(`${TOOLBOX_BASE_URL}/api/km/data-documents?search=${encodeURIComponent(query)}&pageSize=100`, {
        method: 'GET',
        headers: getHeaders(),
        credentials: 'include',
      })
      
      if (!response.ok) {
        console.error('Failed to search documents, status:', response.status)
        return []
      }
      
      const data = await response.json()
      // 后端返回格式: { total, rows } 或 { documents }
      const documents = data.rows || data.documents || []
      
      return documents.map((doc: any) => ({
        ...doc,
        recordCount: Array.isArray(doc.data) ? doc.data.length : 0,
      }))
    } catch (error) {
      console.error('Error searching toolbox documents:', error)
      return []
    }
  },
}
