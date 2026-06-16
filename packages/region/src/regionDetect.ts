export type RegionCode = 'mainland' | 'overseas'

const MAINLAND_SUFFIXES = ['xiaoone.cn']

/** Diagnostic hostname hint only; effective region comes from the region API. */
export function regionFromHostname(hostname?: string): RegionCode | null {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  if (!host)
    return null
  for (const suffix of MAINLAND_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`))
      return 'mainland'
  }
  return null
}

export function defaultLocaleForRegion(region: RegionCode): 'zh' | 'en' {
  return region === 'mainland' ? 'zh' : 'en'
}

/** @deprecated Use in-site region switch via setRegionChoice; kept for same-page reload. */
export function alternatePortalOrigin(_region: RegionCode): string {
  if (typeof window === 'undefined')
    return 'https://vip.xiaoone.cn'
  const { href } = window.location
  return href
}

export const PRODUCT_ROOT_DOMAIN = 'xiaoone.cn'

export function merchantSubdomainFqdn(subdomain: string): string {
  const sub = (subdomain || '').trim().toLowerCase().replace(/\.+$/, '')
  return sub ? `${sub}.${PRODUCT_ROOT_DOMAIN}` : PRODUCT_ROOT_DOMAIN
}
