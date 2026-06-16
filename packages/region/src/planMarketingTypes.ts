export type PlanFeatureLocale = 'zh' | 'en'

export interface MarketingFeatureRow {
  key: string
  label_zh: string
  label_en: string
  value_zh?: string
  value_en?: string
  state?: 'included' | 'locked' | string
  region_restricted?: boolean
  agreement_hint?: boolean
  requires_real_name?: boolean
}

export interface PlanLike {
  code?: string
  included_points?: number
  entitlements?: Record<string, unknown>
}
