import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, LogOut, RefreshCw, Sparkles } from 'lucide-react'
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
  type PaymentCapability,
  type WechatPayIntentResult,
} from '../lib/billingApi'
import { describeAxiosError } from '../lib/apiErrors'
import { DiscountCodePicker } from './DiscountCodePicker'
import { PartnerBrandMark } from './PartnerBrandMark'
import { computePayable, resolveSelectedDiscountCode } from '../lib/discountCodeUtils'
import { closePaymentWindow, isCheckoutPaid, openPaymentWindow, payableChannelsFromCapabilities, preferredPayableChannel, rememberPendingCheckout, redirectPaymentWindow, type PayableChannel } from '../lib/paymentWindow'
import { useAuthStore } from '../store/auth'
import { evaluatePlanPurchase } from '../lib/planTier'
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
} from '../lib/planPricing'
import { usePreferences } from '../app/preferences'
import './MembershipPurchaseSurface.css'

type TermMonths = 1 | 3 | 6 | 12

interface MembershipPurchaseSurfaceProps {
  className?: string
  title?: string
  description?: string
  initialPlanCode?: string
  initialTermMonths?: string | number
  requiredNote?: string
  allowSkip?: boolean
  skipLabel?: string
  compact?: boolean
  introOnly?: boolean
  onSkip?: () => void
  onActivated?: () => void
}

interface MembershipBlockingDialogProps {
  open: boolean
}

function normalizeTerm(value: string | number | undefined): TermMonths {
  const raw = String(value || '1')
  if (raw === '3') return 3
  if (raw === '6') return 6
  if (raw === '12') return 12
  return 1
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
): PayableChannel {
  const paidPlan = Number(plan.price_cny || 0) > 0 || Number(plan.price_usd || 0) > 0
  if (!paidPlan)
    return preferredPayableChannel(channels)
  return preferredPayableChannel(channels)
}

