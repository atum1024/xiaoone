import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { applyLocalIpRegionHeaders, withLocalIpRegionHeaders } from '@xiaoone/region'
import {
  clearTokens,
  notifyAccessTokenRefreshed,
  readAccessToken,
  readRefreshToken,
  setTokens,
} from './authEvents'

const AUTH_CRITICAL_PATHS = ['/api/v1/iam/me/', '/oauth2/token/']

export const api = axios.create({
  baseURL: '/',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  config.headers = config.headers || {}
  applyLocalIpRegionHeaders(config.headers)
  const token = readAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---- 401 自动刷新（集中托管，避免多个请求并发触发多次刷新）---------------
let refreshing: Promise<string | null> | null = null

function clearTokensAndBounce() {
  clearTokens()
  if (location.pathname !== '/login')
    location.href = '/login'
}

function isAuthCriticalRequest(url?: string): boolean {
  if (!url) return false
  return AUTH_CRITICAL_PATHS.some(path => url.includes(path))
}

export function shouldBounceAfterRefreshFailure(url?: string): boolean {
  return isAuthCriticalRequest(url)
}

export async function refreshToken(): Promise<string | null> {
  const rt = readRefreshToken()
  try {
    const payload: { grant_type: 'refresh_token'; refresh_token?: string } = { grant_type: 'refresh_token' }
    if (rt)
      payload.refresh_token = rt
    // 直接 fetch（不走 axios 实例，避免再被拦截到刷新）
    const resp = await fetch('/oauth2/token/', withLocalIpRegionHeaders({
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }))
    if (!resp.ok) return null
    const data = await resp.json()
    if (!data.access_token) return null
    setTokens(data.access_token, data.refresh_token || rt)
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
    const isAuthCritical = isAuthCriticalRequest(cfg?.url || '')
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
      if (shouldBounceAfterRefreshFailure(cfg?.url || '')) {
        clearTokensAndBounce()
      }
    }
    else if (status === 401 && isAuthCritical) {
      clearTokensAndBounce()
    }
    return Promise.reject(err)
  },
)
