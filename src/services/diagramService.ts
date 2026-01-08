import type { EngineType } from '@/types'
import { apiClient, ensureAuth } from '@/lib/apiClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/dev-api/ai'

export interface DiagramSavePayload {
  id?: string
  title?: string
  engineType: EngineType
  thumbnail?: string
  mermaid?: { content: string }
  drawio?: { xml: string }
  excalidraw?: { json: string }
  dataflow?: { nodes: any[]; edges: any[] }
  // 兼容旧字段（将被后端转换）
  mermaidContent?: string
  drawioXml?: string
  excalidrawJson?: string
  dataflowJson?: string
}

export const diagramService = {
  async save(payload: DiagramSavePayload) {
    const res = await apiClient.post(`${API_BASE_URL}/diagram`, payload, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(err || '保存失败')
    }
    const data = await res.json()
    ensureAuth(data)
    // 兼容 AjaxResult 包装和直返数据
    return data?.data ?? data
  },

  async list() {
    const res = await apiClient.get(`${API_BASE_URL}/diagram/list`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(err || '查询失败')
    }
    const data = await res.json()
    ensureAuth(data)
    // 兼容 AjaxResult 包装
    return data?.data ?? data
  },

  async get(id: string) {
    const res = await apiClient.get(`${API_BASE_URL}/diagram/${id}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(err || '查询失败')
    }
    const data = await res.json()
    ensureAuth(data)
    return data?.data ?? data
  },
}
