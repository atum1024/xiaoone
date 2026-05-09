const PLATFORM_ACCESS_KEY = 'xiaoone.platform_access_token'
const PLATFORM_REFRESH_KEY = 'xiaoone.platform_refresh_token'

export function readPlatformAccessToken() {
  return window.localStorage.getItem(PLATFORM_ACCESS_KEY)
}

export function readPlatformRefreshToken() {
  return window.localStorage.getItem(PLATFORM_REFRESH_KEY)
}

export function setPlatformTokens(accessToken: string, refreshToken?: string | null) {
  if (accessToken)
    window.localStorage.setItem(PLATFORM_ACCESS_KEY, accessToken)
  if (refreshToken)
    window.localStorage.setItem(PLATFORM_REFRESH_KEY, refreshToken)
}

export function clearPlatformTokens() {
  window.localStorage.removeItem(PLATFORM_ACCESS_KEY)
  window.localStorage.removeItem(PLATFORM_REFRESH_KEY)
}
