import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLocaleStore, type Locale } from '../store/locale'
import { useThemeStore, type ThemeMode } from '../store/theme'

export type { Locale, ThemeMode }

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
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { locale, set: setLocale, toggle: toggleLocale, t, tpl } = useLocaleStore()
  const { mode: theme, set: setTheme, toggle: toggleTheme } = useThemeStore()

  useEffect(() => {
    useThemeStore.getState().init()
    useLocaleStore.getState().init()
  }, [])

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
  }), [locale, theme, setLocale, toggleLocale, setTheme, toggleTheme, t, tpl])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx)
    throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
