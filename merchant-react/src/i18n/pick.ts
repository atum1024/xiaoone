import type { Locale, LocalizedCopy } from './types'

export function pickLocalized(copy: LocalizedCopy, locale: Locale): string {
  return copy[locale]
}

export function localized(zh: string, en: string): LocalizedCopy {
  return { zh, en }
}

export function createTranslator(dicts: Record<Locale, Record<string, string>>, locale: Locale) {
  const dict = dicts[locale]
  return {
    locale,
    isZh: locale === 'zh',
    isEn: locale === 'en',
    t: (key: string, fallback?: string) => {
      if (key in dict) return dict[key]
      if (fallback !== undefined) return fallback
      return key.split('.').filter(Boolean).pop() || key
    },
    tpl: (key: string, ...parts: string[]) => {
      let s = key in dict ? dict[key] : key
      parts.forEach((p, i) => {
        s = s.split(`{${i}}`).join(p)
      })
      return s
    },
    tCopy: (copy: LocalizedCopy) => copy[locale],
  }
}
