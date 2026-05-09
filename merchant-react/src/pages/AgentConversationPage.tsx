import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  Archive,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Sparkles,
  Trash2,
  Pin,
  BellOff
} from 'lucide-react'
import {
  getChatKit,
  type AgentDomain,
  type AgentMessage,
  type AgentModelAvailability,
  type AgentThread,
  type AgentThreadDetail,
} from '@xiaoone/chat-kit'
import { usePreferences } from '../app/preferences'
import { XiaooneComposer } from '../components/XiaooneComposer'
import { ChatStream } from '../components/ChatStream'
import { HeroParticles } from '../components/HeroParticles'
import SoftwareRightPanel from '../panels/SoftwareRightPanel'
import { generationBroadcast } from '../realtime/generationBroadcast'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import {
  defaultModeForBusiness,
  defaultModelForBusiness,
  defaultPluginForBusiness,
  type BusinessKey,
} from '../lib/composer'
import { toast, Popover, PopoverContent, PopoverTrigger } from '@xiaoone/react-ui'
import { useMediaMinWidth } from '../hooks/useMediaMinWidth'
import { useAuthStore } from '../store/auth'

const DOMAIN_BY_PATH: Array<{ prefix: string; domain: AgentDomain; label: string; entry: BusinessKey }> = [
  { prefix: '/workbench/marketing', domain: 'marketing', label: '推广大师', entry: 'marketing' },
  { prefix: '/workbench/support', domain: 'support', label: '渠道专员', entry: 'support' },
  { prefix: '/workbench/agency', domain: 'agency', label: '商务经理', entry: 'agency' },
  { prefix: '/workbench/feedback', domain: 'feedback', label: '维修工', entry: 'feedback' },
  { prefix: '/workbench/consultant', domain: 'general', label: '顾问', entry: 'consultant' },
  { prefix: '/workbench/system', domain: 'general', label: '程序员', entry: 'software' },
]

function resolveDomain(pathname: string) {
  return DOMAIN_BY_PATH.find(item => pathname.startsWith(item.prefix)) || DOMAIN_BY_PATH[4]
}

function threadMatchesEntry(thread: AgentThread, entry: BusinessKey) {
  const plugin = thread.plugin_key || ''
  if (entry === 'consultant') return plugin === 'consultant'
  if (entry === 'software') return thread.domain === 'general' && plugin !== 'consultant'
  return thread.domain === entry
}

