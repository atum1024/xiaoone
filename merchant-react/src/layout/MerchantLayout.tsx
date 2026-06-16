import { Navigate, Outlet, useLocation } from 'react-router'
import { Suspense, useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useWorkspaceStore } from '../store/workspace'
import { useLiveChatStore } from '../store/liveChat'
import { useAgentDomainsOverview } from '../hooks/agentQueries'
import { useWsHealthStore } from '../store/wsHealth'
import { Toaster } from '@xiaoone/react-ui'
import { hasAccessToken } from '../auth/token'
import { hasPaidSubscription, resolveAuthedLandingPath } from '../lib/membershipRouting'

export function MerchantLayout() {
  const auth = useAuthStore()
  const location = useLocation()
  const syncFromUrl = useWorkspaceStore(s => s.syncFromUrl)
  const realtimeConnected = useWsHealthStore(s => s.agentRealtimeConnected)

  const hasUser = !!auth.user
  useAgentDomainsOverview({
    enabled: hasUser,
    refetchInterval: realtimeConnected ? false : 12_000,
  })

  // Sync workspace store with URL routing changes
  useEffect(() => {
    syncFromUrl(location.pathname, location.search)
  }, [location.pathname, location.search, syncFromUrl])

  useEffect(() => {
    if (hasUser) return
    const hasToken = typeof window !== 'undefined' && hasAccessToken()
    if (hasToken) void useAuthStore.getState().bootstrap().catch(() => {})
  }, [hasUser])

  useEffect(() => {
    if (!hasUser) return

    useLiveChatStore.getState().ensureAgentRealtime()

    return () => {
      useLiveChatStore.getState().stopRealtime()
      useLiveChatStore.getState().stopPolling()
    }
  }, [hasUser])

  if (!hasUser) {
    const hasToken = typeof window !== 'undefined' && hasAccessToken()
    if (hasToken && (auth.status === 'authed' || auth.status === 'loading'))
      return <div className="mr-loading-screen">正在加载用户信息...</div>
    return <Navigate to="/login" replace />
  }

  if (auth.currentMerchantId && !hasPaidSubscription(auth.subscriptionPlanCode))
    return <Navigate to={resolveAuthedLandingPath(auth.subscriptionPlanCode)} replace />

  return (
    <div className="mr-shell">
      <Sidebar />
      <div className="mr-main">
        <Topbar />
        <main className="mr-content">
          <Suspense fallback={<div className="mr-surface p-8 text-center text-sm text-[var(--xiaoone-fg-mute)]">Loading...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </div>
  )
}
