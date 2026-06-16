import { commonCatalog } from './catalog/common'
import { composerCatalog } from './catalog/composer'
import { createTranslator, pickLocalized, localized } from './pick'
import { mergeDicts } from './merge'
import type { Locale } from './types'

const UI_CATALOG = mergeDicts(composerCatalog, commonCatalog)

export function uiTranslator(locale: Locale) {
  return createTranslator(UI_CATALOG, locale)
}

export function uiT(locale: Locale, key: string, fallback?: string) {
  return uiTranslator(locale).t(key, fallback)
}

export function uiTpl(locale: Locale, key: string, ...parts: string[]) {
  return uiTranslator(locale).tpl(key, ...parts)
}

export { pickLocalized, localized }
