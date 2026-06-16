import type { Dict, DictPair, Locale } from './types'
import { marketingCatalog } from './catalog/marketing'

export function mergeDicts(...pairs: DictPair[]): Record<Locale, Dict> {
  const zh: Dict = {}
  const en: Dict = {}
  for (const pair of pairs) {
    Object.assign(zh, pair.zh)
    Object.assign(en, pair.en)
  }
  return { zh, en }
}

/** Merge workbench + marketing catalogs. Workbench dict is passed in to avoid circular imports. */
export function buildMergedCatalogs(workbench: DictPair): Record<Locale, Dict> {
  return mergeDicts(workbench, marketingCatalog)
}
