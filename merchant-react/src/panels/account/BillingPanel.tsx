import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, CheckCircle2, CreditCard, RefreshCw, Sparkles, TicketPercent, Wallet } from 'lucide-react'
import {
  Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, Input, RadioGroup, RadioGroupItem, Select,
  SelectTrigger, SelectValue, SelectContent, SelectItem, toast,
  DataTable, Pagination, Empty
} from '@xiaoone/react-ui'
import { APageHeader } from './APageHeader'
import {
  BillingAPI,
  type AlipayIntentResult,
  type DiscountCodeItem,
  type MerchantPlan,
  type MerchantSubscription,
  type PaymentCapability,
  type PointLedger,
  type WechatPayIntentResult,
  type WalletSummary,
} from '../../lib/billingApi'
import { useRegion } from '@xiaoone/region'
import { evaluatePlanPurchase } from '../../lib/planTier'
import { useAuthStore as useAuth } from '../../store/auth'
import { TeamAPI } from '../../lib/teamApi'
import { getChatKit } from '@xiaoone/chat-kit'
import { describeAxiosError } from '../../lib/apiErrors'
import { DiscountCodeCard, DiscountCodePicker } from '../../components/DiscountCodePicker'
import { PartnerBrandMark } from '../../components/PartnerBrandMark'
import { computePayable, resolveSelectedDiscountCode } from '../../lib/discountCodeUtils'
import { closePaymentWindow, isCheckoutPaid, openPaymentWindow, payableChannelsFromCapabilities, preferredPayableChannel, rememberPendingCheckout, redirectPaymentWindow, type PayableChannel } from '../../lib/paymentWindow'
import { PlanFeatureList } from '../../lib/planFeatures'
import { useCheckoutPolling } from '../../hooks/useCheckoutPolling'
import {
  billingCurrencyForRegion,
  checkoutAmountPayload,
  formatPlanPrice,
  normalizeUserRegion,
  planDisplayPrice,
  planListPrice,
  quoteFinalPrice,
} from '../../lib/planPricing'
import { partnerBrandCssVars, paymentChannelDisplayLabel } from '../../lib/partnerBrands'
import { displayPlanName } from '../../lib/planLabels'
import { usePreferences } from '../../app/preferences'
import './billing-panel.css'

const QUICK_AMOUNTS = ['50', '100', '500', '1000']

interface BillingPanelProps {
  forceMembership?: boolean
  onMembershipActivated?: () => void
}

function fmtGbFromBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 GB'
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`
}

function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function storageNotReportedLabel(t: (key: string, fallback?: string) => string): string {
  return t('account.billing.storageNotReported', '未上报')
}

function storageNotActivatedLabel(t: (key: string, fallback?: string) => string): string {
  return t('account.billing.notActivated', '未开通')
}

function storageValueLabel(bytes: number | null, totalGb: number | null, t: (key: string, fallback?: string) => string): string {
  if (totalGb === null) return storageNotReportedLabel(t)
  if (totalGb <= 0) return storageNotActivatedLabel(t)
  if (bytes === null) return storageNotReportedLabel(t)
  return fmtGbFromBytes(bytes)
}

function storageCapacityLabel(totalGb: number | null, t: (key: string, fallback?: string) => string): string {
  if (totalGb === null) return storageNotReportedLabel(t)
  if (totalGb <= 0) return storageNotActivatedLabel(t)
  return `${totalGb} GB`
}

function fmtTokens(value?: string | number | null): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n <= 0)
    return '—'
  return n >= 1000 ? Math.round(n).toLocaleString('zh-CN') : n.toFixed(2)
}

export function BillingPanel({ forceMembership = false, onMembershipActivated }: BillingPanelProps = {}) {
  const { t, tpl, locale } = usePreferences()
  const auth = useAuth()
  const navigate = useNavigate()
  const { region } = useRegion()
  const billingRegion = normalizeUserRegion(auth.user?.region, region)
  const billingCurrency = billingCurrencyForRegion(billingRegion)
  const [searchParams, setSearchParams] = useSearchParams()
  const [capabilities, setCapabilities] = useState<Record<string, PaymentCapability>>({})
  const payableChannelOptions = useMemo(() => payableChannelsFromCapabilities(capabilities), [capabilities])
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [records, setRecords] = useState<PointLedger[]>([])
  const [plans, setPlans] = useState<MerchantPlan[]>([])
  const [subscription, setSubscription] = useState<MerchantSubscription | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterKind, setFilterKind] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [topupOpen, setTopupOpen] = useState(false)
  const [topupAmount, setTopupAmount] = useState('100')
  const [topupSubmitting, setTopupSubmitting] = useState(false)
  const [topupCouponCode, setTopupCouponCode] = useState('')
  const [topupChannel, setTopupChannel] = useState<PayableChannel>('wechat_pay')
  const [topupWechatIntent, setTopupWechatIntent] = useState<WechatPayIntentResult | null>(null)
  const topupWechatBoxRef = useRef<HTMLDivElement | null>(null)
  const topupDialogBodyRef = useRef<HTMLDivElement | null>(null)
  const [topupCardixonToken, setTopupCardixonToken] = useState<1 | 2>(1)
  const [topupCardixonChain, setTopupCardixonChain] = useState<1 | 56 | 195>(195)

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlanCode, setSelectedPlanCode] = useState('')
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false)
  const [purchaseCouponCode, setPurchaseCouponCode] = useState('')
  const [purchaseChannel, setPurchaseChannel] = useState<PayableChannel>('wechat_pay')
  const [wechatPayIntent, setWechatPayIntent] = useState<WechatPayIntentResult | null>(null)
  const [cardixonToken, setCardixonToken] = useState<1 | 2>(1)
  const [cardixonChain, setCardixonChain] = useState<1 | 56 | 195>(195)
  const [purchaseTermMonths, setPurchaseTermMonths] = useState<1 | 3 | 6 | 12>(1)
  const [purchaseQuote, setPurchaseQuote] = useState<{
    plan_code: string
    list_price_cny: string
    display_price_cny: string
    term_months: number
    discount_percent: string
    final_price_cny: string
  } | null>(null)
  const [myDiscountCodes, setMyDiscountCodes] = useState<DiscountCodeItem[]>([])
  const [usageOverview, setUsageOverview] = useState({
    storesUsed: 0,
    teamSeatsUsed: 0,
    usPhoneUsed: 0,
    paymentCardsUsed: 0,
    pendingUsServers: 0,
  })

  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US'

  const TERM_OPTIONS = useMemo<Array<{ months: 1 | 3 | 6 | 12; label: string }>>(() => [
    { months: 1, label: t('account.billing.term1') },
    { months: 3, label: t('account.billing.term3') },
    { months: 6, label: t('account.billing.term6') },
    { months: 12, label: t('account.billing.term12') },
  ], [t])

  const SUBSCRIPTION_STATUS_LABEL = useMemo<Record<MerchantSubscription['status'], string>>(() => ({
    active: '',
    trialing: t('account.billing.membershipStatusTrialing'),
    canceled: t('account.billing.membershipStatusCanceled'),
    expired: t('account.billing.membershipStatusExpired'),
  }), [t])

  const KIND_META = useMemo<Record<string, { label: string; type: string; textColor: string }>>(() => ({
    recharge: { label: t('account.billing.kindRecharge'), type: 'outline', textColor: 'text-green-500 border-green-200' },
    membership_grant: { label: t('account.billing.kindMembershipGrant'), type: 'outline', textColor: 'text-blue-500 border-blue-200' },
    ai_charge: { label: t('account.billing.kindAiCharge'), type: 'outline', textColor: 'text-red-500 border-red-200' },
    service_purchase: { label: t('account.billing.kindServicePurchase'), type: 'outline', textColor: 'text-indigo-500 border-indigo-200' },
    dcpay_card_topup: { label: t('account.billing.kindDcpayTopup'), type: 'outline', textColor: 'text-amber-500 border-amber-200' },
    dcpay_card_open: { label: t('account.billing.kindDcpayOpen'), type: 'outline', textColor: 'text-amber-500 border-amber-200' },
    dcpay_card_recharge: { label: t('account.billing.kindDcpayRecharge'), type: 'outline', textColor: 'text-amber-500 border-amber-200' },
    refund: { label: t('account.billing.kindRefund'), type: 'outline', textColor: 'text-orange-500 border-orange-200' },
    adjust: { label: t('account.billing.kindAdjust'), type: 'outline', textColor: 'text-gray-500 border-gray-200' },
    admin_reset: { label: t('account.billing.kindAdminReset'), type: 'outline', textColor: 'text-gray-500 border-gray-200' },
  }), [t])

  const loadAll = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const mid = auth.me?.current_merchant_id || auth.me?.merchants?.[0]?.id
      const [w, list, planResp, subResp] = await Promise.all([
        BillingAPI.wallet(),
        BillingAPI.transactions({
          kind: filterKind === 'all' ? undefined : filterKind,
          page,
          page_size: pageSize,
        }),
        BillingAPI.publicPlans(),
        mid ? BillingAPI.currentSubscription(mid) : Promise.resolve({ subscription: null }),
      ])
      setWallet(w)
      setRecords(list.items)
      setTotal(list.total)
      setPlans(planResp.items)
      setSubscription(subResp.subscription)
      const [storesRes, teamRes, numbersRes, serversRes] = await Promise.allSettled([
        getChatKit().StoreAPI.list(),
        TeamAPI.list(),
        BillingAPI.usPhoneNumbers(),
        BillingAPI.serverEntitlements({ status: 'invoiced', server_spec: 'us_native_4c4g' }),
      ])
      const storesUsed = storesRes.status === 'fulfilled' ? (storesRes.value.items || []).length : 0
      const teamSeatsUsed = teamRes.status === 'fulfilled' ? Number(teamRes.value.total || 0) : 0
      const usPhoneUsed = numbersRes.status === 'fulfilled' ? (numbersRes.value.items || []).filter(item => item.status !== 'canceled').length : 0
      const pendingUsServers = serversRes.status === 'fulfilled' ? (serversRes.value.items || []).length : 0
      const paymentCardsUsed = 0
      setUsageOverview({
        storesUsed,
        teamSeatsUsed,
        usPhoneUsed,
        paymentCardsUsed,
        pendingUsServers,
      })
    } catch (e: any) {
      const message = describeAxiosError(e, t('account.common.unknownError'))
      setLoadError(message)
      toast({ title: t('account.common.loadFailed'), description: message })
    } finally {
      setLoading(false)
    }
  }

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

  const preferredTopupChannel = (channels: Record<string, PaymentCapability>): PayableChannel =>
    preferredPayableChannel(channels)

  const preferredPurchaseChannel = (
    plan: MerchantPlan,
    channels: Record<string, PaymentCapability>,
  ): PayableChannel => {
    const paidPlan = planDisplayPrice(plan, billingCurrency) > 0
    if (!paidPlan)
      return preferredPayableChannel(channels)
    return preferredPayableChannel(channels)
  }

  const openTopup = () => {
    setTopupAmount('100')
    setTopupCouponCode('')
    setTopupWechatIntent(null)
    setTopupCardixonToken(1)
    setTopupCardixonChain(195)
    setTopupChannel(preferredTopupChannel(capabilities))
    setTopupOpen(true)
    void loadCapabilities().then(channels => {
      setTopupChannel(preferredTopupChannel(channels))
    })
  }

  const openMembershipPage = () => {
    navigate('/workbench/pricing')
  }

  useEffect(() => {
    loadAll()
  }, [filterKind, page, pageSize])

  useEffect(() => {
    loadCapabilities()
  }, [])

  useEffect(() => {
    loadDiscountCodes()
  }, [])

  // Auto-refresh when the page becomes visible again (user returns from payment tab/window)
  const loadAllRef = useRef(loadAll)
  loadAllRef.current = loadAll

  useEffect(() => {
    let lastVisible = Date.now()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastVisible > 5000) loadAllRef.current()
        lastVisible = Date.now()
      }
    }
    const onFocus = () => {
      if (Date.now() - lastVisible > 5000) {
        loadAllRef.current()
        lastVisible = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  useEffect(() => {
    if (!topupWechatIntent)
      return
    const target = topupWechatBoxRef.current
    if (!target)
      return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' })
    })
  }, [topupWechatIntent])

  const handleTopupCheckoutStatus = useCallback((status: { status: string; checkout_id?: string }) => {
    if (status.status !== 'paid')
      return
    sessionStorage.removeItem('pending_checkout_id')
    void loadAll()
    void auth.fetchMe().catch(() => {})
    setTopupOpen(false)
    setTopupWechatIntent(null)
    toast({ title: t('account.billing.toastRechargeSuccess'), description: t('account.billing.toastWechatCredited') })
  }, [auth, loadAll, t])

  useCheckoutPolling(
    topupOpen ? topupWechatIntent?.checkout_id : null,
    handleTopupCheckoutStatus,
    Boolean(topupOpen && topupWechatIntent?.checkout_id),
  )

  const submitTopup = async () => {
    const n = Number(topupAmount)
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: t('account.billing.toastInvalidAmount') })
      return
    }
    const selectedDiscountCode = topupCouponCode.trim()
    setTopupSubmitting(true)
    setTopupWechatIntent(null)
    try {
      if (topupRedeemOnly) {
        const ledger = await BillingAPI.topup(
          String(n),
          tpl('account.billing.noteRedeemRecharge', String(n)),
          undefined,
          selectedDiscountCode,
        )
        await loadAll()
        setTopupOpen(false)
        setTopupCouponCode('')
        toast({
          title: t('account.billing.toastRechargeSuccess'),
          description: tpl('account.billing.toastRedeemSuccess', Number(ledger.payment_amount || n).toFixed(2)),
        })
        return
      }
      if (topupChannel === 'wechat_pay') {
        if (!capabilities.wechat_pay?.enabled) {
          toast({ title: t('account.billing.toastWechatNotConfigured'), description: t('account.billing.toastWechatConfigHint') })
          return
        }
        const intent = await BillingAPI.createWechatPayIntent({
          purpose: 'point_recharge',
          amount_cny: n,
          discount_code: selectedDiscountCode || undefined,
          subject: t('account.billing.subjectRecharge'),
          metadata: {
            note: tpl('account.billing.noteWechatRecharge', String(n)),
          },
        })
        rememberPendingCheckout(intent.checkout_id)
        if (isCheckoutPaid(intent)) {
          navigate(`/billing/success?order_id=${encodeURIComponent(intent.checkout_id)}`)
          return
        }
        setTopupWechatIntent(intent)
        toast({ title: t('account.billing.toastWechatQrGenerated'), description: t('account.billing.toastWechatScanHint') })
        return
      }
      if (topupChannel === 'alipay') {
        if (!capabilities.alipay?.enabled) {
          toast({ title: t('account.billing.toastAlipayNotConfigured'), description: t('account.billing.toastAlipayConfigHint') })
          return
        }
        const paymentWindow = openPaymentWindow()
        const device: 'pc' | 'wap' = window.matchMedia('(max-width: 768px)').matches ? 'wap' : 'pc'
        let intent: AlipayIntentResult
        try {
          intent = await BillingAPI.createAlipayIntent({
            purpose: 'point_recharge',
            amount_cny: n,
            device_type: device,
            discount_code: selectedDiscountCode || undefined,
            subject: t('account.billing.subjectRecharge'),
            metadata: {
              note: tpl('account.billing.noteAlipayRecharge', String(n)),
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
        await loadAll()
        return
      }
      if (topupChannel === 'cardixon') {
        if (!capabilities.cardixon?.enabled) {
          toast({ title: t('account.billing.toastCardixonNotConfigured'), description: t('account.billing.toastCardixonConfigHint') })
          return
        }
        const intent = await BillingAPI.createCardixonIntent({
          purpose: 'point_recharge',
          amount_cny: n,
          discount_code: selectedDiscountCode || undefined,
          token: topupCardixonToken,
          chain_type: topupCardixonChain,
          language: 'en-US',
          subject: t('account.billing.subjectRecharge'),
          metadata: {
            note: tpl('account.billing.noteUsdtRecharge', String(n)),
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
        await loadAll()
        return
      }
    } catch (e: any) {
      toast({ title: t('account.billing.toastRechargeFailed'), description: describeAxiosError(e, t('account.common.unknownError')) })
    } finally {
      setTopupSubmitting(false)
    }
  }

  const selectedPlan = useMemo(() => plans.find(p => p.code === selectedPlanCode) || null, [plans, selectedPlanCode])
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
  const topupBaseCny = useMemo(() => Number(topupAmount || 0), [topupAmount])
  const selectedTopupDiscount = useMemo(
    () => resolveSelectedDiscountCode(myDiscountCodes, topupCouponCode),
    [myDiscountCodes, topupCouponCode],
  )
  const topupPayableCny = useMemo(
    () => computePayable(topupBaseCny, billingCurrency, selectedTopupDiscount),
    [topupBaseCny, billingCurrency, selectedTopupDiscount],
  )
  const topupAmountValid = Number.isFinite(topupBaseCny) && topupBaseCny > 0
  const topupDisplayAmount = topupAmountValid ? topupBaseCny : 0
  const topupDisplayPayable = topupAmountValid ? Math.max(0, topupPayableCny) : 0
  const topupDiscountAmount = topupAmountValid ? Math.max(0, topupBaseCny - topupDisplayPayable) : 0
  const activeTopupChannel = payableChannelOptions.find(ch => ch.code === topupChannel)
  const topupRedeemOnly = Boolean(topupCouponCode.trim()) && topupBaseCny > 0 && topupPayableCny <= 0
  const topupSubmitLabel = useMemo(() => topupRedeemOnly
    ? t('account.billing.confirmRedeem')
    : topupChannel === 'wechat_pay'
      ? topupWechatIntent ? t('account.billing.regenWechatQr') : t('account.billing.genWechatQr')
      : topupChannel === 'alipay'
        ? t('account.billing.goAlipay')
        : t('account.billing.goCardixon'), [topupRedeemOnly, topupChannel, topupWechatIntent, t])

  const openPurchase = (plan: MerchantPlan, termMonths: 1 | 3 | 6 | 12 = 1) => {
    const decision = evaluatePlanPurchase(auth.subscriptionPlanCode, plan.code, auth.subscriptionPeriodEnd)
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
    if (!plans.length) return
    const code = String(searchParams.get('plan_code') || '').trim().toLowerCase()
    if (!code) return
    const matched = plans.find(plan => plan.code === code)
    if (!matched) return
    const rawTerm = String(searchParams.get('term') || '1').trim()
    const term = rawTerm === '3' ? 3 : rawTerm === '6' ? 6 : rawTerm === '12' ? 12 : 1
    openPurchase(matched, term)
    const next = new URLSearchParams(searchParams)
    next.delete('plan_code')
    next.delete('term')
    setSearchParams(next, { replace: true })
  }, [plans, searchParams, setSearchParams])

  useEffect(() => {
    if (!purchaseOpen || !selectedPlanCode) {
      return
    }
    BillingAPI.quotePlan(selectedPlanCode, purchaseTermMonths, billingCurrency)
      .then(setPurchaseQuote)
      .catch(() => setPurchaseQuote(null))
  }, [purchaseOpen, selectedPlanCode, purchaseTermMonths, billingCurrency])

  const finishMembershipPurchase = async (description: string) => {
    toast({ title: t('account.billing.toastMembershipSuccess'), description })
    setPurchaseOpen(false)
    await Promise.allSettled([
      loadAll(),
      loadDiscountCodes(),
      auth.fetchMe(),
    ])
    onMembershipActivated?.()
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
            // mainland CNY only
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

  const balance = Number(wallet?.wallet.balance_points || 0)
  const lowBalance = balance < 10000
  const networkBytesUsed = Number(wallet?.network?.bytes_used || 0)
  const networkQuotaGb = Number(wallet?.network?.quota_gb || 0)
  const networkOveragePoints = Number(wallet?.network?.overage_points || 0)
  const networkOverageRate = Number(wallet?.network?.cny_per_overage_gb || 0.8)
  const storageTotalGbFromPlan = numericOrNull(wallet?.storage?.total_gb)
  const storageTotalBytes = numericOrNull(wallet?.storage?.total_bytes)
  const storageTotalGb = storageTotalGbFromPlan ?? (storageTotalBytes === null ? null : Number((storageTotalBytes / (1024 ** 3)).toFixed(2)))
  const storageUsedBytes = numericOrNull(wallet?.storage?.used_bytes)
  const storageAvailableBytes = numericOrNull(wallet?.storage?.available_bytes)
  const currentPlanName = displayPlanName(subscription?.plan.code ?? auth.subscriptionPlanCode, locale)
  const currentMembershipLabel = useMemo(() => {
    if (!currentPlanName)
      return t('account.billing.currentMembershipNone')
    const statusLabel = subscription?.status ? SUBSCRIPTION_STATUS_LABEL[subscription.status] : ''
    const statusSuffix = statusLabel
      ? (locale === 'zh' ? `（${statusLabel}）` : ` (${statusLabel})`)
      : ''
    return tpl('account.billing.currentMembershipLabel', currentPlanName + statusSuffix)
  }, [currentPlanName, subscription?.status, SUBSCRIPTION_STATUS_LABEL, t, tpl, locale])

  const columns = useMemo(() => [
    {
      key: 'created_at',
      title: t('account.billing.colTime'),
      width: 180,
      render: (row: PointLedger) => <span className="text-[var(--xiaoone-fg-mute)]">{new Date(row.created_at).toLocaleString(localeTag, { hour12: false })}</span>
    },
    {
      key: 'kind',
      title: t('account.billing.colType'),
      width: 110,
      render: (row: PointLedger) => {
        const meta = KIND_META[row.kind]
        return (
          <Badge variant="outline" className={`rounded-full ${meta?.textColor || 'text-gray-500'}`}>
            {meta?.label || row.kind}
          </Badge>
        )
      }
    },
    {
      key: 'note',
      title: t('account.billing.colNote'),
      render: (row: PointLedger) => (
        <div>
          <div>{row.note || t('account.common.notAvailable')}</div>
          {row.operator && <div className="text-[var(--xiaoone-fg-mute)]">{tpl('account.common.operator', row.operator)}</div>}
        </div>
      )
    },
    {
      key: 'amount',
      title: t('account.billing.colAmount'),
      width: 140,
      render: (row: PointLedger) => {
        const n = Number(row.amount_points || 0)
        const isOutflow = row.kind === 'ai_charge' || row.kind === 'dcpay_card_topup' || row.kind === 'dcpay_card_open' || row.kind === 'dcpay_card_recharge'
        const sign = isOutflow ? '-' : '+'
        if (row.kind === 'service_purchase')
          return <strong className="text-indigo-500">¥{Number(row.payment_amount || 0).toFixed(2)}</strong>
        if (row.kind === 'dcpay_card_topup' || row.kind === 'dcpay_card_open' || row.kind === 'dcpay_card_recharge')
          return <strong className="text-amber-600">{sign}{tpl('account.common.pointsUnit', n.toLocaleString(localeTag))}</strong>
        return <strong className={isOutflow ? 'text-red-500' : 'text-green-600'}>{sign}{tpl('account.common.pointsUnit', n.toLocaleString(localeTag))}</strong>
      }
    },
    {
      key: 'balance_after',
      title: t('account.billing.colBalance'),
      width: 120,
      render: (row: PointLedger) => <span className="text-[var(--xiaoone-fg-mute)]">{tpl('account.common.pointsUnit', Number(row.balance_after_points).toLocaleString(localeTag))}</span>
    },
  ], [t, tpl, localeTag, KIND_META])

  return (
    <section className={`apage ${forceMembership ? 'billing-panel--membership-gate' : ''}`}>
      {forceMembership ? (
        <div className="membership-billing-hero">
          <div className="membership-billing-hero__copy">
            <span className="membership-billing-kicker">{t('account.billing.membershipKicker')}</span>
            <h1>{t('account.billing.membershipTitle')}</h1>
            <p>{t('account.billing.membershipDesc')}</p>
            <div className="membership-billing-facts" aria-label={t('account.billing.activationFactsAria')}>
              <span>{t('account.billing.factMonthlyPoints')}</span>
              <span>{t('account.billing.factTermDiscount')}</span>
              <span>{t('account.billing.factAutoEnter')}</span>
            </div>
          </div>
          <aside className="membership-billing-status">
            <span>{t('account.billing.currentMembership')}</span>
            <strong>{displayPlanName(subscription?.plan.code, locale) || t('account.billing.pendingActivation')}</strong>
            <small>{t('account.billing.refreshStatusHint')}</small>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              <RefreshCw size={14} />
              {t('account.billing.refreshStatus')}
            </Button>
          </aside>
        </div>
      ) : (
        <APageHeader
          title={t('account.billing.title')}
          iconName="briefcase"
          service={currentMembershipLabel}
          description={t('account.billing.synced')}
          compact
          banner
          actions={
            <>
              <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>{t('account.common.refresh')}</Button>
              <Button size="sm" onClick={openMembershipPage}>{t('account.billing.upgrade')}</Button>
            </>
          }
        />
      )}

      <div className="apage-body">
        {loadError ? (
          <div className="billing-inline-state is-error" role="alert" aria-live="polite">
            <div>
              <strong>{t('account.billing.loadErrorTitle')}</strong>
              <span>{loadError}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              {t('account.common.retry')}
            </Button>
          </div>
        ) : null}

        {!forceMembership && wallet && (
          <div className="balance-card">
            <div className="balance-main">
              <div className="balance-label">{tpl('account.billing.balanceLabel', wallet.wallet.currency)}</div>
              <div className="balance-value">{tpl('account.common.pointsUnit', balance.toLocaleString(localeTag))}</div>
              <div className="balance-stats">
                <span>{t('account.billing.totalPurchased')} <strong>{tpl('account.common.pointsUnit', Number(wallet.wallet.purchased_points).toLocaleString(localeTag))}</strong></span>
                <span className="dot">·</span>
                <span>{t('account.billing.totalGranted')} <strong>{tpl('account.common.pointsUnit', Number(wallet.wallet.granted_points).toLocaleString(localeTag))}</strong></span>
                <span className="dot">·</span>
                <span>{t('account.billing.totalSpent')} <strong>{tpl('account.common.pointsUnit', Number(wallet.wallet.spent_points).toLocaleString(localeTag))}</strong></span>
              </div>
              {lowBalance && <div className="warn">{t('account.billing.lowBalanceWarn')}</div>}
            </div>
            <div className="balance-actions">
              <Button onClick={openTopup}>{t('account.billing.recharge')}</Button>
              <small>{t('account.billing.rechargeRate')}</small>
            </div>
          </div>
        )}

        {!forceMembership && wallet && (
          <div className="network-card">
            <div className="network-card__head">
              <strong>{t('account.billing.networkTitle')}</strong>
              <small>{tpl('account.billing.networkOverage', networkOverageRate.toFixed(2))}</small>
            </div>
            <div className="network-card__grid">
              <div className="network-card__item">
                <span>{t('account.billing.used')}</span>
                <strong>{fmtGbFromBytes(networkBytesUsed)}</strong>
              </div>
              <div className="network-card__item">
                <span>{t('account.billing.remaining')}</span>
                <strong>{networkQuotaGb > 0 ? fmtGbFromBytes(Number(wallet?.network?.remaining_bytes || 0)) : t('account.common.unlimited')}</strong>
              </div>
              <div className="network-card__item">
                <span>{t('account.billing.quota')}</span>
                <strong>{networkQuotaGb > 0 ? `${networkQuotaGb} GB` : t('account.common.unlimited')}</strong>
              </div>
              <div className="network-card__item">
                <span>{t('account.billing.overageDeduction')}</span>
                <strong>{networkOveragePoints > 0 ? tpl('account.common.pointsUnit', networkOveragePoints.toLocaleString(localeTag)) : tpl('account.common.pointsUnit', '0')}</strong>
              </div>
            </div>
          </div>
        )}

        {!forceMembership && wallet && (
          <div className="network-card">
            <div className="network-card__head">
              <strong>{t('account.billing.storageTitle')}</strong>
              <small>{t('account.billing.storageDesc')}</small>
            </div>
            <div className="network-card__grid">
              <div className="network-card__item">
                <span>{t('account.billing.used')}</span>
                <strong>{storageValueLabel(storageUsedBytes, storageTotalGb, t)}</strong>
              </div>
              <div className="network-card__item">
                <span>{t('account.billing.remaining')}</span>
                <strong>{storageValueLabel(storageAvailableBytes, storageTotalGb, t)}</strong>
              </div>
              <div className="network-card__item">
                <span>{t('account.billing.planCapacity')}</span>
                <strong>{storageCapacityLabel(storageTotalGb, t)}</strong>
              </div>
            </div>
          </div>
        )}

        {forceMembership && plans.length > 0 && (
          <div className={`service-card ${forceMembership ? 'service-card--membership-plans' : ''}`}>
            <div className="service-head">
              <div>
                <strong>{forceMembership ? t('account.billing.selectPlan') : t('account.billing.openMembership')}</strong>
                <small>
                  {forceMembership
                    ? t('account.billing.selectPlanDesc')
                    : tpl('account.billing.currentMembershipDesc', displayPlanName(subscription?.plan.code, locale) || t('account.billing.notActivated'))}
                </small>
              </div>
            </div>
            <div className={`service-grid ${forceMembership ? 'service-grid--membership-plans' : ''}`}>
              {plans.map(plan => {
                const active = subscription?.plan.code === plan.code && subscription?.status === 'active'
                const ent = (plan.entitlements || {}) as Record<string, any>
                const features = (ent.features || {}) as Record<string, boolean>
                const storesMax = Number(ent.stores_max || 0)
                const teamSeatsMax = Number(ent.team_seats_max || 0)
                const trafficMaxGb = Number(ent.monthly_traffic_gb || ent.network_quota_gb || 0)
                const popular = plan.code === 'startup'
                return (
                  <article key={plan.code} className={`service-plan ${active ? 'is-current' : ''} ${popular ? 'is-popular' : ''}`}>
                    <div className="service-plan-top">
                      <div className="service-plan-title">
                        <strong>{plan.name}</strong>
                        {popular && forceMembership ? (
                          <span>
                            <Sparkles size={12} />
                            {t('account.common.recommended')}
                          </span>
                        ) : null}
                      </div>
                      {active && <Badge variant="outline" className="rounded-full text-green-500 border-green-200">{t('account.common.current')}</Badge>}
                    </div>
                    <p>{plan.description || t('account.billing.standardPlan')}</p>
                    <div className="service-price">
                      {planListPrice(plan, billingCurrency) > planDisplayPrice(plan, billingCurrency) ? (
                        <span className="service-price-list line-through text-[var(--xiaoone-fg-mute)] text-sm mr-2">
                          {formatPlanPrice(planListPrice(plan, billingCurrency), billingCurrency)}
                        </span>
                      ) : null}
                      <strong>{formatPlanPrice(planDisplayPrice(plan, billingCurrency), billingCurrency)}</strong>
                      <span>/{plan.billing_period === 'annual' ? t('account.billing.periodYear') : plan.billing_period === 'quarterly' ? t('account.billing.periodQuarter') : plan.billing_period === 'perpetual' ? t('account.billing.periodPerpetual') : t('account.billing.periodMonth')}</span>
                    </div>
                    <div className="service-meta">
                      <span>{tpl('account.billing.grantPoints', Number(plan.included_points || 0).toLocaleString(localeTag))}</span>
                      <span>{forceMembership ? t('account.billing.discountAvailable') : t('account.billing.channelsWechatAlipay')}</span>
                      {forceMembership ? <span>{t('account.billing.channelsByConfig')}</span> : null}
                    </div>
                    {forceMembership ? (
                      <PlanFeatureList
                        plan={plan}
                        region={region}
                        className="service-feature-list plan-feature-list"
                        lockedClassName="plan-feature--locked"
                      />
                    ) : (
                      <div className="service-usage-grid">
                        <span>{tpl('account.billing.traffic', fmtGbFromBytes(networkBytesUsed), trafficMaxGb > 0 ? `${trafficMaxGb} GB` : t('account.common.unlimited'))}</span>
                        <span>{tpl('account.billing.stores', String(usageOverview.storesUsed), storesMax > 0 ? String(storesMax) : t('account.billing.cannotCreate'))}</span>
                        <span>{tpl('account.billing.team', String(usageOverview.teamSeatsUsed), teamSeatsMax > 0 ? String(teamSeatsMax) : t('account.billing.cannotInvite'))}</span>
                        <span>{tpl('account.billing.accelerator', features.network_acceleration ? t('account.billing.acceleratorOn') : t('account.billing.acceleratorOff'))}</span>
                        <span>{tpl('account.billing.usPhone', features.us_phone_number ? tpl('account.billing.usPhoneSelf', String(usageOverview.usPhoneUsed)) : t('account.billing.usPhoneClosed'))}</span>
                        <span>{tpl('account.billing.paymentCard', features.payment_card ? tpl('account.billing.paymentCardSelf', String(usageOverview.paymentCardsUsed)) : t('account.billing.paymentCardClosed'))}</span>
                        {plan.code === 'business'
                          ? <span>{tpl('account.billing.usServerPending', String(usageOverview.pendingUsServers))}</span>
                          : null}
                      </div>
                    )}
                    {(() => {
                      const decision = evaluatePlanPurchase(auth.subscriptionPlanCode, plan.code, auth.subscriptionPeriodEnd)
                      const ctaLabel = !decision.allowed
                        ? t('account.membership.downgradeBlocked')
                        : decision.allowed && decision.action === 'renew'
                          ? t('account.billing.renewMembership')
                          : decision.allowed && decision.action === 'upgrade'
                            ? t('account.membership.upgradeAndPay')
                            : forceMembership ? t('account.billing.activateNow') : t('account.billing.openMembershipBtn')
                      return (
                    <Button
                      className="service-plan-cta"
                      size="sm"
                      variant={active ? 'outline' : forceMembership && !popular ? 'secondary' : 'default'}
                      disabled={!decision.allowed}
                      onClick={() => openPurchase(plan)}
                    >
                      {ctaLabel}
                      {forceMembership && !active ? <ArrowRight size={14} /> : null}
                    </Button>
                      )
                    })()}
                  </article>
                )
              })}
            </div>
          </div>
        )}

        <div className={`service-card ${forceMembership ? 'service-card--discounts' : ''}`}>
          <div className="service-head">
            <div>
              <strong>{t('account.billing.myDiscountCodes')}</strong>
              <small>{forceMembership ? t('account.billing.discountGateHint') : t('account.billing.discountBillingHint')}</small>
            </div>
          </div>
          {!myDiscountCodes.length ? (
            <div className="py-5 text-sm text-[var(--xiaoone-fg-mute)]">{t('account.billing.noCoupons')}</div>
          ) : (
            <div className="service-grid service-grid--discount-codes">
              {myDiscountCodes.slice(0, 6).map(code => (
                <DiscountCodeCard key={code.code} code={code} />
              ))}
            </div>
          )}
        </div>

        {!forceMembership && <div className="table-wrap">
          <div className="table-head">
            <strong>{t('account.billing.transactions')}</strong>
            <Select value={filterKind} onValueChange={(val) => {
              setFilterKind(val)
              setPage(1)
            }}>
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue placeholder={t('account.billing.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('account.billing.allTypes')}</SelectItem>
                {Object.entries(KIND_META).map(([k, meta]) => (
                  <SelectItem key={k} value={k}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {records.length === 0 && !loading ? (
            <div className="py-8"><Empty description={t('account.billing.noTransactions')} /></div>
          ) : (
            <>
              <DataTable columns={columns} data={records} rowKey={r => String(r.id)} />
              <div className="flex justify-end mt-4">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(p, s) => {
                    if (s !== pageSize) {
                      setPageSize(s)
                      setPage(1)
                    } else {
                      setPage(p)
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>}
      </div>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="billing-dialog billing-dialog--topup">
          <DialogHeader className="billing-dialog-header billing-topup-header">
            <div className="billing-topup-title">
              <span className="billing-dialog-kicker"><Wallet size={14} aria-hidden /> {t('account.billing.topupKicker')}</span>
              <DialogTitle>{t('account.billing.topupTitle')}</DialogTitle>
              <DialogDescription className="billing-dialog-description">
                {t('account.billing.topupDesc')}
              </DialogDescription>
            </div>
            <div className="billing-topup-total" aria-label={t('account.billing.payableThisTime')}>
              <span>{t('account.billing.payableThisTime')}</span>
              <strong>¥{topupDisplayPayable.toFixed(2)}</strong>
              <small>{topupDiscountAmount > 0 ? tpl('account.billing.deducted', topupDiscountAmount.toFixed(2)) : tpl('account.billing.credited', topupDisplayAmount.toFixed(2))}</small>
            </div>
          </DialogHeader>
          <div ref={topupDialogBodyRef} className="billing-dialog-body billing-dialog-body--topup">
            <section className="billing-topup-panel billing-topup-panel--amount">
              <div className="billing-section-head">
                <span className="billing-section-icon"><Wallet size={16} aria-hidden /></span>
                <div>
                  <label className="text-sm font-medium" htmlFor="billing-topup-amount">{t('account.billing.topupAmountLabel')}</label>
                  <span>{t('account.billing.topupAmountHint')}</span>
                </div>
              </div>
              <div className="billing-currency-input">
                <span className="billing-currency-input__prefix">¥</span>
                <Input
                  id="billing-topup-amount"
                  className="billing-currency-input__control"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="100"
                  inputMode="decimal"
                />
              </div>
              <div className="billing-topup-summary">
                <div>
                  <span>{t('account.billing.creditedAmount')}</span>
                  <strong>¥{topupDisplayAmount.toFixed(2)}</strong>
                </div>
                <div>
                  <span>{t('account.billing.discountDeduction')}</span>
                  <strong>{topupDiscountAmount > 0 ? `-¥${topupDiscountAmount.toFixed(2)}` : '¥0.00'}</strong>
                </div>
              </div>
            </section>
            <section className="billing-topup-panel billing-topup-panel--quick">
              <div className="billing-section-head billing-section-head--compact">
                <span className="billing-section-icon"><Sparkles size={16} aria-hidden /></span>
                <div>
                  <label className="text-sm font-medium">{t('account.billing.quickSelect')}</label>
                </div>
              </div>
              <RadioGroup value={topupAmount} onValueChange={setTopupAmount} className="billing-quick-amounts">
                {QUICK_AMOUNTS.map(amt => (
                  <div
                    key={amt}
                    className={`billing-quick-amount ${topupAmount === amt ? 'is-active' : ''}`}
                    onClick={() => setTopupAmount(amt)}
                  >
                    <RadioGroupItem value={amt} id={`amt-${amt}`} className="billing-quick-amount__radio" />
                    <label htmlFor={`amt-${amt}`} className="text-sm font-medium">¥{Number(amt).toLocaleString(localeTag)}</label>
                  </div>
                ))}
              </RadioGroup>
            </section>
            <section className="billing-topup-panel billing-topup-panel--payment">
              <div className="billing-section-head">
                <span className="billing-section-icon"><CreditCard size={16} aria-hidden /></span>
                <div>
                  <label className="text-sm font-medium">{t('account.billing.topupChannel')}</label>
                  <span>{topupRedeemOnly ? t('account.billing.redeemOnlyHint') : activeTopupChannel ? tpl('account.billing.channelSelected', activeTopupChannel.label) : t('account.billing.selectChannel')}</span>
                </div>
              </div>
              <div className="pay-choice-grid">
                {payableChannelOptions.map(ch => {
                  const available = Boolean(capabilities[ch.code]?.enabled)
                  const selected = topupChannel === ch.code
                  const label = paymentChannelDisplayLabel(ch.code, ch.label)
                  return (
                    <button
                      key={ch.code}
                      type="button"
                      className={`pay-choice ${available ? (selected ? 'is-active' : '') : 'is-disabled'}`}
                      style={partnerBrandCssVars(ch.code)}
                      disabled={!available}
                      title={available ? tpl('account.common.channelAvailable', label) : tpl('account.common.channelNotConfigured', label)}
                      onClick={() => {
                        setTopupWechatIntent(null)
                        if (available) {
                          setTopupChannel(ch.code)
                        }
                      }}
                    >
                      <span className="pay-choice__brand">
                        <PartnerBrandMark brand={ch.code} size={18} />
                        <strong>{label}</strong>
                      </span>
                      <span className="pay-choice__state">
                        {available && selected ? <CheckCircle2 size={14} aria-hidden /> : null}
                        {available ? (selected ? t('account.common.selected') : t('account.common.available')) : t('account.common.notConfigured')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
            <section className="billing-topup-panel billing-topup-panel--discount">
              <div className="billing-section-head">
                <span className="billing-section-icon"><TicketPercent size={16} aria-hidden /></span>
                <div>
                  <span className="billing-section-label">{t('account.billing.discountSection')}</span>
                  <span>{selectedTopupDiscount ? t('account.billing.discountApplied') : t('account.billing.discountOptional')}</span>
                </div>
              </div>
              <DiscountCodePicker
                codes={myDiscountCodes}
                value={topupCouponCode}
                onChange={setTopupCouponCode}
                business="recharge"
                baseAmountCny={topupBaseCny}
                currency={billingCurrency}
                className="billing-dialog-discount"
                gridClassName="service-grid service-grid--discount-codes billing-dialog-discount-grid"
              />
            </section>
            {topupChannel === 'cardixon' && (
              <div className="billing-topup-crypto">
                <label className="text-sm font-medium">{t('account.billing.cryptoParams')}</label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-1">
                    <span className="text-xs text-[var(--xiaoone-fg-mute)]">{t('account.billing.cryptoToken')}</span>
                    <Select value={String(topupCardixonToken)} onValueChange={val => setTopupCardixonToken(val === '2' ? 2 : 1)}>
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
                    <Select value={String(topupCardixonChain)} onValueChange={(val) => {
                      if (val === '1') setTopupCardixonChain(1)
                      else if (val === '56') setTopupCardixonChain(56)
                      else setTopupCardixonChain(195)
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
            {topupChannel === 'wechat_pay' && topupWechatIntent && (
              <div ref={topupWechatBoxRef} className="billing-wechat-pay-box">
                <strong><PartnerBrandMark brand="wechat_pay" size={16} className="partner-brand-mark--sm" /> {t('account.billing.wechatScanPay')}</strong>
                {topupWechatIntent.qr_svg ? (
                  <img src={topupWechatIntent.qr_svg} alt={t('account.billing.wechatQrAlt')} />
                ) : (
                  <code>{topupWechatIntent.code_url}</code>
                )}
                <span>{tpl('account.common.orderId', topupWechatIntent.checkout_id)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/billing/success?order_id=${encodeURIComponent(topupWechatIntent.checkout_id)}`)}
                >
                  {t('account.billing.viewPaymentStatus')}
                </Button>
              </div>
            )}
            <div className="billing-payment-note">
              {topupRedeemOnly
                ? t('account.billing.redeemOnlyNote')
                : t('account.billing.paymentNote')}
            </div>
          </div>
          <DialogFooter className="billing-dialog-footer billing-dialog-footer--topup">
            <div className="billing-dialog-footer__summary">
              <span>{tpl('account.billing.creditedFooter', topupDisplayAmount.toFixed(2))}</span>
              <strong>{tpl('account.billing.payableFooter', topupDisplayPayable.toFixed(2))}</strong>
            </div>
            <div className="billing-dialog-footer__actions">
              <Button variant="outline" onClick={() => setTopupOpen(false)}>{t('account.common.cancel')}</Button>
              <Button
                onClick={submitTopup}
                disabled={topupSubmitting || !topupAmountValid}
              >
                {topupSubmitLabel}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="billing-dialog billing-dialog--purchase max-w-[min(940px,94vw)]">
          <DialogHeader>
            <DialogTitle>{t('account.billing.purchaseTitle')}</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="billing-dialog-body billing-dialog-body--purchase">
              {forceMembership && (
                <p className="x1-membership-required-note">{t('account.billing.membershipRequiredNote')}</p>
              )}
              <div className="purchase-summary">
                <strong>{selectedPlan.name}</strong>
                <span>{formatPlanPrice(purchasePayableAmount, billingCurrency)}</span>
                <p>{selectedPlan.description || t('account.billing.standardPlan')}</p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('account.billing.purchaseTerm')}</label>
                <Select value={String(purchaseTermMonths)} onValueChange={val => setPurchaseTermMonths((Number(val) || 1) as 1 | 3 | 6 | 12)}>
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
            {!forceMembership && <Button variant="outline" onClick={() => setPurchaseOpen(false)}>{t('account.common.cancel')}</Button>}
            <Button
              onClick={submitPurchase}
              disabled={purchaseSubmitting || !selectedPlan}
            >
              {selectedPlan && planDisplayPrice(selectedPlan, billingCurrency) <= 0
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
