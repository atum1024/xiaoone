import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast } from '@xiaoone/react-ui'
import { getChatKit, type AgentThread } from '@xiaoone/chat-kit'
import { ApiError } from '../lib/apiErrors'
import { sanitizeAgentAssistantText } from '../lib/agentProtocolText'
import { usePreferences } from '../app/preferences'
import { routeForThread as routeForWorkbenchThread } from '../app/workbenchRouteModel'

interface AgentThreadSearchDialogProps {
  open: boolean
  onClose: () => void
}

const AUTOMATION_AGENT_PLUGIN_KEYS = new Set([
  'industry',
  'hot-product',
  'competitor',
  'ai',
  'product',
  'notify-tg',
  'file-organize',
  'install-doc',
  'corpus',
  'sop',
  'notify-feishu',
  'notify-wecom',
])
const XIAOWAN_ASSISTANT_PLUGIN_KEY = 'xiaowan-asst'

function routeForThread(row: AgentThread): string | null {
  const domain = row.domain || 'general'
  const plugin = row.plugin_key || ''
  if (domain === 'general' && plugin === 'ppt')
    return null
  return routeForWorkbenchThread(row)
}

function categoryLabel(row: AgentThread, t: (key: string, fallback?: string) => string) {
  if ((row as any).category_label)
    return (row as any).category_label
  if (row.domain === 'general' && row.plugin_key === XIAOWAN_ASSISTANT_PLUGIN_KEY) return t('biz.xiaoone', 'xiaoone')
  if (row.domain === 'marketing') {
    if (row.mode_key === 'image') return t('biz.marketing.image')
    if (row.mode_key === 'video') return t('biz.marketing.video')
    return t('biz.marketing.text')
  }
  if (row.domain === 'support') return t('biz.support')
  if (row.domain === 'agency') return t('biz.agency')
  if (row.domain === 'feedback') return t('biz.feedback')
  if (row.plugin_key === 'consultant') return t('biz.consultant')
  if (AUTOMATION_AGENT_PLUGIN_KEYS.has(row.plugin_key || '')) return t('biz.automation')
  return t('biz.system')
}

function formatTime(value: string | undefined, locale: 'zh' | 'en', t: (key: string, fallback?: string) => string) {
  if (!value)
    return t('search.recentLabel')
  return new Date(value).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', { hour12: false })
}

