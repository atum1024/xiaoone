const CHAT_WS_PATHS = [
  '/ws/agent',
  '/ws/team',
  '/ws/service-case',
  '/ws/hermes/channel',
]

const PRODUCT_ROOT = 'xiaoone.cn'

function normalizePath(path: string) {
  const raw = path.startsWith('/') ? path : `/${path}`
  return raw.endsWith('/') ? raw : `${raw}/`
}

function isKnownChatWsPath(pathname: string) {
  const path = pathname.replace(/\/$/, '')
  return CHAT_WS_PATHS.includes(path)
}

function isStagingHostname(hostname: string) {
  const label = hostname.toLowerCase().split('.', 1)[0] || ''
  return label.includes('staging')
}

function isProductHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  return host === PRODUCT_ROOT || host.endsWith(`.${PRODUCT_ROOT}`)
}

function explicitUrlForCurrentRegion(raw: string, fallbackOrigin: string) {
  const trimmed = raw.trim()
  if (!trimmed)
    return ''
  try {
    const explicit = new URL(trimmed, fallbackOrigin)
    const fallback = new URL(fallbackOrigin)
    if (isProductHostname(explicit.hostname) !== isProductHostname(fallback.hostname))
      return ''
    if (isStagingHostname(explicit.hostname) !== isStagingHostname(fallback.hostname))
      return ''
    return trimmed
  }
  catch {
    return trimmed
  }
}

export function buildChatWsUrl(options: {
  explicit?: string
  fallbackOrigin: string
  path: string
  params: Record<string, string | undefined>
}) {
  const raw = explicitUrlForCurrentRegion(options.explicit || '', options.fallbackOrigin)
  const targetPath = normalizePath(options.path)
  const url = new URL(raw || options.fallbackOrigin, options.fallbackOrigin)
  if (!url.pathname || url.pathname === '/' || isKnownChatWsPath(url.pathname))
    url.pathname = targetPath
  else
    url.pathname = `${url.pathname.replace(/\/$/, '')}${targetPath}`
  url.search = ''
  for (const [key, value] of Object.entries(options.params)) {
    if (value)
      url.searchParams.set(key, value)
  }
  return url.toString()
}
