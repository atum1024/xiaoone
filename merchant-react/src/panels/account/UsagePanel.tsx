import { useEffect, useState, useMemo, type CSSProperties } from 'react'
import {
  Badge,
  Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  DataTable, Pagination, Empty, toast, Progress
} from '@xiaoone/react-ui'
import { APageHeader } from './APageHeader'
import {
  BillingAPI,
  type ModelCostRate,
  type UsageEvent,
  type UsageSummary,
  type WalletSummary,
} from '../../lib/billingApi'
import { usePreferences } from '../../app/preferences'
import './usage-panel.css'

function fmtAmount(a: string | number, pointsLabel: string) {
  const n = Number(a || 0)
  return `${n.toLocaleString()} ${pointsLabel}`
}

function fmtTokens(value?: string | number | null): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n <= 0)
    return '—'
  return n >= 1000 ? Math.round(n).toLocaleString('zh-CN') : n.toFixed(2)
}

function numeric(value?: string | number | null): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function pricingMeta(
  p: ModelCostRate,
  t: (key: string) => string,
  tpl: (key: string, ...parts: string[]) => string,
): { title: string; detail: string } {
  if (numeric(p.tool_price) > 0) {
    const unit = p.model.toLowerCase().includes('seedream')
      ? t('account.usage.mediaUnitImage')
      : t('account.usage.mediaUnitTimes')
    const loadedCost = numeric(p.tool_price)
      * numeric(p.exchange_rate || '1')
      * (1 + numeric(p.channel_cost_rate) + numeric(p.risk_loss_rate))
    const sale = loadedCost * numeric(p.markup_multiplier)
    const points = Math.ceil(sale * 1000 - 1e-9)
    return {
      title: tpl('account.usage.pricingPointsPerUnit', points.toLocaleString('zh-CN'), unit),
      detail: tpl(
        'account.usage.pricingCostSale',
        fmtCny(loadedCost),
        unit,
        fmtCny(sale),
        unit,
      ),
    }
  }
  return {
    title: tpl('account.usage.pricingTokensPerCny', fmtTokens(p.tokens_per_cny_blended)),
    detail: tpl('account.usage.pricingInOut', fmtTokens(p.tokens_per_cny_input), fmtTokens(p.tokens_per_cny_output)),
  }
}

