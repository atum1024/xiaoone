import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './router'
import { PreferencesProvider } from './preferences'
import { useAuthStore } from '../store/auth'

export function App() {
  const bootstrap = useAuthStore(s => s.bootstrap)
  useEffect(() => {
    bootstrap().catch(() => {})
  }, [bootstrap])

  return (
    <PreferencesProvider>
      <RouterProvider router={router} />
    </PreferencesProvider>
  )
}
