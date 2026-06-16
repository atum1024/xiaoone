import type { DictPair } from '../types'

// Canonical zh→en map lives in siteTranslations; re-export for DOM walker + catalog build.
import { marketingZhToEn as ZH_TO_EN } from '../../marketing/siteTranslations'

/** Flat marketing strings (migrated from siteTranslations ZH_TO_EN). Keys: marketing.<slug> */
function slugify(zh: string): string {
  return zh
    .replace(/[^\u4e00-\u9fffa-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80) || 'text'
}

const zh: Record<string, string> = {}
const en: Record<string, string> = {}
const used = new Set<string>()

for (const [zhText, enText] of Object.entries(ZH_TO_EN)) {
  let key = `marketing.${slugify(zhText)}`
  let n = 0
  while (used.has(key)) {
    n += 1
    key = `marketing.${slugify(zhText)}_${n}`
  }
  used.add(key)
  zh[key] = zhText
  en[key] = enText
}

export const marketingCatalog: DictPair = { zh, en }

/** Lookup marketing string by Chinese source text (DOM walker / legacy). */
export function marketingTextByZh(zhText: string, locale: 'zh' | 'en'): string {
  if (locale === 'zh') return zhText
  return ZH_TO_EN[zhText.trim()] ?? zhText
}

export { ZH_TO_EN as marketingZhToEn }
