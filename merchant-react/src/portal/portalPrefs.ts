import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * 用户端「门面页」（/login、/register）的浅色/深色 + 中文/英文偏好。
 *
 * - 持久化到 localStorage：`xiaoone.user.portal.lang`、`xiaoone.user.portal.theme`。
 * - 首次访问时支持从 URL 查询参数 `?lang=&theme=` 种子（官网点击「登录/创建工作站」
 *   时会带上自己的 locale / theme），消费完会用 history.replaceState 把这两个
 *   query 删除，避免污染浏览器历史。
 * - 同时把 theme 设到 `<html data-theme=...>`（与现有 `mr-*` 暗色工作台共用约定，
 *   见 styles.css 的 `:root, [data-theme='dark']` / `[data-theme='light']`）。
 */
export type PortalLocale = 'zh' | 'en'
export type PortalTheme = 'light' | 'dark'

const LANG_KEY = 'xiaoone.user.portal.lang'
const THEME_KEY = 'xiaoone.user.portal.theme'

function isLocale(v: unknown): v is PortalLocale {
  return v === 'zh' || v === 'en'
}

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
  if (isLocale(lang))
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

function getInitialLocale(seedLang?: PortalLocale): PortalLocale {
  if (seedLang)
    return seedLang
  if (typeof window === 'undefined')
    return 'zh'
  const stored = window.localStorage.getItem(LANG_KEY)
  if (isLocale(stored))
    return stored
  return window.navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
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

export interface LocalizedCopy {
  zh: string
  en: string
}

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
  const [locale, setLocaleState] = useState<PortalLocale>(() => getInitialLocale(seed.lang))
  const [theme, setThemeState] = useState<PortalTheme>(() => getInitialTheme(seed.theme))

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    window.localStorage.setItem(LANG_KEY, locale)
  }, [locale])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const setLocale = useCallback((l: PortalLocale) => setLocaleState(l), [])
  const setTheme = useCallback((th: PortalTheme) => setThemeState(th), [])
  const toggleLocale = useCallback(
    () => setLocaleState(prev => (prev === 'zh' ? 'en' : 'zh')),
    [],
  )
  const toggleTheme = useCallback(
    () => setThemeState(prev => (prev === 'light' ? 'dark' : 'light')),
    [],
  )
  const t = useCallback((copy: LocalizedCopy) => copy[locale], [locale])

  return { locale, theme, setLocale, setTheme, toggleLocale, toggleTheme, t }
}
