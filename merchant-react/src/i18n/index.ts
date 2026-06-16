export type { Locale, LocalizedCopy, Dict, DictPair } from './types'
export { pickLocalized, localized, createTranslator } from './pick'
export { useI18n, useT } from './useI18n'
export {
  migrateLegacyLocaleKeys,
  syncLocaleToLegacyKeys,
  LEGACY_SITE_LOCALE_KEY,
  LEGACY_PORTAL_LANG_KEY,
  MERCHANT_LOCALE_KEY,
} from './syncLocaleStorage'
export { marketingZhToEn, marketingTextByZh } from './catalog/marketing'
export { marketingPagesCatalog } from './catalog/marketingPages'
export { composerCatalog } from './catalog/composer'
export { commonCatalog } from './catalog/common'
export { uiTranslator, uiT, uiTpl } from './catalogResolve'
