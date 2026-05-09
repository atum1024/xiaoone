import { useEffect, useState, useMemo } from 'react'
import {
  Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Badge, DataTable, Pagination, Empty, toast, Progress
} from '@xiaoone/react-ui'
import { APageHeader } from './APageHeader'
import { BillingAPI, type UsageEvent, type UsageSummary, type WalletSummary } from '../../lib/billingApi'
import './usage-panel.css'

const OP_LABEL: Record<string, string> = {
  dispatch: '聊天 (非流式)',
  stream: '聊天 (流式)',
  translate: '翻译',
  suggest: '建议',
  persona: '人设',
}

const DOMAIN_LABEL: Record<string, string> = {
  marketing: '营销',
  support: '支持',
  agency: '代理',
  kefu: '客服',
  general: '通用',
}

function fmtAmount(a: string | number) {
  const n = Number(a || 0)
  return `¥${n.toFixed(4)}`
}

export function UsagePanel() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filterOp, setFilterOp] = useState<string>('all')
  const [filterDomain, setFilterDomain] = useState<string>('all')
  const [loading, setLoading] = useState(false)

  const trendMaxTokens = useMemo(() => {
    if (!summary?.last_7_days?.length) return 1
    return Math.max(1, ...summary.last_7_days.map(d => d.tokens))
  }, [summary])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [w, s, list] = await Promise.all([
        BillingAPI.wallet(),
        BillingAPI.summary(),
        BillingAPI.usageList({
          operation: filterOp === 'all' ? undefined : filterOp,
          domain: filterDomain === 'all' ? undefined : filterDomain,
          page,
          page_size: pageSize,
        }),
      ])
      setWallet(w)
      setSummary(s)
      setEvents(list.items)
      setTotal(list.total)
    } catch (e: any) {
      toast({ title: '加载失败', description: e?.message || '未知错误' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [filterOp, filterDomain, page, pageSize])

  const columns = [
    {
      key: 'created_at',
      title: '时间',
      width: 160,
      render: (row: UsageEvent) => <span className="text-[var(--xiaoone-fg-mute)]">{new Date(row.created_at).toLocaleString('zh-CN', { hour12: false })}</span>
    },
    {
      key: 'model_op',
      title: '模型 / 操作',
      render: (row: UsageEvent) => (
        <div>
          <div>
            <strong>{row.model}</strong>
            {row.is_mock && <Badge variant="outline" className="ml-2 text-[10px] text-amber-600 border-amber-200 bg-amber-50 h-5">MOCK</Badge>}
          </div>
          <div className="text-[var(--xiaoone-fg-mute)]">{OP_LABEL[row.operation] || row.operation} · {DOMAIN_LABEL[row.domain] || row.domain}</div>
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
          <div className="text-[var(--xiaoone-fg-mute)]">输入 {row.prompt_tokens} · 输出 {row.completion_tokens}</div>
        </div>
      )
    },
    {
      key: 'amount',
      title: '金额',
      width: 120,
      render: (row: UsageEvent) => <strong>{fmtAmount(row.amount)}</strong>
    },
    {
      key: 'is_demo',
      title: '状态',
      width: 80,
      render: (row: UsageEvent) => (
        <Badge variant="outline" className={`rounded-full ${row.is_demo ? 'text-amber-500 border-amber-200' : 'text-green-500 border-green-200'}`}>
          {row.is_demo ? '示例' : '实际'}
        </Badge>
      )
    },
  ]

  return (
    <section className="apage">
      <APageHeader
        group="Token 用量"
        title="AI 调用明细"
        description="所有 AI 调用的 Token 消耗与计费明细 · 数据来自 ai → billing 自动上报。"
        iconName="sparkles"
        service="billing service"
        actions={<Button size="sm" onClick={loadAll} disabled={loading}>刷新</Button>}
      />

      <div className="apage-body">
        {wallet && (
          <div className="overview-grid">
            <div className="ov-card balance">
              <div className="ov-label">余额</div>
              <div className="ov-value">¥{Number(wallet.wallet.balance).toFixed(2)}</div>
              <div className="ov-foot">{wallet.wallet.currency} · 已充值 ¥{Number(wallet.wallet.total_topup).toFixed(2)}</div>
            </div>
            <div className="ov-card">
              <div className="ov-label">30 天 Token</div>
              <div className="ov-value">{wallet.tokens_30d.toLocaleString()}</div>
              <div className="ov-foot">调用 {wallet.calls_30d} 次</div>
            </div>
            <div className="ov-card">
              <div className="ov-label">30 天扣费</div>
              <div className="ov-value">¥{Number(wallet.amount_30d).toFixed(4)}</div>
              <div className="ov-foot">总扣费 ¥{Number(wallet.wallet.total_charge).toFixed(4)}</div>
            </div>
          </div>
        )}

        {summary && (
          <div className="dist-grid">
            <div className="dist-card">
              <div className="dist-title">最近 7 天 · Token 消耗</div>
              <div className="trend">
                {(summary.last_7_days || []).map(d => (
                  <div key={d.date} className="trend-bar">
                    <div
                      className="bar"
                      style={{ height: `${Math.max(6, (d.tokens / trendMaxTokens) * 100)}%` }}
                      title={`${d.tokens.toLocaleString()} tokens · ${fmtAmount(d.amount)}`}
                    />
                    <small>{d.date.slice(5)}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="dist-card">
              <div className="dist-title">按模型</div>
              <ul className="dist-list">
                {(summary.by_model || []).map(m => (
                  <li key={m.model}>
                    <div className="dist-line">
                      <strong>{m.model}</strong>
                      <span>{m.tokens.toLocaleString()} tk · {fmtAmount(m.amount)}</span>
                    </div>
                    <Progress value={Math.round((m.tokens / (summary.by_model[0]?.tokens || 1)) * 100)} className="h-1.5" />
                  </li>
                ))}
                {(!summary.by_model || summary.by_model.length === 0) && (
                  <Empty description="暂无数据" className="mt-4" />
                )}
              </ul>
            </div>
            <div className="dist-card">
              <div className="dist-title">按业务</div>
              <ul className="dist-list">
                {(summary.by_domain || []).map(d => (
                  <li key={d.domain}>
                    <div className="dist-line">
                      <strong>{DOMAIN_LABEL[d.domain] || d.domain}</strong>
                      <span>{d.calls} 次 · {d.tokens.toLocaleString()} tk</span>
                    </div>
                    <Progress value={Math.round((d.tokens / (summary.by_domain[0]?.tokens || 1)) * 100)} className="h-1.5 [&>div]:bg-green-500" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <div className="table-head">
            <strong>调用明细</strong>
            <div className="filters">
              <Select value={filterOp} onValueChange={v => { setFilterOp(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-8 text-sm">
                  <SelectValue placeholder="操作类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部操作</SelectItem>
                  {Object.entries(OP_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDomain} onValueChange={v => { setFilterDomain(v); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-sm">
                  <SelectValue placeholder="业务" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部业务</SelectItem>
                  {Object.entries(DOMAIN_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DataTable columns={columns} data={events} rowKey={r => String(r.id)} emptyText={loading ? '加载中...' : '暂无调用记录'} />
          
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
