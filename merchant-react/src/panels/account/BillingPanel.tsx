import { useEffect, useMemo, useState } from 'react'
import {
  Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, Input, RadioGroup, RadioGroupItem, Select,
  SelectTrigger, SelectValue, SelectContent, SelectItem, toast,
  DataTable, Pagination, Empty
} from '@xiaoone/react-ui'
import { APageHeader } from './APageHeader'
import { BillingAPI, type MerchantPlan, type MerchantSubscription, type ModelPricing, type PaymentChannel, type PaymentRegion, type TransactionRecord, type WalletSummary } from '../../lib/billingApi'
import { useAuthStore as useAuth } from '../../store/auth'
import './billing-panel.css'

const QUICK_AMOUNTS = ['50', '100', '500', '1000']

const PAYMENT_OPTIONS: Record<PaymentRegion, Array<{ value: PaymentChannel; label: string; hint: string }>> = {
  domestic: [
    { value: 'wechat_pay', label: '微信支付', hint: '适合中国大陆用户扫码支付' },
    { value: 'alipay', label: '支付宝', hint: '适合中国大陆用户扫码或跳转支付' },
  ],
  overseas: [
    { value: 'usdt_trc20', label: 'USDT-TRC20', hint: '海外默认数字货币通道' },
    { value: 'usdt_erc20', label: 'USDT-ERC20', hint: '适合以太坊网络付款' },
    { value: 'btc', label: 'BTC', hint: '比特币付款' },
    { value: 'eth', label: 'ETH', hint: '以太坊付款' },
  ],
}

function defaultChannel(region: PaymentRegion): PaymentChannel {
  return region === 'domestic' ? 'wechat_pay' : 'usdt_trc20'
}

const KIND_META: Record<string, { label: string; type: string; textColor: string }> = {
  topup: { label: '充值', type: 'outline', textColor: 'text-green-500 border-green-200' },
  charge: { label: '扣费', type: 'outline', textColor: 'text-red-500 border-red-200' },
  purchase: { label: '服务购买', type: 'outline', textColor: 'text-indigo-500 border-indigo-200' },
  refund: { label: '退款', type: 'outline', textColor: 'text-orange-500 border-orange-200' },
  adjust: { label: '调账', type: 'outline', textColor: 'text-gray-500 border-gray-200' },
  grant: { label: '系统赠送', type: 'outline', textColor: 'text-blue-500 border-blue-200' },
}

