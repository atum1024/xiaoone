import { Navigate, Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { usePreferences } from '../app/preferences'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useWorkspaceStore } from '../store/workspace'
import { useAgentStore } from '../store/agent'
import { useLiveChatStore } from '../store/liveChat'
import { Toaster } from '@xiaoone/react-ui'
import { generationBroadcast } from '../realtime/generationBroadcast'

export function MerchantLayout() {
  const auth = useAuthStore()
  const { t } = usePreferences()
  const location = useLocation()
  const syncFromUrl = useWorkspaceStore(s => s.syncFromUrl)

  const isDemo = auth.isDemo
  const hasUser = !!auth.user

  // Sync workspace store with URL routing changes
  useEffect(() => {
    syncFromUrl(location.pathname)
  }, [location.pathname, location.search, syncFromUrl])

  // Periodic polling for Agent domains and LiveChat counts
  useEffect(() => {
    if (!hasUser) return

    // Initial fetch
    useAgentStore.getState().refreshAllAgentDomains().catch(() => {})
    useLiveChatStore.getState().ensureAgentRealtime()

    const timer = window.setInterval(() => {
      useAgentStore.getState().refreshAllAgentDomains().catch(() => {})
    }, 12000)

    generationBroadcast.init()
    generationBroadcast.listen(() => {
      useAgentStore.getState().refreshAllAgentDomains().catch(() => {})
    })

    return () => {
      window.clearInterval(timer)
      useLiveChatStore.getState().stopRealtime()
      useLiveChatStore.getState().stopPolling()
    }
  }, [hasUser])

  if (!hasUser)
    return <Navigate to="/login" replace />

  return (
    <div className="mr-shell">
      <Sidebar />
      <div className="mr-main">
        <Topbar />
        {isDemo ? (
          <div className="mr-demo-banner">
            <span>{t('common.demo')}</span>
            <p>{t('common.demo.banner')}</p>
          </div>
        ) : null}
        <main className="mr-content">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
