import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLocaleStore, type Locale } from '../store/locale'
import { useThemeStore, type ThemeMode } from '../store/theme'

export type { Locale, ThemeMode }

import type { LocalizedCopy } from '../i18n/types'

interface PreferencesContextValue {
  locale: Locale
  theme: ThemeMode
  isZh: boolean
  isEn: boolean
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  t: (key: string, fallback?: string) => string
  tpl: (key: string, ...values: string[]) => string
  tCopy: (copy: LocalizedCopy) => string
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore(s => s.locale)
  const setLocale = useLocaleStore(s => s.set)
  const toggleLocale = useLocaleStore(s => s.toggle)
  const rawT = useLocaleStore(s => s.t)
  const rawTpl = useLocaleStore(s => s.tpl)
  const rawTCopy = useLocaleStore(s => s.tCopy)
  const { mode: theme, set: setTheme, toggle: toggleTheme } = useThemeStore()

  useEffect(() => {
    useThemeStore.getState().init()
    useLocaleStore.getState().init()
  }, [])

  const t = useCallback((key: string, fallback?: string) => rawT(key, fallback), [locale, rawT])
  const tpl = useCallback((key: string, ...values: string[]) => rawTpl(key, ...values), [locale, rawTpl])
  const tCopy = useCallback((copy: LocalizedCopy) => rawTCopy(copy), [locale, rawTCopy])

  const value = useMemo<PreferencesContextValue>(() => ({
    locale,
    theme,
    isZh: locale === 'zh',
    isEn: locale === 'en',
    setLocale,
    toggleLocale,
    setTheme,
    toggleTheme,
    t,
    tpl,
    tCopy,
  }), [locale, theme, setLocale, toggleLocale, setTheme, toggleTheme, t, tpl, tCopy])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx)
    throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
