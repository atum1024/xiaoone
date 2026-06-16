import { useMemo } from 'react'
import { useLocaleStore } from '../store/locale'
import { createTranslator } from './pick'
import type { LocalizedCopy } from './types'

export function useI18n() {
  const locale = useLocaleStore(s => s.locale)
  const dicts = useLocaleStore(s => s.dicts)

  return useMemo(() => createTranslator(dicts, locale), [dicts, locale])
}

export function useT() {
  const { t, tpl, tCopy, locale, isZh, isEn } = useI18n()
  return { t, tpl, tCopy, locale, isZh, isEn }
}

export type { LocalizedCopy }
