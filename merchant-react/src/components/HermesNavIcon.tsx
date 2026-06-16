import type { NavModuleIconProps } from '../app/moduleRegistry'

const HERMES_ICON_SRC = '/hermes/icon.png'

export function HermesNavIcon({ size = 14, className }: NavModuleIconProps) {
  return (
    <img
      src={HERMES_ICON_SRC}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0, objectFit: 'contain' }}
    />
  )
}
