export const ACCESS_TOKEN_REFRESHED_EVENT = 'xiaoone:access-token-refreshed'

export function readAccessToken(): string | null {
  return localStorage.getItem('xiaoone.access_token')
}

export function notifyAccessTokenRefreshed(accessToken: string) {
  window.dispatchEvent(new CustomEvent(ACCESS_TOKEN_REFRESHED_EVENT, {
    detail: { accessToken },
  }))

  queueMicrotask(() => {
    void import('../store/teamChat').then(({ restartTeamRealtimeForSpace, currentMerchantSpaceKey }) => {
      restartTeamRealtimeForSpace(currentMerchantSpaceKey())
    })
    void import('../store/liveChat').then(({ useLiveChatStore }) => {
      useLiveChatStore.getState().startRealtime()
    })
  })
}
