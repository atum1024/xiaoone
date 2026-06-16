type ThemeName = 'light' | 'dark'

export function syncFaviconForTheme(_theme: ThemeName) {
  if (typeof document === 'undefined')
    return

  document
    .querySelectorAll<HTMLLinkElement>('link[data-xiaoone-theme-favicon]')
    .forEach(link => link.remove())

  let link = document.querySelector<HTMLLinkElement>('link[data-xiaoone-favicon="true"]')
  if (!link) {
    link = document.createElement('link')
    link.dataset.xiaooneFavicon = 'true'
    document.head.appendChild(link)
  }

  link.rel = 'icon'
  link.type = 'image/png'
  link.href = '/logo/favicon.png'
}
