import type { DiscountCodeItem } from './billingApi'
import type { Locale } from '../i18n/types'
import type { BillingCurrency } from './planPricing'
import { formatPlanPrice } from './planPricing'

export function formatThresholdDeductLabel(
  thresholdLabel: string,
  deductLabel: string,
  locale: Locale = 'zh',
): string {
  if (locale === 'en')
    return `Spend ${thresholdLabel} save ${deductLabel}`
  return `满 ${thresholdLabel} 抵 ${deductLabel}`
}

export function isVoucherCode(code: DiscountCodeItem): boolean {
  return String(code.discount_kind || 'percentage') === 'voucher'
}

export function isPartnerDiscountCode(code: DiscountCodeItem): boolean {
  return String(code.discount_kind || 'percentage') === 'partner_discount'
}

export function isPercentageLikeCode(code: DiscountCodeItem): boolean {
  return isPartnerDiscountCode(code) || String(code.discount_kind || 'percentage') === 'percentage'
}

function voucherTypeMatches(code: DiscountCodeItem, expected: string): boolean {
  return String(code.voucher_type || '').trim() === expected
}

export function isRechargeCode(code: DiscountCodeItem): boolean {
  if (isVoucherCode(code) || isPartnerDiscountCode(code))
    return voucherTypeMatches(code, 'recharge')
  const types = code.valid_business_types
  if (Array.isArray(types) && types.length)
    return types.includes('recharge')
  return false
}

export function isMembershipCode(code: DiscountCodeItem, planCode?: string): boolean {
  if (isVoucherCode(code) || isPartnerDiscountCode(code)) {
    if (code.voucher_type && code.voucher_type !== 'membership')
      return false
    if (planCode && code.valid_plan_codes?.length)
      return code.valid_plan_codes.includes(planCode)
    return code.voucher_type === 'membership' || !code.voucher_type
  }
  if (planCode && code.valid_plan_codes?.length)
    return code.valid_plan_codes.includes(planCode)
  return !code.valid_plan_codes?.length || (planCode ? code.valid_plan_codes.includes(planCode) : true)
}

/** CNY-only full-reduction vouchers and partner discount coupons are not valid for USD checkout. */
export function isDiscountCodeAllowedForCurrency(code: DiscountCodeItem, currency: BillingCurrency): boolean {
  if (currency === 'USD' && (isVoucherCode(code) || isPartnerDiscountCode(code)))
    return false
  return true
}

export function voucherTypeLabel(voucherType?: string, locale: Locale = 'zh'): string {
  const zh: Record<string, string> = {
    recharge: '充值',
    membership: '套餐',
    resource_pack: '资源包',
  }
  const en: Record<string, string> = {
    recharge: 'Top-up',
    membership: 'Membership',
    resource_pack: 'Resource pack',
  }
  const map = locale === 'en' ? en : zh
  return map[String(voucherType || '')] || ''
}

function formatDiscountRateLabel(rate: number, locale: Locale): string {
  const normalized = Number.isFinite(rate) ? rate.toFixed(2) : '0.00'
  return locale === 'en' ? `${normalized} rate` : `折扣 ${normalized}`
}

export function describeDiscountCode(
  code: DiscountCodeItem,
  currency: BillingCurrency = 'CNY',
  locale: Locale = 'zh',
): { badge: string, kindLabel: string } {
  if (isPartnerDiscountCode(code)) {
    const typeLabel = voucherTypeLabel(code.voucher_type, locale)
    const userRate = Number(code.discount_rate || 0)
    const discountLabel = locale === 'en' ? 'Discount coupon' : '折扣券'
    return {
      badge: formatDiscountRateLabel(userRate, locale),
      kindLabel: typeLabel ? `${discountLabel} · ${typeLabel}` : discountLabel,
    }
  }
  if (isVoucherCode(code)) {
    const typeLabel = voucherTypeLabel(code.voucher_type, locale)
    const effectiveDeduct = code.effective_deduct_cny
      ? Number(code.effective_deduct_cny)
      : Number(code.deduct_cny || 0) - Number(code.partner_markup_cny || 0)
    const markup = Number(code.partner_markup_cny || 0)
    const threshold = Number(code.threshold_cny || 0)
    const thresholdLabel = formatPlanPrice(threshold, currency)
    const deductLabel = formatPlanPrice(markup > 0 ? effectiveDeduct : Number(code.deduct_cny || 0), currency)
    const badgeText = formatThresholdDeductLabel(thresholdLabel, deductLabel, locale)
    const voucherLabel = locale === 'en' ? 'Voucher' : '代金券'
    return {
      badge: badgeText,
      kindLabel: typeLabel ? `${voucherLabel} · ${typeLabel}` : voucherLabel,
    }
  }
  const rate = Number(code.discount_rate || 0).toFixed(2)
  return {
    badge: locale === 'en' ? `${rate} off` : `折扣 ${rate}`,
    kindLabel: locale === 'en' ? 'Discount code' : '折扣码',
  }
}

export function computePayable(
  amount: number,
  currency: BillingCurrency,
  code: DiscountCodeItem | null | undefined,
): number {
  if (!code || !isDiscountCodeAllowedForCurrency(code, currency))
    return amount
  return computePayableCny(amount, code)
}

/** @deprecated Use computePayable(amount, currency, code) */
export function computePayableCny(amountCny: number, code: DiscountCodeItem | null | undefined): number {
  const amount = Number(amountCny || 0)
  if (!code || !Number.isFinite(amount) || amount <= 0)
    return amount
  if (isVoucherCode(code)) {
    const threshold = Number(code.threshold_cny || 0)
    if (amount < threshold)
      return amount
    const effectiveDeduct = code.effective_deduct_cny
      ? Number(code.effective_deduct_cny)
      : Number(code.deduct_cny || 0) - Number(code.partner_markup_cny || 0)
    return Math.max(0, Math.round((amount - effectiveDeduct) * 100) / 100)
  }
  if (isPercentageLikeCode(code)) {
    const rate = Number(code.discount_rate || 0)
    return Math.max(0, Math.round(amount * rate * 100) / 100)
  }
  const rate = Number(code.discount_rate || 0)
  return Math.max(0, Math.round(amount * rate * 100) / 100)
}

export function findDiscountCodeByInput(codes: DiscountCodeItem[], input: string): DiscountCodeItem | null {
  const normalized = String(input || '').trim().toUpperCase()
  if (!normalized)
    return null
  return codes.find(row => String(row.code || '').trim().toUpperCase() === normalized) ?? null
}

export function resolveSelectedDiscountCode(
  codes: DiscountCodeItem[],
  input: string,
): DiscountCodeItem | null {
  return findDiscountCodeByInput(codes, input)
}
