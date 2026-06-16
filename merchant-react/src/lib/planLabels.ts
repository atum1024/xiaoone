import type { Locale } from '../i18n/types'

const PLAN_NAME_ZH: Record<string, string> = {
  personal: '娱乐版',
  startup: '创业版',
  business: '商户版',
}

const PLAN_NAME_EN: Record<string, string> = {
  personal: 'Lite',
  startup: 'Pro',
  business: 'Ultra',
}

/** @deprecated Use displayPlanName(code, locale) */
export const PLAN_NAME_BY_CODE: Record<string, string> = PLAN_NAME_ZH

export function displayPlanName(planCode?: string | null, locale: Locale = 'zh'): string {
  const code = String(planCode || '').trim().toLowerCase()
  if (!code) return locale === 'zh' ? '未开通' : 'Not subscribed'
  const table = locale === 'zh' ? PLAN_NAME_ZH : PLAN_NAME_EN
  return table[code] || code
}
