import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { TooltipProvider } from '@xiaoone/react-ui'
import { router } from './router'
import { RegionProvider } from '@xiaoone/region'
import { PreferencesProvider } from './preferences'
import { useAuthStore } from '../store/auth'
import { ensureWsHealthBridge } from '../store/wsHealth'

export function App() {
  const bootstrap = useAuthStore(s => s.bootstrap)
  useEffect(() => {
    bootstrap().catch(() => {})
  }, [bootstrap])

  useEffect(() => {
    ensureWsHealthBridge()
  }, [])

  return (
    <RegionProvider>
      <PreferencesProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </PreferencesProvider>
    </RegionProvider>
  )
}