export function AgentThreadSearchDialog({ open, onClose }: AgentThreadSearchDialogProps) {
  const navigate = useNavigate()
  const { locale, t, tpl } = usePreferences()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<AgentThread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const title = useMemo(() => query.trim() ? t('search.results') : t('search.recent'), [query, t])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const payload = await getChatKit().AgentThreadAPI.list({ search: query.trim(), archived: 'false', page_size: 10 })
        if (!cancelled) setRows(payload.items.filter(row => routeForThread(row)))
      } catch (err) {
        if (!cancelled) {
          setRows([])
          setError(err instanceof ApiError ? err.message : t('search.error'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const timer = window.setTimeout(() => {
      void load()
    }, query.trim() ? 220 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query, t])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  function openThread(row: AgentThread) {
    const route = routeForThread(row)
    if (!route) {
      toast({ title: t('search.unavailableTitle'), description: t('search.unavailableBody') })
      return
    }
    onClose()
    window.requestAnimationFrame(() => {
      navigate(route)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="flex flex-col min-h-0 w-[calc(100vw-32px)] max-w-[640px] max-h-[min(85vh,720px)] p-0 gap-0 overflow-hidden border-[var(--xiaoone-border-soft)] shadow-[var(--xiaoone-shadow-lg)] sm:rounded-[var(--xiaoone-r-xl)] box-border">
        <div className="shrink-0 px-6 pt-6 pb-1 pr-14">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[15px] font-semibold leading-snug tracking-tight text-[var(--xiaoone-fg)] pr-0">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--xiaoone-r-md)] bg-[var(--xiaoone-accent-bg)] text-[var(--xiaoone-accent)]">
                <Search size={16} strokeWidth={2} aria-hidden />
              </span>
              {t('qa.search')}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug text-[var(--xiaoone-fg-mute)]">
              {t('search.help')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={onSubmit} className="shrink-0 px-6 pb-5 pt-3">
          <label htmlFor="agent-thread-search" className="sr-only">
            {t('search.placeholder')}
          </label>
          <div className="agent-thread-search-shell flex items-center gap-2.5 rounded-[var(--xiaoone-r-md)] border border-[var(--xiaoone-border)] bg-[var(--xiaoone-bg-soft)] px-3 py-0.5 transition-[box-shadow,border-color] focus-within:border-[color-mix(in_srgb,var(--xiaoone-accent)_55%,var(--xiaoone-border))] focus-within:shadow-[0_0_0_3px_var(--xiaoone-accent-bg)]">
            <Search size={15} className="shrink-0 text-[var(--xiaoone-fg-faint)]" aria-hidden />
            <input
              id="agent-thread-search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
              autoFocus
              autoComplete="off"
              className="min-h-10 w-full flex-1 border-0 bg-transparent py-2 text-[14px] leading-snug text-[var(--xiaoone-fg)] outline-none placeholder:text-[var(--xiaoone-fg-faint)]"
            />
          </div>
        </form>

        <div
          className="flex shrink-0 items-baseline justify-between gap-3 border-t border-[var(--xiaoone-border-soft)] px-6 py-2.5"
          aria-live="polite"
        >
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--xiaoone-fg-mute)]">
            {title}
          </h2>
          <span className="tabular-nums text-[11px] text-[var(--xiaoone-fg-faint)]">
            {loading ? t('search.loading') : tpl('agent.rows', String(rows.length))}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-1">
          {error && (
            <div
              role="alert"
              className="mx-3 mb-3 rounded-[var(--xiaoone-r-md)] border border-[color-mix(in_srgb,var(--xiaoone-danger)_28%,var(--xiaoone-border))] bg-[color-mix(in_srgb,var(--xiaoone-danger)_12%,transparent)] px-3 py-2 text-[13px] text-[var(--xiaoone-danger)]"
            >
              {error}
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-[15px] font-medium text-[var(--xiaoone-fg)]">{query.trim() ? t('search.noMatch') : t('search.noRecent')}</p>
              <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-[var(--xiaoone-fg-mute)]">
                {t('search.emptyHint')}
              </p>
            </div>
          )}

          <ul className="flex list-none flex-col gap-0 p-0 m-0">
            {rows.map(row => {
              const snippet = sanitizeAgentAssistantText(row.preview || row.summary || '')
              const showPlaceholder = !snippet
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex w-full min-w-0 flex-col gap-2 rounded-[var(--xiaoone-r-md)] border border-transparent px-3 py-3 text-left transition-colors hover:bg-[var(--xiaoone-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xiaoone-accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--xiaoone-bg-elev)] sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    onClick={() => openThread(row)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium leading-snug text-[var(--xiaoone-fg)]">
                        {row.title || t('agent.untitled')}
                      </span>
                      <span
                        className={`mt-1 block line-clamp-2 text-[12px] leading-relaxed ${showPlaceholder ? 'italic text-[var(--xiaoone-fg-faint)]' : 'text-[var(--xiaoone-fg-mute)]'}`}
                      >
                        {snippet || t('agent.noSummary')}
                      </span>
                    </div>
                    <div className="flex min-w-0 shrink-0 flex-col items-start gap-1 pt-0.5 sm:items-end">
                      <span className="max-w-full truncate text-left text-[11px] font-medium text-[var(--xiaoone-fg-soft)] sm:max-w-[7.5rem] sm:text-right">
                        {categoryLabel(row, t)}
                      </span>
                      <time className="tabular-nums text-[11px] text-[var(--xiaoone-fg-faint)]">
                        {formatTime(row.last_message_at || row.updated_at || undefined, locale, t)}
                      </time>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
