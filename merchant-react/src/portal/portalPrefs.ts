import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { defaultLocaleForRegion, regionFromHostname } from '@xiaoone/region'
import { syncFaviconForTheme } from '../lib/favicon'
import { useLocaleStore } from '../store/locale'
import type { Locale, LocalizedCopy } from '../i18n/types'

/**
 * Portal auth pages share the canonical merchant locale store.
 * Theme remains portal-scoped in localStorage for marketing/portal light defaults.
 */
export type PortalLocale = Locale
export type PortalTheme = 'light' | 'dark'

const THEME_KEY = 'xiaoone.user.portal.theme'

function isTheme(v: unknown): v is PortalTheme {
  return v === 'light' || v === 'dark'
}

function readSeedFromUrl(): { lang?: PortalLocale; theme?: PortalTheme } {
  if (typeof window === 'undefined')
    return {}
  const params = new URLSearchParams(window.location.search)
  const lang = params.get('lang')
  const theme = params.get('theme')
  const seed: { lang?: PortalLocale; theme?: PortalTheme } = {}
  if (lang === 'zh' || lang === 'en')
    seed.lang = lang
  if (isTheme(theme))
    seed.theme = theme
  if (seed.lang || seed.theme) {
    params.delete('lang')
    params.delete('theme')
    const next = params.toString()
    const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
    window.history.replaceState(window.history.state, '', nextUrl)
  }
  return seed
}

function applyPortalDocumentTheme(theme: PortalTheme) {
  if (typeof document === 'undefined')
    return
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  syncFaviconForTheme(theme)
}

function getInitialTheme(seedTheme?: PortalTheme): PortalTheme {
  if (seedTheme)
    return seedTheme
  if (typeof window === 'undefined')
    return 'light'
  const stored = window.localStorage.getItem(THEME_KEY)
  if (isTheme(stored))
    return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export type { LocalizedCopy }

export interface PortalPrefs {
  locale: PortalLocale
  theme: PortalTheme
  setLocale: (locale: PortalLocale) => void
  setTheme: (theme: PortalTheme) => void
  toggleLocale: () => void
  toggleTheme: () => void
  t: (copy: LocalizedCopy) => string
}

export function usePortalPrefs(): PortalPrefs {
  const seed = useMemo(() => readSeedFromUrl(), [])
  const locale = useLocaleStore(s => s.locale)
  const setLocaleGlobal = useLocaleStore(s => s.set)
  const toggleLocaleGlobal = useLocaleStore(s => s.toggle)
  const tCopy = useLocaleStore(s => s.tCopy)
  const [theme, setThemeState] = useState<PortalTheme>(() => getInitialTheme(seed.theme))

  useEffect(() => {
    useLocaleStore.getState().init()
    if (seed.lang)
      setLocaleGlobal(seed.lang)
  }, [seed.lang, setLocaleGlobal])

  useLayoutEffect(() => {
    applyPortalDocumentTheme(theme)
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const setLocale = useCallback((l: PortalLocale) => setLocaleGlobal(l), [setLocaleGlobal])
  const setTheme = useCallback((th: PortalTheme) => setThemeState(th), [])
  const toggleLocale = useCallback(() => toggleLocaleGlobal(), [toggleLocaleGlobal])
  const toggleTheme = useCallback(
    () => setThemeState(prev => prev === 'light' ? 'dark' : 'light'),
    [],
  )
  const t = useCallback((copy: LocalizedCopy) => tCopy(copy), [tCopy])

  return { locale, theme, setLocale, setTheme, toggleLocale, toggleTheme, t }
}
