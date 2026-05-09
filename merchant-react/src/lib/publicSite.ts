/**
 * 用户端登录/注册页 Logo 跳转的「官网首页」地址。
 * 生产环境请在构建时配置 VITE_PUBLIC_SITE_ORIGIN（含协议，无末尾斜杠）。
 */
export function getPublicSiteHomeHref(): string {
  const raw = import.meta.env.VITE_PUBLIC_SITE_ORIGIN
  if (typeof raw === 'string' && raw.trim())
    return `${raw.replace(/\/$/, '')}/`
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    return `${protocol}//${hostname}:5173/`
  }
  return '/'
}
