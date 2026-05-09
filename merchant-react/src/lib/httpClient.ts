import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { notifyAccessTokenRefreshed } from './authEvents'

const ACCESS_KEY = 'xiaoone.access_token'
const REFRESH_KEY = 'xiaoone.refresh_token'

export const api = axios.create({
  baseURL: '/',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_KEY)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---- 401 自动刷新（集中托管，避免多个请求并发触发多次刷新）---------------
let refreshing: Promise<string | null> | null = null

function readRefresh(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

function clearTokensAndBounce() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  if (location.pathname !== '/login')
    location.href = '/login'
}

async function refreshToken(): Promise<string | null> {
  const rt = readRefresh()
  if (!rt) return null
  try {
    // 直接 fetch（不走 axios 实例，避免再被拦截到刷新）
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

interface RetryConfig extends AxiosRequestConfig {
  _retried?: boolean
}

api.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    const status = err.response?.status
    const cfg = err.config as RetryConfig | undefined

    // 仅对 401 + 还没重试过 + 不是 token 端点本身做刷新
    const isTokenEndpoint = (cfg?.url || '').includes('/oauth2/token')
    if (status === 401 && cfg && !cfg._retried && !isTokenEndpoint) {
      cfg._retried = true
      if (!refreshing) refreshing = refreshToken()
      const next = await refreshing
      refreshing = null
      if (next) {
        cfg.headers = cfg.headers || {}
        ;(cfg.headers as Record<string, string>).Authorization = `Bearer ${next}`
        return api.request(cfg)
      }
      // 刷新失败 → 跳登录
      clearTokensAndBounce()
    }
    else if (status === 401) {
      clearTokensAndBounce()
    }
    return Promise.reject(err)
  },
)
