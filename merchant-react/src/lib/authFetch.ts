// 带自动刷新的 fetch —— 用于流式 (NDJSON / SSE) 等无法走 axios 拦截器的场景。
// 行为与 src/api.ts 的 axios 拦截器保持一致：401 → refresh → retry，refresh 失败跳登录。

import { notifyAccessTokenRefreshed } from './authEvents'

const ACCESS_KEY = 'xiaoone.access_token'
const REFRESH_KEY = 'xiaoone.refresh_token'

let refreshing: Promise<string | null> | null = null

function clearTokensAndBounce() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  if (location.pathname !== '/login')
    location.href = '/login'
}

async function refreshToken(): Promise<string | null> {
  const rt = localStorage.getItem(REFRESH_KEY)
  if (!rt) return null
  try {
    const resp = await fetch('/oauth2/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: rt }),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data.access_token) return null
    localStorage.setItem(ACCESS_KEY, data.access_token)
    if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
    notifyAccessTokenRefreshed(data.access_token)
    return data.access_token as string
  }
  catch {
    return null
  }
}

function withAuth(init: RequestInit | undefined, token: string | null): RequestInit {
  const headers = new Headers(init?.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return { ...init, headers }
}

/**
 * 与 fetch 同签名，401 时自动 refresh + retry。
 * 注意：用于流式时，第一次 401 会被消费成普通响应再触发刷新，
 * 重试后才返回流；调用者按返回值正常处理 body 即可。
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const access = localStorage.getItem(ACCESS_KEY)
  const r = await fetch(input, withAuth(init, access))
  if (r.status !== 401) return r

  // 是否是 token 端点本身？避免死循环
  const url = typeof input === 'string' ? input : (input as URL | Request).toString()
  if (url.includes('/oauth2/token')) return r

  if (!refreshing) refreshing = refreshToken()
  const next = await refreshing
  refreshing = null

  if (!next) {
    clearTokensAndBounce()
    return r
  }
  return fetch(input, withAuth(init, next))
}
