const CHAT_WS_PATHS = [
  '/ws/agent',
  '/ws/team',
  '/ws/service-case',
  '/ws/hermes/channel',
]

function normalizePath(path: string) {
  const raw = path.startsWith('/') ? path : `/${path}`
  return raw.endsWith('/') ? raw : `${raw}/`
}

function isKnownChatWsPath(pathname: string) {
  const path = pathname.replace(/\/$/, '')
  return CHAT_WS_PATHS.includes(path)
}

export function buildChatWsUrl(options: {
  explicit?: string
  fallbackOrigin: string
  path: string
  params: Record<string, string | undefined>
}) {
  const raw = (options.explicit || '').trim()
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
