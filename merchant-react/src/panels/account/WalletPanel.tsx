import { useEffect, useState } from 'react'
import { Button, Badge } from '@xiaoone/react-ui'
import { APageHeader } from './APageHeader'
import { Icon } from '../../components/Icon'
import { BillingAPI, type WalletSummary } from '../../lib/billingApi'
import { useAuthStore as useAuth } from '../../store/auth'
import { toast } from '@xiaoone/react-ui'
import { usePreferences } from '../../app/preferences'
import './wallet-panel.css'

export function WalletPanel({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const { t, tpl, locale } = usePreferences()
  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US'
  const pointsLabel = t('account.common.points')
  const auth = useAuth()
  const merchant = auth.currentMerchant()
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    setLoading(true)
    try {
      const w = await BillingAPI.wallet()
      setWallet(w)
      const mid = merchant?.id
      if (mid) {
        const r = await BillingAPI.currentSubscription(mid)
        setSubscription(r.subscription)
      }
    } catch (e: any) {
      toast({ title: t('account.common.loadFailed'), description: e?.message || t('account.common.unknownError') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const balance = Number(wallet?.wallet.balance_points || 0)
  const tokens30d = wallet?.tokens_30d || 0
  const calls30d = wallet?.calls_30d || 0
  const points30d = Number(wallet?.points_30d || 0)
  const merchantName = merchant?.name || merchant?.code || t('account.wallet.myMerchant')
  const merchantCode = merchant?.code || '—'
  const userName = auth.me?.user.name || auth.me?.user.email?.split('@')[0] || t('account.wallet.currentAccount')
  const lowBalance = balance < 10000

  return (
    <section className="apage">
      <APageHeader
        group={t('account.wallet.group')}
        title={t('account.wallet.title')}
        description={t('account.wallet.description')}
        iconName="briefcase"
        service="billing"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>{t('account.common.refresh')}</Button>
            <Button size="sm" onClick={() => onNavigate?.('billing')}>{t('account.wallet.rechargeAndMembership')}</Button>
          </>
        }
      />

      <div className="apage-body">
        <div className="mr-card identity">
          <div className="ident-left">
            <div className="ident-name">
              <strong>{merchantName}</strong>
            </div>
            <div className="ident-meta">
              <span>code <code>{merchantCode}</code></span>
              <span className="dot">·</span>
              <span>{tpl('account.wallet.loginAccount', userName)}</span>
            </div>
          </div>
          <div className="ident-right">
            <div className="metric">
              <small>{t('account.wallet.balance')}</small>
              <strong className={lowBalance ? 'low' : ''}>{balance.toLocaleString()} {pointsLabel}</strong>
            </div>
            <div className="metric">
              <small>{t('account.wallet.tokens30d')}</small>
              <strong>{tokens30d.toLocaleString()}</strong>
            </div>
            <div className="metric">
              <small>{t('account.wallet.calls30d')}</small>
              <strong>{tpl('account.wallet.calls30dValue', calls30d.toLocaleString())}</strong>
            </div>
            <div className="metric">
              <small>{t('account.wallet.spent30d')}</small>
              <strong>{points30d.toLocaleString()} {pointsLabel}</strong>
            </div>
          </div>
        </div>

        {subscription && (
          <div className="mr-card subscription">
            <div className="sub-left">
              <small>{t('account.wallet.currentSubscription')}</small>
              <strong>
                {subscription.plan.name}
                <Badge variant="outline" className={`rounded-full ${subscription.status === 'active' ? 'text-green-500 border-green-200' : 'text-gray-500'}`}>
                  {subscription.status === 'active' ? t('account.wallet.active') : subscription.status}
                </Badge>
              </strong>
              <p className="sub-desc">{subscription.plan.description || '—'}</p>
            </div>
            <div className="sub-right">
              <div className="metric">
                <small>{t('account.wallet.monthlyFee')}</small>
                <strong>¥{Number(subscription.plan.price_cny).toFixed(2)}</strong>
              </div>
              <div className="metric">
                <small>{t('account.wallet.grantedPoints')}</small>
                <strong>{Number(subscription.plan.included_points || 0).toLocaleString()} {pointsLabel}</strong>
              </div>
              <div className="metric">
                <small>{t('account.wallet.periodEnd')}</small>
                <strong>{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString(localeTag) : t('account.wallet.permanent')}</strong>
              </div>
            </div>
          </div>
        )}

        {lowBalance && wallet && (
          <div className="alert-box">
            <Icon name="bolt" size={14} />
            <span>{t('account.billing.lowBalanceWarn')}</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => onNavigate?.('billing')}>{t('account.wallet.goRecharge')}</Button>
          </div>
        )}

        <div className="cards-grid">
          <div className="mr-card link-card" onClick={() => onNavigate?.('billing')}>
            <div className="lc-head">
              <Icon name="bolt" size={16} />
              <strong>{t('account.wallet.membershipCard')}</strong>
            </div>
            <p>{t('account.wallet.membershipCardDesc')}</p>
            <small>billing service · {balance.toLocaleString()} {pointsLabel}</small>
          </div>
          <div className="mr-card link-card" onClick={() => onNavigate?.('usage')}>
            <div className="lc-head">
              <Icon name="sparkles" size={16} />
              <strong>{t('account.wallet.usageCard')}</strong>
            </div>
            <p>{t('account.wallet.usageCardDesc')}</p>
            <small>billing service · {tpl('account.wallet.callsSummary', calls30d.toLocaleString())}</small>
          </div>
        </div>
      </div>
    </section>
  )
}
