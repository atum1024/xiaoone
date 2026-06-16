import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, HelpCircle, Sparkles } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@xiaoone/react-ui'
import { useRegion } from '@xiaoone/region'
import {
  BillingAPI,
  type AlipayIntentResult,
  type DiscountCodeItem,
  type MerchantPlan,
  type MerchantSubscription,
  type PaymentCapability,
  type WechatPayIntentResult,
} from '../lib/billingApi'
import { DiscountCodePicker } from '../components/DiscountCodePicker'
import { PartnerBrandMark } from '../components/PartnerBrandMark'
import { computePayable, resolveSelectedDiscountCode } from '../lib/discountCodeUtils'
import { closePaymentWindow, isCheckoutPaid, openPaymentWindow, payableChannelsFromCapabilities, preferredPayableChannel, rememberPendingCheckout, redirectPaymentWindow, type PayableChannel } from '../lib/paymentWindow'
import { describeAxiosError } from '../lib/apiErrors'
import { evaluatePlanPurchase } from '../lib/planTier'
import { useAuthStore as useAuth } from '../store/auth'
import { usePreferences } from '../app/preferences'
import { featureMetaForKey } from '../lib/upgradePlans'
import { PlanFeatureList } from '../lib/planFeatures'
import { partnerBrandCssVars, paymentChannelDisplayLabel } from '../lib/partnerBrands'
import {
  billingCurrencyForRegion,
  checkoutAmountPayload,
  formatPlanPrice,
  normalizeUserRegion,
  planDisplayPrice,
  planListPrice,
  quoteFinalPrice,
  type BillingCurrency,
} from '../lib/planPricing'
import '../panels/account/billing-panel.css'
import './plan-purchase-page.css'

type TermMonths = 1 | 3 | 6 | 12

function buildFallbackPlans(t: (key: string) => string): MerchantPlan[] {
  return [
  {
    code: 'personal',
    name: t('account.billing.planPersonal'),
    description: t('account.plan.fallbackPersonalDesc'),
    list_price_cny: '598',
    display_price_cny: '298',
    price_cny: '298',
    list_price_usd: '98',
    display_price_usd: '49',
    price_usd: '49',
    included_points: 20000,
    billing_period: 'monthly',
    entitlements: {
      monthly_traffic_gb: 10,
      stores_max: 1,
      team_seats_max: 0,
      features: {
        social_posting: true,
        network_acceleration: true,
        us_phone_number: true,
        payment_card: true,
        data_reports: true,
      },
      included_addons: {},
    },
    is_active: true,
    sort: 0,
  },
  {
    code: 'startup',
    name: t('account.billing.planStartup'),
    description: t('account.plan.fallbackStartupDesc'),
    list_price_cny: '1288',
    display_price_cny: '688',
    price_cny: '688',
    list_price_usd: '198',
    display_price_usd: '99',
    price_usd: '99',
    included_points: 80000,
    billing_period: 'monthly',
    entitlements: {
      monthly_traffic_gb: 30,
      stores_max: 2,
      team_seats_max: 2,
      features: {
        kefu: true,
        cross_border_ecommerce: true,
        network_acceleration: true,
        us_phone_number: true,
        payment_card: true,
        social_posting: true,
      },
      included_addons: {},
    },
    is_active: true,
    sort: 10,
  },
  {
    code: 'business',
    name: t('account.billing.planBusiness'),
    description: t('account.plan.fallbackBusinessDesc'),
    list_price_cny: '2588',
    display_price_cny: '1288',
    price_cny: '1288',
    list_price_usd: '398',
    display_price_usd: '199',
    price_usd: '199',
    included_points: 200000,
    billing_period: 'monthly',
    entitlements: {
      monthly_traffic_gb: 100,
      stores_max: 5,
      team_seats_max: 10,
      us_native_ip_server: 1,
      features: {
        kefu: true,
        cross_border_ecommerce: true,
        network_acceleration: true,
        us_phone_number: true,
        payment_card: true,
        social_posting: true,
      },
      included_addons: {},
    },
    is_active: true,
    sort: 20,
  },
  ]
}

