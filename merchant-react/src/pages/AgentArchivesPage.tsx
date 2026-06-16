import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getChatKit, type AgentDomain, type AgentThread } from '@xiaoone/chat-kit'
import { Button, Badge, toast } from '@xiaoone/react-ui'
import { queryClient } from '../app/queryClient'
import { AGENT_QUERY_KEYS } from '../hooks/agentQueries'
import { sanitizeAgentAssistantText } from '../lib/agentProtocolText'
import { usePreferences } from '../app/preferences'
import { CONSULTANT_PLUGIN_KEY, routeForThread, XIAOWAN_ASSISTANT_PLUGIN_KEY } from '../app/workbenchRouteModel'
import './agent-archives-page.css'

const ARCHIVE_DOMAINS: AgentDomain[] = ['general', 'marketing', 'support', 'agency', 'feedback']
type Row = AgentThread & { domain: AgentDomain }

export function AgentArchivesPanel({ embedded = false }: { embedded?: boolean }) {
  const { t } = usePreferences()
  const { AgentThreadAPI } = getChatKit()
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  const domainLabel = (d: AgentDomain, thread?: AgentThread): string => {
    if (d === 'general' && thread?.plugin_key === XIAOWAN_ASSISTANT_PLUGIN_KEY) return 'xiaoone'
    if (d === 'general' && thread?.plugin_key === CONSULTANT_PLUGIN_KEY) return 'xiaoone'
    switch (d) {
      case 'general': return t('automation.archives.domain.system')
      case 'marketing': return t('automation.archives.domain.marketing')
      case 'support': return t('automation.archives.domain.support')
      case 'agency': return t('automation.archives.domain.agency')
      case 'feedback': return t('automation.archives.domain.feedback')
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

  const unarchive = async (row: Row) => {
    try {
      await AgentThreadAPI.update(row.id, { archived: false } as any)
      toast({ title: t('automation.archives.unarchived') })
      await queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.threads(row.domain) })
      await queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.overview() })
      await queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.sidebarThreads() })
      load()
    } catch (e: any) {
      toast({ title: t('automation.archives.actionFailed'), description: e?.message || t('automation.archives.unknownError') })
    }
  }

  const openThread = (row: Row) => {
    navigate(routeForThread(row))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section className={`arch-panel${embedded ? ' arch-panel--embedded' : ''}`}>
      <header className="arch-head">
        <p className="arch-desc">{t('automation.archives.desc')}</p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>{t('automation.archives.refresh')}</Button>
      </header>

      {loading && !rows.length ? (
        <div className="arch-empty">{t('automation.archives.loading')}</div>
      ) : !rows.length ? (
        <div className="arch-empty">{t('automation.archives.empty')}</div>
      ) : (
        <ul className="arch-list">
          {rows.map(row => (
            <li key={row.id} className="arch-row">
              <div className="arch-row-main">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full font-normal">
                    {domainLabel(row.domain, row)}
                  </Badge>
                  <strong className="arch-row-title">{row.title || t('automation.archives.thread')}</strong>
                </div>
                {row.preview && <span className="arch-row-preview">{sanitizeAgentAssistantText(row.preview)}</span>}
              </div>
              <div className="arch-row-actions">
                <Button size="sm" variant="outline" className="text-[var(--xiaoone-accent)] border-[var(--xiaoone-accent-soft)] hover:bg-[var(--xiaoone-accent-bg)]" onClick={() => unarchive(row)}>
                  {t('automation.archives.unarchive')}
                </Button>
                <Button size="sm" onClick={() => openThread(row)}>{t('automation.archives.open')}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function AgentArchivesPage() {
  return <AgentArchivesPanel />
}