export function BillingPanel() {
  const auth = useAuth()
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [records, setRecords] = useState<TransactionRecord[]>([])
  const [pricing, setPricing] = useState<ModelPricing[]>([])
  const [plans, setPlans] = useState<MerchantPlan[]>([])
  const [subscription, setSubscription] = useState<MerchantSubscription | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterKind, setFilterKind] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  const [topupOpen, setTopupOpen] = useState(false)
  const [topupAmount, setTopupAmount] = useState('100')
  const [topupNote, setTopupNote] = useState('')
  const [topupRegion, setTopupRegion] = useState<PaymentRegion>('domestic')
  const [topupChannel, setTopupChannel] = useState<PaymentChannel>('wechat_pay')
  const [topupSubmitting, setTopupSubmitting] = useState(false)

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlanCode, setSelectedPlanCode] = useState('')
  const [purchaseRegion, setPurchaseRegion] = useState<PaymentRegion>('domestic')
  const [purchaseChannel, setPurchaseChannel] = useState<PaymentChannel>('wechat_pay')
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false)

  const loadAll = async () => {
    setLoading(true)
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
    } catch (e: any) {
      toast({ title: '加载失败', description: e?.message || '未知错误' })
    } finally {
      setLoading(false)
    }
  }

  const loadPricing = async () => {
    try {
      const list = await BillingAPI.pricing()
      setPricing(list.items)
    } catch {}
  }

  useEffect(() => {
    loadAll()
  }, [filterKind, page, pageSize])

  useEffect(() => {
    loadPricing()
  }, [])

  const submitTopup = async () => {
    const n = Number(topupAmount)
    if (!Number.isFinite(n) || n <= 0) {
      toast({ title: '请输入正确的金额' })
      return
    }
    setTopupSubmitting(true)
    try {
      await BillingAPI.topup(String(n), topupNote || `自助充值 ¥${n}`, {
        payment_region: topupRegion,
        payment_channel: topupChannel,
      })
      toast({ title: '充值成功', description: `已通过 ${PAYMENT_OPTIONS[topupRegion].find(x => x.value === topupChannel)?.label || '支付通道'} 入账` })
      setTopupOpen(false)
      loadAll()
    } catch (e: any) {
      toast({ title: '充值失败', description: e?.message || '未知错误' })
    } finally {
      setTopupSubmitting(false)
    }
  }

  const selectedPlan = useMemo(() => plans.find(p => p.code === selectedPlanCode) || null, [plans, selectedPlanCode])

  const openPurchase = (plan: MerchantPlan) => {
    setSelectedPlanCode(plan.code)
    setPurchaseRegion('domestic')
    setPurchaseChannel('wechat_pay')
    setPurchaseOpen(true)
  }

  const submitPurchase = async () => {
    if (!selectedPlan) return
    setPurchaseSubmitting(true)
    try {
      const res = await BillingAPI.purchasePlan(selectedPlan.code, {
        payment_region: purchaseRegion,
        payment_channel: purchaseChannel,
      })
      toast({ title: '服务购买成功', description: `订单 ${res.order_id} 已开通 ${res.subscription.plan.name}` })
      setPurchaseOpen(false)
      loadAll()
    } catch (e: any) {
      toast({ title: '购买失败', description: e?.message || '未知错误' })
    } finally {
      setPurchaseSubmitting(false)
    }
  }

  const balance = Number(wallet?.wallet.balance || 0)
  const lowBalance = balance < 10

  const columns = [
    {
      key: 'created_at',
      title: '时间',
      width: 180,
      render: (row: TransactionRecord) => <span className="text-[var(--xiaoone-fg-mute)]">{new Date(row.created_at).toLocaleString('zh-CN', { hour12: false })}</span>
    },
    {
      key: 'kind',
      title: '类型',
      width: 110,
      render: (row: TransactionRecord) => {
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
      title: '说明',
      render: (row: TransactionRecord) => (
        <div>
          <div>{row.note || '—'}</div>
          {row.operator && <div className="text-[var(--xiaoone-fg-mute)]">操作者：{row.operator}</div>}
        </div>
      )
    },
    {
      key: 'amount',
      title: '金额',
      width: 140,
      render: (row: TransactionRecord) => {
        const n = Number(row.amount || 0)
        const isOutflow = row.kind === 'charge' || row.kind === 'purchase'
        const sign = isOutflow ? '-' : '+'
        return <strong className={isOutflow ? 'text-red-500' : 'text-green-600'}>{sign}¥{n.toFixed(4)}</strong>
      }
    },
    {
      key: 'balance_after',
      title: '余额',
      width: 120,
      render: (row: TransactionRecord) => <span className="text-[var(--xiaoone-fg-mute)]">¥{Number(row.balance_after).toFixed(2)}</span>
    },
    {
      key: 'is_demo',
      title: '状态',
      width: 80,
      render: (row: TransactionRecord) => (
        <Badge variant="outline" className={`rounded-full ${row.is_demo ? 'text-amber-500 border-amber-200' : 'text-green-500 border-green-200'}`}>
          {row.is_demo ? '示例' : '实际'}
        </Badge>
      )
    },
  ]

  return (
    <section className="apage">
      <APageHeader
        group="充值与交易"
        title="充值与付款"
        description="账户余额充值、服务购买、扣费流水统一在 billing service 记账。"
        iconName="bolt"
        service="billing service"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>刷新</Button>
            <Button size="sm" onClick={() => {
              setTopupAmount('100')
              setTopupNote('')
              setTopupRegion('domestic')
              setTopupChannel('wechat_pay')
              setTopupOpen(true)
            }}>立即充值</Button>
          </>
        }
      />

      <div className="apage-body">
        {wallet && (
          <div className="balance-card">
            <div className="balance-main">
              <div className="balance-label">当前余额（{wallet.wallet.currency}）</div>
              <div className="balance-value">¥{balance.toFixed(2)}</div>
              <div className="balance-stats">
                <span>累计充值 <strong>¥{Number(wallet.wallet.total_topup).toFixed(2)}</strong></span>
                <span className="dot">·</span>
                <span>累计扣费 <strong>¥{Number(wallet.wallet.total_charge).toFixed(4)}</strong></span>
                <span className="dot">·</span>
                <span>近 30 天 Token <strong>{wallet.tokens_30d.toLocaleString()}</strong></span>
              </div>
              {lowBalance && <div className="warn">余额已低于 ¥10，建议尽快充值，避免影响 AI 服务。</div>}
            </div>
            <div className="balance-actions">
              <Button onClick={() => setTopupOpen(true)}>充值</Button>
              <small>国内支持微信 / 支付宝；海外支持数字货币。</small>
            </div>
          </div>
        )}

        {plans.length > 0 && (
          <div className="service-card">
            <div className="service-head">
              <div>
                <strong>购买服务</strong>
                <small>当前服务：{subscription?.plan.name || '未开通'}。国内微信 / 支付宝付款，海外数字货币付款。</small>
              </div>
            </div>
            <div className="service-grid">
              {plans.map(plan => {
                const active = subscription?.plan.code === plan.code && subscription?.status === 'active'
                return (
                  <article key={plan.code} className={`service-plan ${active ? 'is-current' : ''}`}>
                    <div className="service-plan-top">
                      <strong>{plan.name}</strong>
                      {active && <Badge variant="outline" className="rounded-full text-green-500 border-green-200">当前</Badge>}
                    </div>
                    <p>{plan.description || '标准服务套餐'}</p>
                    <div className="service-price">
                      ¥{Number(plan.monthly_price).toFixed(2)}
                      <span>/{plan.billing_period === 'annual' ? '年' : plan.billing_period === 'quarterly' ? '季' : plan.billing_period === 'perpetual' ? '买断' : '月'}</span>
                    </div>
                    <div className="service-meta">
                      <span>含余额 ¥{Number(plan.included_credits).toFixed(2)}</span>
                      <span>国内/海外支付</span>
                    </div>
                    <Button size="sm" variant={active ? 'outline' : 'default'} onClick={() => openPurchase(plan)}>
                      {active ? '续费当前服务' : '购买服务'}
                    </Button>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {pricing.length > 0 && (
          <div className="pricing-card">
            <div className="pricing-head">
              <strong>模型定价</strong>
              <small>所有 AI 调用按以下价格计费（单位：元 / 1k tokens）</small>
            </div>
            <div className="pricing-grid">
              {pricing.map(p => (
                <div key={p.model} className="pricing-item">
                  <div className="model-row">
                    <strong>{p.display_name}</strong>
                    <Badge variant="outline" className="rounded-full text-xs font-normal">{p.provider}</Badge>
                  </div>
                  <div className="model-meta">
                    <span>输入 ¥{Number(p.price_input_per_1k).toFixed(4)}</span>
                    <span className="dot">·</span>
                    <span>输出 ¥{Number(p.price_output_per_1k).toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="table-wrap">
          <div className="table-head">
            <strong>交易流水</strong>
            <Select value={filterKind} onValueChange={(val) => {
              setFilterKind(val)
              setPage(1)
            }}>
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue placeholder="所有类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                {Object.entries(KIND_META).map(([k, meta]) => (
                  <SelectItem key={k} value={k}>{meta.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {records.length === 0 && !loading ? (
            <div className="py-8"><Empty description="暂无交易" /></div>
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
        </div>
      </div>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>账户充值</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">充值金额（CNY）</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">¥</span>
                <Input
                  className="pl-8"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">快速选择</label>
              <RadioGroup value={topupAmount} onValueChange={setTopupAmount} className="flex gap-2">
                {QUICK_AMOUNTS.map(amt => (
                  <div key={amt} className="flex items-center space-x-2">
                    <RadioGroupItem value={amt} id={`amt-${amt}`} />
                    <label htmlFor={`amt-${amt}`} className="text-sm font-medium">¥{amt}</label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">备注 (可选)</label>
              <Input value={topupNote} onChange={e => setTopupNote(e.target.value)} placeholder="例如：项目预付款" />
            </div>
            <p className="text-xs text-[var(--xiaoone-fg-mute)]">开发模式将直接为账户加上对应金额，无需走支付通道。</p>
            <div className="grid gap-2">
              <label className="text-sm font-medium">付款地区</label>
              <Select value={topupRegion} onValueChange={(val) => {
                const next = val as PaymentRegion
                setTopupRegion(next)
                setTopupChannel(defaultChannel(next))
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestic">国内</SelectItem>
                  <SelectItem value="overseas">海外</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pay-choice-grid">
              {PAYMENT_OPTIONS[topupRegion].map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`pay-choice ${topupChannel === option.value ? 'is-active' : ''}`}
                  onClick={() => setTopupChannel(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupOpen(false)}>取消</Button>
            <Button onClick={submitTopup} disabled={topupSubmitting}>确认充值</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>购买服务</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="grid gap-4 py-4">
              <div className="purchase-summary">
                <strong>{selectedPlan.name}</strong>
                <span>¥{Number(selectedPlan.monthly_price).toFixed(2)}</span>
                <p>{selectedPlan.description || '标准服务套餐'}</p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">付款地区</label>
                <Select value={purchaseRegion} onValueChange={(val) => {
                  const next = val as PaymentRegion
                  setPurchaseRegion(next)
                  setPurchaseChannel(defaultChannel(next))
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">国内</SelectItem>
                    <SelectItem value="overseas">海外</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pay-choice-grid">
                {PAYMENT_OPTIONS[purchaseRegion].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`pay-choice ${purchaseChannel === option.value ? 'is-active' : ''}`}
                    onClick={() => setPurchaseChannel(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.hint}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--xiaoone-fg-mute)]">当前为开发态模拟支付：确认后会记录服务购买流水并开通套餐。</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseOpen(false)}>取消</Button>
            <Button onClick={submitPurchase} disabled={purchaseSubmitting || !selectedPlan}>确认付款并开通</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
