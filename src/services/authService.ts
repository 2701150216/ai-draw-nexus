const TOKEN_KEY = 'token'
const USERNAME_KEY = 'username'
const AUTH_EVENT = 'auth-changed'

export interface LoginPayload {
  username: string
  password: string
  code?: string
  uuid?: string
}

export interface RegisterPayload {
  username: string
  password: string
  code?: string
  uuid?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/dev-api/ai'
const AUTH_BASE = API_BASE_URL.replace(/\/ai\/?$/, '')

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAuthUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY)
}

export function isAuthed(): boolean {
  return !!getAuthToken()
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

const BASENAME = (import.meta.env.VITE_BASE_PATH ?? '/').replace(/\/+$/, '') || '/'

/**
 * 401 未登录/过期时提示并可跳转登录页
 */
export function promptLoginRedirect(message = '未登录或登录已过期，是否前往登录？') {
  const target = `${BASENAME}/login`
  if (window.confirm(message)) {
    window.location.href = target
  }
}

/**
 * 调用后端 /login，获取 token 并缓存
 */
export async function login(payload: LoginPayload): Promise<string> {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || '登录失败')
  }
  const data = await res.json()
  const token = data?.token
  if (token) {
    setAuthToken(token)
    if (payload.username) {
      localStorage.setItem(USERNAME_KEY, payload.username)
    }
  }
  return token
}

/**
 * 订阅登录状态变更（set/clear token 或 storage 事件）
 */
export function subscribeAuthChange(callback: () => void): () => void {
  const handler = () => callback()
  window.addEventListener(AUTH_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(AUTH_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export async function register(payload: RegisterPayload): Promise<void> {
  const res = await fetch(`${AUTH_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || '注册失败')
  }
}

export async function fetchCaptcha(): Promise<{ enabled: boolean; img?: string; uuid?: string }> {
  const res = await fetch(`${AUTH_BASE}/captchaImage`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error('获取验证码失败')
  }
  const data = await res.json()
  const enabled = data?.captchaEnabled !== undefined ? data.captchaEnabled : true
  if (!enabled) {
    return { enabled }
  }
  return { enabled, img: `data:image/gif;base64,${data.img}`, uuid: data.uuid }
}
