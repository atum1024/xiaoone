import { useEffect, useState } from 'react'
import { getChatKit, type AgentGenerationTask } from '@xiaoone/chat-kit'
import { useWorkspaceStore } from '../store/workspace'
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input, Badge, DataTable, toast } from '@xiaoone/react-ui'
import type { NavCategory } from '../lib/nav'
import './generation-assets-page.css'

const STATUS_OPTS = [
  { value: 'all', label: '全部状态' },
  { value: 'running', label: '进行中' },
  { value: 'queued', label: '排队' },
  { value: 'submitted', label: '已提交' },
  { value: 'succeeded', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'draft', label: '草稿' },
  { value: 'canceled', label: '已取消' },
]

function categoryForDomain(d: string): NavCategory {
  switch (d) {
    case 'marketing': return 'marketing'
    case 'support': return 'support'
    case 'agency': return 'agency'
    default: return 'consultant'
  }
}

function statusTone(s: string) {
  if (s === 'succeeded') return 'text-green-500 border-green-200 bg-green-50/50'
  if (s === 'failed') return 'text-red-500 border-red-200 bg-red-50/50'
  if (['running', 'queued', 'submitted'].includes(s)) return 'text-amber-500 border-amber-200 bg-amber-50/50'
  return 'text-gray-500 border-gray-200 bg-gray-50/50'
}

function promptSnippet(p: string, n = 72) {
  const t = (p || '').replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t || '—'
  return `${t.slice(0, n)}…`
}

function errSnippet(s: string | undefined, n = 56) {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  if (!t) return '—'
  if (t.length <= n) return t
  return `${t.slice(0, n)}…`
}

function threadShort(id: string) {
  if (!id) return '—'
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

export function GenerationAssetsPage() {
  const { AgentGenerationTaskAPI, AgentThreadAPI } = getChatKit()
  const ws = useWorkspaceStore()

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<AgentGenerationTask[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterThread, setFilterThread] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page_size: 100 }
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus
      const tid = filterThread.trim()
      if (tid) params.thread = tid

      const r = await AgentGenerationTaskAPI.list(params)
      setItems(r.items || [])
    } catch (e: any) {
      toast({ title: '加载生成任务失败', description: e?.message || '未知错误' })
    } finally {
      setLoading(false)
    }
  }

  const openThread = async (task: AgentGenerationTask) => {
    try {
      const detail = await AgentThreadAPI.detail(task.thread)
      const cat = categoryForDomain(detail.domain)
      ws.showAgentThread(cat, detail.domain, task.thread)
    } catch (e: any) {
      toast({ title: '无法打开对话', description: e?.message || '未知错误' })
    }
  }

  const refreshOne = async (task: AgentGenerationTask) => {
    try {
      const next = await AgentGenerationTaskAPI.refresh(task.id)
      if (next) setItems(prev => prev.map(t => t.id === next.id ? next : t))
    } catch (e: any) {
      toast({ title: '刷新失败', description: e?.message || '未知错误' })
    }
  }

  const retryOne = async (task: AgentGenerationTask) => {
    try {
      const next = await AgentGenerationTaskAPI.retry(task.id)
      if (next) setItems(prev => prev.map(t => t.id === next.id ? next : t))
    } catch (e: any) {
      toast({ title: '重试失败', description: e?.message || '未知错误' })
    }
  }

  useEffect(() => {
    load()
  }, [filterStatus]) // Reacting to status change like @change="load"

  const columns = [
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row: AgentGenerationTask) => (
        <Badge variant="outline" className={statusTone(row.status)}>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'thread',
      title: '对话',
      width: 120,
      render: (row: AgentGenerationTask) => <span className="font-mono text-xs">{threadShort(row.thread)}</span>
    },
    {
      key: 'modality',
      title: '类型',
      width: 88,
      dataIndex: 'modality' as keyof AgentGenerationTask
    },
    {
      key: 'model',
      title: '模型',
      width: 120,
      render: (row: AgentGenerationTask) => row.model_key || row.model
    },
    {
      key: 'error',
      title: '失败原因',
      width: 140,
      render: (row: AgentGenerationTask) => (
        <span className={row.status === 'failed' && row.error_message ? 'text-red-500' : ''}>
          {errSnippet(row.error_message)}
        </span>
      )
    },
    {
      key: 'prompt',
      title: '提示词摘要',
      render: (row: AgentGenerationTask) => promptSnippet(row.prompt)
    },
    {
      key: 'updated_at',
      title: '更新时间',
      width: 168,
      render: (row: AgentGenerationTask) => (
        <span className="text-[var(--xiaoone-fg-mute)]">
          {row.updated_at?.replace('T', ' ').slice(0, 19) || '—'}
        </span>
      )
    },
    {
      key: 'actions',
      title: '操作',
      width: 160,
      render: (row: AgentGenerationTask) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[var(--xiaoone-accent)]" onClick={() => openThread(row)}>打开对话</Button>
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => refreshOne(row)}>刷新</Button>
          {row.status === 'failed' && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-amber-500" onClick={() => retryOne(row)}>重试</Button>
          )}
        </div>
      )
    }
  ]

  return (
    <section className="gap-page">
      <header className="gap-head">
        <div>
          <h1 className="gap-title">生成素材库</h1>
          <p className="gap-desc">
            汇总当前商户的图片 / 视频生成任务（与对话内任务卡同源）。用于检索结果、刷新状态与跳回对话。
          </p>
          <p className="gap-hint text-[var(--xiaoone-fg-mute)]">
            商户级每日次数与成本硬限制在后端落地前，仍以计费余额与模型可用性为准；视频类任务受云厂商额度影响较大（如 Google Veo）。失败任务可复制提示词后在对话内重试。
          </p>
        </div>
        <div className="gap-actions">
          <Input
            value={filterThread}
            onChange={e => setFilterThread(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="对话 thread id"
            className="w-[200px] h-8 text-sm"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>刷新</Button>
        </div>
      </header>

      <div className="gap-table">
        <DataTable
          columns={columns}
          data={items}
          rowKey={r => r.id}
          emptyText={loading ? '加载中...' : '暂无生成任务'}
        />
      </div>
    </section>
  )
}