function fmtCny(value: number): string {
  if (!Number.isFinite(value) || value <= 0)
    return '—'
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

export function UsagePanel() {
  const { t, tpl, locale } = usePreferences()
  const localeTag = locale === 'zh' ? 'zh-CN' : 'en-US'
  const pointsLabel = t('account.common.points')

  const OP_LABEL = useMemo(() => ({
    dispatch: t('account.usage.opDispatch'),
    stream: t('account.usage.opStream'),
    translate: t('account.usage.opTranslate'),
    suggest: t('account.usage.opSuggest'),
    persona: t('account.usage.opPersona'),
  }), [t])

  const DOMAIN_LABEL = useMemo(() => ({
    marketing: t('account.usage.domainMarketing'),
    support: t('account.usage.domainSupport'),
    agency: t('account.usage.domainAgency'),
    kefu: t('account.usage.domainKefu'),
    general: t('account.usage.domainGeneral'),
  }), [t])

  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterOp, setFilterOp] = useState<string>('all')
  const [filterDomain, setFilterDomain] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [pricing, setPricing] = useState<ModelCostRate[]>([])

  const trendMaxTokens = useMemo(() => {
    if (!summary?.last_7_days?.length) return 1
    return Math.max(1, ...summary.last_7_days.map(d => d.tokens))
  }, [summary])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [w, s, list, pricingResp] = await Promise.all([
        BillingAPI.wallet(),
        BillingAPI.summary(),
        BillingAPI.usageList({
          operation: filterOp === 'all' ? undefined : filterOp,
          domain: filterDomain === 'all' ? undefined : filterDomain,
          page,
          page_size: pageSize,
        }),
        BillingAPI.pricing(),
      ])
      setWallet(w)
      setSummary(s)
      setEvents(list.items)
      setTotal(list.total)
      setPricing(pricingResp.items)
    } catch (e: any) {
      toast({ title: t('account.common.loadFailed'), description: e?.message || t('account.common.unknownError') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [filterOp, filterDomain, page, pageSize])

  const columns = useMemo(() => [
    {
      key: 'created_at',
      title: t('account.billing.colTime'),
      width: 160,
      render: (row: UsageEvent) => <span className="text-[var(--xiaoone-fg-mute)]">{new Date(row.created_at).toLocaleString(localeTag, { hour12: false })}</span>
    },
    {
      key: 'model_op',
      title: t('account.usage.colModelOp'),
      render: (row: UsageEvent) => (
        <div>
          <div>
            <strong>{row.model}</strong>
          </div>
          <div className="text-[var(--xiaoone-fg-mute)]">{OP_LABEL[row.operation as keyof typeof OP_LABEL] || row.operation} · {DOMAIN_LABEL[row.domain as keyof typeof DOMAIN_LABEL] || row.domain}</div>
        </div>
      )
    },
    {
      key: 'tokens',
      title: 'Token',
      width: 160,
      render: (row: UsageEvent) => (
        <div>
          <span>{row.total_tokens.toLocaleString()}</span>
          <div className="text-[var(--xiaoone-fg-mute)]">{tpl('account.usage.inputOutput', String(row.prompt_tokens), String(row.completion_tokens))}</div>
        </div>
      )
    },
    {
      key: 'amount',
      title: t('account.usage.colPlatformPoints'),
      width: 120,
      render: (row: UsageEvent) => <strong>{fmtAmount(row.points_charged, pointsLabel)}</strong>
    },
  ], [DOMAIN_LABEL, OP_LABEL, localeTag, pointsLabel, t, tpl])

  return (
    <section className="apage">
      <APageHeader
        title={t('account.usage.title')}
        description={t('account.usage.description')}
        iconName="sparkles"
        compact
        actions={<Button size="sm" onClick={loadAll} disabled={loading}>{t('account.common.refresh')}</Button>}
      />

      <div className="apage-body">
        {wallet && (
          <div className="overview-grid">
            <div className="ov-card balance">
              <div className="ov-label">{t('account.usage.balance')}</div>
              <div className="ov-value">{Number(wallet.wallet.balance_points).toLocaleString()}</div>
              <div className="ov-foot">{wallet.wallet.currency} · {tpl('account.usage.purchased', Number(wallet.wallet.purchased_points).toLocaleString())}</div>
            </div>
            <div className="ov-card">
              <div className="ov-label">{t('account.usage.tokens30d')}</div>
              <div className="ov-value">{wallet.tokens_30d.toLocaleString()}</div>
              <div className="ov-foot">{tpl('account.usage.calls30d', String(wallet.calls_30d))}</div>
            </div>
            <div className="ov-card">
              <div className="ov-label">{t('account.usage.spent30d')}</div>
              <div className="ov-value">{Number(wallet.points_30d).toLocaleString()} {pointsLabel}</div>
              <div className="ov-foot">{tpl('account.usage.totalSpent', Number(wallet.wallet.spent_points).toLocaleString())}</div>
            </div>
          </div>
        )}

        {summary && (
          <div className="dist-grid">
            <div className="dist-card">
              <div className="dist-title">{t('account.usage.trendTitle')}</div>
              <div className="trend">
                {(summary.last_7_days || []).map(d => (
	                  <div key={d.date} className="trend-bar">
	                    <div
	                      className="bar"
	                      style={{ '--trend-ratio': String(Math.max(0.05, d.tokens / trendMaxTokens)) } as CSSProperties}
	                      title={tpl('account.usage.trendTooltip', d.tokens.toLocaleString(), fmtAmount(d.points, pointsLabel))}
	                    />
                    <small>{d.date.slice(5)}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="dist-card">
              <div className="dist-title">{t('account.usage.byModel')}</div>
              <ul className="dist-list">
                {(summary.by_model || []).map(m => (
                  <li key={m.model}>
                    <div className="dist-line">
                      <strong>{m.model}</strong>
                      <span>{tpl('account.usage.modelLine', m.tokens.toLocaleString(), fmtAmount(m.points, pointsLabel))}</span>
                    </div>
                    <Progress value={Math.round((m.tokens / (summary.by_model[0]?.tokens || 1)) * 100)} className="h-1.5" />
                  </li>
                ))}
                {(!summary.by_model || summary.by_model.length === 0) && (
                  <Empty description={t('account.common.noData')} className="mt-4" />
                )}
              </ul>
            </div>
            <div className="dist-card">
              <div className="dist-title">{t('account.usage.byDomain')}</div>
              <ul className="dist-list">
                {(summary.by_domain || []).map(d => (
                  <li key={d.domain}>
                    <div className="dist-line">
                      <strong>{DOMAIN_LABEL[d.domain as keyof typeof DOMAIN_LABEL] || d.domain}</strong>
                      <span>{tpl('account.usage.domainLine', String(d.calls), d.tokens.toLocaleString())}</span>
                    </div>
                    <Progress value={Math.round((d.tokens / (summary.by_domain[0]?.tokens || 1)) * 100)} className="h-1.5 [&>div]:bg-green-500" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {pricing.length > 0 && (
          <div className="pricing-card">
            <div className="pricing-head">
              <strong>{t('account.usage.pricingTitle')}</strong>
              <small>{t('account.usage.pricingDesc')}</small>
            </div>
            <div className="pricing-grid">
              {pricing.map((p) => {
                const meta = pricingMeta(p, t, tpl)
                return (
                  <div key={p.model} className="pricing-item">
                    <div className="model-row">
                      <strong>{p.display_name}</strong>
                      <Badge variant="outline" className="rounded-full text-xs font-normal">{p.provider}</Badge>
                    </div>
                    <div className="model-meta model-meta--stack">
                      <span>{meta.title}</span>
                      <span>{meta.detail}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="table-wrap">
          <div className="table-head">
            <strong>{t('account.usage.details')}</strong>
            <div className="filters">
              <Select value={filterOp} onValueChange={v => { setFilterOp(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-8 text-sm">
                  <SelectValue placeholder={t('account.usage.opPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('account.usage.allOps')}</SelectItem>
                  {Object.entries(OP_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDomain} onValueChange={v => { setFilterDomain(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-sm">
                  <SelectValue placeholder={t('account.usage.domainPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('account.usage.allDomains')}</SelectItem>
                  {Object.entries(DOMAIN_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DataTable columns={columns} data={events} rowKey={r => String(r.id)} emptyText={loading ? t('account.common.loading') : t('account.usage.noRecords')} />
          
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
        </div>
      </div>
    </section>
  )
}
