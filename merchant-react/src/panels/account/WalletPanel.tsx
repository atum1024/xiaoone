import { useEffect, useMemo, useState } from 'react'
import { Button, Badge } from '@xiaoone/react-ui'
import { APageHeader } from './APageHeader'
import { Icon } from '../../components/Icon'
import { BillingAPI, type WalletSummary } from '../../lib/billingApi'
import { useAuthStore as useAuth } from '../../store/auth'
import { toast } from '@xiaoone/react-ui'
import './wallet-panel.css'

export function WalletPanel({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const auth = useAuth()
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    setLoading(true)
    try {
      const w = await BillingAPI.wallet()
      setWallet(w)
      const mid = auth.me?.current_merchant_id || auth.me?.merchants[0]?.id
      if (mid) {
        const r = await BillingAPI.currentSubscription(mid)
        setSubscription(r.subscription)
      }
    } catch (e: any) {
      toast({ title: '加载失败', description: e?.message || '未知错误' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const balance = Number(wallet?.wallet.balance || 0)
  const tokens30d = wallet?.tokens_30d || 0
  const calls30d = wallet?.calls_30d || 0
  const amount30d = Number(wallet?.amount_30d || 0)
  const merchantName = auth.me?.merchants[0]?.name || '我的商户'
  const merchantCode = auth.me?.merchants[0]?.code || '—'
  const userName = auth.me?.user.name || auth.me?.user.email?.split('@')[0] || '当前账户'
  const lowBalance = balance < 10

  return (
    <section className="apage">
      <APageHeader
        group="钱包概览"
        title="账户主页"
        description="商户钱包 / Token 用量 / 充值 一览；团队管理与团队聊天已独立为顶级模块。"
        iconName="briefcase"
        service="billing"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>刷新</Button>
            <Button size="sm" onClick={() => onNavigate?.('billing')}>充值 / 购买服务</Button>
          </>
        }
      />

      <div className="apage-body">
        <div className="mr-card identity">
          <div className="ident-left">
            <div className="ident-name">
              <strong>{merchantName}</strong>
              {auth.isDemo && <Badge variant="outline" className="rounded-full text-amber-500 border-amber-200">示例数据</Badge>}
            </div>
            <div className="ident-meta">
              <span>code <code>{merchantCode}</code></span>
              <span className="dot">·</span>
              <span>登录账号 {userName}</span>
            </div>
          </div>
          <div className="ident-right">
            <div className="metric">
              <small>当前余额</small>
              <strong className={lowBalance ? 'low' : ''}>¥{balance.toFixed(2)}</strong>
            </div>
            <div className="metric">
              <small>30 天 Token</small>
              <strong>{tokens30d.toLocaleString()}</strong>
            </div>
            <div className="metric">
              <small>30 天调用</small>
              <strong>{calls30d.toLocaleString()} 次</strong>
            </div>
            <div className="metric">
              <small>30 天扣费</small>
              <strong>¥{amount30d.toFixed(4)}</strong>
            </div>
          </div>
        </div>

        {subscription && (
          <div className="mr-card subscription">
            <div className="sub-left">
              <small>当前订阅</small>
              <strong>
                {subscription.plan.name}
                <Badge variant="outline" className={`rounded-full ${subscription.status === 'active' ? 'text-green-500 border-green-200' : 'text-gray-500'}`}>
                  {subscription.status === 'active' ? '生效中' : subscription.status}
                </Badge>
              </strong>
              <p className="sub-desc">{subscription.plan.description || '—'}</p>
            </div>
            <div className="sub-right">
              <div className="metric">
                <small>月费</small>
                <strong>¥{Number(subscription.plan.monthly_price).toFixed(2)}</strong>
              </div>
              <div className="metric">
                <small>含余额</small>
                <strong>¥{Number(subscription.plan.included_credits).toFixed(2)}</strong>
              </div>
              <div className="metric">
                <small>本期至</small>
                <strong>{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('zh-CN') : '永久'}</strong>
              </div>
            </div>
          </div>
        )}

        {lowBalance && wallet && (
          <div className="alert-box">
            <Icon name="bolt" size={14} />
            <span>账户余额已低于 ¥10，建议尽快充值，避免影响 AI 服务。</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => onNavigate?.('billing')}>前往充值</Button>
          </div>
        )}

        <div className="cards-grid">
          <div className="mr-card link-card" onClick={() => onNavigate?.('billing')}>
            <div className="lc-head">
              <Icon name="bolt" size={16} />
              <strong>充值与付款</strong>
            </div>
            <p>国内微信 / 支付宝，海外数字货币；支持余额充值与服务购买。</p>
            <small>billing service · 余额 ¥{balance.toFixed(2)}</small>
          </div>
          <div className="mr-card link-card" onClick={() => onNavigate?.('usage')}>
            <div className="lc-head">
              <Icon name="sparkles" size={16} />
              <strong>Token 用量</strong>
            </div>
            <p>近 30 天 AI / 翻译调用明细，按模型 / 业务分布。</p>
            <small>billing service · {calls30d} 次调用</small>
          </div>
        </div>
      </div>
    </section>
  )
}
