import { PLAN_MARKETING_FALLBACK } from './planMarketingFallback'
import type { MarketingFeatureRow, PlanFeatureLocale, PlanLike } from './planMarketingTypes'
import type { RegionCode } from './regionDetect'

export type { MarketingFeatureRow, PlanFeatureLocale, PlanLike } from './planMarketingTypes'

/** Canonical feature order — identical across personal / startup / business. Marketing last. */
export const PLAN_FEATURE_KEY_ORDER: readonly string[] = [
  'monthly_points',
  'monthly_traffic',
  'workspace_storage',
  'hermes_server',
  'kefu',
  'stores_max',
  'team_seats_max',
  'settlement',
  'data_reports',
  'listing_wechat_mini',
  'listing_domestic_app',
  'listing_apple',
  'listing_google',
  'us_native_ip',
  'network_acceleration',
  'social_posting',
  'sms_registration',
  'payment_card',
]

export const MARKETING_FEATURE_KEYS = new Set([
  'network_acceleration',
  'social_posting',
  'sms_registration',
  'payment_card',
])

/** Shared with startup; business tier ships higher quotas on these rows. */
export const BUSINESS_TIER_UPGRADE_KEYS = new Set([
  'monthly_points',
  'monthly_traffic',
  'workspace_storage',
  'hermes_server',
  'social_posting',
  'stores_max',
  'team_seats_max',
])

function numberValue(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) ? n : fallback
}

function fallbackIncludedPoints(code: string): number {
  if (code === 'startup') return 80000
  if (code === 'business') return 200000
  return 20000
}

function sortPlanFeatureRows(rows: MarketingFeatureRow[]): MarketingFeatureRow[] {
  const order = new Map(PLAN_FEATURE_KEY_ORDER.map((key, index) => [key, index]))
  return [...rows].sort((left, right) => (order.get(left.key) ?? 999) - (order.get(right.key) ?? 999))
}

export function interpolatePlanFeatureValue(template: string, plan: PlanLike): string {
  const ent = (plan.entitlements || {}) as Record<string, unknown>
  const points = numberValue(plan.included_points, fallbackIncludedPoints(String(plan.code || '')))
  const traffic = numberValue(ent.monthly_traffic_gb ?? ent.network_quota_gb, 0)
  const storageGb = numberValue(ent.workspace_storage_gb, 50)
  return template
    .replace(/\{points\}/g, points.toLocaleString('zh-CN'))
    .replace(/\{traffic\}/g, String(traffic))
    .replace(/\{storage_gb\}/g, String(storageGb))
}

export function formatPlanFeatureText(row: MarketingFeatureRow, plan: PlanLike, locale: PlanFeatureLocale): string {
  const label = locale === 'zh' ? row.label_zh : row.label_en
  const valueTemplate = locale === 'zh' ? row.value_zh : row.value_en
  if (valueTemplate) {
    const value = interpolatePlanFeatureValue(valueTemplate, plan)
    if (row.state === 'locked')
      return locale === 'zh' ? `${label} 未解锁` : `${label} locked`
    return `${label} ${value}`.trim()
  }
  if (row.state === 'locked')
    return locale === 'zh' ? `${label} 未解锁` : `${label} locked`
  return label
}

export function marketingFeaturesForPlan(plan: PlanLike): MarketingFeatureRow[] {
  const ent = (plan.entitlements || {}) as Record<string, unknown>
  const raw = ent.marketing_features
  if (Array.isArray(raw) && raw.length)
    return raw as MarketingFeatureRow[]
  const code = String(plan.code || '')
  return PLAN_MARKETING_FALLBACK[code] || []
}

export function partitionPlanFeatureRows(rows: MarketingFeatureRow[]): {
  core: MarketingFeatureRow[]
  marketing: MarketingFeatureRow[]
} {
  const core: MarketingFeatureRow[] = []
  const marketing: MarketingFeatureRow[] = []
  for (const row of rows) {
    if (MARKETING_FEATURE_KEYS.has(row.key))
      marketing.push(row)
    else
      core.push(row)
  }
  return { core, marketing }
}

export function isBusinessTierUpgradeHighlight(planCode: string | undefined, row: MarketingFeatureRow): boolean {
  return planCode === 'business' && row.state !== 'locked' && BUSINESS_TIER_UPGRADE_KEYS.has(row.key)
}

export function resolvePlanFeatureRows(
  plan: PlanLike,
  options: {
    region: RegionCode
    showRegionRestricted?: boolean
  },
): MarketingFeatureRow[] {
  const rows = marketingFeaturesForPlan(plan)
  const showRestricted = options.showRegionRestricted ?? options.region !== 'mainland'
  const filtered = rows.filter(row => !row.region_restricted || showRestricted)
  return sortPlanFeatureRows(filtered)
}