export function AgentConversationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { locale, t, tpl } = usePreferences()
  const { domain, label: fallbackLabel, entry } = resolveDomain(location.pathname)
  const label = t(`biz.${entry}`, fallbackLabel)

  const threadFromSearch = searchParams.get('thread') || ''
  const draftFromSearch = searchParams.get('draft') || ''

  const [threads, setThreads] = useState<AgentThread[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<AgentThreadDetail | null>(null)
  const [prompts, setPrompts] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  const [draft, setDraft] = useState(draftFromSearch)
  const [plugin, setPlugin] = useState<string | null>(defaultPluginForBusiness(entry))
  const [mode, setMode] = useState<string | null>(defaultModeForBusiness(entry, plugin))
  const [model, setModel] = useState<string | null>(defaultModelForBusiness(entry, plugin, mode))
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [modelAvailability, setModelAvailability] = useState<Record<string, AgentModelAvailability>>({})

  const consultantAllowlist = useAuthStore((s) => {
    const m = s.merchants.find(x => x.id === s.currentMerchantId) ?? s.merchants[0]
    const keys = m?.consultant_allowed_model_keys
    return keys?.length ? keys : null
  })

  const [moreOpen, setMoreOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(entry === 'software')
  const [softwareFullscreen, setSoftwareFullscreen] = useState(false)

  const isMdUp = useMediaMinWidth(768)
  const selected = useMemo(() => threads.find(t => t.id === selectedId) || null, [threads, selectedId])
  const isHeroState = !selectedId
  const showSoftwarePreview = entry === 'software'
  const showSoftwarePreviewPanel = showSoftwarePreview && rightPanelOpen && isMdUp
  const emptyThreadName = t('agent.untitled')
  const heroTitle = locale === 'zh' ? `我们该在 ${label} 中做什么？` : `What should we do in ${label}?`

  // ESC to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && softwareFullscreen) {
        setSoftwareFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [softwareFullscreen])

  useEffect(() => {
    if (!isMdUp && softwareFullscreen)
      setSoftwareFullscreen(false)
  }, [isMdUp, softwareFullscreen])

  const reloadThreads = useCallback(async (focusThreadId = threadFromSearch) => {
    setLoading(true)
    setError('')
    try {
      const { AgentThreadAPI } = getChatKit()
      const res = await AgentThreadAPI.list({ domain, page_size: 50 })
      const rows = res.items.filter(item => threadMatchesEntry(item, entry))
      setThreads(rows)
      if (focusThreadId && rows.some(item => item.id === focusThreadId)) {
        setSelectedId(focusThreadId)
      } else if (!focusThreadId) {
        setSelectedId('')
      }
    } catch (err: any) {
      setThreads([])
      setSelectedId('')
      setError(err.message || t('agent.loadThreadError'))
    } finally {
      setLoading(false)
    }
  }, [domain, entry, threadFromSearch, t])

  const loadThreadDetail = useCallback(async (threadId: string) => {
    setDetailLoading(true)
    setError('')
    try {
      const { AgentThreadAPI } = getChatKit()
      const payload = await AgentThreadAPI.detail(threadId)
      setDetail(payload)
      setPlugin(payload.plugin_key || defaultPluginForBusiness(entry))
      setMode(payload.mode_key || defaultModeForBusiness(entry, payload.plugin_key))
      setModel(payload.model_key || defaultModelForBusiness(entry, payload.plugin_key, payload.mode_key))
    } catch (err: any) {
      setDetail(null)
      setError(err.message || t('agent.loadDetailError'))
    } finally {
      setDetailLoading(false)
    }
  }, [entry, t])

  useEffect(() => {
    let cancelled = false
    void getChatKit().AgentModelAvailabilityAPI.fetch().then((rows) => {
      if (!cancelled)
        setModelAvailability(rows)
    }).catch(() => {
      if (!cancelled)
        setModelAvailability({})
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setPlugin(defaultPluginForBusiness(entry))
    setMode(defaultModeForBusiness(entry, plugin))
    setModel(defaultModelForBusiness(entry, plugin, mode))
    setDraft(draftFromSearch)
    setSelectedId('')
    setDetail(null)
    setRightPanelOpen(entry === 'software')
    setSoftwareFullscreen(false)
    void reloadThreads(threadFromSearch)
    getChatKit().AgentSuggestedPromptsAPI.fetch(domain)
      .then(data => setPrompts(data.prompts || []))
      .catch(() => setPrompts([]))
  }, [domain, draftFromSearch, entry, location.pathname, reloadThreads, threadFromSearch])

  useEffect(() => {
    if (!threadFromSearch) {
      setSelectedId('')
      setDetail(null)
      return
    }
    if (!threads.some(item => item.id === threadFromSearch)) return
    setSelectedId(threadFromSearch)
  }, [threadFromSearch, threads])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    void loadThreadDetail(selectedId)
  }, [loadThreadDetail, selectedId])

  // Polling & BroadcastChannel
  useEffect(() => {
    const hasActiveTask = detail?.messages?.some(m => m.generation_tasks?.some(t => ['pending', 'processing', 'submitted', 'queued', 'running'].includes(t.status)))
    if (hasActiveTask) {
      const timer = window.setInterval(() => {
        void loadThreadDetail(selectedId)
      }, 3000)
      return () => window.clearInterval(timer)
    }
  }, [detail, loadThreadDetail, selectedId])

  useEffect(() => {
    generationBroadcast.listen(() => {
      if (selectedId) loadThreadDetail(selectedId)
    })
  }, [selectedId, loadThreadDetail])

  // Background Poll
  useEffect(() => {
    const timer = window.setInterval(() => {
      void reloadThreads(selectedId || threadFromSearch || '')
    }, 32000)
    return () => window.clearInterval(timer)
  }, [reloadThreads, selectedId, threadFromSearch])

  function resetToHero() {
    setSelectedId('')
    setDetail(null)
    setMoreOpen(false)
    setDraft('')
    setPendingFiles([])
    setPlugin(defaultPluginForBusiness(entry))
    setSearchParams({}, { replace: true })
  }

  async function onRenameThread() {
    if (!selectedId) return
    const title = window.prompt(t('agent.renamePrompt'), selected?.title || detail?.title || '')
    if (!title?.trim()) return
    try {
      await getChatKit().AgentThreadAPI.update(selectedId, { title: title.trim() })
      await reloadThreads(selectedId)
      await loadThreadDetail(selectedId)
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || t('agent.sendError') })
    }
  }

  async function onTogglePin() {
    if (!selectedId) return
    try {
      await getChatKit().AgentThreadAPI.update(selectedId, { pinned: !selected?.pinned })
      await reloadThreads(selectedId)
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || t('agent.sendError') })
    }
  }

  async function onArchiveThread() {
    if (!selectedId) return
    const ok = window.confirm(t('agent.archiveConfirm'))
    if (!ok) return
    try {
      await getChatKit().AgentThreadAPI.update(selectedId, { archived: true })
      resetToHero()
      await reloadThreads('')
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || t('agent.sendError') })
    }
  }

  async function onDeleteThread() {
    if (!selectedId) return
    const ok = window.confirm(t('agent.deleteConfirm'))
    if (!ok) return
    try {
      await getChatKit().AgentThreadAPI.destroy(selectedId)
      resetToHero()
      await reloadThreads('')
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || t('agent.sendError') })
    }
  }

  async function onSend() {
    const content = draft.trim()
    if ((!content && pendingFiles.length === 0) || sending || streaming) return
    setSending(true)
    setError('')

    try {
      const { AgentThreadAPI, AgentAttachmentAPI, streamThreadChat } = getChatKit()
      let threadId = selectedId
      if (!threadId) {
        const created = await AgentThreadAPI.create({
          domain,
          title: content.slice(0, 32) || emptyThreadName,
          plugin_key: plugin || '',
          mode_key: mode || '',
          model_key: model || '',
        })
        threadId = created.id
        setThreads(prev => [created, ...prev.filter(item => item.id !== created.id)])
        setSelectedId(created.id)
        setSearchParams({ thread: created.id }, { replace: true })
        setDetail({ ...created, messages: [] })
      }

      const attachmentIds: string[] = []
      for (const file of pendingFiles) {
        const attachment = await AgentAttachmentAPI.upload(file, threadId)
        attachmentIds.push(attachment.id)
      }
      setPendingFiles([])

      const streamId = `stream:${Date.now()}`
      const userMessage: AgentMessage = {
        id: `user:${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      } as any
      const assistantMessage: AgentMessage = {
        id: streamId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        status: 'streaming',
      } as any

      setDetail(prev => prev && prev.id === threadId
        ? { ...prev, messages: [...(prev.messages || []), userMessage, assistantMessage] }
        : prev)
      setDraft('')
      setStreaming(true)

      let received = ''
      try {
        for await (const evt of streamThreadChat(threadId, content, attachmentIds, model || '')) {
          if (evt.delta) {
            received += evt.delta
            setDetail(prev => prev && prev.id === threadId
              ? {
                  ...prev,
                  messages: prev.messages.map(msg => msg.id === streamId
                    ? { ...msg, content: received, status: 'streaming' }
                    : msg),
                }
              : prev)
          }
          if (evt.type === 'error') {
            toast({ variant: 'destructive', description: evt.message || 'Stream error' })
          }
        }
      } catch (err: any) {
        toast({ variant: 'destructive', description: err.message || 'Stream error' })
      }

      setDetail(prev => prev && prev.id === threadId
        ? { ...prev, messages: prev.messages.map(msg => msg.id === streamId ? { ...msg, status: 'done' } : msg) }
        : prev)

      await reloadThreads(threadId)
      await loadThreadDetail(threadId)
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || t('agent.sendError') })
    } finally {
      setStreaming(false)
      setSending(false)
    }
  }

  function onAttachFile(file: File) {
    setPendingFiles(prev => [...prev, file])
  }

  const handlePickPrompt = (p: string) => {
    setDraft(p)
  }

  const isConsultantTheme = entry === 'consultant'
  /** 渠道专员 / 商务经理 / 维修工：固定 xiaoone 模式，模型走平台端商户默认配置 */
  const isPlatformDefaultAgentEntry = entry === 'feedback' || entry === 'support' || entry === 'agency'

  return (
    <section className={`mr-agent-thread-page ${softwareFullscreen ? 'is-fullscreen' : ''}`}>
      <header className="mr-agent-thread-head">
        <div className="mr-agent-thread-title">
          <Sparkles size={14} />
          <strong>{label}</strong>
          <span>{selected?.title || detail?.title || emptyThreadName}</span>
        </div>
        <div className="mr-agent-thread-actions">
          {showSoftwarePreview && isMdUp && (
            <button type="button" className="mr-btn" onClick={() => setRightPanelOpen(prev => !prev)}>
              {rightPanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              {rightPanelOpen ? t('agent.closePreview', '关闭预览') : t('agent.openPreview', '打开预览')}
            </button>
          )}
          {showSoftwarePreviewPanel && (
            <button type="button" className="mr-btn" onClick={() => setSoftwareFullscreen(prev => !prev)}>
              {softwareFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {softwareFullscreen ? t('agent.exitExpand', '退出全屏 (ESC)') : t('agent.expand', '全屏')}
            </button>
          )}
          <button type="button" className="mr-btn mr-btn-primary" onClick={resetToHero}>
            <Pencil size={14} />
            {t('agent.newChat', '新对话')}
          </button>

          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="mr-btn">
                <MoreHorizontal size={14} />
                {t('agent.more', '更多')}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              <div className="mr-more-menu flex flex-col">
                <button type="button" className="flex items-center gap-2 p-2 hover:bg-[var(--xiaoone-bg-hover)] rounded-md text-sm cursor-pointer" onClick={() => { setMoreOpen(false); void onRenameThread() }}>
                  <Pencil size={13} />
                  {t('agent.rename', '重命名')}
                </button>
                <button type="button" className="flex items-center gap-2 p-2 hover:bg-[var(--xiaoone-bg-hover)] rounded-md text-sm cursor-pointer" onClick={() => { setMoreOpen(false); void onTogglePin() }}>
                  <Pin size={13} />
                  {selected?.pinned ? '取消置顶' : '置顶'}
                </button>
                <button type="button" className="flex items-center gap-2 p-2 hover:bg-[var(--xiaoone-bg-hover)] rounded-md text-sm cursor-pointer" onClick={() => { setMoreOpen(false); void onArchiveThread() }}>
                  <Archive size={13} />
                  {t('agent.archive', '归档')}
                </button>
                <button type="button" className="flex items-center gap-2 p-2 hover:bg-[var(--xiaoone-bg-hover)] text-red-500 rounded-md text-sm cursor-pointer" onClick={() => { setMoreOpen(false); void onDeleteThread() }}>
                  <Trash2 size={13} />
                  {t('agent.delete', '删除')}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={showSoftwarePreviewPanel ? 50 : 100} minSize={30}>
          <div className="h-full flex flex-col bg-[var(--xiaoone-bg)] relative">
            {isHeroState ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-50"><HeroParticles active /></div>
                <div className="relative z-10 w-full max-w-[800px] flex flex-col items-center">
                  <h1 className="text-2xl font-bold mb-8">{heroTitle}</h1>
                  <div className="w-full">
                    <XiaooneComposer
                      value={draft}
                      onChange={setDraft}
                      business={entry}
                      hideBusinessPicker
                      lockMode={isConsultantTheme || isPlatformDefaultAgentEntry}
                      plugin={plugin}
                      onPluginChange={setPlugin}
                      mode={mode}
                      onModeChange={setMode}
                      model={model}
                      onModelChange={setModel}
                      loading={sending || streaming}
                      enableFileAttach
                      requirePlugin={!isConsultantTheme}
                      requireMode={!isConsultantTheme}
                      hideMode={false}
                      hideModel={isPlatformDefaultAgentEntry}
                      consultantModelAllowlist={consultantAllowlist}
                      modelAvailability={modelAvailability}
                      onSubmit={onSend}
                      onAttachFile={onAttachFile}
                      aboveSlot={
                        pendingFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2 p-2 border-b border-[var(--xiaoone-border-soft)]">
                            {pendingFiles.map((file, i) => (
                              <div key={i} className="flex items-center gap-2 bg-[var(--xiaoone-bg-soft)] p-2 rounded-md text-sm">
                                <span className="truncate max-w-[150px]">{file.name}</span>
                                <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}><Trash2 size={12}/></button>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    />
                  </div>
                  {prompts.length > 0 && (
                    <div className="flex flex-col w-full max-w-[640px] mt-4 gap-2">
                      {prompts.slice(0, 3).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePickPrompt(p)}
                          className="flex items-start gap-3 p-3 rounded-lg border border-[var(--xiaoone-border-soft)] bg-[var(--xiaoone-bg-elev)] text-left font-medium text-[13px] text-[var(--xiaoone-fg-soft)] cursor-pointer shadow-sm transition-all hover:border-[var(--xiaoone-accent-soft)] hover:text-[var(--xiaoone-fg)] hover:shadow-md hover:-translate-y-[1px]"
                        >
                          <Sparkles size={13} className="text-[var(--xiaoone-accent)] mt-[2px] flex-shrink-0" />
                          <span>{p}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-4">
                  {detailLoading && !detail ? (
                    <div className="flex items-center justify-center h-full text-[var(--xiaoone-fg-mute)]">Loading...</div>
                  ) : (
                    <ChatStream
                      messages={(detail?.messages || []).filter(message => message.role === 'user' || message.role === 'assistant') as any}
                    />
                  )}
                </div>
                <div className="mr-thread-composer px-4">
                  <XiaooneComposer
                    compact
                    value={draft}
                    onChange={setDraft}
                    business={entry}
                    hideBusinessPicker
                    lockMode={isConsultantTheme || isPlatformDefaultAgentEntry}
                    plugin={plugin}
                    onPluginChange={setPlugin}
                    mode={mode}
                    onModeChange={setMode}
                    model={model}
                    onModelChange={setModel}
                    loading={sending || streaming}
                    enableFileAttach
                    requirePlugin={!isConsultantTheme}
                    requireMode={!isConsultantTheme}
                    hideMode={false}
                    hideModel={isPlatformDefaultAgentEntry}
                    consultantModelAllowlist={consultantAllowlist}
                    modelAvailability={modelAvailability}
                    onSubmit={onSend}
                    onAttachFile={onAttachFile}
                    aboveSlot={
                      pendingFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 p-2 border-b border-[var(--xiaoone-border-soft)]">
                          {pendingFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[var(--xiaoone-bg-soft)] p-2 rounded-md text-sm">
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}><Trash2 size={12}/></button>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  />
                </div>
              </>
            )}
          </div>
        </Panel>

        {showSoftwarePreviewPanel && (
          <>
            <PanelResizeHandle className="w-1 bg-[var(--xiaoone-border-soft)] cursor-col-resize hover:bg-[var(--xiaoone-accent)] transition-colors" />
            <Panel defaultSize={50} minSize={30}>
              <div className="h-full bg-[var(--xiaoone-bg-soft)] relative">
                {entry !== 'software' && (detail as any)?.serviceCase ? (
                  <aside className="service-right w-full h-full p-4 overflow-auto">
                    <div className="service-progress bg-[var(--xiaoone-bg-elev)] border border-[var(--xiaoone-border-soft)] rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[var(--xiaoone-fg-mute)] text-xs">服务进度</span>
                        <strong className="text-sm">{(detail as any).serviceCase.service_type_label || '服务单'}</strong>
                      </div>
                      <div className="text-[var(--xiaoone-accent)] font-semibold text-lg mb-6">
                        {(detail as any).serviceCase.status_label || '处理中'}
                      </div>
                      <ol className="space-y-3 relative before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--xiaoone-border-soft)]">
                        {[
                          ['data_submitted', '资料提交'],
                          ['consulting', '咨询中'],
                          ['in_progress', '办理中'],
                          ['completed', '已完成'],
                          ['closed', '已关闭'],
                        ].map(s => (
                          <li key={s[0]} className={`relative z-10 flex items-center gap-3 text-sm ${(detail as any).serviceCase?.status === s[0] ? 'text-[var(--xiaoone-fg)] font-medium' : 'text-[var(--xiaoone-fg-mute)]'}`}>
                            <span className={`w-6 h-6 rounded-full border-2 flex-shrink-0 bg-[var(--xiaoone-bg)] ${(detail as any).serviceCase?.status === s[0] ? 'border-[var(--xiaoone-accent)]' : 'border-[var(--xiaoone-border-soft)]'}`} />
                            <em>{s[1]}</em>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </aside>
                ) : (
                  <SoftwareRightPanel onClose={() => setRightPanelOpen(false)} />
                )}
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </section>
  )
}
