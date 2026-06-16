import { useNavigate } from 'react-router'
import { HomePortalTransitionHost } from './HomePortalTransitionHost'
import { markHomePortalTransitionHandoff } from './homePortalTransition'

export function HomePortalTransitionBridge() {
  const navigate = useNavigate()

  return (
    <HomePortalTransitionHost
      onNavigate={() => {
        markHomePortalTransitionHandoff()
        navigate('/login', { state: { fromHomePortal: true } })
      }}
    />
  )
}
