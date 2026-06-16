/**
 * One-time migration from the retired visitor site's plain localStorage keys
 * into merchant zustand persist entries so returning users keep locale/theme.
 */
const LEGACY_LOCALE_KEY = 'xiaoone.site.locale'
const LEGACY_THEME_KEY = 'xiaoone.site.theme'
const MERCHANT_LOCALE_KEY = 'xiaoone-merchant-locale'
const MERCHANT_THEME_KEY = 'xiaoone-merchant-theme'

function isSiteLocale(value: string | null): value is 'zh' | 'en' {
  return value === 'zh' || value === 'en'
}

function isSiteTheme(value: string | null): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark'
}

export function migrateLegacySitePreferences(): void {
  if (typeof localStorage === 'undefined') return

  const legacyLocale = localStorage.getItem(LEGACY_LOCALE_KEY)
  if (isSiteLocale(legacyLocale) && !localStorage.getItem(MERCHANT_LOCALE_KEY)) {
    localStorage.setItem(
      MERCHANT_LOCALE_KEY,
      JSON.stringify({ state: { locale: legacyLocale }, version: 0 }),
    )
  }

  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY)
  if (isSiteTheme(legacyTheme) && !localStorage.getItem(MERCHANT_THEME_KEY)) {
    localStorage.setItem(
      MERCHANT_THEME_KEY,
      JSON.stringify({ state: { mode: legacyTheme }, version: 0 }),
    )
  }
}
