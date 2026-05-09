import { SVGProps } from 'react'

export type IconName =
  | 'pencil' | 'plus' | 'chevron' | 'sparkles' | 'send' | 'gear' | 'logout'
  | 'user' | 'plug' | 'cube' | 'wand' | 'workflow' | 'message' | 'rss'
  | 'shop' | 'package' | 'support' | 'briefcase' | 'kefu' | 'system'
  | 'marketing' | 'agency' | 'reply' | 'bolt' | 'users' | 'link' | 'grid'
  | 'chat' | 'consult' | 'sun' | 'moon' | 'dot' | 'more' | 'search' | 'globe' | 'home'
  | 'x' | 'check' | 'expand' | 'compress' | 'cart'
  | 'message-square' | 'more-horizontal' | 'paperclip'
  | 'dashboard' | 'business-service' | 'technical-service' | 'channel-service'
  | 'feedback-service' | 'merchants' | 'merchant-team' | 'platform-team'
  | 'merchant-billing' | 'identities' | 'bot' | 'wallet' | 'file' | 'bell'
  | 'key' | 'database' | 'server' | 'sidebar'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number | string
  strokeWidth?: number
}

export function Icon({ name, size = 16, strokeWidth = 1.75, className = '', ...props }: IconProps) {
  const combinedClass = `xiaoone-icon ${className}`.trim()

  const paths = (() => {
    switch (name) {
      case 'pencil':
        return (
          <>
            <path d="M4 18.5 5.1 14 15.8 3.3a2.2 2.2 0 0 1 3.1 3.1L8.2 17.1Z" />
            <path d="M13.9 5.2 17 8.3" />
            <path d="M4 21h16" />
          </>
        )
      case 'plus':
        return <path d="M12 5v14M5 12h14" />
      case 'chevron':
        return <path d="m7 10 5 5 5-5" />
      case 'sparkles':
      case 'bot':
        return (
          <>
            <path d="M12 3.5 13.8 8l4.7 1.8-4.7 1.8L12 16l-1.8-4.4-4.7-1.8L10.2 8Z" />
            <path d="M18 15.5v4M16 17.5h4" />
            <path d="M5 17.5v2M4 18.5h2" />
          </>
        )
      case 'send':
        return (
          <>
            <path d="M21 4 10.4 14.6" />
            <path d="M21 4 15 21l-4.6-6.4L4 10Z" />
          </>
        )
      case 'gear':
        return (
          <>
            <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
            <path d="M4.8 10.2 3.6 8l2.2-3.1 2.5.8 1.2-.7L10 2.5h4l.5 2.5 1.2.7 2.5-.8L20.4 8l-1.2 2.2v1.6l1.2 2.2-2.2 3.1-2.5-.8-1.2.7L14 21.5h-4L9.5 19l-1.2-.7-2.5.8L3.6 16l1.2-2.2Z" />
          </>
        )
      case 'logout':
        return (
          <>
            <path d="M9 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H9" />
            <path d="M14 8l4 4-4 4" />
            <path d="M18 12H9" />
          </>
        )
      case 'user':
        return (
          <>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </>
        )
      case 'users':
      case 'platform-team':
        return (
          <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3.8 20a5.2 5.2 0 0 1 10.4 0" />
            <path d="M16.5 10.8a2.7 2.7 0 1 0-1.1-5.2" />
            <path d="M17 15.2a5 5 0 0 1 3.8 4.8" />
          </>
        )
      case 'plug':
        return (
          <>
            <path d="M8 3v5M16 3v5" />
            <path d="M6 8h12v4.5A5.5 5.5 0 0 1 12.5 18H12a6 6 0 0 0-6 6" />
            <path d="M9 13h6" />
          </>
        )
      case 'cube':
        return (
          <>
            <path d="M12 3.5 20 8v8l-8 4.5L4 16V8Z" />
            <path d="m4 8 8 4.5L20 8" />
            <path d="M12 12.5v8" />
          </>
        )
      case 'wand':
      case 'bolt':
        return (
          <>
            <path d="M14 3 5 14h6l-1 7 9-11h-6Z" />
            <path d="M5 4v2M4 5h2M19 18v2M18 19h2" />
          </>
        )
      case 'workflow':
        return (
          <>
            <path d="M5 7.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
            <path d="M14 16.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
            <path d="M8 10v2.5a4 4 0 0 0 4 4h2" />
            <path d="M12 6h5a2 2 0 0 1 2 2v2" />
          </>
        )
      case 'message':
      case 'message-square':
      case 'reply':
        return (
          <>
            <path d="M5 5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H9l-5 3v-13A2.5 2.5 0 0 1 6.5 5" />
            <path d="M8 10h8M8 13h5" />
          </>
        )
      case 'chat':
      case 'merchant-team':
        return (
          <>
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H15a2.5 2.5 0 0 1 2.5 2.5V12a2.5 2.5 0 0 1-2.5 2.5H9l-5 3Z" />
            <path d="M12.5 17.5H16l4 2.5v-9.5" />
            <path d="M8 9h5.5M8 11.5h3.5" />
          </>
        )
      case 'consult':
        return (
          <>
            <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H16a2.5 2.5 0 0 1 2.5 2.5V11a2.5 2.5 0 0 1-2.5 2.5h-3.2L8 17v-3.5h-.5A2.5 2.5 0 0 1 5 11Z" />
            <circle cx="10" cy="8.2" r="1.1" />
            <path d="M13 7h3M13 10h2" />
            <path d="M15 17.5h2.5L21 20v-8" />
          </>
        )
      case 'rss':
        return (
          <>
            <path d="M5 6a13 13 0 0 1 13 13" />
            <path d="M5 12a7 7 0 0 1 7 7" />
            <path d="M6 19h.01" />
          </>
        )
      case 'shop':
      case 'merchants':
        return (
          <>
            <path d="M4 10 5.2 4h13.6L20 10" />
            <path d="M6 10v10h12V10" />
            <path d="M9 20v-6h6v6" />
            <path d="M4 10c1.2 1.5 3.1 1.5 4.3 0 1.2 1.5 3.2 1.5 4.4 0 1.2 1.5 3.1 1.5 4.3 0 1.2 1.5 2.9 1.5 4 0" />
          </>
        )
      case 'package':
      case 'file':
        return (
          <>
            <path d="M6 4h8l4 4v12H6Z" />
            <path d="M14 4v4h4" />
            <path d="M9 13h6M9 16h4" />
          </>
        )
      case 'support':
      case 'channel-service':
        return (
          <>
            <circle cx="12" cy="12" r="2.4" />
            <path d="M12 5v4.6M12 14.4V19" />
            <path d="M5.9 8.5 9.9 11M14.1 13l4 2.5" />
            <path d="M18.1 8.5 14.1 11M9.9 13l-4 2.5" />
            <circle cx="12" cy="4" r="1.5" />
            <circle cx="4.8" cy="16.2" r="1.5" />
            <circle cx="19.2" cy="16.2" r="1.5" />
          </>
        )
      case 'kefu':
        return (
          <>
            <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
            <path d="M4 13h4v5H6a2 2 0 0 1-2-2Z" />
            <path d="M20 13h-4v5h2a2 2 0 0 0 2-2Z" />
            <path d="M9 20h3a4 4 0 0 0 4-4" />
            <path d="M9 9.5h6" />
          </>
        )
      case 'system':
      case 'technical-service':
        return (
          <>
            <rect x="4" y="5" width="16" height="11" rx="2" />
            <path d="M8 20h8M12 16v4" />
            <path d="m9 9-2 2 2 2M15 9l2 2-2 2" />
          </>
        )
      case 'marketing':
        return (
          <>
            <path d="M4 13h3l10 5V6L7 11H4Z" />
            <path d="M7 13v5a2 2 0 0 0 2 2h1" />
            <path d="M19.5 9.5a4 4 0 0 1 0 5" />
          </>
        )
      case 'agency':
      case 'business-service':
        return (
          <>
            <path d="M6 18V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v11" />
            <path d="M4 18h16" />
            <path d="M9 9h6M9 12h4" />
            <path d="M10 18v-3h4v3" />
            <path d="m16 5 3-2 1.5 3" />
          </>
        )
      case 'briefcase':
        return (
          <>
            <rect x="3" y="7" width="18" height="12" rx="2" />
            <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
            <path d="M3 12h18" />
          </>
        )
      case 'link':
      case 'paperclip':
        return (
          <>
            <path d="M9.5 14.5 14.5 9.5" />
            <path d="M8.5 10.5 7 12a4 4 0 0 0 5.7 5.7l1.5-1.5" />
            <path d="M15.5 13.5 17 12a4 4 0 0 0-5.7-5.7L9.8 7.8" />
          </>
        )
      case 'grid':
      case 'dashboard':
        return (
          <>
            <rect x="4" y="4" width="6" height="6" rx="1.5" />
            <rect x="14" y="4" width="6" height="6" rx="1.5" />
            <path d="M5 19V14M10 19v-3M15 19v-6M20 19v-4" />
          </>
        )
      case 'sun':
        return (
          <>
            <circle cx="12" cy="12" r="3.8" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
          </>
        )
      case 'moon':
        return <path d="M19.5 14.2A7.6 7.6 0 0 1 9.8 4.5 8.5 8.5 0 1 0 19.5 14.2Z" />
      case 'dot':
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          </>
        )
      case 'more':
      case 'more-horizontal':
        return <path d="M6 12h.01M12 12h.01M18 12h.01" />
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </>
        )
      case 'globe':
        return (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M3.5 12h17M12 3.5c2.2 2.3 3.2 5.1 3.2 8.5s-1 6.2-3.2 8.5M12 3.5C9.8 5.8 8.8 8.6 8.8 12s1 6.2 3.2 8.5" />
          </>
        )
      case 'home':
        return (
          <>
            <path d="M4 11.5 12 5l8 6.5" />
            <path d="M6 10.5V20h4v-5h4v5h4v-9.5" />
          </>
        )
      case 'x':
        return <path d="M7 7 17 17M17 7 7 17" />
      case 'check':
        return <path d="m5 12 4 4 10-9" />
      case 'expand':
        return <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
      case 'compress':
        return <path d="M20 9h-5V4M15 9l6-6M4 15h5v5M9 15l-6 6" />
      case 'cart':
        return (
          <>
            <path d="M3 4h2l2 11h11.5l2-8H6.4" />
            <circle cx="9" cy="20" r="1.3" />
            <circle cx="18" cy="20" r="1.3" />
          </>
        )
      case 'feedback-service':
        return (
          <>
            <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
            <path d="M12 8v4" />
            <path d="M12 15h.01" />
          </>
        )
      case 'merchant-billing':
      case 'wallet':
        return (
          <>
            <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5Z" />
            <path d="M16 11h4v4h-4a2 2 0 0 1 0-4Z" />
            <path d="M7 8h5" />
          </>
        )
      case 'identities':
      case 'key':
        return (
          <>
            <path d="M12 3.5 19 6v5.5c0 4.2-2.6 7.4-7 9-4.4-1.6-7-4.8-7-9V6Z" />
            <path d="M9.5 12.5 11.3 14l3.6-4" />
          </>
        )
      case 'bell':
        return (
          <>
            <path d="M6 17h12l-1.2-2V10a4.8 4.8 0 0 0-9.6 0v5Z" />
            <path d="M10 20h4" />
          </>
        )
      case 'database':
        return (
          <>
            <ellipse cx="12" cy="6" rx="7" ry="3" />
            <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
            <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
          </>
        )
      case 'server':
        return (
          <>
            <rect x="4" y="4" width="16" height="6" rx="2" />
            <rect x="4" y="14" width="16" height="6" rx="2" />
            <path d="M8 7h.01M8 17h.01M12 7h4M12 17h4" />
          </>
        )
      case 'sidebar':
        return (
          <>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M9 4v16" />
            <path d="M13 9h4M13 13h3" />
          </>
        )
      default:
        return null
    }
  })()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={combinedClass}
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
      {...props}
    >
      {paths}
    </svg>
  )
}
