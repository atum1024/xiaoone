/**
 * 平台 token 的内存槽 + 事件总线。
 *
 * 与商户 token 相互独立：
 * - 商户 access/refresh：商户内存槽
 * - 平台 access/refresh：平台内存槽
 *
 * 这样商户 token 过期 / 主动 logout 不会踢掉平台 sidekick session，反之亦然。
 */

const PLATFORM_ACCESS_KEY = 'xiaoone.platform_access_token'
const PLATFORM_REFRESH_KEY = 'xiaoone.platform_refresh_token'

let platformAccessToken: string | null = null
let platformRefreshToken: string | null = null
let legacyStorageMigrated = false

export const PLATFORM_ACCESS_TOKEN_REFRESHED_EVENT = 'xiaoone:platform-access-token-refreshed'
export const PLATFORM_TOKENS_CLEARED_EVENT = 'xiaoone:platform-tokens-cleared'

function migrateLegacyStorage() {
  if (legacyStorageMigrated || typeof window === 'undefined')
    return
  legacyStorageMigrated = true
  const legacyAccess = localStorage.getItem(PLATFORM_ACCESS_KEY)
  const legacyRefresh = localStorage.getItem(PLATFORM_REFRESH_KEY)
  if (legacyAccess && !platformAccessToken)
    platformAccessToken = legacyAccess
  if (legacyRefresh && !platformRefreshToken)
    platformRefreshToken = legacyRefresh
  localStorage.removeItem(PLATFORM_ACCESS_KEY)
  localStorage.removeItem(PLATFORM_REFRESH_KEY)
}

export function readPlatformAccessToken(): string | null {
  migrateLegacyStorage()
  return platformAccessToken
}

export function readPlatformRefreshToken(): string | null {
  migrateLegacyStorage()
  return platformRefreshToken
}

export function setPlatformTokens(accessToken: string, refreshToken?: string | null) {
  migrateLegacyStorage()
  if (accessToken) platformAccessToken = accessToken
  if (refreshToken) platformRefreshToken = refreshToken
  localStorage.removeItem(PLATFORM_ACCESS_KEY)
  localStorage.removeItem(PLATFORM_REFRESH_KEY)
  window.dispatchEvent(new CustomEvent(PLATFORM_ACCESS_TOKEN_REFRESHED_EVENT, {
    detail: { accessToken },
  }))
}

export function clearPlatformTokens() {
  platformAccessToken = null
  platformRefreshToken = null
  localStorage.removeItem(PLATFORM_ACCESS_KEY)
  localStorage.removeItem(PLATFORM_REFRESH_KEY)
  window.dispatchEvent(new Event(PLATFORM_TOKENS_CLEARED_EVENT))
}

export function hasPlatformAccessToken(): boolean {
  return !!readPlatformAccessToken()
}
