import { getAuthToken, clearAuthToken } from '@/services/authService'

/**
 * 全局 API 拦截器
 * 自动处理 401 认证失败，提示用户未登录
 */

interface FetchOptions extends RequestInit {
  skipAuthInterceptor?: boolean
}

/**
 * 增强的 fetch 函数，自动处理认证和错误
 */
export async function apiFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuthInterceptor = false, headers = {}, ...restOptions } = options

  // 自动添加 Authorization header
  const token = getAuthToken()
  const enhancedHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  }

  if (token && !skipAuthInterceptor) {
    enhancedHeaders['Authorization'] = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: enhancedHeaders,
  })

  // 全局处理 401 错误
  if (response.status === 401 && !skipAuthInterceptor) {
    clearAuthToken()
    
    // 创建一个精美的提示框
    const shouldLogin = window.confirm(
      '您的登录已过期或尚未登录\n\n点击确定前往登录页面'
    )
    
    if (shouldLogin) {
      const currentPath = window.location.pathname
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
    }
    
    throw new Error('未登录或登录已过期')
  }

  return response
}

/**
 * API 客户端辅助函数
 */
export const apiClient = {
  get: async (url: string, options?: FetchOptions) => {
    return apiFetch(url, { ...options, method: 'GET' })
  },

  post: async (url: string, data?: unknown, options?: FetchOptions) => {
    return apiFetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  put: async (url: string, data?: unknown, options?: FetchOptions) => {
    return apiFetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  delete: async (url: string, options?: FetchOptions) => {
    return apiFetch(url, { ...options, method: 'DELETE' })
  },
}
