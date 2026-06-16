const VIP_PUBLIC_HOSTS = new Set([
  'vip.xiaoone.net',
  'vip.xiaoone.cn',
  'vip.xiaoone.ai',
  'vip-staging.xiaoone.cn',
  'vip-staging.xiaoone.ai',
])

export function isVipPublicHost(hostname = globalThis.window?.location.hostname || '') {
  return VIP_PUBLIC_HOSTS.has(hostname.trim().toLowerCase())
}
