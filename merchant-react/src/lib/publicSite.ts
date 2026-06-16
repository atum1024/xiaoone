/**
 * 用户端登录/注册页 Logo 跳转的「官网首页」地址。
 * 生产以 xiaoone.cn 为唯一产品根域；VITE_PUBLIC_SITE_ORIGIN 作本地/未知域兜底。
 */
const PRODUCT_ROOT = 'xiaoone.cn'

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || /^10\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    || /^192\.168\./.test(hostname)
  )
}

function cleanConfiguredOrigin(raw: unknown): string {
  return typeof raw === 'string' && raw.trim() ? raw.trim().replace(/\/$/, '') : ''
}

function configuredPublicSiteOrigin(): string {
  return cleanConfiguredOrigin(import.meta.env.VITE_PUBLIC_SITE_ORIGIN)
}

function configuredUserPortalOrigin(): string {
  return cleanConfiguredOrigin(import.meta.env.VITE_USER_PORTAL_ORIGIN)
}


function publicSiteHostFromHostname(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (host === PRODUCT_ROOT || host.endsWith(`.${PRODUCT_ROOT}`)) {
    const prefix = host === PRODUCT_ROOT ? '' : host.slice(0, -(PRODUCT_ROOT.length + 1))
    if (prefix === 'vip-staging' || prefix === 'admin-staging')
      return `staging.${PRODUCT_ROOT}`
    if (prefix === 'staging' || prefix === 'www-staging')
      return `staging.${PRODUCT_ROOT}`
    return PRODUCT_ROOT
  }
  return ''
}

export function getPublicSiteOrigin(): string {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location
    if (!isLocalHostname(hostname)) {
      const publicHost = publicSiteHostFromHostname(hostname)
      if (publicHost)
        return `https://${publicHost}`
    }
    const fromEnv = configuredPublicSiteOrigin()
    if (fromEnv)
      return fromEnv
    if ((import.meta as any).env?.DEV)
      return `${protocol}//${hostname}:5177`
    return origin.replace(/\/$/, '')
  }
  return configuredPublicSiteOrigin()
}

export function getPublicSiteHomeHref(): string {
  const origin = getPublicSiteOrigin()
  return origin ? `${origin}/` : '/'
}

export function getUserPortalOrigin(): string {
  const configured = configuredUserPortalOrigin()
  return configured || getPublicSiteOrigin()
}

export function getUserRegisterHref(): string {
  const origin = getUserPortalOrigin()
  return origin ? `${origin}/register` : '/register'
}
