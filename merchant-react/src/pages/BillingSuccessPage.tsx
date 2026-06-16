import { useEffect, useMemo, useState } from 'react'
import { Button } from '@xiaoone/react-ui'
import { useNavigate } from 'react-router'
import { BillingAPI, type CheckoutStatusResult } from '../lib/billingApi'
import { useAuthStore } from '../store/auth'
import { usePreferences } from '../app/preferences'

const MAX_POLL_TIMES = 60
const POLL_INTERVAL_MS = 2000

type ViewState = 'pending' | 'paid' | 'failed' | 'expired' | 'timeout' | 'missing_order'

function formatCny(value?: string) {
  const n = Number(value || 0)
  if (!Number.isFinite(n))
    return value || '0.00'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isLessAmount(left?: string, right?: string) {
  const l = Number(left || 0)
  const r = Number(right || 0)
  return Number.isFinite(l) && Number.isFinite(r) && l < r
}

export function BillingSuccessPage() {
  const navigate = useNavigate()
  const { t, tpl } = usePreferences()
  const fetchMe = useAuthStore(state => state.fetchMe)
  const search = new URLSearchParams(window.location.search)
  const queryOrderId = search.get('order_id') || search.get('out_trade_no') || ''
  const [orderId, setOrderId] = useState(queryOrderId)
  const [state, setState] = useState<ViewState>(queryOrderId ? 'pending' : 'missing_order')
  const [amount, setAmount] = useState('')
  const [statusInfo, setStatusInfo] = useState<CheckoutStatusResult | null>(null)

  // TOP- prefix = point_recharge; navigate back to account page so the user sees the new record
  const isRecharge = statusInfo?.purpose === 'point_recharge' || orderId.startsWith('TOP-')

  useEffect(() => {
    if (queryOrderId) {
      sessionStorage.setItem('pending_checkout_id', queryOrderId)
      setOrderId(queryOrderId)
      setState('pending')
      return
    }
    const cached = sessionStorage.getItem('pending_checkout_id') || ''
    if (cached) {
      setOrderId(cached)
      setState('pending')
      return
    }
    setState('missing_order')
  }, [queryOrderId])

  useEffect(() => {
    if (!orderId) {
      return
    }
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let polls = 0

    const poll = async () => {
      if (stopped) {
        return
      }
      try {
        const status: CheckoutStatusResult = await BillingAPI.checkoutStatus(orderId)
        setStatusInfo(status)
        setAmount(status.amount_cny)
        if (status.status === 'paid') {
          sessionStorage.removeItem('pending_checkout_id')
          void fetchMe().catch(() => {})
          setState('paid')
          return
        }
        if (status.status === 'failed') {
          sessionStorage.removeItem('pending_checkout_id')
          setState('failed')
          return
        }
        if (status.status === 'expired') {
          sessionStorage.removeItem('pending_checkout_id')
          setState('expired')
          return
        }
      } catch {
        // Keep polling within timeout window; callback may arrive late.
      }
      polls += 1
      if (polls >= MAX_POLL_TIMES) {
        setState('timeout')
        return
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    void poll()

    return () => {
      stopped = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [fetchMe, orderId])

  const title = useMemo(() => {
    if (state === 'paid') return isRecharge ? t('account.success.rechargeSuccess') : t('account.success.paymentSuccess')
    if (state === 'failed') return t('account.success.paymentFailed')
    if (state === 'expired') return t('account.success.orderExpired')
    if (state === 'timeout') return t('account.success.confirmTimeout')
    if (state === 'missing_order') return t('account.success.missingOrder')
    return t('account.success.confirming')
  }, [isRecharge, state, t])

  const description = useMemo(() => {
    if (state === 'paid') {
      const payable = statusInfo?.payable_amount_cny || amount
      const display = statusInfo?.display_amount_cny || statusInfo?.credited_amount_cny || amount
      if (isRecharge) {
        const suffix = isLessAmount(payable, display) ? tpl('account.success.actualPaid', formatCny(payable)) : ''
        return display
          ? tpl('account.success.rechargeCredited', formatCny(display), suffix)
          : t('account.success.rechargeConfirmed')
      }
      return amount
        ? tpl('account.success.paidAmount', formatCny(payable))
        : t('account.success.paymentConfirmed')
    }
    if (state === 'failed') return t('account.success.failedDesc')
    if (state === 'expired') return t('account.success.expiredDesc')
    if (state === 'timeout') return t('account.success.timeoutDesc')
    if (state === 'missing_order') return t('account.success.missingOrderDesc')
    return t('account.success.pendingDesc')
  }, [amount, isRecharge, state, statusInfo, t, tpl])

  return (
    <section className="apage">
      <div className="apage-body" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 36 }}>
        <div className="service-card" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>{title}</h1>
          <p style={{ color: 'var(--xiaoone-fg-mute)', marginBottom: 10 }}>{description}</p>
          {orderId ? <p style={{ color: 'var(--xiaoone-fg-mute)', marginBottom: 24 }}>{tpl('account.common.orderId', orderId)}</p> : null}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Button variant="outline" onClick={() => window.location.reload()}>{t('account.success.refreshStatus')}</Button>
            <Button onClick={() => navigate(isRecharge ? '/workbench/account' : '/workbench')}>{isRecharge ? t('account.success.viewAccount') : t('account.success.enterWorkbench')}</Button>
          </div>
        </div>
      </div>
    </section>
  )
}
