const TOKEN_KEY = 'token'

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

export function isAuthed(): boolean {
  return !!getAuthToken()
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
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
  }
  return token
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
