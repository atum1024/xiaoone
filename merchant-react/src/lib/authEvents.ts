import { readAccessToken as readMemoryAccessToken } from '../auth/token'
export {
  clearTokens,
  hasAccessToken,
  readRefreshToken,
  setTokens,
} from '../auth/token'

export const ACCESS_TOKEN_REFRESHED_EVENT = 'xiaoone:access-token-refreshed'

export function readAccessToken(): string | null {
  return readMemoryAccessToken() || null
}

export function notifyAccessTokenRefreshed(accessToken: string) {
  window.dispatchEvent(new CustomEvent(ACCESS_TOKEN_REFRESHED_EVENT, {
    detail: { accessToken },
  }))

  queueMicrotask(() => {
    void import('../store/liveChat').then(({ useLiveChatStore }) => {
      useLiveChatStore.getState().startRealtime()
    })
  })
}
