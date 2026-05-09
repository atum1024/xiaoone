import { useEffect, useState, useMemo } from 'react'
import { getChatKit, type AgentDomain, type AgentThread } from '@xiaoone/chat-kit'
import { useWorkspaceStore } from '../store/workspace'
import { useAgentStore } from '../store/agent'
import { AUTOMATION_AGENT_PLUGIN_KEYS, CONSULTANT_AGENT_PLUGIN_KEY } from '../lib/composer'
import { Button, Badge, toast } from '@xiaoone/react-ui'
import type { NavCategory } from '../lib/nav'
import './agent-archives-page.css'

const ARCHIVE_DOMAINS: AgentDomain[] = ['general', 'marketing', 'support', 'agency']

type Row = AgentThread & { domain: AgentDomain }

export function AgentArchivesPage() {
  const { AgentThreadAPI } = getChatKit()
  const ws = useWorkspaceStore()
  const agentStore = useAgentStore()
  const AUTO_ARCH_PLUGIN = useMemo(() => new Set<string>(AUTOMATION_AGENT_PLUGIN_KEYS), [])

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  const navCategoryForDomain = (d: AgentDomain, t?: AgentThread): NavCategory => {
    if (d === 'general') {
      if (t && t.plugin_key && AUTO_ARCH_PLUGIN.has(t.plugin_key)) return 'automation'
      if (t?.plugin_key === CONSULTANT_AGENT_PLUGIN_KEY) return 'consultant'
      return 'system'
    }
    if (d === 'marketing') return 'marketing'
    if (d === 'support') return 'support'
    if (d === 'agency') return 'agency'
    return 'consultant'
  }

  const domainLabel = (d: AgentDomain, t?: AgentThread): string => {
    if (d === 'general' && t?.plugin_key === CONSULTANT_AGENT_PLUGIN_KEY) return '顾问'
    switch (d) {
      case 'general': return '程序员'
      case 'marketing': return '推广大师'
      case 'support': return '渠道专员'
      case 'agency': return '商务经理'
      default: return d
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const chunks = await Promise.all(
        ARCHIVE_DOMAINS.map(d => AgentThreadAPI.list({ domain: d, archived: true }).then(res => res.items).catch(() => []))
      )
      const all: Row[] = []
      chunks.forEach((items, i) => {
        const d = ARCHIVE_DOMAINS[i]
        for (const t of items || []) {
          all.push({ ...t, domain: d })
        }
      })
      const ts = (t: Row) => new Date(t.last_message_at || t.created_at || 0).getTime()
      setRows(all.sort((a, b) => ts(b) - ts(a)))
    } finally {
      setLoading(false)
    }
  }

  const unarchive = async (t: Row) => {
    try {
      await AgentThreadAPI.update(t.id, { archived: false } as any)
      toast({ title: '已取消归档' })
      await agentStore.fetchDomain(t.domain, true)
      load()
    } catch (e: any) {
      toast({ title: '操作失败', description: e?.message || '未知错误' })
    }
  }

  const openThread = (t: Row) => {
    ws.showAgentThread(navCategoryForDomain(t.domain, t), t.domain, t.id)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section className="arch-panel">
      <header className="arch-head">
        <h1 className="arch-title">档案管理</h1>
        <p className="arch-desc">已归档的业务对话可在此恢复至侧栏列表。</p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>刷新</Button>
      </header>

      {loading && !rows.length ? (
        <div className="arch-empty">加载中…</div>
      ) : !rows.length ? (
        <div className="arch-empty">暂无归档对话</div>
      ) : (
        <ul className="arch-list">
          {rows.map(t => (
            <li key={t.id} className="arch-row">
              <div className="arch-row-main">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full font-normal">
                    {domainLabel(t.domain, t)}
                  </Badge>
                  <strong className="arch-row-title">{t.title || '对话'}</strong>
                </div>
                {t.preview && <span className="arch-row-preview">{t.preview}</span>}
              </div>
              <div className="arch-row-actions">
                <Button size="sm" variant="outline" className="text-[var(--xiaoone-accent)] border-[var(--xiaoone-accent-soft)] hover:bg-[var(--xiaoone-accent-bg)]" onClick={() => unarchive(t)}>
                  取消归档
                </Button>
                <Button size="sm" onClick={() => openThread(t)}>打开</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
