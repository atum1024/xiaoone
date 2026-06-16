import { Navigate, Outlet, useLocation } from 'react-router'
import { MENU_PERMISSION_OPTIONS, menuIdForLocation } from './menuPermissions'
import { useAuthStore as useAuth } from '../store/auth'
import { hasAccessToken } from '../auth/token'

export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()
  const hasToken = typeof window !== 'undefined' && hasAccessToken()

  if (auth.status === 'loading' || (hasToken && auth.status === 'idle'))
    return <div className="mr-loading-screen">正在校验登录状态...</div>

  if (!hasToken || auth.status !== 'authed')
    return <Navigate to="/login" replace state={{ from: location.pathname }} />

  const requiredMenu = menuIdForLocation(location.pathname, location.search)
  if (requiredMenu && !auth.hasMenuAccess(requiredMenu)) {
    const fallback = MENU_PERMISSION_OPTIONS.find(item => item.id !== 'search' && auth.hasMenuAccess(item.id))?.route || '/workbench'
    if (fallback !== location.pathname) return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
