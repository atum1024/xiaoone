import { usePortalPrefs } from './portalPrefs'
import { portalDict } from './dict'
import { usePortalStyleMode, type PortalStyleMode } from './portalStyleMode'

interface PortalStyleSwitchProps {
  target: PortalStyleMode
  className?: string
}

export function PortalStyleSwitch({ target, className = 'x1-portal__reg-header-link' }: PortalStyleSwitchProps) {
  const { t } = usePortalPrefs()
  const { setMode } = usePortalStyleMode()
  const label = target === 'chat'
    ? t(portalDict.chatStyleSwitchChat)
    : t(portalDict.chatStyleSwitchClassic)

  return (
    <button
      type="button"
      className={className}
      onClick={() => setMode(target)}
    >
      {label}
    </button>
  )
}