function numberValue(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback)
  return Number.isFinite(n) ? n : fallback
}

function discountFor(plan: MerchantPlan, term: TermMonths): number {
  const matched = (plan.term_discounts || []).find(
    item => Number(item.term_months) === term && item.is_active !== false,
  )
  if (!matched)
    return ({ 1: 1, 3: 0.95, 6: 0.9, 12: 0.8 } as const)[term]
  return numberValue(matched.discount_percent, 1)
}

function preferredPurchaseChannel(
  plan: MerchantPlan,
  channels: Record<string, PaymentCapability>,
  currency: BillingCurrency,
): PayableChannel {
  const paidPlan = currency === 'USD'
    ? Number(plan.price_usd || 0) > 0
    : Number(plan.price_cny || 0) > 0
  if (!paidPlan)
    return preferredPayableChannel(channels)
  return preferredPayableChannel(channels)
}

function normalizeTerm(value: string | null): TermMonths {
  if (value === '3') return 3
  if (value === '6') return 6
  if (value === '12') return 12
  return 1
}

export function PlanPurchasePage() {
  const { t, tpl, locale } = usePreferences()
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { region } = useRegion()
  const billingRegion = normalizeUserRegion(auth.user?.region, region)
  const billingCurrency = billingCurrencyForRegion(billingRegion)
  const featureMeta = featureMetaForKey(searchParams.get('feature'), locale)
  const requestedPlanCode = String(searchParams.get('plan_code') || featureMeta?.requiredPlanCode || '').trim()
  const highlightedPlanCode = requestedPlanCode || 'startup'

  const fallbackPlans = useMemo(() => buildFallbackPlans(t), [t])
  const TERMS = useMemo<Array<{ months: TermMonths; label: string }>>(() => [
    { months: 1, label: t('account.membership.term1') },
    { months: 3, label: t('account.membership.term3') },
    { months: 6, label: t('account.membership.term6') },
    { months: 12, label: t('account.membership.term12') },
  ], [t])
  const TERM_OPTIONS = useMemo<Array<{ months: TermMonths; label: string }>>(() => [
    { months: 1, label: t('account.billing.term1') },
    { months: 3, label: t('account.billing.term3') },
    { months: 6, label: t('account.billing.term6') },
    { months: 12, label: t('account.billing.term12') },
  ], [t])
  const PLAN_NAME_BY_CODE = useMemo<Record<string, string>>(() => ({
    personal: t('account.billing.planPersonal'),
    startup: t('account.billing.planStartup'),
    business: t('account.billing.planBusiness'),
  }), [t])

  const [term, setTerm] = useState<TermMonths>(() => normalizeTerm(searchParams.get('term')))
  const [remotePlans, setRemotePlans] = useState<MerchantPlan[] | null>(null)
  const plans = remotePlans ?? fallbackPlans
  const [subscription, setSubscription] = useState<MerchantSubscription | null>(null)
  const [capabilities, setCapabilities] = useState<Record<string, PaymentCapability>>({})
  const payableChannelOptions = useMemo(() => payableChannelsFromCapabilities(capabilities), [capabilities])
  const [myDiscountCodes, setMyDiscountCodes] = useState<DiscountCodeItem[]>([])
  const [loading, setLoading] = useState(false)

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlanCode, setSelectedPlanCode] = useState('')
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false)
  const [purchaseCouponCode, setPurchaseCouponCode] = useState('')
  const [purchaseChannel, setPurchaseChannel] = useState<PayableChannel>('wechat_pay')
  const [wechatPayIntent, setWechatPayIntent] = useState<WechatPayIntentResult | null>(null)
  const [cardixonToken, setCardixonToken] = useState<1 | 2>(1)
  const [cardixonChain, setCardixonChain] = useState<1 | 56 | 195>(195)
  const [purchaseTermMonths, setPurchaseTermMonths] = useState<TermMonths>(term)
  const [purchaseQuote, setPurchaseQuote] = useState<{
    plan_code: string
    list_price_cny: string
    display_price_cny: string
    term_months: number
    discount_percent: string
    final_price_cny: string
  } | null>(null)

  const merchantId = Number(auth.currentMerchantId || auth.me?.current_merchant_id || 0)

  const loadData = async () => {
    setLoading(true)
    try {
      const [planResp, capabilityResp, discountResp, subResp] = await Promise.allSettled([
        BillingAPI.publicPlans(),
        BillingAPI.paymentCapabilities(),
        BillingAPI.discountCodesMine(),
        merchantId > 0 ? BillingAPI.currentSubscription(merchantId) : Promise.resolve({ subscription: null }),
      ])
      if (planResp.status === 'fulfilled' && planResp.value.items?.length)
        setRemotePlans(planResp.value.items.filter(plan => ['personal', 'startup', 'business'].includes(plan.code)))
      if (capabilityResp.status === 'fulfilled')
        setCapabilities(capabilityResp.value.channels || {})
      if (discountResp.status === 'fulfilled')
        setMyDiscountCodes(discountResp.value.items || [])
      if (subResp.status === 'fulfilled')
        setSubscription(subResp.value.subscription)
    } catch (e: any) {
      toast({ title: t('account.plan.toastLoadFailed'), description: e?.message || t('account.membership.toastRetryLater') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [merchantId])

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => numberValue(a.sort, 0) - numberValue(b.sort, 0)),
    [plans],
  )

  const selectedPlan = useMemo(() => plans.find(plan => plan.code === selectedPlanCode) || null, [plans, selectedPlanCode])
  const purchaseBaseAmount = useMemo(
    () => quoteFinalPrice(purchaseQuote, billingCurrency)
      || (selectedPlan ? planDisplayPrice(selectedPlan, billingCurrency) : 0),
    [purchaseQuote, selectedPlan, billingCurrency],
  )
  const purchasePayableAmount = useMemo(
    () => computePayable(
      purchaseBaseAmount,
      billingCurrency,
      resolveSelectedDiscountCode(myDiscountCodes, purchaseCouponCode),
    ),
    [purchaseBaseAmount, billingCurrency, myDiscountCodes, purchaseCouponCode],
  )

  const preferredPurchaseChannelForPlan = (
    plan: MerchantPlan,
    channels: Record<string, PaymentCapability>,
  ): PayableChannel => preferredPurchaseChannel(plan, channels, billingCurrency)

  const openPurchase = (plan: MerchantPlan, termMonths: TermMonths = term) => {
    const decision = evaluatePlanPurchase(auth.subscriptionPlanCode, plan.code, auth.subscriptionPeriodEnd)
    if (!decision.allowed) {
      toast.error(t('account.membership.downgradeBlocked'))
      return
    }
    setSelectedPlanCode(plan.code)
    setPurchaseTermMonths(termMonths)
    setPurchaseQuote(null)
    setWechatPayIntent(null)
    setPurchaseChannel(preferredPurchaseChannelForPlan(plan, capabilities))
    void BillingAPI.paymentCapabilities()
      .then(payload => {
        const channels = payload.channels || {}
        setCapabilities(channels)
        setPurchaseChannel(preferredPurchaseChannelForPlan(plan, channels))
      })
      .catch(() => {})
    setCardixonToken(1)
    setCardixonChain(195)
    setPurchaseCouponCode('')
    setPurchaseOpen(true)
  }

  useEffect(() => {
    if (!purchaseOpen || !selectedPlanCode) return
    BillingAPI.quotePlan(selectedPlanCode, purchaseTermMonths, billingCurrency)
      .then(setPurchaseQuote)
      .catch(() => setPurchaseQuote(null))
  }, [purchaseOpen, selectedPlanCode, purchaseTermMonths, billingCurrency])

  const finishMembershipPurchase = async (description: string) => {
    toast({ title: t('account.billing.toastMembershipSuccess'), description })
    setPurchaseOpen(false)
    await Promise.allSettled([
      loadData(),
      auth.fetchMe(),
    ])
  }

  const submitPurchase = async () => {
    if (!selectedPlan) return
    setPurchaseSubmitting(true)
    setWechatPayIntent(null)
    try {
      const selectedDiscountCode = purchaseCouponCode.trim()
      const price = purchasePayableAmount
      const checkoutAmount = purchaseBaseAmount
      const amountPayload = checkoutAmountPayload(checkoutAmount, billingCurrency)
      if (price <= 0) {
        const res = await BillingAPI.purchasePlan(
          selectedPlan.code,
          undefined,
          selectedDiscountCode || undefined,
          purchaseTermMonths,
        )
        await finishMembershipPurchase(tpl('account.billing.toastActivated', String((res as any)?.plan_code || selectedPlan.name)))
        return
      }

      if (purchaseChannel === 'wechat_pay' || purchaseChannel === 'alipay') {
        if (billingCurrency === 'USD') {
          toast({ title: t('account.billing.toastUseCardixon'), description: t('account.billing.toastOverseasNoWechatAlipay') })
          return
        }
      }

      if (purchaseChannel === 'wechat_pay') {
        if (!capabilities.wechat_pay?.enabled) {
          toast({ title: t('account.billing.toastWechatNotConfigured'), description: t('account.billing.toastWechatConfigHint') })
          return
        }
        const intent = await BillingAPI.createWechatPayIntent({
          purpose: 'membership_subscription',
          amount_cny: checkoutAmount,
          discount_code: selectedDiscountCode || undefined,
          subject: `Xiaoone ${selectedPlan.name}`,
          metadata: {
            plan_code: selectedPlan.code,
            term_months: purchaseTermMonths,
            note: tpl('account.billing.noteOpenMembership', selectedPlan.name),
          },
        })
        rememberPendingCheckout(intent.checkout_id)
        if (isCheckoutPaid(intent)) {
          navigate(`/billing/success?order_id=${encodeURIComponent(intent.checkout_id)}`)
          return
        }
        if (intent.qr_svg || intent.code_url) {
          setWechatPayIntent(intent)
          toast({ title: t('account.billing.toastWechatQrGenerated'), description: t('account.billing.toastWechatScanHint') })
          return
        }
        toast({ title: t('account.billing.toastPurchaseFailed'), description: t('account.membership.toastRetryLater') })
        return
      }

      if (purchaseChannel === 'alipay') {
        if (!capabilities.alipay?.enabled) {
          toast({ title: t('account.billing.toastAlipayNotConfigured'), description: t('account.billing.toastAlipayConfigHint') })
          return
        }
        const paymentWindow = openPaymentWindow()
        const device: 'pc' | 'wap' = window.matchMedia('(max-width: 768px)').matches ? 'wap' : 'pc'
        let intent: AlipayIntentResult
        try {
          intent = await BillingAPI.createAlipayIntent({
            purpose: 'membership_subscription',
            amount_cny: checkoutAmount,
            device_type: device,
            discount_code: selectedDiscountCode || undefined,
            subject: `Xiaoone ${selectedPlan.name}`,
            metadata: {
              plan_code: selectedPlan.code,
              term_months: purchaseTermMonths,
              note: tpl('account.billing.noteOpenMembership', selectedPlan.name),
            },
          })
        } catch (error) {
          closePaymentWindow(paymentWindow)
          throw error
        }
        rememberPendingCheckout(intent.checkout_id)
        if (isCheckoutPaid(intent)) {
          closePaymentWindow(paymentWindow)
          navigate(`/billing/success?order_id=${encodeURIComponent(intent.checkout_id)}`)
          return
        }
        if (intent.redirect_url) {
          if (redirectPaymentWindow(paymentWindow, intent.redirect_url)) {
            toast({ title: t('account.billing.toastAlipayOpened'), description: t('account.billing.toastAlipayCompleteHint') })
          } else {
            toast({ title: t('account.billing.toastPopupBlocked'), description: t('account.billing.toastAllowPopup') })
          }
          return
        }
        closePaymentWindow(paymentWindow)
        navigate(`/billing/success?order_id=${encodeURIComponent(intent.checkout_id)}`)
        return
      }

      if (purchaseChannel === 'cardixon') {
        if (!capabilities.cardixon?.enabled) {
          toast({ title: t('account.billing.toastCardixonNotConfigured'), description: t('account.billing.toastCardixonConfigHint') })
          return
        }
        const intent = await BillingAPI.createCardixonIntent({
          purpose: 'membership_subscription',
          ...amountPayload,
          discount_code: selectedDiscountCode || undefined,
          token: cardixonToken,
          chain_type: cardixonChain,
          language: 'en-US',
          subject: `Xiaoone ${selectedPlan.name}`,
          metadata: {
            plan_code: selectedPlan.code,
            term_months: purchaseTermMonths,
            note: tpl('account.billing.noteOpenMembership', selectedPlan.name),
          },
        })
        rememberPendingCheckout(intent.checkout_id)
        if (isCheckoutPaid(intent)) {
          navigate(`/billing/success?order_id=${encodeURIComponent(intent.checkout_id)}`)
          return
        }
        if (intent.redirect_url) {
          window.location.href = intent.redirect_url
          return
        }
        navigate(`/billing/success?order_id=${encodeURIComponent(intent.checkout_id)}`)
        return
      }
    } catch (e: any) {
      toast({ title: t('account.billing.toastPurchaseFailed'), description: describeAxiosError(e, t('account.common.unknownError')) })
    } finally {
      setPurchaseSubmitting(false)
    }
  }

  return (
    <section className="plan-purchase-page" aria-busy={loading}>
      <header className="plan-purchase-hero">
        <div>
          <button type="button" className="plan-purchase-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} />
            {t('account.plan.back')}
          </button>
          <h1>{t('account.plan.heroTitle')}</h1>
          <p>{t('account.plan.heroDesc')}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/workbench/account')}>{t('account.plan.accountCenter')}</Button>
      </header>

      {featureMeta ? (
        <section className="plan-upgrade-banner">
          <div>
            <span>{t('account.plan.upgradeBanner')}</span>
            <strong>{featureMeta.description}</strong>
          </div>
          <Badge variant="outline" className="rounded-full text-emerald-600 border-emerald-200">
            {tpl('account.plan.suggestPlan', PLAN_NAME_BY_CODE[featureMeta.requiredPlanCode] || featureMeta.requiredPlanCode)}
          </Badge>
        </section>
      ) : null}

      <nav className="plan-term-switch" aria-label={t('account.plan.termAria')}>
        {TERMS.map(item => (
          <button
            key={item.months}
            type="button"
            className={term === item.months ? 'is-active' : ''}
            onClick={() => setTerm(item.months)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="plan-purchase-grid">
        {sortedPlans.map((plan) => {
          const listPrice = planListPrice(plan, billingCurrency)
          const displayPrice = planDisplayPrice(plan, billingCurrency)
          const finalPrice = Math.ceil(displayPrice * discountFor(plan, term) * term * 100) / 100
          const monthlyEquivalent = finalPrice / term
          const popular = plan.code === 'startup'
          const active = subscription?.status === 'active' && subscription.plan?.code === plan.code
          const highlighted = plan.code === highlightedPlanCode

          return (
            <article
              key={plan.code}
              className={`plan-card ${popular ? 'is-popular' : ''} ${highlighted ? 'is-highlighted' : ''}`}
            >
              {popular ? (
                <span className="plan-card-ribbon">
                  <Sparkles size={12} />
                  {t('account.membership.startupRibbon')}
                </span>
              ) : null}
              <div className="plan-card-head">
                <h2>{plan.name}</h2>
                {active ? <Badge variant="outline" className="rounded-full text-green-600 border-green-200">{t('account.common.current')}</Badge> : null}
              </div>
              <p>{plan.description || t('account.billing.standardPlan')}</p>

              <div className="plan-card-price">
                <span className="plan-card-list-price">{formatPlanPrice(listPrice, billingCurrency)}{t('account.plan.perMonth')}</span>
                <div>
                  <strong>{formatPlanPrice(monthlyEquivalent, billingCurrency)}</strong>
                  <span>{t('account.plan.perMonth')}</span>
                </div>
                <em>{tpl('account.plan.termPayable', String(term), formatPlanPrice(finalPrice, billingCurrency), formatPlanPrice(monthlyEquivalent, billingCurrency))}</em>
              </div>

              <PlanFeatureList plan={plan} region={region} />

              {(() => {
                const decision = evaluatePlanPurchase(auth.subscriptionPlanCode, plan.code, auth.subscriptionPeriodEnd)
                const ctaLabel = !decision.allowed
                  ? t('account.membership.downgradeBlocked')
                  : decision.allowed && decision.action === 'renew'
                    ? t('account.billing.renewMembership')
                    : decision.allowed && decision.action === 'upgrade'
                      ? t('account.membership.upgradeAndPay')
                      : t('account.billing.activateNow')
                return (
              <Button
                className="plan-card-cta"
                variant={popular || highlighted ? 'default' : 'secondary'}
                disabled={!decision.allowed}
                onClick={() => openPurchase(plan, term)}
              >
                {ctaLabel}
                <ArrowRight size={15} />
              </Button>
                )
              })()}
            </article>
          )
        })}
      </div>

      <section className="plan-faq">
        <h2><HelpCircle size={18} /> {t('account.plan.faqTitle')}</h2>
        <div>
          <article>
            <h3>{t('account.plan.faq1Title')}</h3>
            <p>{t('account.plan.faq1Desc')}</p>
          </article>
          <article>
            <h3>{t('account.plan.faq2Title')}</h3>
            <p>{t('account.plan.faq2Desc')}</p>
          </article>
          <article>
            <h3>{t('account.plan.faq3Title')}</h3>
            <p>{t('account.plan.faq3Desc')}</p>
          </article>
          <article>
            <h3>{t('account.plan.faq4Title')}</h3>
            <p>{t('account.plan.faq4Desc')}</p>
          </article>
        </div>
      </section>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="billing-dialog billing-dialog--purchase max-w-[min(940px,94vw)]">
          <DialogHeader>
            <DialogTitle>{t('account.billing.purchaseTitle')}</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="billing-dialog-body billing-dialog-body--purchase">
              <div className="purchase-summary">
                <strong>{selectedPlan.name}</strong>
                <span>¥{purchasePayableAmount.toFixed(2)}</span>
                <p>{selectedPlan.description || t('account.billing.standardPlan')}</p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('account.billing.purchaseTerm')}</label>
                <Select value={String(purchaseTermMonths)} onValueChange={val => setPurchaseTermMonths((Number(val) || 1) as TermMonths)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t('account.billing.selectTerm')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TERM_OPTIONS.map(item => (
                      <SelectItem key={item.months} value={String(item.months)}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {purchaseQuote ? (
                  <small className="text-[var(--xiaoone-fg-mute)]">
                    {tpl(
                      'account.billing.quoteLine',
                      formatPlanPrice(planListPrice(selectedPlan, billingCurrency), billingCurrency),
                      formatPlanPrice(planDisplayPrice(selectedPlan, billingCurrency), billingCurrency),
                      formatPlanPrice(purchaseBaseAmount, billingCurrency),
                    )}
                    {purchasePayableAmount < purchaseBaseAmount ? tpl('account.billing.quoteAfterCoupon', formatPlanPrice(purchasePayableAmount, billingCurrency)) : ''}
                  </small>
                ) : null}
              </div>
              {planDisplayPrice(selectedPlan, billingCurrency) > 0 && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('account.billing.paymentChannels')}</label>
                  <div className="pay-choice-grid">
                    {payableChannelOptions.map(ch => {
                      const available = Boolean(capabilities[ch.code]?.enabled)
                      const isSelected = purchaseChannel === ch.code
                      const label = paymentChannelDisplayLabel(ch.code, ch.label)
                      return (
                        <button
                          key={ch.code}
                          type="button"
                          className={`pay-choice ${available ? (isSelected ? 'is-active' : '') : 'is-disabled'}`}
                          style={partnerBrandCssVars(ch.code)}
                          disabled={!available}
                          title={available ? tpl('account.common.channelAvailable', label) : tpl('account.common.channelNotConfigured', label)}
                          onClick={() => {
                            setWechatPayIntent(null)
                            if (available) {
                              setPurchaseChannel(ch.code)
                            }
                          }}
                        >
                          <span className="pay-choice__brand">
                            <PartnerBrandMark brand={ch.code} size={18} />
                            <strong>{label}</strong>
                          </span>
                          <span>{available ? (isSelected ? t('account.common.selected') : t('account.common.available')) : t('account.common.notConfigured')}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {purchaseChannel === 'wechat_pay' && wechatPayIntent && (
                <div className="billing-wechat-pay-box">
                  <strong><PartnerBrandMark brand="wechat_pay" size={16} className="partner-brand-mark--sm" /> {t('account.billing.wechatScanPay')}</strong>
                  {wechatPayIntent.qr_svg ? (
                    <img src={wechatPayIntent.qr_svg} alt={t('account.billing.wechatQrAlt')} />
                  ) : (
                    <code>{wechatPayIntent.code_url}</code>
                  )}
                  <span>{tpl('account.common.orderId', wechatPayIntent.checkout_id)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/billing/success?order_id=${encodeURIComponent(wechatPayIntent.checkout_id)}`)}
                  >
                    {t('account.billing.viewPaymentStatus')}
                  </Button>
                </div>
              )}

              {purchaseChannel === 'cardixon' && planDisplayPrice(selectedPlan, billingCurrency) > 0 && (
                <div className="grid gap-2 rounded-md border border-[var(--xiaoone-border)] bg-[var(--xiaoone-bg-soft)] p-3">
                  <label className="text-sm font-medium">{t('account.billing.cryptoParams')}</label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-1">
                      <span className="text-xs text-[var(--xiaoone-fg-mute)]">{t('account.billing.cryptoToken')}</span>
                      <Select value={String(cardixonToken)} onValueChange={val => setCardixonToken(val === '2' ? 2 : 1)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={t('account.billing.selectToken')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">USDT</SelectItem>
                          <SelectItem value="2">USDC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs text-[var(--xiaoone-fg-mute)]">{t('account.billing.cryptoChain')}</span>
                      <Select value={String(cardixonChain)} onValueChange={(val) => {
                        if (val === '1') setCardixonChain(1)
                        else if (val === '56') setCardixonChain(56)
                        else setCardixonChain(195)
                      }}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={t('account.billing.selectChain')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="195">TRON</SelectItem>
                          <SelectItem value="56">BSC</SelectItem>
                          <SelectItem value="1">ETH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <DiscountCodePicker
                codes={myDiscountCodes}
                value={purchaseCouponCode}
                onChange={setPurchaseCouponCode}
                business="membership"
                planCode={selectedPlanCode}
                baseAmountCny={purchaseBaseAmount}
                currency={billingCurrency}
                className="billing-dialog-discount"
                gridClassName="service-grid service-grid--discount-codes billing-dialog-discount-grid"
              />
            </div>
          )}
          <DialogFooter className="billing-dialog-footer">
            <Button variant="outline" onClick={() => setPurchaseOpen(false)}>{t('account.common.cancel')}</Button>
            <Button
              onClick={submitPurchase}
              disabled={purchaseSubmitting || !selectedPlan}
            >
              {Number(selectedPlan?.price_cny || 0) <= 0
                ? t('account.billing.activateNow')
                : purchaseChannel === 'wechat_pay'
                  ? wechatPayIntent ? t('account.billing.regenWechatQr') : t('account.billing.genWechatQr')
                  : purchaseChannel === 'alipay'
                    ? t('account.billing.goAlipay')
                    : t('account.billing.goCardixon')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
