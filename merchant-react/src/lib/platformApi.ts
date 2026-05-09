import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'

import {
  clearPlatformTokens,
  readPlatformAccessToken,
  readPlatformRefreshToken,
  setPlatformTokens,
} from './platformAuthEvents'

/**
 * 平台 token 专用 axios 实例。
 *
 * - 请求拦截器读 ``xiaoone.platform_access_token``（与商户 axios 完全隔离）。
 * - 401 时单次刷新：用 ``xiaoone.platform_refresh_token`` 调 ``/oauth2/token/``，
 *   失败仅清平台 token 槽 + 抛错；不踢登录页（商户 session 仍然可用）。
 *
 * 所有 ``/api/v1/iam/platform/*``、``/api/v1/iam/auth/platform/elevate/`` 之外
 * 的平台域调用都应走这个实例；商户域调用继续走 ``api.ts`` 的 axios。
 */

export const platformApi = axios.create({
  baseURL: '/',
  timeout: 30000,
})

platformApi.interceptors.request.use((config) => {
  const token = readPlatformAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing: Promise<string | null> | null = null

async function refreshPlatformToken(): Promise<string | null> {
  const rt = readPlatformRefreshToken()
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
    setPlatformTokens(data.access_token, data.refresh_token || rt)
    return data.access_token as string
  }
  catch {
    return null
  }
}

interface RetryConfig extends AxiosRequestConfig {
  _retried?: boolean
}

platformApi.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    const status = err.response?.status
    const cfg = err.config as RetryConfig | undefined
    const isTokenEndpoint = (cfg?.url || '').includes('/oauth2/token')
    if (status === 401 && cfg && !cfg._retried && !isTokenEndpoint) {
      cfg._retried = true
      if (!refreshing) refreshing = refreshPlatformToken()
      const next = await refreshing
      refreshing = null
      if (next) {
        cfg.headers = cfg.headers || {}
        ;(cfg.headers as Record<string, string>).Authorization = `Bearer ${next}`
        return platformApi.request(cfg)
      }
      // 刷新失败：清平台 token；提权门次次重新走，商户 session 不受影响。
      clearPlatformTokens()
    }
    return Promise.reject(err)
  },
)
