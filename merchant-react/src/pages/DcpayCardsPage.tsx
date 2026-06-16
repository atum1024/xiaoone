import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@xiaoone/react-ui'
import { Copy, CreditCard, Eye, Info, LockKeyhole, MessageSquare, RefreshCw, ShieldAlert } from 'lucide-react'
import {
  BillingAPI,
  type DcpayAdCard,
  type DcpayCardProduct,
  type DcpayCardSensitiveDetails,
  type DcpayCardTransaction,
} from '../lib/billingApi'
import { PlanUpgradeDialog } from '../components/PlanUpgradeDialog'
import { RealNameVerifyDialog } from '../components/RealNameVerifyDialog'
import { requiresMainlandRealName } from '../lib/kycGate'
import { useRealNameVerified } from '../lib/useRealNameVerified'
import { useRegion } from '@xiaoone/region'
import { describeAxiosError } from '../lib/apiErrors'
import {
  cardStatusLabel,
  fundsDirectionLabel,
  txDisplayAmount,
  txStatusLabel,
  txTypeLabel,
} from '../lib/dcpayCardLabels'
import { useAuthStore } from '../store/auth'
import { usePreferences } from '../app/preferences'
import { DcpayCardBinPlatformsPanel } from '../components/DcpayCardBinPlatformsPanel'
import { isDcpayCardBin5378 } from '../data/dcpayCardBin5378Platforms'
import './dcpay-cards-page.css'

type Tab = 'cards' | 'open'

interface DcpayCardsPageProps {
  initialTab?: Tab
  embedded?: boolean
}

function fmt(value?: string | null, digits = 2) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return value || '0'
  return num.toFixed(digits)
}

function toNumber(value?: string | number | null) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}

function productOpenCost(product: DcpayCardProduct) {
  return toNumber(product.open_card_fee) + toNumber(product.recharge_money)
}

function fmtPoints(value: number) {
  return Math.max(0, Math.ceil(value || 0)).toLocaleString('zh-CN')
}

function dcpayIdempotencyKey(kind: string, scope = '') {
  const cleanScope = scope.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  return [kind, cleanScope, Date.now().toString(36), random].filter(Boolean).join(':').slice(0, 128)
}

function loadCachedProducts() {
  return BillingAPI.dcpayCardProducts(false)
}

function fmtTime(value?: string | null, locale: 'zh' | 'en' = 'zh') {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })
}

function sceneLabel(scene: string, tr: (key: string) => string) {
  if (!scene) return tr('automation.dcpay.unlabeled')
  const lower = scene.toLowerCase()
  if (lower.includes('facebook')) return 'Facebook'
  if (lower.includes('google')) return 'Google'
  if (lower.includes('tiktok')) return 'TikTok'
  if (lower.includes('amazon')) return 'Amazon'
  return scene
}

function cardStatusTone(status: string): 'success' | 'warning' | 'danger' | 'muted' {
  const text = (status || '').toLowerCase()
  if (text.includes('active')) return 'success'
  if (text.includes('block') || text.includes('freeze')) return 'warning'
  if (text.includes('cancel')) return 'muted'
  if (text.includes('fail')) return 'danger'
  return 'muted'
}

function txStatusTone(tx: DcpayCardTransaction): 'success' | 'warning' | 'danger' | 'muted' {
  const text = `${tx.status || ''} ${tx.failure_reason || ''}`.toLowerCase()
  if (text.includes('declin') || text.includes('reject') || text.includes('fail')) return 'danger'
  if (text.includes('pending') || text.includes('process') || text.includes('auth')) return 'warning'
  if (text.includes('settled') || text.includes('success')) return 'success'
  return 'muted'
}

function txNarrative(tx: DcpayCardTransaction) {
  return tx.merchant_name || tx.note || tx.notice_type || '—'
}

function isPaymentCardPlanError(error: any): boolean {
  const code = error?.response?.data?.data?.code || error?.response?.data?.code || error?.response?.data?.message
  return code === 'payment_card_not_enabled'
}

