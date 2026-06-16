import type { Locale } from './types'

/** Legacy plain localStorage keys kept in sync with the canonical merchant locale. */
export const LEGACY_SITE_LOCALE_KEY = 'xiaoone.site.locale'
export const LEGACY_PORTAL_LANG_KEY = 'xiaoone.user.portal.lang'
export const MERCHANT_LOCALE_KEY = 'xiaoone-merchant-locale'

export function isLocale(value: unknown): value is Locale {
  return value === 'zh' || value === 'en'
}

/** One-time import: legacy keys → merchant zustand persist when merchant key is absent. */
export function migrateLegacyLocaleKeys(): void {
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(MERCHANT_LOCALE_KEY)) return

  const candidates = [
    localStorage.getItem(LEGACY_SITE_LOCALE_KEY),
    localStorage.getItem(LEGACY_PORTAL_LANG_KEY),
  ]
  const found = candidates.find(isLocale)
  if (!found) return

  localStorage.setItem(
    MERCHANT_LOCALE_KEY,
    JSON.stringify({ state: { locale: found }, version: 0 }),
  )
}

/** Write locale to all legacy plain keys so older code paths stay consistent. */
export function syncLocaleToLegacyKeys(locale: Locale): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LEGACY_SITE_LOCALE_KEY, locale)
  localStorage.setItem(LEGACY_PORTAL_LANG_KEY, locale)
}
