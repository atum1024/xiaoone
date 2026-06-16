import type { CSSProperties } from 'react'
import type { IconName } from '../components/Icon'

export type PartnerBrandKey =
  | 'alipay'
  | 'cardixon'
  | 'telegram'
  | 'wechat'
  | 'wechat_pay'
  | 'wecom'
  | 'whatsapp'

export interface PartnerBrandMeta {
  key: PartnerBrandKey
  label: string
  paymentLabel?: string
  icon: IconName
  imageUrl?: string
  color: string
}

export const PARTNER_BRANDS: Record<PartnerBrandKey, PartnerBrandMeta> = {
  alipay: {
    key: 'alipay',
    label: '支付宝',
    paymentLabel: '支付宝',
    icon: 'brand-alipay',
    color: '#1677FF',
  },
  cardixon: {
    key: 'cardixon',
    label: 'Cardixon',
    paymentLabel: 'Cardixon',
    icon: 'wallet',
    imageUrl: 'https://www.cardixon.com/_nuxt/logo.Pn0q77-g.png',
    color: '#2150F5',
  },
  telegram: {
    key: 'telegram',
    label: 'Telegram',
    icon: 'brand-telegram',
    color: '#26A5E4',
  },
  wechat: {
    key: 'wechat',
    label: '微信',
    paymentLabel: '微信支付',
    icon: 'brand-wechat',
    color: '#07C160',
  },
  wechat_pay: {
    key: 'wechat_pay',
    label: '微信支付',
    paymentLabel: '微信支付',
    icon: 'brand-wechat',
    color: '#07C160',
  },
  wecom: {
    key: 'wecom',
    label: '企业微信',
    icon: 'brand-wechat',
    color: '#2AABEE',
  },
  whatsapp: {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: 'brand-whatsapp',
    color: '#25D366',
  },
}

export const PARTNER_BRAND_COLORS = Object.fromEntries(
  Object.entries(PARTNER_BRANDS).map(([key, brand]) => [key, brand.color]),
) as Record<PartnerBrandKey, string>

const PARTNER_BRAND_ALIASES: Record<string, PartnerBrandKey> = {
  alipay: 'alipay',
  alipay_pay: 'alipay',
  cardixon: 'cardixon',
  dcpay: 'cardixon',
  payment_cardixon: 'cardixon',
  telegram: 'telegram',
  tg: 'telegram',
  wechat: 'wechat',
  wechat_pay: 'wechat_pay',
  weixin: 'wechat',
  weixin_pay: 'wechat_pay',
  wx: 'wechat',
  wecom: 'wecom',
  wechat_work: 'wecom',
  wework: 'wecom',
  whatsapp: 'whatsapp',
}

export function normalizePartnerBrandKey(value?: string | null): PartnerBrandKey | null {
  const key = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_')
  return PARTNER_BRAND_ALIASES[key] || null
}

export function getPartnerBrand(value?: string | null): PartnerBrandMeta | null {
  const key = normalizePartnerBrandKey(value)
  return key ? PARTNER_BRANDS[key] : null
}

export function partnerBrandCssVars(value?: string | null): CSSProperties {
  const brand = getPartnerBrand(value)
  if (!brand)
    return {}
  return { '--partner-brand-color': brand.color } as CSSProperties
}

export function paymentChannelDisplayLabel(code: string, fallback: string) {
  const brand = getPartnerBrand(code)
  return brand?.paymentLabel || brand?.label || fallback
}
