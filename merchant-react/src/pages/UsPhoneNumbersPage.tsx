import { useEffect, useMemo, useState } from 'react'
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
import { Copy, Info, MessageSquare, ReceiptText, RefreshCw, Smartphone } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { useRegion } from '@xiaoone/region'
import { BillingAPI, type UsPhoneNumber, type UsPhonePackage, type UsPhoneQuote, type UsPhoneSmsMessage } from '../lib/billingApi'
import { usePreferences } from '../app/preferences'
import { PlanUpgradeDialog } from '../components/PlanUpgradeDialog'
import { RealNameVerifyDialog } from '../components/RealNameVerifyDialog'
import { requiresMainlandRealName } from '../lib/kycGate'
import { useRealNameVerified } from '../lib/useRealNameVerified'
import './us-phone-numbers-page.css'

const STATUS_LABEL: Record<UsPhoneNumber['status'], string> = {
  pending_payment: '待支付',
  provisioning: '开通中',
  active: '已开通',
  failed: '失败',
  expired: '已过期',
  canceled: '已取消',
}

const STATUS_TONE: Record<UsPhoneNumber['status'], 'success' | 'warning' | 'danger' | 'muted'> = {
  pending_payment: 'warning',
  provisioning: 'warning',
  active: 'success',
  failed: 'danger',
  expired: 'muted',
  canceled: 'muted',
}

function fmtTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('zh-CN', { hour12: false })
}

function fmtPrice(pkg: UsPhonePackage) {
  const price = Number(pkg.sale_price_cny || 0)
  const upstream = Number(pkg.settlement_price_usd || 0)
  const local = Number.isFinite(price) && price > 0 ? `¥${price.toFixed(2)}` : '免费'
  const base = Number.isFinite(upstream) && upstream > 0 ? `成本 $${upstream.toFixed(2)}` : pkg.provider_name || '外部 OpenAPI'
  return `${local}/月 · ${base}`
}

function fmtCny(value?: string | number | null) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return '¥0.00'
  return `¥${numeric.toFixed(2)}`
}

function fmtPoints(value?: number | null) {
  return `${Math.max(0, Number(value || 0)).toLocaleString('zh-CN')} 点`
}

function displayPhoneNumber(row: UsPhoneNumber) {
  const raw = String(row.phone_number || '').trim()
  if (!raw) return ''
  if (raw.startsWith('+')) return raw
  const digits = raw.replace(/\D/g, '')
  const codeDigits = String(row.phone_code || '').replace(/\D/g, '')
  if (!digits) return raw
  if (codeDigits && digits.startsWith(codeDigits)) return `+${digits}`
  if (codeDigits) return `+${codeDigits}${digits}`
  return raw
}

function numberTitle(row: UsPhoneNumber) {
  const phone = displayPhoneNumber(row)
  if (phone) return phone
  if (row.status === 'provisioning') return '号码生成中'
  if (row.status === 'failed') return '未开通成功'
  return '未获取号码'
}

function packageName(row: UsPhoneNumber) {
  return row.package?.name || String(row.package_snapshot?.name || '美国号码')
}

interface UsPhoneNumbersPageProps {
  embedded?: boolean
}

