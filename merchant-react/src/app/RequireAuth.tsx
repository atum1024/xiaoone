import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore as useAuth } from '../store/auth'

export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('xiaoone.access_token')

  if (auth.status === 'loading' || (hasToken && auth.status === 'idle'))
    return <div className="mr-loading-screen">正在校验登录状态...</div>

  if (!hasToken || auth.status !== 'authed')
    return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}
