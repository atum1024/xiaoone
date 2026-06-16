import type { Locale } from '../i18n/types'
import { uiT } from '../i18n/catalogResolve'

export type UpgradePlanCode = 'personal' | 'startup' | 'business'

export type UpgradeFeatureKey =
  | 'network_acceleration'
  | 'dedicated_network'
  | 'us_phone_number'
  | 'payment_card'
  | 'stores'
  | 'team'

const PLAN_LABEL_KEYS: Record<UpgradePlanCode, string> = {
  personal: 'common.upgrade.personal',
  startup: 'common.upgrade.startup',
  business: 'common.upgrade.business',
}

const FEATURE_META_KEYS: Record<UpgradeFeatureKey, {
  feature: string
  title: string
  description: string
  requiredPlanCode: UpgradePlanCode
}> = {
  network_acceleration: {
    feature: 'common.upgrade.networkAcceleration.feature',
    title: 'common.upgrade.networkAcceleration.title',
    description: 'common.upgrade.networkAcceleration.desc',
    requiredPlanCode: 'startup',
  },
  dedicated_network: {
    feature: 'common.upgrade.dedicatedNetwork.feature',
    title: 'common.upgrade.dedicatedNetwork.title',
    description: 'common.upgrade.dedicatedNetwork.desc',
    requiredPlanCode: 'business',
  },
  us_phone_number: {
    feature: 'common.upgrade.usPhone.feature',
    title: 'common.upgrade.usPhone.title',
    description: 'common.upgrade.usPhone.desc',
    requiredPlanCode: 'startup',
  },
  payment_card: {
    feature: 'common.upgrade.paymentCard.feature',
    title: 'common.upgrade.paymentCard.title',
    description: 'common.upgrade.paymentCard.desc',
    requiredPlanCode: 'startup',
  },
  stores: {
    feature: 'common.upgrade.stores.feature',
    title: 'common.upgrade.stores.title',
    description: 'common.upgrade.stores.desc',
    requiredPlanCode: 'startup',
  },
  team: {
    feature: 'common.upgrade.team.feature',
    title: 'common.upgrade.team.title',
    description: 'common.upgrade.team.desc',
    requiredPlanCode: 'business',
  },
}

/** @deprecated Use getUpgradePlanLabels(locale) */
export const UPGRADE_PLAN_LABELS: Record<UpgradePlanCode, string> = {
  personal: '娱乐版',
  startup: '创业版',
  business: '商户版',
}

/** @deprecated Use getUpgradeFeatureMeta(locale) */
export const UPGRADE_FEATURE_META: Record<UpgradeFeatureKey, {
  feature: string
  requiredPlanCode: UpgradePlanCode
  title: string
  description: string
}> = {
  network_acceleration: {
    feature: '业务访问支持',
    requiredPlanCode: 'startup',
    title: '业务访问支持需要升级套餐',
    description: '当前套餐未开放业务访问支持能力，升级到创业版或更高套餐后即可配置共享访问支持。',
  },
  dedicated_network: {
    feature: '专属业务节点',
    requiredPlanCode: 'business',
    title: '专属业务节点需要商户版',
    description: '专属业务节点只对商户版开放，升级后可继续配置专属服务器和 OpenVPN 配置。',
  },
  us_phone_number: {
    feature: '渠道资源咨询',
    requiredPlanCode: 'startup',
    title: '渠道资源咨询需要升级套餐',
    description: '当前套餐未开放渠道资源咨询能力，升级到创业版或更高套餐后即可提交开通申请。',
  },
  payment_card: {
    feature: '营销资源流程咨询',
    requiredPlanCode: 'startup',
    title: '营销资源流程咨询需要升级套餐',
    description: '当前套餐未开放营销资源流程咨询能力，升级到创业版或更高套餐后即可提交服务申请。',
  },
  stores: {
    feature: '店铺创建',
    requiredPlanCode: 'startup',
    title: '店铺创建需要升级套餐',
    description: '当前套餐未开放店铺创建，升级到创业版或更高套餐后即可继续。',
  },
  team: {
    feature: '邀请团队成员',
    requiredPlanCode: 'business',
    title: '团队席位需要商户版',
    description: '当前套餐不包含团队席位，升级到商户版后即可邀请团队成员协作。',
  },
}

export function getUpgradePlanLabels(locale: Locale): Record<UpgradePlanCode, string> {
  return {
    personal: uiT(locale, PLAN_LABEL_KEYS.personal),
    startup: uiT(locale, PLAN_LABEL_KEYS.startup),
    business: uiT(locale, PLAN_LABEL_KEYS.business),
  }
}

export function getUpgradeFeatureMeta(locale: Locale) {
  const result = {} as Record<UpgradeFeatureKey, {
    feature: string
    requiredPlanCode: UpgradePlanCode
    title: string
    description: string
  }>
  for (const [key, meta] of Object.entries(FEATURE_META_KEYS) as [UpgradeFeatureKey, typeof FEATURE_META_KEYS[UpgradeFeatureKey]][]) {
    const zhFallback = UPGRADE_FEATURE_META[key]
    result[key] = {
      feature: uiT(locale, meta.feature, zhFallback.feature),
      requiredPlanCode: meta.requiredPlanCode,
      title: uiT(locale, meta.title, zhFallback.title),
      description: uiT(locale, meta.description, zhFallback.description),
    }
  }
  return result
}

export function featureMetaForKey(featureKey?: string | null, locale: Locale = 'zh') {
  if (!featureKey) return null
  const meta = getUpgradeFeatureMeta(locale)[featureKey as UpgradeFeatureKey]
  return meta || null
}

export function buildUpgradePlanUrl(options: {
  featureKey?: UpgradeFeatureKey | string
  planCode?: UpgradePlanCode | string
  from?: string
}) {
  const meta = featureMetaForKey(options.featureKey)
  const planCode = String(options.planCode || meta?.requiredPlanCode || 'startup').trim()
  const params = new URLSearchParams()
  if (meta) params.set('feature', options.featureKey as string)
  if (planCode) params.set('plan', planCode)
  if (options.from) params.set('from', options.from)
  const qs = params.toString()
  return `/workbench/account/plans${qs ? `?${qs}` : ''}`
}

export function teamFeatureKeyword(locale: Locale) {
  return uiT(locale, 'common.upgrade.teamKeyword', '团队')
}
