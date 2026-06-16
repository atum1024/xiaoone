import type { Locale } from '../i18n/types'

type ThemeName = 'light' | 'dark'

type BrandAssetSet = {
  header: string
  horizontal: string
  square: string
  slogan: string
  sloganEn: string
}

const brandAssetPaths: Record<ThemeName, BrandAssetSet> = {
  light: {
    header: '/logo/horizontal-day.png',
    horizontal: '/logo/horizontal-day.png',
    square: '/logo/square-day.png',
    slogan: '/logo/slogan-day.png',
    sloganEn: '/logo/slogan-en-day.png',
  },
  dark: {
    header: '/logo/horizontal-night.png',
    horizontal: '/logo/horizontal-night.png',
    square: '/logo/square-night.png',
    slogan: '/logo/slogan-night.png',
    sloganEn: '/logo/slogan-en-night.png',
  },
}

export const brandAssets = brandAssetPaths

export function logoAssetsForTheme(theme: ThemeName) {
  return theme === 'dark' ? brandAssets.dark : brandAssets.light
}

/** Theme + locale aware brand paths. Slogan picks zh/en image asset. */
export function logoAssetsForThemeAndLocale(theme: ThemeName, locale: Locale) {
  const base = logoAssetsForTheme(theme)
  return {
    ...base,
    slogan: locale === 'en' ? base.sloganEn : base.slogan,
  }
}

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
