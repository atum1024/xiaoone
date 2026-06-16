import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultLocaleForRegion, regionFromHostname } from '@xiaoone/region'
import { syncFaviconForTheme as syncMerchantFaviconForTheme } from '../../lib/favicon'
import { useLocaleStore } from '../../store/locale'
import { useThemeStore } from '../../store/theme'
import { syncFaviconForTheme } from '../brandAssets'
import { applyStaticTranslations } from '../siteTranslations'
import type { Locale, LocalizedCopy } from '../../i18n/types'

export type SiteLocale = Locale
export type SiteTheme = 'light' | 'dark'

export type { LocalizedCopy }

export interface SitePreferences {
  locale: SiteLocale
  theme: SiteTheme
  setLocale: (locale: SiteLocale) => void
  setTheme: (theme: SiteTheme) => void
  toggleLocale: () => void
  toggleTheme: () => void
  t: (copy: LocalizedCopy) => string
  tKey: (key: string, fallback?: string) => string
}

const SitePreferencesContext = createContext<SitePreferences | null>(null)

function getInitialTheme(): SiteTheme {
  if (typeof window === 'undefined')
    return 'light'

  const stored = window.localStorage.getItem('xiaoone.site.theme')
  if (stored === 'light' || stored === 'dark')
    return stored

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applySiteTheme(theme: SiteTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
  syncFaviconForTheme(theme)
}

function restoreMerchantDocumentPreferences() {
  if (typeof document === 'undefined')
    return

  useLocaleStore.getState().applyHtmlLang()

  const merchantTheme = useThemeStore.getState().mode
  const root = document.documentElement
  root.dataset.theme = merchantTheme
  root.classList.toggle('dark', merchantTheme === 'dark')
  root.style.colorScheme = merchantTheme
  syncMerchantFaviconForTheme(merchantTheme)
}

export function SitePreferencesProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore(s => s.locale)
  const setLocaleGlobal = useLocaleStore(s => s.set)
  const toggleLocaleGlobal = useLocaleStore(s => s.toggle)
  const rawTKey = useLocaleStore(s => s.t)
  const tCopy = useLocaleStore(s => s.tCopy)
  const tKey = useCallback((key: string, fallback?: string) => rawTKey(key, fallback), [locale, rawTKey])
  const [theme, setThemeState] = useState<SiteTheme>(getInitialTheme)

  useEffect(() => {
    useLocaleStore.getState().init()
  }, [])

  useEffect(() => {
    applyStaticTranslations(locale)

    let timer: ReturnType<typeof setTimeout> | null = null
    const translatableAttrs = new Set(['placeholder', 'aria-label', 'title', 'alt'])

    const schedule = () => {
      if (timer !== null) return
      timer = setTimeout(() => {
        timer = null
        applyStaticTranslations(locale)
      }, 200)
    }

    const observer = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type === 'childList' && rec.addedNodes.length > 0) {
          schedule()
          return
        }
        if (rec.type === 'characterData') {
          schedule()
          return
        }
        if (rec.type === 'attributes' && rec.attributeName && translatableAttrs.has(rec.attributeName)) {
          schedule()
          return
        }
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'],
    })

    return () => {
      if (timer !== null) clearTimeout(timer)
      observer.disconnect()
    }
  }, [locale])

  useEffect(() => {
    const applyTheme = () => {
      applySiteTheme(theme)
      window.localStorage.setItem('xiaoone.site.theme', theme)
    }
    applyTheme()
    const timer = window.setTimeout(applyTheme, 0)
    return () => window.clearTimeout(timer)
  }, [theme])

  useEffect(() => restoreMerchantDocumentPreferences, [])

  const value = useMemo<SitePreferences>(() => ({
    locale,
    theme,
    setLocale: setLocaleGlobal,
    setTheme: setThemeState,
    toggleLocale: toggleLocaleGlobal,
    toggleTheme: () => setThemeState(current => current === 'light' ? 'dark' : 'light'),
    t: tCopy,
    tKey,
  }), [locale, theme, setLocaleGlobal, toggleLocaleGlobal, tCopy, tKey])

  return createElement(SitePreferencesContext.Provider, { value }, children)
}

export function useSitePreferences(): SitePreferences {
  const context = useContext(SitePreferencesContext)
  if (!context)
    throw new Error('useSitePreferences must be used within SitePreferencesProvider')
  return context
}
