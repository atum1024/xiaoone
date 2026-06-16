export const ACCESS_TOKEN_KEY = 'xiaoone.access_token'
export const REFRESH_TOKEN_KEY = 'xiaoone.refresh_token'
const SESSION_ACCESS_TOKEN_KEY = 'xiaoone.session_access_token'
const SESSION_REFRESH_TOKEN_KEY = 'xiaoone.session_refresh_token'

let accessToken: string | null = null
let refreshToken: string | null = null
let legacyStorageMigrated = false
let sessionStorageLoaded = false

function loadSessionStorage() {
  if (sessionStorageLoaded || typeof window === 'undefined')
    return
  sessionStorageLoaded = true
  try {
    accessToken = accessToken || sessionStorage.getItem(SESSION_ACCESS_TOKEN_KEY)
    refreshToken = refreshToken || sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY)
  }
  catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

function writeSessionStorage() {
  if (typeof window === 'undefined')
    return
  try {
    if (accessToken)
      sessionStorage.setItem(SESSION_ACCESS_TOKEN_KEY, accessToken)
    else
      sessionStorage.removeItem(SESSION_ACCESS_TOKEN_KEY)

    if (refreshToken)
      sessionStorage.setItem(SESSION_REFRESH_TOKEN_KEY, refreshToken)
    else
      sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
  }
  catch {
    // In-memory tokens still work for the current page lifetime.
  }
}

function migrateLegacyStorage() {
  if (legacyStorageMigrated || typeof window === 'undefined')
    return
  legacyStorageMigrated = true
  const legacyAccess = localStorage.getItem(ACCESS_TOKEN_KEY)
  const legacyRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (legacyAccess && !accessToken)
    accessToken = legacyAccess
  if (legacyRefresh && !refreshToken)
    refreshToken = legacyRefresh
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  writeSessionStorage()
}

function hydrateTokens() {
  loadSessionStorage()
  migrateLegacyStorage()
}

export function readAccessToken(): string {
  hydrateTokens()
  return accessToken || ''
}

export function readRefreshToken(): string {
  hydrateTokens()
  return refreshToken || ''
}

export function setTokens(nextAccessToken: string, nextRefreshToken?: string | null) {
  hydrateTokens()
  accessToken = nextAccessToken
  if (nextRefreshToken)
    refreshToken = nextRefreshToken
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  writeSessionStorage()
}

export function clearTokens() {
  hydrateTokens()
  accessToken = null
  refreshToken = null
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  writeSessionStorage()
}

export function hasAccessToken(): boolean {
  return !!readAccessToken()
}