export function MembershipPurchaseSurface({
  className = '',
  title,
  description,
  initialPlanCode = '',
  initialTermMonths,
  requiredNote,
  allowSkip = false,
  skipLabel,
  compact = false,
  introOnly = false,
  onSkip,
  onActivated,
}: MembershipPurchaseSurfaceProps) {
  const { t, tpl, locale } = usePreferences()
  const auth = useAuthStore()
  const navigate = useNavigate()
  const { region } = useRegion()
  const billingRegion = normalizeUserRegion(auth.user?.region, region)
  const billingCurrency = billingCurrencyForRegion(billingRegion)
  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US'
  const resolvedTitle = title ?? t('account.membership.defaultTitle')
  const resolvedDescription = description ?? t('account.membership.defaultDesc')
  const resolvedSkipLabel = skipLabel ?? t('account.membership.skipLabel')

  const TERM_OPTIONS = useMemo<Array<{ months: TermMonths; label: string }>>(() => [
    { months: 1, label: t('account.membership.term1') },
    { months: 3, label: t('account.membership.term3') },
    { months: 6, label: t('account.membership.term6') },
    { months: 12, label: t('account.membership.term12') },
  ], [t])

  const PLAN_NAME_BY_CODE = useMemo<Record<string, string>>(() => ({
    personal: t('account.billing.planPersonal'),
    startup: t('account.billing.planStartup'),
    business: t('account.billing.planBusiness'),
  }), [t])

  const [plans, setPlans] = useState<MerchantPlan[]>([])
  const [capabilities, setCapabilities] = useState<Record<string, PaymentCapability>>({})
  const payableChannelOptions = useMemo(() => payableChannelsFromCapabilities(capabilities), [capabilities])
  const [myDiscountCodes, setMyDiscountCodes] = useState<DiscountCodeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlanCode, setSelectedPlanCode] = useState('')
  const [purchaseTermMonths, setPurchaseTermMonths] = useState<TermMonths>(normalizeTerm(initialTermMonths))
  const [purchaseQuote, setPurchaseQuote] = useState<{
    plan_code: string
    list_price_cny: string
    display_price_cny: string
    term_months: number
    discount_percent: string
    final_price_cny: string
  } | null>(null)
  const [purchaseChannel, setPurchaseChannel] = useState<PayableChannel>('wechat_pay')
  const [purchaseCouponCode, setPurchaseCouponCode] = useState('')
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false)
  const [wechatPayIntent, setWechatPayIntent] = useState<WechatPayIntentResult | null>(null)
  const [cardixonToken, setCardixonToken] = useState<1 | 2>(1)
  const [cardixonChain, setCardixonChain] = useState<1 | 56 | 195>(195)
  const [autoOpened, setAutoOpened] = useState(false)

  const selectedPlan = useMemo(
    () => plans.find(plan => plan.code === selectedPlanCode) || null,
    [plans, selectedPlanCode],
  )
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

  const loadCapabilities = async (): Promise<Record<string, PaymentCapability>> => {
    try {
      const payload = await BillingAPI.paymentCapabilities()
      const channels = payload.channels || {}
      setCapabilities(channels)
      return channels
    } catch {
      setCapabilities({})
      return {}
    }
  }

  const loadDiscountCodes = async () => {
    try {
      const payload = await BillingAPI.discountCodesMine()
      setMyDiscountCodes(payload.items || [])
    } catch {
      setMyDiscountCodes([])
    }
  }

  const loadPlans = async () => {
    setLoading(true)
    try {
      const [planResp] = await Promise.all([
        BillingAPI.publicPlans(),
        loadCapabilities(),
        loadDiscountCodes(),
      ])
      setPlans(planResp.items || [])
    } catch (error) {
      toast({
        title: t('account.membership.toastPlansFailed'),
        description: describeAxiosError(error, t('account.membership.toastRetryLater')),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPlans()
  }, [])

  const openPurchase = (plan: MerchantPlan, termMonths: TermMonths = 1) => {
    const decision = evaluatePlanPurchase(
      auth.subscriptionPlanCode,
      plan.code,
      auth.subscriptionPeriodEnd,
    )
    if (!decision.allowed) {
      toast.error(t('account.membership.downgradeBlocked'))
      return
    }
    setSelectedPlanCode(plan.code)
    setPurchaseTermMonths(termMonths)
    setPurchaseQuote(null)
    setWechatPayIntent(null)
    setPurchaseChannel(preferredPurchaseChannel(plan, capabilities))
    void loadCapabilities().then(channels => {
      setPurchaseChannel(preferredPurchaseChannel(plan, channels))
    })
    setCardixonToken(1)
    setCardixonChain(195)
    setPurchaseCouponCode('')
    setPurchaseOpen(true)
  }

  useEffect(() => {
    if (autoOpened || !initialPlanCode || !plans.length) return
    const matched = plans.find(plan => plan.code === initialPlanCode)
    if (!matched) return
    setAutoOpened(true)
    openPurchase(matched, normalizeTerm(initialTermMonths))
  }, [autoOpened, initialPlanCode, initialTermMonths, plans])

  useEffect(() => {
    if (!purchaseOpen || !selectedPlanCode) return
    BillingAPI.quotePlan(selectedPlanCode, purchaseTermMonths, billingCurrency)
      .then(setPurchaseQuote)
      .catch(() => setPurchaseQuote(null))
  }, [purchaseOpen, selectedPlanCode, purchaseTermMonths, billingCurrency])

  const finishMembershipPurchase = async (descriptionText: string) => {
    toast({ title: t('account.billing.toastMembershipSuccess'), description: descriptionText })
    setPurchaseOpen(false)
    await Promise.allSettled([
      auth.fetchMe(),
      loadDiscountCodes(),
    ])
    onActivated?.()
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
        await finishMembershipPurchase(tpl('account.billing.toastActivated', (res as { plan_code?: string })?.plan_code || selectedPlan.name))
        return
      }

      if (purchaseChannel === 'wechat_pay' || purchaseChannel === 'alipay') {
        if (billingCurrency === 'USD') {
          toast({
            title: t('account.billing.toastUseCardixon'),
            description: t('account.billing.toastOverseasNoWechatAlipay'),
          })
          return
        }
      }

      if (purchaseChannel === 'alipay') {
        if (!capabilities.alipay?.enabled) {
          toast({
            title: t('account.billing.toastAlipayNotConfigured'),
            description: t('account.billing.toastAlipayConfigHint'),
          })
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
            toast({
              title: t('account.billing.toastAlipayOpened'),
              description: t('account.billing.toastAlipayCompleteHint'),
            })
          } else {
            toast({
              title: t('account.billing.toastPopupBlocked'),
              description: t('account.billing.toastAllowPopup'),
            })
          }
          return
        }
        closePaymentWindow(paymentWindow)
        navigate(`/billing/success?order_id=${encodeURIComponent(intent.checkout_id)}`)
        return
      }

      if (purchaseChannel === 'wechat_pay') {
        if (!capabilities.wechat_pay?.enabled) {
          toast({
            title: t('account.billing.toastWechatNotConfigured'),
            description: t('account.billing.toastWechatConfigHint'),
          })
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
          toast({
            title: t('account.billing.toastWechatQrGenerated'),
            description: t('account.billing.toastWechatScanHint'),
          })
          return
        }
        toast({
          title: t('account.billing.toastPurchaseFailed'),
          description: t('account.membership.toastRetryLater'),
        })
        return
      }

      if (purchaseChannel === 'cardixon') {
        if (!capabilities.cardixon?.enabled) {
          toast({
            title: t('account.billing.toastCardixonNotConfigured'),
            description: t('account.billing.toastCardixonConfigHint'),
          })
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
    } catch (error) {
      toast({
        title: t('account.billing.toastPurchaseFailed'),
        description: describeAxiosError(error, t('account.common.unknownError')),
      })
    } finally {
      setPurchaseSubmitting(false)
    }
  }

  return (
    <section className={`x1-membership-surface ${compact ? 'x1-membership-surface--compact' : ''} ${introOnly ? 'x1-membership-surface--intro-only' : ''} ${className}`}>
      {!introOnly ? <header className="x1-membership-surface__head">
        <div>
          <span className="x1-membership-surface__kicker">{t('account.membership.kicker')}</span>
          <h2>{resolvedTitle}</h2>
          <p>{resolvedDescription}</p>
        </div>
        <div className="x1-membership-surface__actions">
          {allowSkip && onSkip ? (
            <Button variant="outline" size="sm" onClick={onSkip}>
              {resolvedSkipLabel}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={loadPlans} disabled={loading}>
            <RefreshCw size={14} />
            {t('account.membership.refreshPlans')}
          </Button>
        </div>
      </header> : null}

      {!introOnly && requiredNote ? <p className="x1-membership-required-note">{requiredNote}</p> : null}

      <nav className="x1-membership-term-switch" aria-label={t('account.membership.termAria')}>
        {TERM_OPTIONS.map(item => (
          <button
            key={item.months}
            type="button"
            className={purchaseTermMonths === item.months ? 'is-active' : ''}
            onClick={() => setPurchaseTermMonths(item.months)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="x1-membership-plans" aria-busy={loading}>
        {plans.map(plan => {
          const active = auth.subscriptionPlanCode === plan.code
          const popular = plan.code === 'startup'
          const listPrice = planListPrice(plan, billingCurrency)
          const displayPrice = planDisplayPrice(plan, billingCurrency)
          const finalPrice = Math.ceil(displayPrice * discountFor(plan, purchaseTermMonths) * purchaseTermMonths * 100) / 100
          const monthlyEquivalent = finalPrice / purchaseTermMonths
          const periodLabel = plan.billing_period === 'annual'
            ? t('account.billing.periodYear')
            : plan.billing_period === 'quarterly'
              ? t('account.billing.periodQuarter')
              : plan.billing_period === 'perpetual'
                ? t('account.billing.periodPerpetual')
                : t('account.billing.periodMonth')
          return (
            <article key={plan.code} className={`x1-membership-plan ${popular ? 'is-popular' : ''} ${active ? 'is-current' : ''}`}>
              {popular ? (
                <span className="x1-membership-plan__ribbon">
                  <Sparkles size={12} />
                  {t('account.membership.startupRibbon')}
                </span>
              ) : null}
              <div className="x1-membership-plan__top">
                <div>
                  <strong>{PLAN_NAME_BY_CODE[plan.code] || plan.name}</strong>
                  <span>{plan.description || t('account.billing.standardPlan')}</span>
                </div>
                {active ? <Badge variant="outline" className="x1-membership-plan__badge">{t('account.common.current')}</Badge> : null}
              </div>
              <div className="x1-membership-plan__price">
                {listPrice > displayPrice ? (
                  <span>{formatPlanPrice(listPrice, billingCurrency)}{t('account.plan.perMonth')}</span>
                ) : null}
                <div>
                  <strong>{formatPlanPrice(monthlyEquivalent, billingCurrency)}</strong>
                  <small>/{periodLabel}</small>
                  <em>{t('account.membership.specialOffer')}</em>
                </div>
                <p>
                  {tpl(
                    'account.membership.termPayable',
                    String(purchaseTermMonths),
                    formatPlanPrice(finalPrice, billingCurrency),
                    formatPlanPrice(monthlyEquivalent, billingCurrency),
                  )}
                </p>
              </div>
              {!introOnly ? (
                <div className="x1-membership-plan__meta">
                  <span>{tpl('account.billing.grantPoints', Number(plan.included_points || 0).toLocaleString(localeTag))}</span>
                  <span>{t('account.billing.discountAvailable')}</span>
                  <span>{t('account.membership.payByConfig')}</span>
                </div>
              ) : null}
              {!introOnly ? (
                <PlanFeatureList
                  plan={plan}
                  region={region}
                  className="x1-membership-plan__features plan-feature-list"
                  lockedClassName="plan-feature--locked"
                />
              ) : null}
              {(() => {
                const decision = evaluatePlanPurchase(
                  auth.subscriptionPlanCode,
                  plan.code,
                  auth.subscriptionPeriodEnd,
                )
                const ctaLabel = !decision.allowed
                  ? t('account.membership.downgradeBlocked')
                  : decision.allowed && decision.action === 'renew'
                    ? t('account.billing.renewMembership')
                    : decision.allowed && decision.action === 'upgrade'
                      ? t('account.membership.upgradeAndPay')
                      : t('account.membership.selectAndPay')
                return (
              <Button
                className="x1-membership-plan__cta"
                variant={popular ? 'default' : 'secondary'}
                disabled={!decision.allowed}
                onClick={() => openPurchase(plan, purchaseTermMonths)}
              >
                {ctaLabel}
                <ArrowRight size={14} />
              </Button>
                )
              })()}
            </article>
          )
        })}
        {!plans.length && !loading ? (
          <div className="x1-membership-empty">{t('account.membership.emptyPlans')}</div>
        ) : null}
      </div>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="x1-membership-dialog max-w-[min(940px,94vw)]">
          <DialogHeader>
            <DialogTitle>{t('account.billing.purchaseTitle')}</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="x1-membership-dialog-body">
              {requiredNote ? <p className="x1-membership-required-note">{requiredNote}</p> : null}
              <div className="x1-purchase-summary">
                <strong>{PLAN_NAME_BY_CODE[selectedPlan.code] || selectedPlan.name}</strong>
                <span>{formatPlanPrice(purchasePayableAmount, billingCurrency)}</span>
                <p>{selectedPlan.description || t('account.billing.standardPlan')}</p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('account.billing.purchaseTerm')}</label>
                <Select value={String(purchaseTermMonths)} onValueChange={val => setPurchaseTermMonths(normalizeTerm(val))}>
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
                    {purchasePayableAmount < purchaseBaseAmount
                      ? tpl('account.billing.quoteAfterCoupon', formatPlanPrice(purchasePayableAmount, billingCurrency))
                      : ''}
                  </small>
                ) : null}
              </div>
              {planDisplayPrice(selectedPlan, billingCurrency) > 0 && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t('account.billing.paymentChannels')}</label>
                  <div className="x1-pay-choice-grid">
                    {payableChannelOptions.map(ch => {
                      const available = Boolean(capabilities[ch.code]?.enabled)
                      const isSelected = purchaseChannel === ch.code
                      const label = paymentChannelDisplayLabel(ch.code, ch.label)
                      return (
                        <button
                          key={ch.code}
                          type="button"
                          className={`x1-pay-choice ${available ? (isSelected ? 'is-active' : '') : 'is-disabled'}`}
                          style={partnerBrandCssVars(ch.code)}
                          disabled={!available}
                          title={available
                            ? tpl('account.common.channelAvailable', label)
                            : tpl('account.common.channelNotConfigured', label)}
                          onClick={() => {
                            setWechatPayIntent(null)
                            if (available) {
                              setPurchaseChannel(ch.code)
                            }
                          }}
                        >
                          <span className="x1-pay-choice__brand">
                            <PartnerBrandMark brand={ch.code} size={18} />
                            <strong>{label}</strong>
                          </span>
                          <span>
                            {available
                              ? (isSelected ? t('account.common.selected') : t('account.common.available'))
                              : t('account.common.notConfigured')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {purchaseChannel === 'wechat_pay' && wechatPayIntent && (
                <div className="x1-wechat-pay-box">
                  <strong>
                    <PartnerBrandMark brand="wechat_pay" size={16} className="partner-brand-mark--sm" />
                    {' '}
                    {t('account.billing.wechatScanPay')}
                  </strong>
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
                pickableClassName="x1-discount-code-card"
                className="x1-membership-dialog-discount"
                gridClassName="x1-discount-code-grid"
              />
            </div>
          )}
          <DialogFooter className="x1-membership-dialog-footer">
            <Button variant="outline" onClick={() => setPurchaseOpen(false)}>{t('account.common.cancel')}</Button>
            <Button
              onClick={submitPurchase}
              disabled={purchaseSubmitting || !selectedPlan}
            >
              {Number(selectedPlan?.price_cny || 0) <= 0
                ? t('account.billing.activateNow')
                : purchaseChannel === 'alipay'
                  ? t('account.billing.goAlipay')
                  : purchaseChannel === 'wechat_pay'
                    ? wechatPayIntent ? t('account.billing.regenWechatQr') : t('account.billing.genWechatQr')
                    : t('account.billing.goCardixon')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

interface RegisterPlanDialogProps {
  open: boolean
  notice?: string
  initialPlanCode?: string
  initialTermMonths?: string | number
  onActivated?: () => void
}

export function RegisterPlanDialog({
  open,
  notice,
  initialPlanCode,
  initialTermMonths,
  onActivated,
}: RegisterPlanDialogProps) {
  if (!open) return null

  return (
    <div
      className="x1-membership-blocker x1-register-plan-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="选择套餐并付款"
    >
      <div className="x1-membership-blocker__panel x1-register-plan-dialog__panel">
        <header className="x1-membership-blocker__bar">
          <div>
            <span>会员开通</span>
            <strong>选择套餐并付款</strong>
          </div>
        </header>
        {notice ? (
          <div className="x1-portal__alert x1-portal__alert--info x1-register-plan-dialog__notice" role="status">
            {notice}
          </div>
        ) : null}
        <MembershipPurchaseSurface
          compact
          introOnly
          initialPlanCode={initialPlanCode}
          initialTermMonths={initialTermMonths}
          onActivated={onActivated}
        />
      </div>
    </div>
  )
}

export function MembershipBlockingDialog({ open }: MembershipBlockingDialogProps) {
  const { t } = usePreferences()
  const auth = useAuthStore()
  const navigate = useNavigate()

  if (!open) return null

  const logout = () => {
    auth.logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="x1-membership-blocker" role="dialog" aria-modal="true" aria-label={t('account.membership.blockerAria')}>
      <div className="x1-membership-blocker__panel">
        <header className="x1-membership-blocker__bar">
          <div>
            <span>{t('account.membership.workstationCreated')}</span>
            <strong>{t('account.membership.unlockAfterPay')}</strong>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut size={14} />
            {t('sidebar.logout', '退出登录')}
          </Button>
        </header>
        <MembershipPurchaseSurface
          compact
          title={t('account.membership.blockerTitle')}
          description={t('account.membership.blockerDesc')}
          requiredNote={t('account.membership.blockerNote')}
          onActivated={() => navigate('/workbench', { replace: true })}
        />
      </div>
    </div>
  )
}
