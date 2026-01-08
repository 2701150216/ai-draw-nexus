import { getAuthToken, clearAuthToken } from '@/services/authService'

/**
 * 全局 API 拦截器
 * 自动处理 401 认证失败，提示用户未登录
 */

let isAuthPromptShown = false;

function showAuthPrompt() {
  if (isAuthPromptShown) return
  isAuthPromptShown = true

  const overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.zIndex = '9999'
  overlay.style.background = 'rgba(15,17,21,0.35)'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'

  const dialog = document.createElement('div')
  dialog.style.width = '360px'
  dialog.style.background = '#ffffff'
  dialog.style.color = '#0f172a'
  dialog.style.border = '1px solid #e2e8f0'
  dialog.style.borderRadius = '16px'
  dialog.style.boxShadow = '0 18px 38px rgba(15,23,42,0.16)'
  dialog.style.padding = '22px 22px 18px'
  dialog.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

  const title = document.createElement('div')
  title.textContent = '需要登录'
  title.style.fontSize = '16px'
  title.style.fontWeight = '700'
  title.style.marginBottom = '8px'
  title.style.color = '#0f172a'

  const desc = document.createElement('div')
  desc.textContent = '未认证或登录已过期，无法请求系统资源。是否前往登录？'
  desc.style.fontSize = '14px'
  desc.style.lineHeight = '1.6'
  desc.style.color = '#475569'
  desc.style.marginBottom = '16px'

  const actions = document.createElement('div')
  actions.style.display = 'flex'
  actions.style.justifyContent = 'flex-end'
  actions.style.gap = '8px'

  const cancelBtn = document.createElement('button')
  cancelBtn.textContent = '取消'
  cancelBtn.style.padding = '10px 14px'
  cancelBtn.style.borderRadius = '10px'
  cancelBtn.style.border = '1px solid #e2e8f0'
  cancelBtn.style.background = '#f8fafc'
  cancelBtn.style.color = '#475569'
  cancelBtn.style.cursor = 'pointer'

  const loginBtn = document.createElement('button')
  loginBtn.textContent = '前往登录'
  loginBtn.style.padding = '10px 14px'
  loginBtn.style.borderRadius = '10px'
  loginBtn.style.border = '1px solid #3b82f6'
  loginBtn.style.background = '#3b82f6'
  loginBtn.style.color = '#fff'
  loginBtn.style.cursor = 'pointer'
  loginBtn.style.boxShadow = '0 6px 18px rgba(59,130,246,0.25)'

  const cleanup = () => {
    isAuthPromptShown = false
    overlay.remove()
  }

  cancelBtn.onclick = () => {
    cleanup()
  }

  loginBtn.onclick = () => {
    const currentPath = window.location.pathname
    cleanup()
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
  }

  actions.append(cancelBtn, loginBtn)
  dialog.append(title, desc, actions)
  overlay.appendChild(dialog)
  document.body.appendChild(overlay)
}

export function ensureAuth(data: any) {
  const code = data?.code ?? data?.status
  const msg = data?.msg || data?.message || ''
  const isAuthError =
    code === 401 ||
    code === '401' ||
    /认证失败|未登录|未授权|token/i.test(msg)
  if (isAuthError) {
    clearAuthToken()
    showAuthPrompt()
    throw new Error(msg || '未登录或登录已过期')
  }
}

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
    showAuthPrompt()
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
