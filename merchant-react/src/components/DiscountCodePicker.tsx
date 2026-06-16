import { useMemo } from 'react'
import { Badge, Input } from '@xiaoone/react-ui'
import { usePreferences } from '../app/preferences'
import type { DiscountCodeItem } from '../lib/billingApi'
import {
  computePayable,
  describeDiscountCode,
  isDiscountCodeAllowedForCurrency,
  isMembershipCode,
  isPartnerDiscountCode,
  isRechargeCode,
  isVoucherCode,
  resolveSelectedDiscountCode,
} from '../lib/discountCodeUtils'
import { formatPlanPrice, type BillingCurrency } from '../lib/planPricing'

type Props = {
  codes: DiscountCodeItem[]
  value: string
  onChange: (code: string) => void
  business: 'recharge' | 'membership'
  planCode?: string
  baseAmountCny?: number
  currency?: BillingCurrency
  inputPlaceholder?: string
  pickableClassName?: string
  className?: string
  gridClassName?: string
}

export function DiscountCodePicker({
  codes,
  value,
  onChange,
  business,
  planCode,
  baseAmountCny,
  currency = 'CNY',
  inputPlaceholder,
  pickableClassName = 'service-plan service-discount-code service-discount-code--pickable',
  className = '',
  gridClassName = 'service-grid service-grid--discount-codes',
}: Props) {
  const { t, tpl, locale } = usePreferences()
  const placeholder = inputPlaceholder ?? t('account.discount.inputPlaceholder')
  const applicable = useMemo(() => {
    const scoped = business === 'recharge'
      ? codes.filter(isRechargeCode)
      : codes.filter(code => isMembershipCode(code, planCode))
    return scoped.filter(code => isDiscountCodeAllowedForCurrency(code, currency))
  }, [codes, business, planCode, currency])

  const selected = useMemo(
    () => resolveSelectedDiscountCode(codes, value),
    [codes, value],
  )

  const payable = useMemo(() => {
    const base = Number(baseAmountCny || 0)
    if (!Number.isFinite(base) || base <= 0)
      return null
    const after = computePayable(base, currency, selected)
    if (after >= base)
      return null
    return { base, after }
  }, [baseAmountCny, currency, selected])

  return (
    <div className={`grid gap-2 discount-code-picker ${className}`.trim()}>
      <label className="text-sm font-medium">{t('account.discount.label')}</label>
      {currency === 'USD' ? (
        <small className="text-[var(--xiaoone-fg-mute)]">{t('account.discount.usdHint')}</small>
      ) : null}
      {applicable.length > 0 ? (
        <div className={gridClassName}>
          {applicable.map(code => {
            const { badge, kindLabel } = describeDiscountCode(code, currency, locale)
            return (
              <button
                key={code.code}
                type="button"
                className={`${pickableClassName} ${value === code.code ? 'is-selected' : ''}`}
                onClick={() => onChange(value === code.code ? '' : code.code)}
                title={code.code}
              >
                <div className="service-plan-top service-discount-code__top">
                  <strong className="service-discount-code__code" title={code.code}>{code.code}</strong>
                  <Badge variant="outline" className="service-discount-code__badge rounded-full text-blue-500 border-blue-200">
                    {badge}
                  </Badge>
                </div>
                <p className="service-discount-code__scope">{kindLabel}</p>
                {business === 'membership' && code.valid_plan_codes?.length ? (
                  <p className="service-discount-code__scope">{tpl('account.discount.applicablePlans', code.valid_plan_codes.join(' / '))}</p>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {payable ? (
        <small className="text-[var(--xiaoone-fg-mute)]">
          {tpl('account.discount.afterCoupon', formatPlanPrice(payable.after, currency), formatPlanPrice(payable.base, currency))}
        </small>
      ) : null}
    </div>
  )
}

export function DiscountCodeCard({ code, currency = 'CNY' }: { code: DiscountCodeItem, currency?: BillingCurrency }) {
  const { t, tpl, locale } = usePreferences()
  const { badge, kindLabel } = describeDiscountCode(code, currency, locale)
  const expiresLabel = code.expires_at
    ? tpl('account.discount.expiresAt', new Date(code.expires_at).toLocaleString('zh-CN', { hour12: false }))
    : t('account.discount.permanent')
  return (
    <article className="service-plan service-discount-code">
      <div className="service-plan-top service-discount-code__top">
        <strong className="service-discount-code__code" title={code.code}>{code.code}</strong>
        <Badge variant="outline" className="service-discount-code__badge rounded-full text-blue-500 border-blue-200">
          {badge}
        </Badge>
      </div>
      <p className="service-discount-code__scope">{kindLabel} · {businessScopeLabel(code, t)}</p>
      <div className="service-meta service-discount-code__meta">
        <span>{expiresLabel}</span>
      </div>
    </article>
  )
}

function businessScopeLabel(code: DiscountCodeItem, t: (key: string) => string): string {
  if (isPartnerDiscountCode(code) || isVoucherCode(code)) {
    if (code.voucher_type === 'recharge')
      return t('account.discount.scopeRecharge')
    if (code.voucher_type === 'membership')
      return t('account.discount.scopeMembership')
    if (code.voucher_type === 'resource_pack')
      return t('account.discount.scopeResourcePack')
  }
  if (code.valid_business_types?.includes('recharge'))
    return t('account.discount.scopeRecharge')
  if (code.valid_business_types?.includes('membership'))
    return t('account.discount.scopeMembership')
  if (code.valid_business_types?.includes('service'))
    return t('account.discount.scopeService')
  return code.valid_plan_codes?.length ? '' : t('account.discount.scopeAllPlans')
}
