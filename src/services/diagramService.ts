import type { EngineType } from '@/types'
import { getAuthToken, clearAuthToken, promptLoginRedirect } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/dev-api/ai'

export interface DiagramSavePayload {
  id?: string
  title?: string
  engineType: EngineType
  mermaidContent?: string
  drawioXml?: string
  excalidrawJson?: string
  thumbnail?: string
}

export const diagramService = {
  async save(payload: DiagramSavePayload) {
    const token = getAuthToken()
    const res = await fetch(`${API_BASE_URL}/diagram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthToken()
        promptLoginRedirect('登录已失效，是否前往登录？')
        throw new Error('未登录或登录已过期，请重新登录')
      }
      const err = await res.text()
      throw new Error(err || '保存失败')
    }
    const data = await res.json()
    // 兼容 AjaxResult 包装和直返数据
    return data?.data ?? data
  },

  async list() {
    const token = getAuthToken()
    const res = await fetch(`${API_BASE_URL}/diagram/list`, {
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthToken()
        promptLoginRedirect('登录已失效，是否前往登录？')
        throw new Error('未登录或登录已过期，请重新登录')
      }
      const err = await res.text()
      throw new Error(err || '查询失败')
    }
    const data = await res.json()
    // 兼容 AjaxResult 包装
    return data?.data ?? data
  },

  async get(id: string) {
    const token = getAuthToken()
    const res = await fetch(`${API_BASE_URL}/diagram/${id}`, {
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthToken()
        promptLoginRedirect('登录已失效，是否前往登录？')
        throw new Error('未登录或登录已过期，请重新登录')
      }
      const err = await res.text()
      throw new Error(err || '查询失败')
    }
    const data = await res.json()
    return data?.data ?? data
  },
}