export function UsPhoneNumbersPage({ embedded = false }: UsPhoneNumbersPageProps) {
  const { t, tpl } = usePreferences()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { region } = useRegion()
  const { verified: realNameVerified, refresh: refreshRealName } = useRealNameVerified()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedNumberId = searchParams.get('number') || ''
  const packagesQ = useQuery({ queryKey: ['us-phone-packages'], queryFn: BillingAPI.usPhonePackages })
  const numbersQ = useQuery({ queryKey: ['us-phone-numbers'], queryFn: BillingAPI.usPhoneNumbers })
  const packages = packagesQ.data?.items || []
  const primaryPackage = packages[0] || null
  const numbers = numbersQ.data?.items || []
  const usPhoneEnabled = packagesQ.data?.enabled !== false
  const [selectedId, setSelectedId] = useState('')
  const [confirmPackage, setConfirmPackage] = useState<UsPhonePackage | null>(null)
  const [transactionsOpen, setTransactionsOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [realNameOpen, setRealNameOpen] = useState(false)
  const [quote, setQuote] = useState<UsPhoneQuote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoteLoadingPackageId, setQuoteLoadingPackageId] = useState('')
  const selected = useMemo(() => numbers.find(item => item.id === selectedId) || numbers[0] || null, [numbers, selectedId])
  const smsQ = useQuery({
    queryKey: ['us-phone-sms', selected?.id],
    queryFn: () => BillingAPI.usPhoneSms(selected!.id),
    enabled: Boolean(selected?.id),
  })
  const transactionRows = useMemo(() => {
    return [...numbers].sort((a, b) => {
      const left = new Date(a.paid_at || a.created_at || 0).getTime()
      const right = new Date(b.paid_at || b.created_at || 0).getTime()
      return right - left
    })
  }, [numbers])

  useEffect(() => {
    const requested = requestedNumberId ? numbers.find(item => item.id === requestedNumberId) : null
    if (requested) {
      if (selectedId !== requested.id)
        setSelectedId(requested.id)
      return
    }
    if (!selectedId && numbers[0])
      setSelectedId(numbers[0].id)
  }, [numbers, requestedNumberId, selectedId])

  const purchaseM = useMutation({
    mutationFn: (packageId: string) => BillingAPI.purchaseUsPhoneNumber(packageId),
    onSuccess: ({ number }) => {
      const phone = displayPhoneNumber(number)
      toast({
        title: phone && number.status === 'active' ? '号码已开通' : '订单已提交',
        description: phone || '上游正在分配号码，请稍后同步状态。',
      })
      setSelectedId(number.id)
      setConfirmPackage(null)
      setQuote(null)
      qc.invalidateQueries({ queryKey: ['us-phone-numbers'] })
    },
    onError: (e: any) => {
      const code = e?.response?.data?.data?.code || e?.response?.data?.code || e?.response?.data?.message
      if (code === 'us_phone_number_not_enabled') {
        setUpgradeOpen(true)
        return
      }
      if (e?.response?.status === 402) {
        toast({ title: '余额不足', description: '请先在账户中心充值或联系运营开通。' })
        navigate('/workbench/account')
        return
      }
      toast({ title: '开通失败', description: e?.response?.data?.message || e?.message || '请稍后重试' })
    },
  })

  const quoteM = useMutation({
    mutationFn: (packageId: string) => BillingAPI.quoteUsPhoneNumber(packageId),
    onMutate: (packageId) => {
      setQuoteLoadingPackageId(packageId)
      setQuote(null)
      setQuoteError('')
    },
    onSuccess: (result) => setQuote(result),
    onError: (e: any) => {
      const code = e?.response?.data?.data?.code || e?.response?.data?.code || e?.response?.data?.message
      if (code === 'us_phone_number_not_enabled') {
        setUpgradeOpen(true)
        return
      }
      const message = e?.response?.data?.message || e?.message || '费用核算失败，请稍后重试'
      setQuoteError(message)
      toast({ title: '暂不能开通', description: message })
    },
    onSettled: () => setQuoteLoadingPackageId(''),
  })

  const refreshM = useMutation({
    mutationFn: (numberId: string) => BillingAPI.refreshUsPhoneNumber(numberId),
    onSuccess: (result) => {
      toast({
        title: result.sms_created > 0 ? '短信已更新' : '暂无新短信',
        description: result.sms_created > 0 ? `新增 ${result.sms_created} 条短信` : '已同步最新状态。',
      })
      qc.invalidateQueries({ queryKey: ['us-phone-numbers'] })
      qc.invalidateQueries({ queryKey: ['us-phone-sms', result.number.id] })
    },
    onError: (e: any) => toast({ title: '同步失败', description: e?.response?.data?.message || e?.message || '请稍后重试' }),
  })

  async function copy(value: string, label: string) {
    if (!value) return
    await navigator.clipboard.writeText(value)
    toast.success(tpl('automation.usphone.toast.copied', label))
  }

  function selectNumber(row: UsPhoneNumber) {
    setSelectedId(row.id)
    const next = new URLSearchParams(searchParams)
    next.set('number', row.id)
    if (embedded)
      next.set('tab', 'numbers')
    setSearchParams(next, { replace: true })
  }

  function requestPurchase(pkg: UsPhonePackage) {
    if (purchaseM.isPending || quoteM.isPending) return
    if (requiresMainlandRealName(region, realNameVerified)) {
      setRealNameOpen(true)
      return
    }
    if (!usPhoneEnabled) {
      setUpgradeOpen(true)
      return
    }
    setConfirmPackage(pkg)
    quoteM.mutate(pkg.id)
  }

  function confirmPurchase() {
    if (!usPhoneEnabled) {
      setUpgradeOpen(true)
      return
    }
    if (!confirmPackage || !quote?.charge.sufficient_balance || purchaseM.isPending) return
    purchaseM.mutate(confirmPackage.id)
  }

  function purchaseButtonLabel(pkg: UsPhonePackage, label = '开通号码') {
    if (quoteLoadingPackageId === pkg.id) return '核算中'
    if (purchaseM.isPending && confirmPackage?.id === pkg.id) return '开通中'
    return label
  }

  const messages = smsQ.data?.items || []
  const pageClass = embedded ? 'uspn-page uspn-page--embedded' : 'uspn-page'
  const activeQuotePackage = quote?.package || confirmPackage
  const charge = quote?.charge
  const includedAddon = quote?.included_addon
  const selectedPhone = selected ? displayPhoneNumber(selected) : ''
  const numbersLoading = numbersQ.isLoading && numbers.length === 0
  const smsLoading = Boolean(selected?.id) && smsQ.isLoading && messages.length === 0

  return (
    <main className={pageClass}>
      {!embedded ? (
        <>
          <section className="uspn-hero">
            <div>
              <span className="uspn-kicker"><Smartphone size={14} /> 美国卡</span>
              <h1>我的号码</h1>
              <p>左侧查看已购号码，右侧查看号码详情与短信收件箱；可从上方套餐继续开通新号码。</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                void numbersQ.refetch()
                if (selected?.id)
                  void smsQ.refetch()
              }}
            >
              <RefreshCw size={16} className={numbersQ.isFetching || smsQ.isFetching ? 'animate-spin' : ''} />
              刷新
            </Button>
          </section>

          <section className="uspn-packages" aria-label="可开通套餐">
            <div className="uspn-section-head">
              <h2>可开通套餐</h2>
              <span>{packages.length} 个</span>
            </div>
            {packagesQ.isLoading ? <p className="uspn-empty">正在加载套餐...</p> : null}
            {!packagesQ.isLoading && packagesQ.isError ? (
              <p className="uspn-empty">
                套餐加载失败。
                <Button variant="ghost" size="sm" onClick={() => void packagesQ.refetch()}>重试</Button>
              </p>
            ) : null}
            {!packagesQ.isLoading && !packagesQ.isError && !packages.length ? <p className="uspn-empty">暂无上架的美国号码套餐，请联系运营配置。</p> : null}
            {!packagesQ.isLoading && !usPhoneEnabled ? <p className="uspn-empty">当前套餐权限不够。仍可点击开通，系统会引导升级套餐。</p> : null}
            <div className="uspn-package-grid">
              {packages.map(pkg => (
                <article className="uspn-package" key={pkg.id}>
                  <div>
                    <b>{pkg.country_code}</b>
                    <h3>{pkg.name}</h3>
                    <p>{pkg.description || `${pkg.region} · ${pkg.provider_name || '外部 OpenAPI'}`}</p>
                  </div>
                  <strong>{fmtPrice(pkg)}</strong>
                  <Button disabled={purchaseM.isPending || quoteLoadingPackageId === pkg.id} onClick={() => requestPurchase(pkg)}>
                    {purchaseButtonLabel(pkg)}
                  </Button>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <div className="uspn-shell">
      {embedded ? (
        <section className="uspn-banner" aria-label="开通美国号码">
          <div className="uspn-banner__title">
            <span className="uspn-kicker"><Smartphone size={14} /> 美国号码</span>
            <h1>号码与短信</h1>
          </div>
          <div className="uspn-banner__summary">
            <p>
              {primaryPackage
                ? `${primaryPackage.name} · ${fmtPrice(primaryPackage)}`
                : '左侧管理已购号码，右侧查看短信收件箱。'}
            </p>
          </div>
          <div className="uspn-banner__actions">
            <Button
              variant="secondary"
              onClick={() => {
                void numbersQ.refetch()
                if (selected?.id)
                  void smsQ.refetch()
              }}
            >
              <RefreshCw size={16} className={numbersQ.isFetching || smsQ.isFetching ? 'animate-spin' : ''} />
              刷新
            </Button>
            {primaryPackage ? (
              <Button disabled={purchaseM.isPending || quoteLoadingPackageId === primaryPackage.id} onClick={() => requestPurchase(primaryPackage)}>
                {purchaseButtonLabel(primaryPackage, '开通')}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setTransactionsOpen(true)}>
              <ReceiptText size={16} />
              交易明细
            </Button>
          </div>
        </section>
      ) : null}

      <section className="uspn-workbench">
        <aside className="uspn-number-list" aria-label="号码列表">
          <div className="uspn-section-head">
            <h2>我的号码</h2>
            <span>{numbers.length} 个</span>
          </div>
          <div className="uspn-number-scroll">
            {numbersLoading ? <p className="uspn-empty">正在加载号码...</p> : null}
            {!numbersLoading && numbersQ.isError ? (
              <p className="uspn-empty">
                号码加载失败。
                <Button variant="ghost" size="sm" onClick={() => void numbersQ.refetch()}>重试</Button>
              </p>
            ) : null}
            {!numbersLoading && !numbersQ.isError && !numbers.length ? <p className="uspn-empty">还没有号码。先从上方套餐开通一个。</p> : null}
            {numbers.map(row => (
              <button
                type="button"
                key={row.id}
                className={selected?.id === row.id ? 'uspn-number is-active' : 'uspn-number'}
                onClick={() => selectNumber(row)}
              >
                <strong>{numberTitle(row)}</strong>
                <em>{row.sms_count} 条短信</em>
              </button>
            ))}
          </div>
        </aside>

        <section className="uspn-sms-panel" aria-label="号码详情与短信列表">
          {selected ? (
            <>
              <div className="uspn-sms-head">
                <div>
                  <span className="uspn-kicker"><MessageSquare size={14} /> 短信收件箱</span>
                  <h2>{numberTitle(selected)}</h2>
                </div>
                <div className="uspn-actions">
                  <Button variant="ghost" onClick={() => setDetailOpen(true)}>
                    <Info size={14} />
                    订单详情
                  </Button>
                  <Button variant="secondary" onClick={() => copy(selectedPhone, '号码')} disabled={!selectedPhone}>
                    <Copy size={14} />
                    复制号码
                  </Button>
                  <Button onClick={() => refreshM.mutate(selected.id)} disabled={refreshM.isPending}>
                    <RefreshCw size={14} className={refreshM.isPending ? 'animate-spin' : ''} />
                    同步短信
                  </Button>
                </div>
              </div>
              {selected.last_error ? <p className="uspn-error">最近同步错误：{selected.last_error}</p> : null}
              {smsLoading ? <p className="uspn-empty">正在加载短信...</p> : null}
              {!smsLoading && smsQ.isError ? (
                <p className="uspn-empty">
                  短信加载失败。
                  <Button variant="ghost" size="sm" onClick={() => void smsQ.refetch()}>重试</Button>
                </p>
              ) : null}
              {!smsLoading && !smsQ.isError && !messages.length ? <p className="uspn-empty">暂无短信。点击“同步短信”从 OpenAPI 拉取最新消息。</p> : null}
              <div className="uspn-message-list">
                {messages.map((msg: UsPhoneSmsMessage) => (
                  <article className="uspn-message" key={msg.id}>
                    <header>
                      <strong>{msg.sender || '未知发送方'}</strong>
                      <time>{fmtTime(msg.received_at)}</time>
                    </header>
                    <p>{msg.content}</p>
                    <button type="button" onClick={() => copy(msg.content, '短信内容')}>复制</button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="uspn-empty uspn-empty--center">{numbersLoading ? '正在加载号码详情...' : '选择一个号码查看短信。'}</div>
          )}
        </section>
      </section>
      </div>
      <Dialog open={detailOpen && Boolean(selected)} onOpenChange={setDetailOpen}>
        <DialogContent className="uspn-detail-dialog">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
            <DialogDescription>
              订单 {selected?.order_no}
              {selected?.upstream_order_no ? ` · 上游 ${selected.upstream_order_no}` : ''}
            </DialogDescription>
          </DialogHeader>
          <dl className="uspn-meta uspn-meta--dialog">
            <div><dt>开通时间</dt><dd>{fmtTime(selected?.activated_at || selected?.created_at)}</dd></div>
            <div><dt>到期时间</dt><dd>{fmtTime(selected?.expires_at)}</dd></div>
            <div><dt>最近同步</dt><dd>{fmtTime(selected?.last_synced_at)}</dd></div>
          </dl>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(confirmPackage)} onOpenChange={(open) => {
        if (!open && !purchaseM.isPending) {
          setConfirmPackage(null)
          setQuote(null)
          setQuoteError('')
        }
      }}>
        <DialogContent className="uspn-confirm-dialog">
          <DialogHeader>
            <DialogTitle>确认开通美国号码</DialogTitle>
            <DialogDescription>
              确认后会立即向上游服务商下单，并从当前商户账户扣除本次费用。
            </DialogDescription>
          </DialogHeader>
          <div className="uspn-confirm-body">
            <div className="uspn-confirm-plan">
              <span className="uspn-kicker"><Smartphone size={14} /> {activeQuotePackage?.country_code || 'US'}</span>
              <h3>{activeQuotePackage?.name || '美国号码套餐'}</h3>
              <p>{activeQuotePackage?.description || `${activeQuotePackage?.region || 'United States'} · ${activeQuotePackage?.provider_name || 'OpenAPI'}`}</p>
            </div>
            {quoteM.isPending ? <p className="uspn-empty">正在核算本次费用...</p> : null}
            {quoteError ? <p className="uspn-error">{quoteError}</p> : null}
            {charge ? (
              <>
                <dl className="uspn-confirm-fees">
                  <div>
                    <dt>本次费用</dt>
                    <dd>{fmtCny(charge.sale_price_cny)}</dd>
                  </div>
                  <div>
                    <dt>扣除平台点</dt>
                    <dd>{fmtPoints(charge.points)}</dd>
                  </div>
                  <div>
                    <dt>当前余额</dt>
                    <dd>{fmtPoints(charge.wallet_balance_points)}</dd>
                  </div>
                  <div>
                    <dt>扣后余额</dt>
                    <dd>{fmtPoints(charge.balance_after_points)}</dd>
                  </div>
                </dl>
                {includedAddon?.applied ? (
                  <p className="uspn-confirm-note">
                    已使用套餐内美国号码名额：{includedAddon.used_before + 1} / {includedAddon.quota}，本次不额外扣费。
                  </p>
                ) : null}
                {!charge.sufficient_balance ? (
                  <p className="uspn-error">平台点余额不足，请先充值或联系运营处理。</p>
                ) : null}
              </>
            ) : null}
          </div>
          <DialogFooter className="uspn-confirm-actions">
            <Button variant="secondary" onClick={() => {
              setConfirmPackage(null)
              setQuote(null)
              setQuoteError('')
            }} disabled={purchaseM.isPending}>
              取消
            </Button>
            {charge && !charge.sufficient_balance ? (
              <Button onClick={() => {
                setConfirmPackage(null)
                navigate('/workbench/account')
              }}>
                去充值
              </Button>
            ) : (
              <Button onClick={confirmPurchase} disabled={!charge || !charge.sufficient_balance || purchaseM.isPending || quoteM.isPending}>
                {purchaseM.isPending ? '开通中' : '确认开通并扣费'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={transactionsOpen} onOpenChange={setTransactionsOpen}>
        <DialogContent className="uspn-transactions-dialog max-w-none">
          <DialogHeader>
            <DialogTitle>{t('automation.usphone.transactions')}</DialogTitle>
            <DialogDescription>
              每次美国号码开通的费用、平台点扣除和订单状态。
            </DialogDescription>
          </DialogHeader>
          {numbersQ.isLoading ? <p className="uspn-empty">正在加载交易明细...</p> : null}
          {!numbersQ.isLoading && !transactionRows.length ? (
            <p className="uspn-empty">暂无开通交易。开通号码后会在这里显示扣费明细。</p>
          ) : null}
          {transactionRows.length ? (
            <div className="uspn-transaction-list" role="list">
              <div className="uspn-transaction-list__head" aria-hidden="true">
                <span>号码 / 订单</span>
                <span>状态</span>
                <span>支付时间</span>
                <span>支付方式</span>
                <span>开通费用</span>
                <span>扣除平台点</span>
              </div>
              {transactionRows.map(row => (
                <article className="uspn-transaction-row" key={row.id} role="listitem">
                  <div className="uspn-transaction-row__identity">
                    <strong>{numberTitle(row)}</strong>
                    <p>{packageName(row)}</p>
                    <small>
                      订单 {row.order_no}
                      {row.upstream_order_no ? ` · 上游 ${row.upstream_order_no}` : ''}
                    </small>
                  </div>
                  <div className="uspn-transaction-row__status">
                    <span>状态</span>
                    <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                  </div>
                  <div className="uspn-transaction-row__cell">
                    <span>支付时间</span>
                    <strong>{row.paid_at ? fmtTime(row.paid_at) : '未支付'}</strong>
                  </div>
                  <div className="uspn-transaction-row__cell">
                    <span>支付方式</span>
                    <strong>平台点</strong>
                  </div>
                  <div className="uspn-transaction-row__cell">
                    <span>开通费用</span>
                    <strong>{fmtCny(row.sale_price_cny)}</strong>
                  </div>
                  <div className="uspn-transaction-row__cell">
                    <span>扣除平台点</span>
                    <strong>{fmtPoints(row.paid_points)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTransactionsOpen(false)}>{t('automation.usphone.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PlanUpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        featureKey="us_phone_number"
        requiredPlanCode="startup"
      />
      <RealNameVerifyDialog
        open={realNameOpen}
        onOpenChange={setRealNameOpen}
        featureLabel={t('automation.usphone.featureLabel')}
        onVerified={refreshRealName}
      />
    </main>
  )
}