export function DcpayCardsPage({ embedded = false }: DcpayCardsPageProps) {
  const { locale, t, tpl } = usePreferences()
  const { region } = useRegion()
  const { verified: realNameVerified, refresh: refreshRealName } = useRealNameVerified()
  const qc = useQueryClient()
  const paymentCardAllowed = useAuthStore(state => Boolean(state.featureFlags.payment_card))
  const boundPhone = useAuthStore(state => state.user?.phone || '')
  const [selectedCardId, setSelectedCardId] = useState('')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [realNameOpen, setRealNameOpen] = useState(false)
  const [openProductsDialog, setOpenProductsDialog] = useState(false)
  const [topupConfirmOpen, setTopupConfirmOpen] = useState(false)
  const [topupAmountUsd, setTopupAmountUsd] = useState('100')
  const [cardRechargeOpen, setCardRechargeOpen] = useState(false)
  const [cardRechargeTarget, setCardRechargeTarget] = useState<DcpayAdCard | null>(null)
  const [cardRechargeAmountUsd, setCardRechargeAmountUsd] = useState('100')
  const [sensitiveOpen, setSensitiveOpen] = useState(false)
  const [sensitiveTarget, setSensitiveTarget] = useState<DcpayAdCard | null>(null)
  const [sensitiveMethod, setSensitiveMethod] = useState<'sms' | 'password'>('sms')
  const [sensitiveSmsCode, setSensitiveSmsCode] = useState('')
  const [sensitivePassword, setSensitivePassword] = useState('')
  const [sensitiveNotice, setSensitiveNotice] = useState('')
  const [sensitiveError, setSensitiveError] = useState('')
  const [sensitiveResult, setSensitiveResult] = useState<DcpayCardSensitiveDetails | null>(null)
  const [cardDetailOpen, setCardDetailOpen] = useState(false)

  const productsQ = useQuery({ queryKey: ['dcpay-card-products'], queryFn: loadCachedProducts })
  const cardsQ = useQuery({ queryKey: ['dcpay-card-cards'], queryFn: () => BillingAPI.dcpayCardCards(false) })
  const walletQ = useQuery({ queryKey: ['billing-wallet'], queryFn: BillingAPI.wallet })

  const cards = cardsQ.data?.items || []
  const selected = useMemo(() => cards.find(item => item.card_id === selectedCardId) || cards[0] || null, [cards, selectedCardId])
  const txQ = useQuery({
    queryKey: ['dcpay-card-transactions', selected?.card_id],
    queryFn: () => BillingAPI.dcpayCardTransactions(selected!.card_id, true),
    enabled: Boolean(selected?.card_id),
    staleTime: 60_000,
  })

  const syncProductsM = useMutation({
    mutationFn: BillingAPI.dcpayCardSyncProducts,
    onSuccess: () => {
      toast.success(t('automation.dcpay.toast.syncDone'))
      qc.invalidateQueries({ queryKey: ['dcpay-card-products'] })
    },
    onError: (e: any) => toast({ title: t('automation.dcpay.toast.syncFailed'), description: e?.response?.data?.message || e?.response?.data?.error || e?.message }),
  })
  const topupM = useMutation({
    mutationFn: (payload: { amount_usd: string; idempotency_key: string }) => BillingAPI.dcpayCardTopup(payload),
    onSuccess: data => {
      toast.success(tpl('automation.dcpay.toast.topupSuccess', fmtPoints(data.point_ledger.amount_points)))
      setTopupConfirmOpen(false)
      qc.invalidateQueries({ queryKey: ['dcpay-card-products'] })
      qc.invalidateQueries({ queryKey: ['dcpay-card-cards'] })
      qc.invalidateQueries({ queryKey: ['dcpay-card-account-ledger'] })
      qc.invalidateQueries({ queryKey: ['billing-wallet'] })
    },
    onError: (e: any) => {
      if (isPaymentCardPlanError(e)) {
        setUpgradeOpen(true)
        return
      }
      const code = e?.response?.data?.data?.code || e?.response?.data?.code
      const data = e?.response?.data?.data || {}
      let message = e?.response?.data?.message || e?.message
      if (code === 'insufficient_points') {
        message = `需要 ${fmtPoints(Number(data.required_points || 0))} 平台点，当前仅 ${fmtPoints(Number(data.balance_points || 0))} 点。`
      }
      if (code === 'monthly_platform_points_limit_exceeded') {
        message = `本月剩余额度 ${fmt(data.monthly_remaining_usd, 4)} USD，请调整充值金额。`
      }
      toast({ title: t('automation.dcpay.toast.topupFailed'), description: message })
    },
  })
  const openCardM = useMutation({
    mutationFn: (product: DcpayCardProduct) =>
      BillingAPI.dcpayCardOpenCard({
        card_manage_id: product.card_manage_id,
        idempotency_key: dcpayIdempotencyKey('dcpay_open', product.card_manage_id),
      }),
    onSuccess: ({ card }) => {
      toast.success(tpl('automation.dcpay.toast.openSuccess', card.card_number_masked || card.card_id))
      setSelectedCardId(card.card_id)
      setOpenProductsDialog(false)
      qc.invalidateQueries({ queryKey: ['dcpay-card-cards'] })
      qc.invalidateQueries({ queryKey: ['dcpay-card-products'] })
      qc.invalidateQueries({ queryKey: ['dcpay-card-account-ledger'] })
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['dcpay-card-account-ledger'] })
      if (isPaymentCardPlanError(e)) {
        setUpgradeOpen(true)
        return
      }
      const code = e?.response?.data?.data?.code || e?.response?.data?.code
      const data = e?.response?.data?.data || {}
      const message = code === 'insufficient_balance'
        ? `当前余额 ${fmt(data.available_amount, 4)} USD，开卡需要 ${fmt(data.required_amount, 4)} USD。请先充值支付卡子账户。`
        : e?.response?.data?.message || e?.message
      toast({ title: t('automation.dcpay.toast.openFailed'), description: message })
    },
  })
  const rechargeM = useMutation({
    mutationFn: ({ cardId, amountUsd, idempotencyKey }: { cardId: string; amountUsd: string; idempotencyKey: string }) =>
      BillingAPI.dcpayCardRecharge(cardId, { amount_usd: amountUsd, idempotency_key: idempotencyKey }),
    onSuccess: (_data, variables) => {
      toast.success(t('automation.dcpay.toast.cardTopupSubmitted'))
      setCardRechargeOpen(false)
      setCardRechargeTarget(null)
      qc.invalidateQueries({ queryKey: ['dcpay-card-cards'] })
      qc.invalidateQueries({ queryKey: ['dcpay-card-products'] })
      qc.invalidateQueries({ queryKey: ['dcpay-card-account-ledger'] })
      qc.invalidateQueries({ queryKey: ['dcpay-card-transactions', variables.cardId] })
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['dcpay-card-account-ledger'] })
      if (isPaymentCardPlanError(e)) {
        setUpgradeOpen(true)
        return
      }
      const code = e?.response?.data?.data?.code || e?.response?.data?.code
      const data = e?.response?.data?.data || {}
      const message = code === 'insufficient_balance'
        ? `子账户可用 ${fmt(data.available_amount, 4)} USD，本次需要 ${fmt(data.required_amount, 4)} USD。请先给支付卡子账户充值。`
        : e?.response?.data?.message || e?.message
      toast({ title: t('automation.dcpay.toast.cardTopupFailed'), description: message })
    },
  })
  const sensitiveSmsM = useMutation({
    mutationFn: BillingAPI.dcpayCardSensitiveAuthRequest,
    onSuccess: data => {
      setSensitiveNotice(`验证码已发送至 ${data.masked_target || '绑定手机号'}，5 分钟内有效。`)
      setSensitiveError('')
    },
    onError: (e: any) => {
      setSensitiveError(describeAxiosError(e, '验证码发送失败，请稍后重试。'))
    },
  })
  const sensitiveM = useMutation({
    mutationFn: ({ cardId, payload }: { cardId: string; payload: { method: 'sms' | 'password'; code?: string; password?: string } }) =>
      BillingAPI.dcpayCardSensitiveDetail(cardId, payload),
    onSuccess: data => {
      setSensitiveResult(data.sensitive)
      setSensitiveError('')
      qc.invalidateQueries({ queryKey: ['dcpay-card-cards'] })
    },
    onError: (e: any) => {
      setSensitiveResult(null)
      setSensitiveError(describeAxiosError(e, '身份验证失败，请重新输入验证码或登录密码。'))
    },
  })

  const enabled = Boolean(productsQ.data?.enabled)
  const products = productsQ.data?.items || []
  const card5378Products = useMemo(
    () => products.filter(product => isDcpayCardBin5378(product.card_bin)),
    [products],
  )
  const account = productsQ.data?.account
  const policy = productsQ.data?.topup_policy
  const walletBalance = Number(walletQ.data?.wallet.balance_points || 0)
  const accountBalance = toNumber(account?.available_amount)
  const transactions = txQ.data?.items || []
  const topupAmount = Number(topupAmountUsd || 0)
  const topupRate = toNumber(policy?.usd_cny_rate) || 7.2
  const pointsPerCny = Number(policy?.points_per_cny || 1000)
  const topupAmountCny = Number.isFinite(topupAmount) ? topupAmount * topupRate : 0
  const topupPoints = Math.ceil(Math.max(0, topupAmountCny * pointsPerCny))
  const walletBalanceAfterTopup = Math.max(0, walletBalance - topupPoints)
  const topupAccountBalanceAfter = accountBalance + Math.max(0, Number.isFinite(topupAmount) ? topupAmount : 0)
  const monthlyRemainingUsd = toNumber(policy?.monthly_remaining_usd)
  const topupOverMonthlyLimit = Boolean(policy) && topupAmount > 0 && topupAmount > monthlyRemainingUsd
  const topupInsufficientPoints = Boolean(walletQ.data) && topupPoints > 0 && walletBalance < topupPoints
  const cardRechargeAmount = Number(cardRechargeAmountUsd || 0)
  const cardRechargeValid = Number.isFinite(cardRechargeAmount) && cardRechargeAmount > 0
  const cardRechargeOverBalance = cardRechargeValid && cardRechargeAmount > accountBalance
  const cardRechargeAccountBalanceAfter = Math.max(0, accountBalance - (cardRechargeValid ? cardRechargeAmount : 0))
  const cardRechargeTargetBalanceAfter = toNumber(cardRechargeTarget?.amount) + (cardRechargeValid ? cardRechargeAmount : 0)
  const productsLoading = productsQ.isLoading && products.length === 0
  const cardsLoading = cardsQ.isLoading && cards.length === 0
  const openCardProcessing = openCardM.isPending

  function openTopupConfirm() {
    if (!paymentCardAllowed) {
      setUpgradeOpen(true)
      return
    }
    const amount = Number(topupAmountUsd || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('automation.dcpay.toast.invalidUsd'))
      return
    }
    setTopupConfirmOpen(true)
  }

  function confirmTopup() {
    const amount = Number(topupAmountUsd || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('automation.dcpay.toast.invalidUsd'))
      return
    }
    if (topupOverMonthlyLimit) {
      toast({ title: t('automation.dcpay.toast.overMonthly'), description: `本月剩余额度 ${fmt(policy?.monthly_remaining_usd, 4)} USD。` })
      return
    }
    if (topupInsufficientPoints) {
      toast({ title: t('automation.dcpay.toast.insufficientPointsTitle'), description: `需要 ${fmtPoints(topupPoints)} 平台点，当前 ${fmtPoints(walletBalance)} 点。` })
      return
    }
    topupM.mutate({
      amount_usd: amount.toFixed(2),
      idempotency_key: dcpayIdempotencyKey('dcpay_topup'),
    })
  }

  function openCardRechargeDialog(card: DcpayAdCard) {
    if (!paymentCardAllowed) {
      setUpgradeOpen(true)
      return
    }
    setCardRechargeTarget(card)
    setCardRechargeAmountUsd('100')
    setCardRechargeOpen(true)
  }

  function confirmCardRecharge() {
    if (!cardRechargeTarget) return
    if (!cardRechargeValid) {
      toast.error(t('automation.dcpay.toast.invalidUsd'))
      return
    }
    if (cardRechargeOverBalance) {
      toast({ title: t('automation.dcpay.toast.insufficientSubAccount'), description: `当前子账户可用 ${fmt(account?.available_amount, 4)} USD。` })
      return
    }
    rechargeM.mutate({
      cardId: cardRechargeTarget.card_id,
      amountUsd: cardRechargeAmount.toFixed(2),
      idempotencyKey: dcpayIdempotencyKey('dcpay_recharge', cardRechargeTarget.card_id),
    })
  }

  async function copySensitiveValue(value: string, label: string) {
    if (!value.trim()) return
    try {
      await navigator.clipboard.writeText(value)
      toast.success(tpl('automation.dcpay.toast.copied', label))
    } catch {
      toast({ title: t('automation.dcpay.toast.copyFailed'), description: t('automation.dcpay.toast.copyFailedDesc') })
    }
  }

  function closeSensitiveDialog(open: boolean) {
    setSensitiveOpen(open)
    if (!open) {
      setSensitiveTarget(null)
      setSensitiveSmsCode('')
      setSensitivePassword('')
      setSensitiveNotice('')
      setSensitiveError('')
      setSensitiveResult(null)
    }
  }

  function openSensitiveDialog(card: DcpayAdCard) {
    if (!paymentCardAllowed) {
      setUpgradeOpen(true)
      return
    }
    setSensitiveTarget(card)
    setSensitiveMethod(boundPhone ? 'sms' : 'password')
    setSensitiveSmsCode('')
    setSensitivePassword('')
    setSensitiveNotice('')
    setSensitiveError('')
    setSensitiveResult(null)
    setSensitiveOpen(true)
  }

  function revealSensitiveCard() {
    if (!sensitiveTarget) return
    if (sensitiveMethod === 'sms') {
      if (!sensitiveSmsCode.trim()) {
        setSensitiveError('请输入短信验证码。')
        return
      }
      sensitiveM.mutate({
        cardId: sensitiveTarget.card_id,
        payload: { method: 'sms', code: sensitiveSmsCode.trim() },
      })
      return
    }
    if (!sensitivePassword) {
      setSensitiveError('请输入登录密码。')
      return
    }
    sensitiveM.mutate({
      cardId: sensitiveTarget.card_id,
      payload: { method: 'password', password: sensitivePassword },
    })
  }

  function handleOpenCard(product: DcpayCardProduct) {
    if (requiresMainlandRealName(region, realNameVerified)) {
      setRealNameOpen(true)
      return
    }
    if (!enabled) {
      toast({ title: t('automation.dcpay.toast.channelClosed'), description: '支付卡通道当前关闭，暂不能开卡。' })
      return
    }
    if (!paymentCardAllowed) {
      setUpgradeOpen(true)
      return
    }
    const required = productOpenCost(product)
    if (accountBalance < required) {
      toast({
        title: '余额不足',
        description: `当前子账户余额 ${fmt(account?.available_amount, 4)} USD，开卡需要 ${fmt(String(required), 4)} USD。请先充值。`,
      })
      return
    }
    openCardM.mutate(product)
  }

  function openCard5378Product(product: DcpayCardProduct) {
    const required = productOpenCost(product)
    const hasBalance = accountBalance >= required
    const isOpening = openCardProcessing && openCardM.variables?.card_manage_id === product.card_manage_id
    const productClassName = [
      'dcpay-product',
      'dcpay-product--5378-hero',
      enabled && !hasBalance ? 'is-low-balance' : '',
    ].filter(Boolean).join(' ')

    return (
      <article className={productClassName} key={product.id}>
        <header className="dcpay-product-5378__head">
          <div className="dcpay-product-5378__identity">
            <span className="dcpay-kicker"><CreditCard size={14} /> {sceneLabel(product.card_scene, t)}</span>
            <h3>{product.card_scheme || 'Card'} · {product.card_bin || product.card_manage_id}</h3>
            <p>币种 {product.currency} · 国家 {product.card_country || '—'} · {product.card_model || 'share'}</p>
          </div>
          <Badge tone={enabled ? (hasBalance ? 'success' : 'warning') : 'muted'}>
            {enabled ? (hasBalance ? '余额足够' : '余额不足') : '待启用'}
          </Badge>
        </header>

        <div className="dcpay-product-5378__primary">
          <dl className="dcpay-product-5378__fees">
            <div><dt>开卡费</dt><dd>{fmt(product.open_card_fee)} USD</dd></div>
            <div><dt>首充</dt><dd>{fmt(product.recharge_money)} USD</dd></div>
            <div><dt>合计需要</dt><dd>{fmt(String(required))} USD</dd></div>
            <div><dt>充值费率</dt><dd>{fmt(product.recharge_fee_rate, 4)}</dd></div>
          </dl>
          <div className="dcpay-product-5378__actions">
            <small className={enabled && !hasBalance ? 'dcpay-product-balance is-low' : 'dcpay-product-balance'}>
              当前可用 {fmt(account?.available_amount, 4)} USD
            </small>
            <Button
              onClick={() => handleOpenCard(product)}
              disabled={openCardProcessing || !enabled}
            >
              {!enabled ? '待启用' : isOpening ? '开卡中' : '开通 5378 卡'}
            </Button>
          </div>
        </div>

        <DcpayCardBinPlatformsPanel
          cardBin={product.card_bin}
          locale={locale === 'en' ? 'en' : 'zh'}
          compact={false}
          className="is-dialog-showcase is-hero-secondary"
        />
      </article>
    )
  }

  return (
    <main className={embedded ? 'dcpay-page dcpay-page--embedded' : 'dcpay-page'}>
      <div className="dcpay-shell">
      <section className="dcpay-toolbar" aria-label={t('automation.dcpay.toolbarAria')}>
        <div className="dcpay-toolbar__title">
          <span className="dcpay-kicker"><CreditCard size={14} /> {t('automation.dcpay.kicker')}</span>
        </div>
        <div className="dcpay-toolbar__summary">
          {!enabled ? <Badge tone="muted">{t('automation.dcpay.channelClosed')}</Badge> : null}
          <span>子账户 {fmt(account?.available_amount, 4)} USD</span>
          <span>点 {fmtPoints(walletBalance)}</span>
        </div>
        <div className="dcpay-toolbar__actions">
          <Button
            variant="secondary"
            onClick={() => {
              void cardsQ.refetch()
              void productsQ.refetch()
              void walletQ.refetch()
              if (selected?.card_id) void txQ.refetch()
            }}
            disabled={cardsQ.isFetching || productsQ.isFetching || txQ.isFetching}
          >
            <RefreshCw size={14} className={cardsQ.isFetching || productsQ.isFetching || txQ.isFetching ? 'animate-spin' : ''} />
            刷新
          </Button>
          <div className="dcpay-topup-combo">
            <span className="dcpay-topup-combo__prefix">USD</span>
            <input
              className="dcpay-topup-combo__input"
              value={topupAmountUsd}
              onChange={e => setTopupAmountUsd(e.target.value)}
              inputMode="decimal"
              placeholder={t('automation.dcpay.topupPlaceholder')}
              aria-label={t('automation.dcpay.topupAria')}
            />
            <Button
              className="dcpay-topup-combo__btn"
              onClick={openTopupConfirm}
              disabled={!enabled || topupM.isPending}
            >
              {topupM.isPending ? t('automation.dcpay.deducting') : t('automation.dcpay.topup')}
            </Button>
          </div>
          <Button onClick={() => {
            if (requiresMainlandRealName(region, realNameVerified)) {
              setRealNameOpen(true)
              return
            }
            setOpenProductsDialog(true)
          }} disabled={productsLoading}>
            <CreditCard size={16} />
            开卡
          </Button>
        </div>
      </section>

      <section className="dcpay-cards">
        <aside className="dcpay-card-list">
          <div className="dcpay-section-head">
            <h2>{t('automation.dcpay.myCards')}</h2>
            <span>{tpl('automation.dcpay.cardCount', String(cards.length))}</span>
          </div>
          <div className="dcpay-card-scroll">
            {cardsLoading ? <p className="dcpay-empty">正在加载卡片...</p> : null}
            {!cardsLoading && cardsQ.isError ? (
              <p className="dcpay-empty">
                卡片加载失败。
                <Button variant="ghost" size="sm" onClick={() => void cardsQ.refetch()}>重试</Button>
              </p>
            ) : null}
            {!cardsLoading && !cardsQ.isError && !cards.length ? <p className="dcpay-empty">暂无卡片。点击上方“开卡”选择卡段后会显示在这里。</p> : null}
            {cards.map(card => (
              <button
                type="button"
                key={card.card_id}
                className={selected?.card_id === card.card_id ? 'dcpay-card-item is-active' : 'dcpay-card-item'}
                onClick={() => setSelectedCardId(card.card_id)}
              >
                <strong>{card.card_number_masked || card.card_id}</strong>
                <em>{fmt(card.amount, 2)} {card.card_currency || 'USD'}</em>
              </button>
            ))}
          </div>
        </aside>
        <section className="dcpay-card-detail">
          {selected ? (
            <>
              <header className="dcpay-detail-head">
                <div>
                  <span className="dcpay-kicker">卡片详情</span>
                  <h3>{selected.card_number_masked || selected.card_id}</h3>
                  <p className="dcpay-detail-summary">
                    <Badge tone={cardStatusTone(selected.card_status)}>{cardStatusLabel(selected.card_status, locale)}</Badge>
                    <span>{fmt(selected.amount, 2)} {selected.card_currency || 'USD'}</span>
                  </p>
                </div>
                <div className="dcpay-row-actions">
                  <Button variant="ghost" onClick={() => setCardDetailOpen(true)}>
                    <Info size={14} /> 卡片信息
                  </Button>
                  <Button variant="secondary" onClick={() => openSensitiveDialog(selected)}>
                    <Eye size={14} /> 查看卡片资料
                  </Button>
                  <Button onClick={() => openCardRechargeDialog(selected)} disabled={rechargeM.isPending}>充值</Button>
                </div>
              </header>
              <div className="dcpay-ledger-panel">
                <div className="dcpay-section-head">
                  <h2>交易流水</h2>
                  <div className="dcpay-section-head__meta">
                    <span>{transactions.length} 条</span>
                    <Button variant="ghost" size="sm" onClick={() => void txQ.refetch()} disabled={txQ.isFetching}>
                      <RefreshCw size={14} className={txQ.isFetching ? 'animate-spin' : ''} />
                      同步
                    </Button>
                  </div>
                </div>
                {txQ.isLoading ? <p className="dcpay-empty">正在加载交易流水...</p> : null}
                {!txQ.isLoading && txQ.isError ? (
                  <p className="dcpay-empty">
                    交易流水加载失败。
                    <Button variant="ghost" size="sm" onClick={() => void txQ.refetch()}>重试</Button>
                  </p>
                ) : null}
                {!txQ.isLoading && !txQ.isError && !transactions.length ? <p className="dcpay-empty">暂无交易流水。</p> : null}
                <div className="dcpay-table-wrap">
                  <table>
                    <thead><tr><th>订单 / 商户</th><th>类型</th><th>金额</th><th>状态</th><th>方向</th><th>时间</th></tr></thead>
                    <tbody>
                      {transactions.map((tx: DcpayCardTransaction) => (
                        <tr key={tx.id}>
                          <td>
                            <span className="dcpay-tx-order">{tx.vendor_order_id || '—'}</span>
                            <small className="dcpay-tx-subtext">{txNarrative(tx)}</small>
                            {tx.failure_reason ? <small className="dcpay-tx-subtext is-error">拒绝原因：{tx.failure_reason}</small> : null}
                          </td>
                          <td>{txTypeLabel(tx.transaction_type, locale)}</td>
                          <td>{fmt(String(txDisplayAmount(tx)), 2)} {tx.auth_amount_currency || selected.card_currency}</td>
                          <td><Badge tone={txStatusTone(tx)}>{txStatusLabel(tx.status, locale)}</Badge></td>
                          <td>{fundsDirectionLabel(tx.funds_direction, locale)}</td>
                          <td>{fmtTime(tx.vendor_create_time, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="dcpay-empty dcpay-empty--center">开卡成功后会在这里显示卡片详情和交易流水。</div>
          )}
        </section>
      </section>
      </div>
      <Dialog open={cardDetailOpen && Boolean(selected)} onOpenChange={setCardDetailOpen}>
        <DialogContent className="dcpay-detail-dialog">
          <DialogHeader>
            <DialogTitle>卡片信息</DialogTitle>
            <DialogDescription>
              {sceneLabel(selected?.card_scene || '', t)} · {selected?.card_scheme || 'Card'} · {selected?.card_currency || 'USD'}
            </DialogDescription>
          </DialogHeader>
          <dl className="dcpay-meta dcpay-meta--dialog">
            <div><dt>卡状态</dt><dd><Badge tone={cardStatusTone(selected?.card_status || '')}>{cardStatusLabel(selected?.card_status || '', locale)}</Badge></dd></div>
            <div><dt>余额</dt><dd>{fmt(selected?.amount, 2)} {selected?.card_currency || 'USD'}</dd></div>
            <div><dt>虚拟余额</dt><dd>{fmt(selected?.virtual_amt, 2)} {selected?.card_currency || 'USD'}</dd></div>
            <div><dt>单笔限额</dt><dd>{fmt(selected?.single_limit, 2)}</dd></div>
            <div><dt>月限额</dt><dd>{fmt(selected?.monthly_limit, 2)}</dd></div>
            <div><dt>总限额</dt><dd>{fmt(selected?.total_limit, 2)}</dd></div>
          </dl>
        </DialogContent>
      </Dialog>
      <PlanUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        featureKey="payment_card"
        requiredPlanCode="startup"
      />
      <RealNameVerifyDialog
        open={realNameOpen}
        onOpenChange={setRealNameOpen}
        featureLabel={t('automation.dcpay.featureLabel')}
        onVerified={refreshRealName}
      />
      <Dialog open={openProductsDialog} onOpenChange={(open) => !openCardProcessing && setOpenProductsDialog(open)}>
        <DialogContent className="dcpay-open-dialog">
          <DialogHeader>
            <DialogTitle>{locale === 'en' ? 'Open 5378 global payment card' : '开通 5378 全球支付卡'}</DialogTitle>
            <DialogDescription>
              {locale === 'en'
                ? 'One card segment for cross-border subscriptions, ads, and SaaS payments.'
                : '单一 5378 卡段，覆盖跨境订阅、广告投放与 SaaS 支付场景。'}
            </DialogDescription>
          </DialogHeader>
          {openCardProcessing ? (
            <div className="dcpay-open-dialog__processing" role="status" aria-live="polite" aria-atomic="true">
              <div className="dcpay-open-dialog__processing-panel">
                <span className="dcpay-open-dialog__spinner" aria-hidden="true" />
                <div>
                  <strong>开卡处理中</strong>
                  <span>正在向支付卡供应商提交申请，通常需要十几秒。请不要关闭页面或重复点击。</span>
                </div>
              </div>
            </div>
          ) : null}
          <div className="dcpay-open-dialog__bar">
            <div className="dcpay-open-dialog__summary">
              <span>子账户可用 {fmt(account?.available_amount, 4)} USD</span>
              <span>本月平台点兑换剩余 {fmt(policy?.monthly_remaining_usd, 2)} USD</span>
            </div>
            <Button variant="secondary" onClick={() => syncProductsM.mutate()} disabled={!enabled || syncProductsM.isPending}>
              <RefreshCw size={14} className={syncProductsM.isPending ? 'animate-spin' : ''} /> 同步卡段
            </Button>
          </div>
          {productsLoading ? <p className="dcpay-empty">正在加载已同步卡段...</p> : null}
          {!productsLoading && productsQ.isError ? (
            <p className="dcpay-empty">
              卡段加载失败。
              <Button variant="ghost" size="sm" onClick={() => void productsQ.refetch()}>重试</Button>
            </p>
          ) : null}
          {!productsLoading && !productsQ.isError && !card5378Products.length ? (
            <p className="dcpay-empty">暂无可开 5378 卡段，请先同步卡段。</p>
          ) : null}
          {!productsLoading && !productsQ.isError && card5378Products.length ? (
            <div className="dcpay-product-grid dcpay-product-grid--dialog dcpay-product-grid--5378-single">
              {card5378Products.map(product => openCard5378Product(product))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={topupConfirmOpen} onOpenChange={(open) => !topupM.isPending && setTopupConfirmOpen(open)}>
        <DialogContent className="dcpay-topup-dialog">
          <DialogHeader>
            <DialogTitle>充值支付卡子账户</DialogTitle>
            <DialogDescription>
              确认后将立即扣除平台点，并把对应 USD 充值到支付卡子账户。
            </DialogDescription>
          </DialogHeader>
          <div className="dcpay-topup-dialog__body">
            <section className="dcpay-topup-dialog__section">
              <div className="dcpay-section-head">
                <h2>费用明细</h2>
                <span>平台点支付</span>
              </div>
              <dl className="dcpay-confirm-grid">
                <div><dt>充值金额</dt><dd>{fmt(topupAmountUsd, 2)} USD</dd></div>
                <div><dt>折算人民币</dt><dd>¥{fmt(String(topupAmountCny), 2)}</dd></div>
                <div><dt>运营汇率</dt><dd>{fmt(policy?.usd_cny_rate, 4)}</dd></div>
                <div><dt>扣除平台点</dt><dd>{fmtPoints(topupPoints)} 点</dd></div>
              </dl>
            </section>
            <section className="dcpay-topup-dialog__section">
              <div className="dcpay-section-head">
                <h2>交易明细</h2>
                <span>入账子账户</span>
              </div>
              <dl className="dcpay-confirm-grid">
                <div><dt>当前平台点</dt><dd>{fmtPoints(walletBalance)} 点</dd></div>
                <div><dt>扣后平台点</dt><dd>{fmtPoints(walletBalanceAfterTopup)} 点</dd></div>
                <div><dt>当前子账户</dt><dd>{fmt(account?.available_amount, 4)} USD</dd></div>
                <div><dt>预计充值后</dt><dd>{fmt(String(topupAccountBalanceAfter), 4)} USD</dd></div>
                <div><dt>本月剩余额度</dt><dd>{fmt(policy?.monthly_remaining_usd, 2)} USD</dd></div>
                <div><dt>支付通道</dt><dd>平台点</dd></div>
              </dl>
            </section>
            {topupOverMonthlyLimit ? (
              <p className="dcpay-error">充值金额超过本月剩余额度，请调小金额后再确认。</p>
            ) : null}
            {topupInsufficientPoints ? (
              <p className="dcpay-error">平台点余额不足，当前还差 {fmtPoints(topupPoints - walletBalance)} 点。</p>
            ) : null}
          </div>
          <DialogFooter className="dcpay-topup-dialog__actions">
            <Button variant="secondary" onClick={() => setTopupConfirmOpen(false)} disabled={topupM.isPending}>
              取消
            </Button>
            <Button
              onClick={confirmTopup}
              disabled={topupM.isPending || topupOverMonthlyLimit || topupInsufficientPoints}
            >
              {topupM.isPending ? '扣点中' : '确认充值'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={cardRechargeOpen}
        onOpenChange={(open) => {
          if (rechargeM.isPending) return
          setCardRechargeOpen(open)
          if (!open) setCardRechargeTarget(null)
        }}
      >
        <DialogContent className="dcpay-card-recharge-dialog">
          <DialogHeader>
            <DialogTitle>给卡片充值</DialogTitle>
            <DialogDescription>
              本次充值只会从支付卡子账户扣除 USD，不会直接扣平台点或发起其他支付通道。
            </DialogDescription>
          </DialogHeader>
          <div className="dcpay-topup-dialog__body">
            <section className="dcpay-topup-dialog__section">
              <div className="dcpay-section-head">
                <h2>充值对象</h2>
                <span>{cardRechargeTarget?.card_currency || 'USD'}</span>
              </div>
              <dl className="dcpay-confirm-grid">
                <div><dt>卡号</dt><dd>{cardRechargeTarget?.card_number_masked || cardRechargeTarget?.card_id || '—'}</dd></div>
                <div><dt>当前卡余额</dt><dd>{fmt(cardRechargeTarget?.amount, 2)} {cardRechargeTarget?.card_currency || 'USD'}</dd></div>
                <div><dt>子账户可用</dt><dd>{fmt(account?.available_amount, 4)} USD</dd></div>
                <div><dt>充值后子账户</dt><dd>{fmt(String(cardRechargeAccountBalanceAfter), 4)} USD</dd></div>
              </dl>
            </section>
            <label className="dcpay-form-field">
              <span>充值金额 USD</span>
              <input
                value={cardRechargeAmountUsd}
                onChange={e => setCardRechargeAmountUsd(e.target.value)}
                inputMode="decimal"
                autoFocus
                placeholder="输入 USD 金额"
              />
            </label>
            <dl className="dcpay-confirm-grid dcpay-confirm-grid--compact">
              <div><dt>支付来源</dt><dd>支付卡子账户 USD</dd></div>
              <div><dt>预计卡余额</dt><dd>{fmt(String(cardRechargeTargetBalanceAfter), 2)} {cardRechargeTarget?.card_currency || 'USD'}</dd></div>
            </dl>
            {cardRechargeOverBalance ? (
              <p className="dcpay-error">充值金额超过子账户可用 USD，请先给支付卡子账户充值或调小金额。</p>
            ) : null}
          </div>
          <DialogFooter className="dcpay-topup-dialog__actions">
            <Button variant="secondary" onClick={() => setCardRechargeOpen(false)} disabled={rechargeM.isPending}>
              取消
            </Button>
            <Button
              onClick={confirmCardRecharge}
              disabled={rechargeM.isPending || !cardRechargeValid || cardRechargeOverBalance}
            >
              {rechargeM.isPending ? '提交中' : '确认充值'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={sensitiveOpen} onOpenChange={(open) => !sensitiveM.isPending && closeSensitiveDialog(open)}>
        <DialogContent className="dcpay-sensitive-dialog">
          <DialogHeader>
            <DialogTitle>查看卡片资料</DialogTitle>
            <DialogDescription>
              完整卡号、日期和 CVV 属于敏感信息，仅商户本人二次验证后本次显示。
            </DialogDescription>
          </DialogHeader>
          <div className="dcpay-sensitive-callout" role="alert">
            <ShieldAlert size={18} />
            <div>
              <strong>显示前请确认周围无人可见。</strong>
              <span>运营端不能查看完整卡资料；关闭弹窗后页面不会保留明文。</span>
            </div>
          </div>
          {sensitiveResult ? (
            <div className="dcpay-sensitive-result">
              <dl className="dcpay-secret-grid">
                <div>
                  <dt>卡号</dt>
                  <dd className="dcpay-secret-value-row">
                    <span className="dcpay-secret-value">{sensitiveResult.card_number || '上游未返回'}</span>
                    {sensitiveResult.card_number ? (
                      <button
                        type="button"
                        className="dcpay-secret-copy-btn"
                        onClick={() => void copySensitiveValue(sensitiveResult.card_number, '卡号')}
                        aria-label="复制卡号"
                        title="复制卡号"
                      >
                        <Copy size={14} />
                      </button>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>日期</dt>
                  <dd className="dcpay-secret-value">{sensitiveResult.expiration || '上游未返回'}</dd>
                </div>
                <div>
                  <dt>CVV</dt>
                  <dd className="dcpay-secret-value">{sensitiveResult.cvv || '上游未返回'}</dd>
                </div>
              </dl>
              {!sensitiveResult.available ? (
                <p className="dcpay-error">上游没有返回完整卡号、日期或 CVV，请稍后重试或联系支持。</p>
              ) : null}
            </div>
          ) : (
            <div className="dcpay-sensitive-auth">
              <div className="dcpay-auth-tabs" role="tablist" aria-label="二次验证方式">
                <button
                  type="button"
                  className={sensitiveMethod === 'sms' ? 'is-active' : ''}
                  disabled={!boundPhone}
                  onClick={() => {
                    setSensitiveMethod('sms')
                    setSensitiveError('')
                  }}
                >
                  <MessageSquare size={15} /> 短信验证码
                </button>
                <button
                  type="button"
                  className={sensitiveMethod === 'password' ? 'is-active' : ''}
                  onClick={() => {
                    setSensitiveMethod('password')
                    setSensitiveError('')
                  }}
                >
                  <LockKeyhole size={15} /> 登录密码
                </button>
              </div>
              {sensitiveMethod === 'sms' ? (
                <div className="dcpay-inline-field">
                  <label>
                    <span>短信验证码</span>
                    <input
                      value={sensitiveSmsCode}
                      onChange={e => setSensitiveSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      placeholder="6 位验证码"
                      autoComplete="one-time-code"
                    />
                  </label>
                  <Button
                    variant="secondary"
                    onClick={() => sensitiveSmsM.mutate()}
                    disabled={!boundPhone || sensitiveSmsM.isPending}
                  >
                    {sensitiveSmsM.isPending ? '发送中' : sensitiveNotice ? '重新发送' : '发送验证码'}
                  </Button>
                </div>
              ) : (
                <label className="dcpay-form-field">
                  <span>登录密码</span>
                  <input
                    type="password"
                    value={sensitivePassword}
                    onChange={e => setSensitivePassword(e.target.value)}
                    placeholder="输入当前登录密码"
                    autoComplete="current-password"
                  />
                </label>
              )}
              {!boundPhone && sensitiveMethod === 'sms' ? (
                <p className="dcpay-error">当前账号未绑定手机号，请改用登录密码查看。</p>
              ) : null}
              {sensitiveNotice ? <p className="dcpay-dialog-note">{sensitiveNotice}</p> : null}
              {sensitiveError ? <p className="dcpay-error">{sensitiveError}</p> : null}
            </div>
          )}
          <DialogFooter className="dcpay-topup-dialog__actions">
            <Button variant="secondary" onClick={() => closeSensitiveDialog(false)} disabled={sensitiveM.isPending}>
              关闭
            </Button>
            {!sensitiveResult ? (
              <Button
                onClick={revealSensitiveCard}
                disabled={
                  sensitiveM.isPending
                  || (sensitiveMethod === 'sms' ? !sensitiveSmsCode.trim() : !sensitivePassword)
                }
              >
                {sensitiveM.isPending ? '验证中' : '验证并查看'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
