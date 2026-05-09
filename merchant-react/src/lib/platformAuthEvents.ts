/**
 * 平台 token 的 localStorage 槽 + 事件总线。
 *
 * 与商户 token 相互独立：
 * - 商户 access/refresh：``xiaoone.access_token`` / ``xiaoone.refresh_token``
 * - 平台 access/refresh：``xiaoone.platform_access_token`` / ``xiaoone.platform_refresh_token``
 *
 * 这样商户 token 过期 / 主动 logout 不会踢掉平台 sidekick session，反之亦然。
 */

const PLATFORM_ACCESS_KEY = 'xiaoone.platform_access_token'
const PLATFORM_REFRESH_KEY = 'xiaoone.platform_refresh_token'

export const PLATFORM_ACCESS_TOKEN_REFRESHED_EVENT = 'xiaoone:platform-access-token-refreshed'
export const PLATFORM_TOKENS_CLEARED_EVENT = 'xiaoone:platform-tokens-cleared'

export function readPlatformAccessToken(): string | null {
  return localStorage.getItem(PLATFORM_ACCESS_KEY)
}

export function readPlatformRefreshToken(): string | null {
  return localStorage.getItem(PLATFORM_REFRESH_KEY)
}

export function setPlatformTokens(accessToken: string, refreshToken?: string | null) {
  if (accessToken) localStorage.setItem(PLATFORM_ACCESS_KEY, accessToken)
  if (refreshToken) localStorage.setItem(PLATFORM_REFRESH_KEY, refreshToken)
  window.dispatchEvent(new CustomEvent(PLATFORM_ACCESS_TOKEN_REFRESHED_EVENT, {
    detail: { accessToken },
  }))
  // 让 ``platform:internal`` 的 TeamLiveSocket 立即用新 token 重连。
  // 异步 import 避免与 platformApi / auth store 互相循环依赖。
  queueMicrotask(() => {
    void import('../store/teamChat').then(({ restartTeamRealtimeForSpace }) => {
      restartTeamRealtimeForSpace('platform:internal')
    })
  })
}

export function clearPlatformTokens() {
  localStorage.removeItem(PLATFORM_ACCESS_KEY)
  localStorage.removeItem(PLATFORM_REFRESH_KEY)
  window.dispatchEvent(new Event(PLATFORM_TOKENS_CLEARED_EVENT))
}

export function hasPlatformAccessToken(): boolean {
  return !!readPlatformAccessToken()
}
