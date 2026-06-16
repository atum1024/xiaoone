import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './LiveChatShellPage.css'
import { Ban, Bot, CheckCheck, ChevronLeft, Database, Download, FileText, Film, Globe2, Image as ImageIcon, MessageCircle, MessageSquareText, Paperclip, SendHorizontal, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { assignDefined, getChatKit, type AgentMaterialAsset, type LiveAttachmentMeta, type LiveConversation, type LiveConversationDetail, type LiveMessage, type LiveState, type QuickReply } from '@xiaoone/chat-kit'
import { describeKefuError } from '../lib/apiErrors'
import { useLiveChatStore, type LiveAgentPanelHandlers } from '../store/liveChat'
import { useMediaMinWidth } from '../hooks/useMediaMinWidth'
import { usePreferences } from '../app/preferences'
import type { KefuTranslate, KefuTpl } from '../i18n/catalog/kefu'
import { DefaultAvatar } from '../components/DefaultAvatar'
import { WarehouseAssetPickerDialog } from '../components/WarehouseAssetPickerDialog'
import { warehouseAssetToFile } from '../lib/warehouseAssets'

interface LiveChatShellPageProps {
  state?: LiveState
  onStateChange?: (state: LiveState) => void
  hideStateTabs?: boolean
}

/** 与后端 `message_limit` / `limit` 对齐；最大 50（见 chat_core serializers）。 */
const LIVE_CHAT_MESSAGE_PAGE_SIZE = 20

type KefuSetupState = {
  loading: boolean
  stores: number
  sdkConfigs: number
  corpusEntries: number
  conversations: number
}

const KEFU_SETUP_EMPTY: KefuSetupState = {
  loading: true,
  stores: 0,
  sdkConfigs: 0,
  corpusEntries: 0,
  conversations: 0,
}

function formatCountBadge(value: number) {
  return value > 99 ? '99+' : String(value)
}

interface SuggestedReplyState {
  suggestion: string
  corpusSuggestion: string
  matches: Array<{
    score: number
    matched_terms?: string[]
    entry?: Record<string, any>
  }>
}

const SIMPLIFIED_CHINESE_HINT_RE = /[体湾国语广东欢联络资讯产订单问题请这们为会处发货后吗号码价钱]/
const TRADITIONAL_CHINESE_HINT_RE = /[體臺灣國語廣東歡聯絡資訊產訂單問題請這們為會處發貨後嗎號碼價錢]/

function prettyTime(value?: string | null) {
  if (!value)
    return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    return value
  return d.toLocaleString('zh-CN', { hour12: false })
}

/** 气泡内完整时间，贴近智能团队会话展示。 */
function liveChatBubbleTime(value?: string | null) {
  if (!value)
    return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    return value
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function stateLabel(state: string | undefined, t: KefuTranslate) {
  if (state === 'waiting')
    return t('kefu.liveChat.state.waiting')
  if (state === 'active')
    return t('kefu.liveChat.state.active')
  if (state === 'closed')
    return t('kefu.liveChat.state.closed')
  return t('kefu.liveChat.state.none')
}

function assignmentLabel(row: LiveConversationDetail | LiveConversation | null | undefined, t: KefuTranslate, tpl: KefuTpl) {
  if (!row)
    return t('kefu.liveChat.assignment.unassigned')
  if (row.assigned_kefu_agent_name)
    return tpl('kefu.liveChat.assignment.agent', row.assigned_kefu_agent_name)
  if (row.assigned_agent_id)
    return tpl('kefu.liveChat.assignment.agentId', String(row.assigned_agent_id))
  return t('kefu.liveChat.assignment.notTaken')
}

function handoffHint(row: LiveConversationDetail | LiveConversation | null | undefined, aiAutoReplyEnabled: boolean, t: KefuTranslate, tpl: KefuTpl) {
  if (needsHumanAttention(row))
    return t('kefu.liveChat.handoff.needsHuman')
  const s = row?.state
  if (s === 'waiting')
    return t('kefu.liveChat.handoff.waiting')
  if (s === 'active')
    return aiAutoReplyEnabled
      ? tpl('kefu.liveChat.handoff.activeOn', assignmentLabel(row, t, tpl))
      : tpl('kefu.liveChat.handoff.activeOff', assignmentLabel(row, t, tpl))
  if (s === 'closed')
    return t('kefu.liveChat.handoff.closed')
  return t('kefu.liveChat.handoff.default')
}

function senderLabel(role: string | undefined, name: string | undefined, t: KefuTranslate) {
  if (name)
    return name
  if (role === 'visitor')
    return t('kefu.liveChat.sender.visitor')
  if (role === 'agent')
    return t('kefu.liveChat.sender.agent')
  if (role === 'bot')
    return t('kefu.liveChat.sender.bot')
  return t('kefu.liveChat.sender.system')
}

function storeLabel(row: { store_name?: string; store_id?: string } | null | undefined, t: KefuTranslate, tpl: KefuTpl) {
  if (!row)
    return ''
  if (row.store_name)
    return row.store_name
  if (row.store_id)
    return tpl('kefu.common.storeHash', String(row.store_id))
  return ''
}

function parseAttachment(msg: LiveMessage): LiveAttachmentMeta | null {
  const raw = msg.metadata?.attachment
  if (!raw || typeof raw !== 'object' || typeof (raw as LiveAttachmentMeta).id !== 'string')
    return null
  return raw as LiveAttachmentMeta
}

function formatFileSize(n: number) {
  if (!n || n < 1024)
    return `${n || 0} B`
  if (n < 1024 * 1024)
    return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function sortConversations(list: LiveConversation[]) {
  return [...list].sort((a, b) => {
    const ah = needsHumanAttention(a) ? 1 : 0
    const bh = needsHumanAttention(b) ? 1 : 0
    if (bh !== ah) return bh - ah
    const ua = a.visitor_unread_count ?? 0
    const ub = b.visitor_unread_count ?? 0
    if (ub !== ua) return ub - ua
    const ta = new Date(a.last_message_at || a.created_at || 0).getTime()
    const tb = new Date(b.last_message_at || b.created_at || 0).getTime()
    return tb - ta
  })
}

function needsHumanAttention(row?: LiveConversation | LiveConversationDetail | null) {
  return Array.isArray(row?.tags) && row.tags.includes('needs_human') && row.state === 'waiting'
}

const HANDOFF_COMPACT_KEYWORDS = [
  '转人工',
  '人工客服',
  '找人工',
  '真人客服',
  '人工服务',
  '人工处理',
  '人工介入',
  '转接人工',
  'connectmetoagent',
  'humanagent',
  'realperson',
  'liveagent',
  'customerservicerepresentative',
]

function isHandoffRequestMessage(msg?: LiveMessage) {
  if (msg?.sender_role !== 'visitor') return false
  if (msg.metadata?.human_handoff_requested || msg.metadata?.agent_attention === 'needs_human') return true
  const compact = String(msg.content || '').trim().toLowerCase().replace(/\s+/g, '')
  return HANDOFF_COMPACT_KEYWORDS.some(keyword => compact.includes(keyword))
}

function playHandoffTone() {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctor)
      return
    const ctx = new Ctor()
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32)
    gain.connect(ctx.destination)
    for (const [index, frequency] of [880, 1175].entries()) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = frequency
      osc.connect(gain)
      osc.start(ctx.currentTime + index * 0.11)
      osc.stop(ctx.currentTime + index * 0.11 + 0.18)
    }
    window.setTimeout(() => void ctx.close().catch(() => undefined), 600)
  }
  catch {
    // Browsers may block audio before user interaction.
  }
}

function messageLanguageMetadata(content: string, t: KefuTranslate) {
  if (/[\u4e00-\u9fff]/.test(content)) return { detected_language: 'zh-CN', language_label: t('kefu.liveChat.lang.zhCN') }
  if (/[A-Za-z]/.test(content)) return { detected_language: 'en-US', language_label: t('kefu.liveChat.lang.enUS') }
  return { detected_language: 'zh-CN', language_label: t('kefu.liveChat.lang.zhCN') }
}

function optimisticAgentMessage(detail: LiveConversationDetail | null, id: string, content: string, t: KefuTranslate): LiveMessage {
  const now = new Date().toISOString()
  return {
    id,
    conversation: detail?.id || '',
    sender_role: 'agent',
    sender_id: String(detail?.assigned_agent_id || ''),
    sender_name: detail?.assigned_kefu_agent_name || t('kefu.liveChat.sender.me'),
    content,
    content_translated: '',
    content_type: 'text',
    metadata: {
      ...messageLanguageMetadata(content, t),
      pending: true,
    },
    delivered_at: null,
    read_at: null,
    created_at: now,
    client_message_id: id,
  }
}

function httpStatus(error: unknown): number {
  const e = error as { status?: number; response?: { status?: number } }
  return Number(e?.response?.status || e?.status || 0)
}

async function fetchLiveAttachmentBlob(conversationId: string, attachmentId: string, download: boolean): Promise<string> {
  const q = download ? '?download=1' : ''
  const path = `/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(attachmentId)}/${q}`
  const r = await getChatKit().apiClient.get(path, { responseType: 'blob' })
  return URL.createObjectURL(r.data)
}

type MediaPreviewState = { url: string; kind: 'image' | 'video'; name: string } | null

function LiveMessageArticle(props: {
  msg: LiveMessage
  conversationId: string
  languageLabel?: string
  deliveryText?: string
  translationText?: string
  translationError?: string
  translationPending?: string
  onOpenPreview: (meta: LiveAttachmentMeta) => void
  onDownloadFile: (meta: LiveAttachmentMeta) => void
}) {
  const { t } = usePreferences()
  const {
    msg,
    conversationId,
    languageLabel,
    deliveryText,
    translationText,
    translationError,
    translationPending,
    onOpenPreview,
    onDownloadFile,
  } = props
  const att = parseAttachment(msg)
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    if (!att || att.kind !== 'image')
      return
    let blobUrl: string | null = null
    let cancelled = false
    void (async () => {
      try {
        const u = await fetchLiveAttachmentBlob(conversationId, att.id, false)
        if (!cancelled) {
          blobUrl = u
          setThumb(u)
        }
      }
      catch {
        /* 缩略图失败时保留占位 */
      }
    })()
    return () => {
      cancelled = true
      if (blobUrl)
        URL.revokeObjectURL(blobUrl)
    }
  }, [att, conversationId])

  if (msg.sender_role === 'system') {
    return (
      <div className="x1-lc-bubble-row is-system">
        {msg.content || t('kefu.common.systemMessage')}
      </div>
    )
  }

  const isAgentSide = msg.sender_role === 'agent' || msg.sender_role === 'bot'
  const who = senderLabel(msg.sender_role, msg.sender_name, t)

  return (
    <div className={`x1-lc-bubble-row ${isAgentSide ? 'is-agent' : 'is-visitor'}`}>
      <div className="x1-lc-bubble-meta">
        <strong>{who}</strong>
        <time dateTime={msg.created_at}>{liveChatBubbleTime(msg.created_at)}</time>
        {languageLabel ? <span className="x1-lc-badge">{languageLabel}</span> : null}
        {deliveryText ? <span className="x1-lc-badge">{deliveryText}</span> : null}
      </div>
      
      <div className="x1-lc-bubble-content">
        {att ? (
          <div className="mr-live-msg-att">
            {att.kind === 'image' ? (
              <button
                type="button"
                className="mr-live-msg-att__thumb"
                onClick={() => void onOpenPreview(att)}
                aria-label={t('kefu.common.viewLargeImage')}
              >
                {thumb
                  ? <img src={thumb} alt={att.name} />
                  : <span className="mr-muted"><ImageIcon size={28} /></span>}
              </button>
            ) : null}
            {att.kind === 'video' ? (
              <button
                type="button"
                className="mr-live-msg-att__video"
                onClick={() => void onOpenPreview(att)}
                aria-label={t('kefu.common.playVideo')}
              >
                <Film size={28} />
                <span>{t('kefu.common.clickPlay')}</span>
              </button>
            ) : null}
            {att.kind === 'file' ? (
              <button
                type="button"
                className="mr-live-msg-att__file"
                onClick={() => void onDownloadFile(att)}
              >
                <FileText size={18} />
                <span>{att.name}</span>
                <small>{formatFileSize(att.size)}</small>
                <Download size={16} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
        
        {msg.content ? <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div> : att ? null : <div>{t('kefu.common.emptyMessage')}</div>}
        
        {translationText ? (
          <div className="mr-live-msg-translation">
            <span>{t('kefu.common.translation')}</span>
            <p>{translationText}</p>
          </div>
        ) : null}
        {translationError ? <div className="mr-live-msg-translation-error">{translationError}</div> : null}
        {!translationError && translationPending ? <div className="mr-live-msg-translation-pending">{translationPending}</div> : null}
      </div>
    </div>
  )
}

export function LiveChatShellPage({ state: controlledState, onStateChange, hideStateTabs = false }: LiveChatShellPageProps) {
  const { t, tpl } = usePreferences()
  const TABS = useMemo(() => [
    { key: 'waiting' as LiveState, label: t('kefu.liveChat.state.waiting') },
    { key: 'active' as LiveState, label: t('kefu.liveChat.state.active') },
    { key: 'closed' as LiveState, label: t('kefu.liveChat.state.closed') },
  ], [t])
  const channelLabel = useCallback((channel: string) => {
    const map: Record<string, string> = {
      web: t('kefu.liveChat.channel.web'),
      official_site: t('kefu.liveChat.channel.officialSite'),
      telegram: t('kefu.liveChat.channel.telegram'),
      whatsapp: t('kefu.liveChat.channel.whatsapp'),
      wecom: t('kefu.liveChat.channel.wecom'),
    }
    return map[channel] || channel
  }, [t])
  const languageLabelMap = useMemo(() => ({
    'zh-CN': t('kefu.liveChat.lang.zhCN'),
    'zh-TW': t('kefu.liveChat.lang.zhTW'),
    'en-US': t('kefu.liveChat.lang.enUS'),
    ja: t('kefu.liveChat.lang.ja'),
    ko: t('kefu.liveChat.lang.ko'),
    es: t('kefu.liveChat.lang.es'),
    fr: t('kefu.liveChat.lang.fr'),
    de: t('kefu.liveChat.lang.de'),
    pt: t('kefu.liveChat.lang.pt'),
    ru: t('kefu.liveChat.lang.ru'),
    ar: t('kefu.liveChat.lang.ar'),
    th: t('kefu.liveChat.lang.th'),
    vi: t('kefu.liveChat.lang.vi'),
  }), [t])
  const navigate = useNavigate()
  const liveChatStore = useLiveChatStore()
  const {
    activeCount,
    activeVisitorUnreadSum,
    closedCount,
    agentJoin,
    agentLeave,
    agentSendMessage,
    agentWsStatus,
    applyStateTransition,
    attachAgentPanel,
    ensureAgentRealtime,
    fetchCounts: fetchLiveCounts,
    pollHandle,
    waitingCount,
    waitingVisitorUnreadSum,
  } = liveChatStore
  const isDesktop = useMediaMinWidth(721)
  const [state, setLiveState] = useState<LiveState>(controlledState || 'waiting')
  const [setup, setSetup] = useState<KefuSetupState>(KEFU_SETUP_EMPTY)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [olderMessagesHasMore, setOlderMessagesHasMore] = useState(false)
  const [olderMessagesCursor, setOlderMessagesCursor] = useState('')
  const [sending, setSending] = useState(false)
  const [takingOver, setTakingOver] = useState(false)
  const [closing, setClosing] = useState(false)
  const [blockingVisitor, setBlockingVisitor] = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [quickAnswers, setQuickAnswers] = useState<QuickReply[]>([])
  const [quickAnswersLoading, setQuickAnswersLoading] = useState(false)
  const [quickAnswersOpen, setQuickAnswersOpen] = useState(false)
  const [autoReplySaving, setAutoReplySaving] = useState(false)
  const [translationEnabled, setTranslationEnabled] = useState(true)
  const [autoTranslating, setAutoTranslating] = useState(false)
  const [listError, setListError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [list, setList] = useState<LiveConversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<LiveConversationDetail | null>(null)
  const [suggestedReply, setSuggestedReply] = useState<SuggestedReplyState | null>(null)
  const [showFacts, setShowFacts] = useState(false)
  const [draft, setDraft] = useState('')
  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false)
  const [warehouseSelectingId, setWarehouseSelectingId] = useState('')
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const selectedIdRef = useRef('')
  const stateRef = useRef<LiveState>('waiting')
  const listRef = useRef<LiveConversation[]>([])
  const detailRef = useRef<LiveConversationDetail | null>(null)
  const listRequestSeqRef = useRef(0)
  const detailRequestSeqRef = useRef(0)
  const pendingAutoTranslationsRef = useRef(new Set<string>())
  const pendingWsSendsRef = useRef(new Map<string, { content: string; optimisticId: string; timer: ReturnType<typeof setTimeout> }>())
  const countRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handoffAlertedRef = useRef(new Set<string>())
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const latestMessageScrollKeyRef = useRef('')
  const olderTopSentinelRef = useRef<HTMLDivElement | null>(null)
  const loadOlderMessagesRef = useRef<() => Promise<void>>(async () => {})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewState>(null)
  const selectConversation = useCallback((id: string) => {
    selectedIdRef.current = id
    setSelectedId(id)
  }, [])
  const clearDetailState = useCallback(() => {
    detailRequestSeqRef.current += 1
    detailRef.current = null
    setLoadingDetail(false)
    setDetail(null)
    setSuggestedReply(null)
    setOlderMessagesHasMore(false)
    setOlderMessagesCursor('')
  }, [])
  const changeState = useCallback((next: LiveState) => {
    stateRef.current = next
    setLiveState(next)
    onStateChange?.(next)
  }, [onStateChange])

  const selected = useMemo(
    () => list.find(row => row.id === selectedId) || null,
    [list, selectedId],
  )
  selectedIdRef.current = selectedId
  stateRef.current = state
  listRef.current = list
  detailRef.current = detail

  useEffect(() => {
    if (!controlledState || controlledState === stateRef.current)
      return
    stateRef.current = controlledState
    setLiveState(controlledState)
    setDetailError('')
    setSuggestedReply(null)
  }, [controlledState])

  /** 详情未返回前用列表行状态兜底，避免进行中会话仍短暂可点「接管」。 */
  const selectedConvState = detail?.state ?? selected?.state
  const selectedVisitorBlocked = Boolean((detail || selected)?.visitor?.is_blocked)
  const selectedAiAutoReplyEnabled = Boolean((detail ?? selected)?.ai_auto_reply_enabled)
  const selectedStoreId = String(detail?.store_id || selected?.store_id || '')
  const visibleQuickAnswers = useMemo(() => {
    return quickAnswers.filter((item) => {
      if (!item.content?.trim())
        return false
      if (!item.store)
        return true
      return selectedStoreId ? String(item.store) === selectedStoreId : false
    })
  }, [quickAnswers, selectedStoreId])

  const wsStatus = useMemo<'connecting' | 'open' | 'closed' | 'no-token' | 'auth-failed'>(() => {
    const s = agentWsStatus
    if (s === 'no-token') return 'no-token'
    if (s === 'auth-failed') return 'auth-failed'
    if (s === 'open') return 'open'
    if (s === 'closed') return 'closed'
    return 'connecting'
  }, [agentWsStatus])

  const tabStats = useMemo(() => ({
    waiting: { count: waitingCount, unread: waitingVisitorUnreadSum },
    active: { count: activeCount, unread: activeVisitorUnreadSum },
    closed: { count: closedCount, unread: 0 },
  }), [
    activeCount,
    activeVisitorUnreadSum,
    waitingCount,
    waitingVisitorUnreadSum,
    closedCount,
  ])

  const setupSteps = useMemo(() => [
    {
      key: 'store',
      label: t('kefu.liveChat.setup.store'),
      hint: t('kefu.liveChat.setup.storeHint'),
      ready: setup.stores > 0,
      count: setup.stores,
      route: '/workbench/kefu/settings?tab=stores',
    },
    {
      key: 'sdk',
      label: t('kefu.liveChat.setup.sdk'),
      hint: t('kefu.liveChat.setup.sdkHint'),
      ready: setup.sdkConfigs > 0,
      count: setup.sdkConfigs,
      route: '/workbench/kefu/settings?tab=tech-config',
    },
    {
      key: 'corpus',
      label: t('kefu.liveChat.setup.corpus'),
      hint: t('kefu.liveChat.setup.corpusHint'),
      ready: setup.corpusEntries > 0,
      count: setup.corpusEntries,
      route: '/workbench/kefu/settings?tab=uploads',
    },
  ], [setup.corpusEntries, setup.sdkConfigs, setup.stores, t])

  const setupReadyCount = setupSteps.filter(item => item.ready).length
  const nextSetupStep = setupSteps.find(item => !item.ready) || setupSteps[setupSteps.length - 1]
  const latestMessageScrollKey = useMemo(() => {
    if (!detail?.id)
      return ''
    const last = detail.messages[detail.messages.length - 1]
    if (!last)
      return `${detail.id}:empty`
    return `${detail.id}:${last.id}:${last.created_at || ''}:${last.client_message_id || ''}`
  }, [detail?.id, detail?.messages])

  const scrollMessagesToBottom = useCallback((conversationId = selectedIdRef.current) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = messageListRef.current
        if (!el || (conversationId && detailRef.current?.id !== conversationId)) return
        el.scrollTop = el.scrollHeight
      })
    })
  }, [])

  const loadSetupState = useCallback(async () => {
    const kit = getChatKit()
    const [storeRes, sdkRes, corpusRes, conversationRes] = await Promise.allSettled([
      kit.StoreAPI.list({ page_size: 1 }),
      kit.SDKConfigAPI.list({ page_size: 1 }),
      kit.CorpusAPI.list({ page_size: 1, is_active: true }),
      kit.ChatAPI.conversations({ page_size: 1 }),
    ])
    setSetup({
      loading: false,
      stores: storeRes.status === 'fulfilled' ? Number(storeRes.value.total || storeRes.value.items?.length || 0) : 0,
      sdkConfigs: sdkRes.status === 'fulfilled' ? Number(sdkRes.value.total || sdkRes.value.items?.length || 0) : 0,
      corpusEntries: corpusRes.status === 'fulfilled' ? Number(corpusRes.value.total || corpusRes.value.items?.length || 0) : 0,
      conversations: conversationRes.status === 'fulfilled' ? Number(conversationRes.value.total || conversationRes.value.items?.length || 0) : 0,
    })
  }, [])

  const filtered = useMemo(() => {
    return list.filter(item => item.state === state)
  }, [list, state])

  const loadList = useCallback(async (preserve = true, forceSelectId = '', stateForRequest?: LiveState) => {
    const requestSeq = ++listRequestSeqRef.current
    const effectiveState = stateForRequest ?? stateRef.current
    setLoadingList(true)
    setListError('')
    const previousList = listRef.current
    const previousSelectedId = selectedIdRef.current
    try {
      const params = {
        state: effectiveState,
      }
      const res = await getChatKit().ChatAPI.conversations(params)
      if (requestSeq !== listRequestSeqRef.current || effectiveState !== stateRef.current)
        return
      const merged = sortConversations(res.items)
      setList(merged)
      if (forceSelectId && merged.some(item => item.id === forceSelectId)) {
        selectConversation(forceSelectId)
        return
      }
      if (preserve && previousSelectedId && merged.some(item => item.id === previousSelectedId)) {
        selectConversation(previousSelectedId)
        return
      }
      const nextSelectedId = merged[0]?.id || ''
      selectConversation(nextSelectedId)
      if (!nextSelectedId)
        clearDetailState()
    }
    catch (err) {
      if (requestSeq !== listRequestSeqRef.current || effectiveState !== stateRef.current)
        return
      setListError(describeKefuError(err, t('kefu.liveChat.listLoadFailed')))
      const fallbackList = previousList.filter(row => row.state === effectiveState)
      if (fallbackList.length > 0) {
        setList(fallbackList)
        if (previousSelectedId && fallbackList.some(item => item.id === previousSelectedId))
          selectConversation(previousSelectedId)
        else
          selectConversation(fallbackList[0]?.id || '')
      }
      else {
        setList([])
        selectConversation('')
        clearDetailState()
      }
    }
    finally {
      if (requestSeq === listRequestSeqRef.current && effectiveState === stateRef.current)
        setLoadingList(false)
    }
  }, [clearDetailState, selectConversation])

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      clearDetailState()
      return
    }
    const requestSeq = ++detailRequestSeqRef.current
    setLoadingDetail(true)
    setDetailError('')
    setDetail(prev => (prev?.id === id ? prev : null))
    setSuggestedReply(null)
    setOlderMessagesHasMore(false)
    setOlderMessagesCursor('')
    try {
      const data = await getChatKit().ChatAPI.detail(id, { message_limit: LIVE_CHAT_MESSAGE_PAGE_SIZE })
      if (requestSeq !== detailRequestSeqRef.current || selectedIdRef.current !== id)
        return
      setDetail(data)
      setOlderMessagesHasMore(!!data.messages_page?.has_more)
      setOlderMessagesCursor(data.messages_page?.before_cursor || data.messages[0]?.id || '')
      setSuggestedReply(null)
    }
    catch (err) {
      if (requestSeq !== detailRequestSeqRef.current || selectedIdRef.current !== id)
        return
      const message = describeKefuError(err, t('kefu.liveChat.detailLoadFailed'))
      setDetailError(message)
      if (httpStatus(err) === 404) {
        setDetail(null)
        setSuggestedReply(null)
        const next = listRef.current.filter(row => row.id !== id)
        const currentTabItems = next.filter(row => row.state === stateRef.current)
        setList(next)
        selectConversation(currentTabItems[0]?.id || '')
      }
      else {
        setDetail(prev => (prev?.id === id ? prev : null))
      }
    }
    finally {
      if (requestSeq === detailRequestSeqRef.current)
        setLoadingDetail(false)
    }
  }, [clearDetailState, selectConversation])

  const scheduleRefreshLiveCounts = useCallback((delayMs = 320) => {
    if (countRefreshTimerRef.current) clearTimeout(countRefreshTimerRef.current)
    countRefreshTimerRef.current = setTimeout(() => {
      countRefreshTimerRef.current = null
      fetchLiveCounts().catch(() => {})
    }, delayMs)
  }, [fetchLiveCounts])

  const loadOlderMessages = useCallback(async () => {
    if (!detail || loadingOlderMessages || !olderMessagesHasMore) return
    const beforeId = olderMessagesCursor || detail.messages[0]?.id
    if (!beforeId) return
    const listEl = messageListRef.current
    const prevScrollHeight = listEl?.scrollHeight ?? 0
    const prevScrollTop = listEl?.scrollTop ?? 0
    const convId = detail.id
    setLoadingOlderMessages(true)
    try {
      const res = await getChatKit().ChatAPI.messages(convId, { before_id: beforeId, limit: LIVE_CHAT_MESSAGE_PAGE_SIZE })
      const incoming = res?.items || []
      if (!incoming.length) {
        setOlderMessagesHasMore(false)
        return
      }
      setDetail((prev) => {
        if (!prev || prev.id !== convId) return prev
        const seen = new Set(prev.messages.map(m => m.id))
        const older = incoming.filter(m => !seen.has(m.id))
        if (!older.length) return prev
        return { ...prev, messages: [...older, ...prev.messages] }
      })
      setOlderMessagesCursor(
        (typeof res.before_cursor === 'string' && res.before_cursor) ? res.before_cursor : (incoming[0]?.id || ''),
      )
      setOlderMessagesHasMore(!!res.has_more)
    }
    catch {
      setDetailError(t('kefu.liveChat.loadOlderFailed'))
    }
    finally {
      setLoadingOlderMessages(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = messageListRef.current
          if (el && prevScrollHeight > 0)
            el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop
        })
      })
    }
  }, [detail, loadingOlderMessages, olderMessagesHasMore, olderMessagesCursor])

  useEffect(() => {
    loadOlderMessagesRef.current = loadOlderMessages
  }, [loadOlderMessages])

  useEffect(() => {
    if (!latestMessageScrollKey) {
      latestMessageScrollKeyRef.current = ''
      return
    }
    if (latestMessageScrollKey === latestMessageScrollKeyRef.current)
      return
    if (loadingOlderMessages)
      return
    latestMessageScrollKeyRef.current = latestMessageScrollKey
    scrollMessagesToBottom(detail?.id || '')
  }, [detail?.id, latestMessageScrollKey, loadingOlderMessages, scrollMessagesToBottom])

  useEffect(() => {
    const root = messageListRef.current
    const target = olderTopSentinelRef.current
    if (!root || !target || !detail?.id) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        void loadOlderMessagesRef.current()
      },
      { root, rootMargin: '100px 0px 0px 0px', threshold: 0 },
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [detail?.id, olderMessagesHasMore, loadingOlderMessages])

  const openMediaPreview = useCallback(async (meta: LiveAttachmentMeta) => {
    const cid = selectedIdRef.current
    if (!cid)
      return
    try {
      const url = await fetchLiveAttachmentBlob(cid, meta.id, false)
      setMediaPreview((prev) => {
        if (prev?.url)
          URL.revokeObjectURL(prev.url)
        return { url, kind: meta.kind === 'video' ? 'video' : 'image', name: meta.name }
      })
    }
    catch {
      setDetailError(t('kefu.liveChat.previewFailed'))
    }
  }, [])

  const downloadLiveFile = useCallback(async (meta: LiveAttachmentMeta) => {
    const cid = selectedIdRef.current
    if (!cid)
      return
    if (!window.confirm(tpl('kefu.liveChat.downloadConfirm', meta.name)))
      return
    try {
      const url = await fetchLiveAttachmentBlob(cid, meta.id, true)
      const a = document.createElement('a')
      a.href = url
      a.download = meta.name || 'download'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    }
    catch {
      setDetailError(t('kefu.liveChat.downloadFailed'))
    }
  }, [])

  useEffect(() => {
    return () => {
      if (mediaPreview?.url)
        URL.revokeObjectURL(mediaPreview.url)
    }
  }, [mediaPreview])

  useEffect(() => {
    void loadList(false)
  }, [loadList, state])

  useEffect(() => {
    void loadSetupState()
  }, [loadSetupState])

  useEffect(() => {
    if (loadingList)
      return
    if (selectedId && filtered.some(row => row.id === selectedId))
      return
    if (filtered[0]) {
      if (selectedId)
        setDetailError(t('kefu.liveChat.stateChanged'))
      selectConversation(filtered[0].id)
      return
    }
    if (selectedId) {
      selectConversation('')
      clearDetailState()
      return
    }
    if (detail)
      clearDetailState()
  }, [clearDetailState, detail, filtered, loadingList, selectConversation, selectedId])

  const appendInPlace = useCallback((message: LiveMessage) => {
    setDetail((prev) => {
      if (!prev || message.conversation !== prev.id) return prev
      const index = prev.messages.findIndex(m => m.id === message.id)
      const nextMessages = [...prev.messages]
      if (index >= 0) nextMessages.splice(index, 1, message)
      else nextMessages.push(message)
      return { ...prev, messages: nextMessages }
    })
  }, [])

  const updateMessageInPlace = useCallback((message?: LiveMessage) => {
    if (!message) return
    setDetail((prev) => {
      if (!prev || message.conversation !== prev.id) return prev
      const index = prev.messages.findIndex(m => m.id === message.id)
      if (index < 0) return prev
      const nextMessages = [...prev.messages]
      nextMessages.splice(index, 1, message)
      return { ...prev, messages: nextMessages }
    })
  }, [])

  const bumpListMeta = useCallback((env: { conversation: LiveConversation; message?: LiveMessage }) => {
    const conv = env.conversation
    if (!conv?.id) return
    if (needsHumanAttention(conv)) {
      const alertKey = `${conv.id}:${env.message?.id || conv.last_message_at || ''}`
      if (!handoffAlertedRef.current.has(alertKey)) {
        handoffAlertedRef.current.add(alertKey)
        playHandoffTone()
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(t('kefu.liveChat.notification.handoffTitle'), {
              body: tpl('kefu.liveChat.notification.handoffBody', conv.visitor?.name || t('kefu.common.visitor')),
              tag: `kefu-handoff-${conv.id}`,
            })
          }
          catch {
            // Notification support varies by browser.
          }
        }
      }
    }
    const currentTab = stateRef.current
    const currentSelectedId = selectedIdRef.current
    if (currentSelectedId === conv.id && conv.state !== currentTab) {
      changeState(conv.state)
      selectConversation(conv.id)
    }
    setList((prev) => {
      const i = prev.findIndex(c => c.id === conv.id)
      const matchesTab = conv.state === stateRef.current
      if (i >= 0) {
        if (!matchesTab) return prev.filter(c => c.id !== conv.id)
        const next = [...prev]
        const merged = { ...next[i] }
        assignDefined(merged, conv as unknown as Record<string, unknown>)
        next.splice(i, 1, merged as LiveConversation)
        return sortConversations(next)
      }
      if (!matchesTab) return prev
      return sortConversations([conv, ...prev])
    })
    if (env.message) appendInPlace(env.message)
    scheduleRefreshLiveCounts()
  }, [appendInPlace, changeState, scheduleRefreshLiveCounts, selectConversation])

  const replaceOptimisticMessage = useCallback((optimisticId: string, confirmed?: LiveMessage) => {
    setDetail((prev) => {
      if (!prev) return prev
      if (!confirmed) {
        return { ...prev, messages: prev.messages.filter(m => m.id !== optimisticId) }
      }
      const hasConfirmed = prev.messages.some(m => m.id === confirmed.id)
      const withoutOptimistic = prev.messages.filter(m => m.id !== optimisticId).map(m => m.id === confirmed.id ? confirmed : m)
      const nextMessages = hasConfirmed ? withoutOptimistic : [...withoutOptimistic, confirmed]
      return { ...prev, messages: nextMessages }
    })
  }, [])

  const markOptimisticFailed = useCallback((optimisticId: string) => {
    setDetail((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: prev.messages.map((m) => {
          if (m.id !== optimisticId) return m
          return {
            ...m,
            metadata: {
              ...(m.metadata || {}),
              pending: false,
              send_failed: true,
            },
          }
        }),
      }
    })
  }, [])

  const settlePendingSend = useCallback((clientMessageId: string, ok: boolean, error = '', confirmed?: LiveMessage) => {
    const pending = pendingWsSendsRef.current.get(clientMessageId)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingWsSendsRef.current.delete(clientMessageId)
    setSending(false)
    if (ok) {
      replaceOptimisticMessage(pending.optimisticId, confirmed)
      scheduleRefreshLiveCounts(120)
      return
    }
    setDraft(pending.content)
    markOptimisticFailed(pending.optimisticId)
    setDetailError(error || t('kefu.liveChat.delivery.failed'))
  }, [markOptimisticFailed, replaceOptimisticMessage, scheduleRefreshLiveCounts])

  const clearPendingSends = useCallback(() => {
    for (const pending of pendingWsSendsRef.current.values()) {
      clearTimeout(pending.timer)
      replaceOptimisticMessage(pending.optimisticId)
    }
    pendingWsSendsRef.current.clear()
    setSending(false)
  }, [replaceOptimisticMessage])

  const compensateSelectedMessages = useCallback(async () => {
    const current = detailRef.current
    if (!current) return
    const last = current.messages[current.messages.length - 1]
    if (!last) {
      await loadDetail(current.id)
      return
    }
    try {
      const res = await getChatKit().ChatAPI.messages(current.id, { after_id: last.id, limit: 50 })
      const incoming = res?.items || []
      if (!incoming.length) return
      setDetail((prev) => {
        if (!prev || prev.id !== current.id) return prev
        const seen = new Set(prev.messages.map(m => m.id))
        const merged = [...prev.messages]
        for (const msg of incoming) {
          if (!seen.has(msg.id)) merged.push(msg)
        }
        return { ...prev, messages: merged }
      })
    }
    catch {
      // best effort
    }
  }, [loadDetail])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setQuickAnswersLoading(true)
    getChatKit().QuickReplyAPI.list({ category: 'agent_answer', page_size: 200 })
      .then((res) => {
        if (!cancelled)
          setQuickAnswers(res.items || [])
      })
      .catch(() => {
        if (!cancelled)
          setDetailError(t('kefu.liveChat.quickAnswersLoadFailed'))
      })
      .finally(() => {
        if (!cancelled)
          setQuickAnswersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function buildAgentPanelHandlers(): LiveAgentPanelHandlers {
      return {
        onReady: () => {
          const current = selectedIdRef.current
          const selectedConv = listRef.current.find(item => item.id === current)
          if (current && selectedConv?.state !== 'closed') agentJoin(current)
          void compensateSelectedMessages()
        },
        onMessage: (env) => {
          if (selectedIdRef.current === env.conversation.id) {
            setDetail((prev) => {
              if (!prev || prev.id !== env.conversation.id) return prev
              const next = { ...prev }
              assignDefined(next, env.conversation as unknown as Record<string, unknown>)
              return next
            })
          }
          bumpListMeta(env)
        },
        onMessageUpdated: (env) => {
          if (selectedIdRef.current === env.conversation.id) {
            setDetail((prev) => {
              if (!prev || prev.id !== env.conversation.id) return prev
              const next = { ...prev }
              assignDefined(next, env.conversation as unknown as Record<string, unknown>)
              return next
            })
          }
          updateMessageInPlace(env.message)
        },
        onState: (env) => {
          if (selectedIdRef.current === env.conversation.id) {
            setDetail((prev) => {
              if (!prev || prev.id !== env.conversation.id) return prev
              const next = { ...prev }
              assignDefined(next, env.conversation as unknown as Record<string, unknown>)
              return next
            })
          }
          bumpListMeta(env)
        },
        onMerchantEvent: (event, data) => {
          if (event === 'message' || event === 'state' || event === 'handoff_alert') {
            const conversation = data?.conversation as LiveConversation | undefined
            const message = data?.message as LiveMessage | undefined
            if (conversation) bumpListMeta({ conversation, message })
          }
        },
        onAck: (env) => {
          if (env.data?.conversation) bumpListMeta(env.data as { conversation: LiveConversation; message?: LiveMessage })
          settlePendingSend(env.client_message_id, true, '', env.data?.message)
        },
        onNack: env => settlePendingSend(env.client_message_id, false, env.error),
      }
    }

    ensureAgentRealtime()
    attachAgentPanel(buildAgentPanelHandlers())
    fetchLiveCounts().catch(() => {})
    return () => {
      const current = selectedIdRef.current
      if (current) agentLeave(current)
      attachAgentPanel(null)
      clearPendingSends()
      if (countRefreshTimerRef.current) {
        clearTimeout(countRefreshTimerRef.current)
        countRefreshTimerRef.current = null
      }
    }
  }, [agentJoin, agentLeave, attachAgentPanel, bumpListMeta, clearPendingSends, compensateSelectedMessages, ensureAgentRealtime, fetchLiveCounts, settlePendingSend, updateMessageInPlace])

  useEffect(() => {
    if (wsStatus === 'open')
      return
    const timer = window.setInterval(() => {
      if (document.hidden) return
      void loadList(true)
      if (selectedIdRef.current)
        void loadDetail(selectedIdRef.current)
      if (pollHandle == null)
        scheduleRefreshLiveCounts()
    }, 15000)
    return () => window.clearInterval(timer)
  }, [loadDetail, loadList, pollHandle, scheduleRefreshLiveCounts, wsStatus])

  useEffect(() => {
    if (selectedId)
      void loadDetail(selectedId)
    else {
      setDetail(null)
      setSuggestedReply(null)
    }
  }, [loadDetail, selectedId])

  useEffect(() => {
    const current = list.find(item => item.id === selectedId)
    if (selectedId && current?.state !== 'closed') agentJoin(selectedId)
    return () => {
      if (selectedId) agentLeave(selectedId)
    }
  }, [agentJoin, agentLeave, list, selectedId])

  useEffect(() => {
    if (isDesktop) setMobileDetailOpen(false)
  }, [isDesktop])

  useEffect(() => {
    if (!isDesktop) setMobileDetailOpen(false)
  }, [isDesktop, state])

  function messageLanguage(msg: LiveMessage): string {
    const raw = String(msg.metadata?.detected_language || '')
    const text = msg.content || ''
    if (raw.toLowerCase().startsWith('zh')) {
      if (SIMPLIFIED_CHINESE_HINT_RE.test(text) && !TRADITIONAL_CHINESE_HINT_RE.test(text))
        return 'zh-CN'
      if (TRADITIONAL_CHINESE_HINT_RE.test(text) && !SIMPLIFIED_CHINESE_HINT_RE.test(text))
        return 'zh-TW'
      return raw
    }
    if (raw) return raw
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh-CN'
    if (/[A-Za-z]/.test(text)) return 'en-US'
    return detail?.visitor?.locale || 'zh-CN'
  }

  function messageLanguageLabel(msg: LiveMessage): string {
    const code = messageLanguage(msg)
    return languageLabelMap[code as keyof typeof languageLabelMap] || code
  }

  function languageFamily(code: string): string {
    const c = String(code || '').trim().toLowerCase()
    if (c.startsWith('zh')) return 'zh'
    if (c.startsWith('en')) return 'en'
    return c.split('-')[0] || c
  }

  function sameLanguage(a: string, b: string): boolean {
    return languageFamily(a) === languageFamily(b)
  }

  function latestVisitorLanguage(): string {
    const rows = detail?.messages || []
    const visitors = [...rows].reverse().filter(m => m.sender_role === 'visitor')
    const latest = visitors.find(m => !isHandoffRequestMessage(m)) || visitors[0]
    return latest ? messageLanguage(latest) : (detail?.visitor?.locale || 'zh-CN')
  }

  function translateTargetForMessage(msg: LiveMessage): string {
    if (msg.sender_role === 'agent') return String(msg.metadata?.recipient_language || latestVisitorLanguage())
    return 'zh-CN'
  }

  function translationText(msg: LiveMessage, targetLanguage: string): string {
    const translations = msg.metadata?.translations || {}
    const hit = translations?.[targetLanguage]
    if (hit?.text) return String(hit.text)
    const translated = (msg.content_translated || '').trim()
    if (!translated) return ''
    if (targetLanguage === 'zh-CN' && messageLanguage(msg) !== 'zh-CN') return translated
    if (msg.metadata?.recipient_language === targetLanguage) return translated
    return ''
  }

  function isTranslatableMessage(msg: LiveMessage): boolean {
    return msg.sender_role === 'visitor' || msg.sender_role === 'agent' || msg.sender_role === 'bot'
  }

  function messageTranslationForAgent(msg: LiveMessage): string {
    if (!translationEnabled || !isTranslatableMessage(msg)) return ''
    const targetLanguage = translateTargetForMessage(msg)
    if (sameLanguage(messageLanguage(msg), targetLanguage)) return ''
    const translated = translationText(msg, targetLanguage).trim()
    if (!translated || translated === msg.content.trim()) return ''
    return translated
  }

  function translationStatus(msg: LiveMessage): string {
    const targetLanguage = translateTargetForMessage(msg)
    return String(msg.metadata?.translation_status?.[targetLanguage] || '')
  }

  function translationErrorText(msg: LiveMessage): string {
    if (!translationEnabled || !isTranslatableMessage(msg)) return ''
    const targetLanguage = translateTargetForMessage(msg)
    if (sameLanguage(messageLanguage(msg), targetLanguage)) return ''
    if (messageTranslationForAgent(msg)) return ''
    if (translationStatus(msg) !== 'failed') return ''
    const err = msg.metadata?.translation_errors?.[targetLanguage]
    const text = String(err?.message || '').trim()
    return text ? tpl('kefu.liveChat.translationUnavailableDetail', text) : t('kefu.liveChat.translationUnavailable')
  }

  function translationPendingText(msg: LiveMessage): string {
    if (!translationEnabled || !isTranslatableMessage(msg)) return ''
    const targetLanguage = translateTargetForMessage(msg)
    if (sameLanguage(messageLanguage(msg), targetLanguage) || messageTranslationForAgent(msg)) return ''
    return translationStatus(msg) === 'pending' ? t('kefu.liveChat.translationPending') : ''
  }

  function messageDeliveryText(msg: LiveMessage): string {
    const rawState = msg.metadata?.delivery_state
    const deliveryState = typeof rawState === 'string' ? rawState : ''
    if (deliveryState === 'read') return t('kefu.liveChat.delivery.read')
    if (deliveryState === 'delivered') return t('kefu.liveChat.delivery.delivered')
    if (msg.metadata?.send_failed) return t('kefu.liveChat.delivery.failed')
    if (msg.metadata?.pending) return t('kefu.liveChat.delivery.pending')
    if (msg.sender_role === 'agent') return t('kefu.liveChat.delivery.sent')
    return ''
  }

  function needsAutoTranslation(msg: LiveMessage): boolean {
    if (!translationEnabled || !isTranslatableMessage(msg)) return false
    const targetLanguage = translateTargetForMessage(msg)
    if (sameLanguage(messageLanguage(msg), targetLanguage)) return false
    if (translationText(msg, targetLanguage).trim()) return false
    const status = translationStatus(msg)
    if (status === 'pending' || status === 'failed') return false
    return !pendingAutoTranslationsRef.current.has(`${msg.id}:${targetLanguage}`)
  }

  const translateMessageInBackground = useCallback(async (msg: LiveMessage) => {
    const conversationId = selectedIdRef.current
    if (!conversationId) return
    const targetLanguage = translateTargetForMessage(msg)
    const key = `${msg.id}:${targetLanguage}`
    if (pendingAutoTranslationsRef.current.has(key)) return
    pendingAutoTranslationsRef.current.add(key)
    try {
      const res = await getChatKit().ChatAPI.translateMessage(conversationId, msg.id, { target_language: targetLanguage })
      setDetail((prev) => {
        if (!prev || prev.id !== conversationId) return prev
        return {
          ...prev,
          messages: prev.messages.map(item => item.id === res.message.id ? res.message : item),
        }
      })
    }
    catch {
      // ignore, next refresh retries
    }
    finally {
      pendingAutoTranslationsRef.current.delete(key)
    }
  }, [])

  const ensureSelectedTranslations = useCallback(async () => {
    const current = detailRef.current
    if (!current || !translationEnabled || autoTranslating) return
    const needs = current.messages.filter(needsAutoTranslation)
    if (!needs.length) return
    setAutoTranslating(true)
    try {
      for (const msg of needs) {
        await translateMessageInBackground(msg)
      }
    }
    finally {
      setAutoTranslating(false)
    }
    const after = detailRef.current
    if (after?.messages.some(needsAutoTranslation)) void ensureSelectedTranslations()
  }, [autoTranslating, translationEnabled, translateMessageInBackground])

  useEffect(() => {
    if (translationEnabled) void ensureSelectedTranslations()
  }, [detail, ensureSelectedTranslations, translationEnabled])

  async function onTakeOver() {
    if (!selectedId)
      return
    setTakingOver(true)
    setDetailError('')
    const id = selectedId
    const previousState = detailRef.current?.state ?? selected?.state ?? stateRef.current
    try {
      const res = await getChatKit().ChatAPI.takeover(id)
      if (res?.conversation)
        setDetail(prev => prev ? ({ ...prev, ...res.conversation }) : (res.conversation as LiveConversationDetail))
      applyStateTransition(previousState, 'active')
      // setState 异步：必须同步更新 ref，且 loadList 显式拉「进行中」，否则仍请求「等待中」导致列表与计数不同步
      changeState('active')
      await loadList(true, id, 'active')
      await loadDetail(id)
      await fetchLiveCounts()
    }
    catch (err) {
      setDetailError(describeKefuError(err, t('kefu.liveChat.takeoverFailed')))
    }
    finally {
      setTakingOver(false)
    }
  }

  async function onToggleAiAutoReply() {
    if (!selectedId)
      return
    const id = selectedId
    const nextEnabled = !selectedAiAutoReplyEnabled
    setAutoReplySaving(true)
    setDetailError('')
    setDetail(prev => (prev?.id === id ? { ...prev, ai_auto_reply_enabled: nextEnabled } : prev))
    setList(prev => prev.map(row => row.id === id ? { ...row, ai_auto_reply_enabled: nextEnabled } : row))
    try {
      const updated = await getChatKit().ChatAPI.patch(id, { ai_auto_reply_enabled: nextEnabled })
      setDetail(prev => (prev?.id === id ? { ...prev, ...updated } : prev))
      setList(prev => sortConversations(prev.map(row => row.id === id ? { ...row, ...updated } : row)))
    }
    catch (err) {
      setDetailError(describeKefuError(err, t('kefu.liveChat.autoReplySaveFailed')))
      await loadDetail(id)
      await loadList(true, id, 'active')
    }
    finally {
      setAutoReplySaving(false)
    }
  }

  async function onCloseConversation() {
    if (!selectedId)
      return
    setClosing(true)
    setDetailError('')
    const id = selectedId
    const previousState = detailRef.current?.state ?? selected?.state ?? stateRef.current
    try {
      const res = await getChatKit().ChatAPI.close(id)
      if (res?.conversation)
        setDetail(prev => prev ? ({ ...prev, ...res.conversation }) : (res.conversation as LiveConversationDetail))
      applyStateTransition(previousState, 'closed')
      changeState('closed')
      await loadList(true, id, 'closed')
      await loadDetail(id)
      await fetchLiveCounts()
    }
    catch (err) {
      setDetailError(describeKefuError(err, t('kefu.liveChat.archiveFailed')))
    }
    finally {
      setClosing(false)
    }
  }

  async function onToggleVisitorBlock() {
    if (!selectedId)
      return
    const id = selectedId
    const currentlyBlocked = Boolean((detail || selected)?.visitor?.is_blocked)
    let reason = ''
    if (!currentlyBlocked) {
      const value = window.prompt(t('kefu.liveChat.blockPrompt'), '')
      if (value === null)
        return
      reason = value.trim()
    }
    else if (!window.confirm(t('kefu.liveChat.unblockConfirm'))) {
      return
    }

    setBlockingVisitor(true)
    setDetailError('')
    try {
      const res = currentlyBlocked
        ? await getChatKit().ChatAPI.unblockVisitor(id)
        : await getChatKit().ChatAPI.blockVisitor(id, { reason })
      if (res?.conversation)
        setDetail(prev => prev ? ({ ...prev, ...res.conversation }) : (res.conversation as LiveConversationDetail))
      if (!currentlyBlocked) {
        changeState('closed')
        await loadList(true, id, 'closed')
      }
      else {
        await loadList(true, id)
      }
      await loadDetail(id)
      scheduleRefreshLiveCounts()
    }
    catch (err) {
      setDetailError(describeKefuError(err, currentlyBlocked ? t('kefu.liveChat.unblockFailed') : t('kefu.liveChat.blockFailed')))
    }
    finally {
      setBlockingVisitor(false)
    }
  }

  async function onSuggestReply() {
    if (!selectedId)
      return
    setAiSuggesting(true)
    setDetailError('')
    try {
      const payload = await getChatKit().ChatAPI.aiSuggestReply(selectedId)
      const next = {
        suggestion: (payload.suggestion || '').trim(),
        corpusSuggestion: (payload.corpus_suggestion || '').trim(),
        matches: payload.corpus_matches || [],
      }
      const recommended = next.suggestion || next.corpusSuggestion
      if (recommended)
        setSuggestedReply(next)
      else
        setDetailError(t('kefu.liveChat.noSuggestion'))
    }
    catch (err) {
      setDetailError(describeKefuError(err, t('kefu.liveChat.suggestFailed'), t('kefu.liveChat.suggestTimeout')))
    }
    finally {
      setAiSuggesting(false)
    }
  }

  function applySuggestedReply(text: string) {
    const next = text.trim()
    if (!next)
      return
    setDraft(next)
  }

  async function sendAgentText(
    content: string,
    options: { clearDraft?: boolean; restoreDraftOnTimeout?: boolean } = {},
  ) {
    const nextContent = content.trim()
    if (!nextContent || !selectedId)
      return false
    const clearDraft = options.clearDraft !== false
    const restoreDraftOnTimeout = options.restoreDraftOnTimeout !== false
    setSending(true)
    setDetailError('')
    try {
      if (wsStatus === 'open' && detail?.state !== 'closed') {
        const clientMessageId = agentSendMessage(selectedId, nextContent)
        if (!clientMessageId) {
          setDetailError(t('kefu.liveChat.sendFailed'))
          return false
        }
        appendInPlace(optimisticAgentMessage(detail, clientMessageId, nextContent, t))
        const timer = setTimeout(() => {
          const pending = pendingWsSendsRef.current.get(clientMessageId)
          pendingWsSendsRef.current.delete(clientMessageId)
          if (pending) markOptimisticFailed(pending.optimisticId)
          if (restoreDraftOnTimeout)
            setDraft(nextContent)
          setDetailError(t('kefu.liveChat.sendTimeout'))
        }, 10000)
        pendingWsSendsRef.current.set(clientMessageId, { content: nextContent, optimisticId: clientMessageId, timer })
        if (clearDraft)
          setDraft('')
        scheduleRefreshLiveCounts(80)
        return true
      }

      await getChatKit().ChatAPI.send(selectedId, nextContent)
      if (clearDraft)
        setDraft('')
      await loadDetail(selectedId)
      await loadList(true)
      const current = detail?.state
      if (current === 'closed')
        changeState('active')
      scheduleRefreshLiveCounts()
      return true
    }
    catch (err) {
      setDetailError(describeKefuError(err, t('kefu.liveChat.messageSendFailed')))
      return false
    }
    finally {
      setSending(false)
    }
  }

  async function sendQuickAnswer(item: QuickReply) {
    const ok = await sendAgentText(item.content || '', { clearDraft: false, restoreDraftOnTimeout: false })
    if (ok)
      setQuickAnswersOpen(false)
  }

  async function sendPickedAttachmentFile(f: File) {
    if (!selectedId)
      return false
    setSending(true)
    setDetailError('')
    try {
      const att = await getChatKit().ChatAPI.uploadLiveAttachment(selectedId, f)
      const cap = draft.trim()
      if (wsStatus === 'open' && detail?.state !== 'closed') {
        const clientMessageId = agentSendMessage(selectedId, cap, att.id)
        if (!clientMessageId) {
          setDetailError(t('kefu.liveChat.sendFailed'))
          return
        }
        if (cap) appendInPlace(optimisticAgentMessage(detail, clientMessageId, cap, t))
        const timer = setTimeout(() => {
          const pending = pendingWsSendsRef.current.get(clientMessageId)
          pendingWsSendsRef.current.delete(clientMessageId)
          if (pending) markOptimisticFailed(pending.optimisticId)
          setDraft(cap)
          setDetailError(t('kefu.liveChat.sendTimeout'))
        }, 10000)
        pendingWsSendsRef.current.set(clientMessageId, { content: cap, optimisticId: clientMessageId, timer })
        setDraft('')
        scheduleRefreshLiveCounts(80)
      }
      else {
        await getChatKit().ChatAPI.send(selectedId, cap, { attachment_id: att.id })
        setDraft('')
        await loadDetail(selectedId)
        await loadList(true)
        if (detail?.state === 'closed')
          changeState('active')
        scheduleRefreshLiveCounts()
      }
      return true
    }
    catch (err) {
      setDetailError(describeKefuError(err, t('kefu.liveChat.attachmentSendFailed')))
      return false
    }
    finally {
      setSending(false)
      if (fileInputRef.current)
        fileInputRef.current.value = ''
    }
  }

  async function onPickFiles(files: FileList | null) {
    const f = files?.[0]
    if (!f)
      return
    await sendPickedAttachmentFile(f)
  }

  async function onPickWarehouseAsset(asset: AgentMaterialAsset) {
    setWarehouseSelectingId(asset.id)
    try {
      const file = await warehouseAssetToFile(asset)
      const sent = await sendPickedAttachmentFile(file)
      if (sent)
        setWarehousePickerOpen(false)
    }
    catch (err) {
      setDetailError(describeKefuError(err, t('kefu.liveChat.attachmentSendFailed')))
    }
    finally {
      setWarehouseSelectingId('')
    }
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !selectedId)
      return
    await sendAgentText(content)
  }

  return (
    <div className="x1-lc-container">
      <section className="x1-lc-workspace">
        {!hideStateTabs ? (
          <header className="x1-lc-header">
            <div className="x1-lc-header-toolbar">
              <div className="x1-lc-toolbar-leading">
                <div className="x1-lc-tabs" role="tablist" aria-label={t('kefu.liveChat.tabsAria')}>
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`x1-lc-tab x1-lc-tab--${tab.key} ${state === tab.key ? 'is-active' : ''}`}
                      onClick={() => {
                        if (tab.key === state)
                          return
                        setDetailError('')
                        setSuggestedReply(null)
                        changeState(tab.key)
                      }}
                    >
                      {tab.label}
                      {tab.key === 'waiting'
                        ? (tabStats.waiting.count > 0 ? <em className="is-alert">{formatCountBadge(tabStats.waiting.count)}</em> : null)
                        : <b>{formatCountBadge(tabStats[tab.key].count)}</b>}
                      {tab.key !== 'waiting' && tabStats[tab.key].unread > 0 ? <em>{formatCountBadge(tabStats[tab.key].unread)}</em> : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>
        ) : null}

        <div className={`x1-lc-body x1-lc-shell ${mobileDetailOpen && !isDesktop ? 'is-mobile-detail' : ''}`}>
        <aside className="x1-lc-sidebar">
          <div className="x1-lc-sidebar-head">
            <span><MessageCircle size={16} className="mr-muted" /> {t('kefu.liveChat.sidebarTitle')}</span>
            <em>{tpl('kefu.common.countItems', String(filtered.length))}</em>
          </div>
          <div className="x1-lc-list">
            {loadingList ? <div className="x1-lc-empty"><p>{t('kefu.common.loadingPlain')}</p></div> : null}
            {listError ? <div className="mr-state-error" style={{ margin: 8 }}>{listError}</div> : null}
            {!loadingList && !listError && filtered.length === 0 ? (
              <div className="x1-lc-empty">
                <div className="x1-lc-empty-icon"><MessageCircle size={24} /></div>
                <p>{state === 'closed' ? t('kefu.liveChat.noArchived') : t('kefu.liveChat.noConversations')}</p>
              </div>
            ) : null}
            
            {filtered.map(row => (
              <button
                key={row.id}
                type="button"
                className={`x1-lc-item ${row.id === selectedId ? 'is-active' : ''}`}
                onClick={() => {
                  selectConversation(row.id)
                  if (!isDesktop) setMobileDetailOpen(true)
                }}
              >
                <DefaultAvatar src={row.visitor?.avatar} className="x1-lc-item-avatar" alt="" size={42} />
                <div className="x1-lc-item-content">
                  <div className="x1-lc-item-top">
                    <strong>{row.visitor?.name || t('kefu.common.visitor')}</strong>
                    <time>{row.visitor_unread_count ? tpl('kefu.liveChat.unread', String(row.visitor_unread_count)) : prettyTime(row.last_message_at)}</time>
                  </div>
                  <div className="x1-lc-item-bottom">
                    <span className="x1-lc-item-badge">{stateLabel(row.state, t)}</span>
                    {needsHumanAttention(row) ? <span className="x1-lc-item-badge x1-lc-item-badge-danger">{t('kefu.liveChat.needsHuman')}</span> : null}
                    {row.visitor?.is_blocked ? <span className="x1-lc-item-badge x1-lc-item-badge-danger">{t('kefu.liveChat.blocked')}</span> : null}
                    <span>{storeLabel(row, t, tpl) || t('kefu.common.defaultStore')} · {channelLabel(String(row.channel || '')) || row.channel || t('kefu.liveChat.channel.web')}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="x1-lc-main">
          <div className="x1-lc-main-head">
            <div className="x1-lc-main-title">
              {!isDesktop ? (
                <button type="button" className="x1-lc-icon-btn" onClick={() => setMobileDetailOpen(false)}>
                  <ChevronLeft size={18} />
                </button>
              ) : null}
              <h2>{selected?.visitor?.name || t('kefu.liveChat.conversationArea')}</h2>
              {selectedId && <span className="x1-lc-badge">{stateLabel(detail?.state || selected?.state, t)}</span>}
              {selectedVisitorBlocked ? <span className="x1-lc-badge x1-lc-badge-danger">{t('kefu.liveChat.blocked')}</span> : null}
            </div>
            
            <div className="x1-lc-main-actions">
              {/* 主操作：根据会话状态自动切换语义 —— 等待中=接管，进行中=AI 建议，已归档=新建消息恢复 */}
              {selectedConvState === 'waiting' ? (
                <button
                  type="button"
                  className="x1-lc-btn x1-lc-btn-primary"
                  onClick={() => void onTakeOver()}
                  disabled={!selectedId || takingOver}
                  title={t('kefu.liveChat.takeoverTitle')}
                >
                  <CheckCheck size={14} />
                  {takingOver ? t('kefu.liveChat.takingOver') : t('kefu.liveChat.takeover')}
                </button>
              ) : (
                <button
                  type="button"
                  className="x1-lc-btn x1-lc-btn-primary"
                  onClick={() => void onSuggestReply()}
                  disabled={!selectedId || aiSuggesting || selectedConvState === 'closed'}
                  title={t('kefu.liveChat.aiSuggestTitle')}
                >
                  <Bot size={14} />
                  {aiSuggesting ? t('kefu.liveChat.aiSuggesting') : t('kefu.liveChat.aiSuggest')}
                </button>
              )}

              <button
                type="button"
                className={`x1-lc-btn ${quickAnswersOpen ? 'is-on' : ''}`}
                onClick={() => setQuickAnswersOpen(prev => !prev)}
                disabled={!selectedId || selectedVisitorBlocked || quickAnswersLoading}
                title={t('kefu.liveChat.quickAnswersTitle')}
              >
                <MessageSquareText size={14} />
                {quickAnswersLoading ? t('kefu.liveChat.quickAnswersLoading') : t('kefu.liveChat.quickAnswers')}
              </button>

              {selectedConvState === 'active' ? (
                <label
                  className={`x1-lc-auto-reply-switch ${selectedAiAutoReplyEnabled ? 'is-on' : ''} ${!selectedId || autoReplySaving ? 'is-disabled' : ''}`}
                  title={selectedAiAutoReplyEnabled ? t('kefu.liveChat.aiAutoReplyOnTitle') : t('kefu.liveChat.aiAutoReplyOffTitle')}
                >
                  <input
                    type="checkbox"
                    role="switch"
                    checked={selectedAiAutoReplyEnabled}
                    disabled={!selectedId || autoReplySaving}
                    onChange={() => void onToggleAiAutoReply()}
                    aria-label={t('kefu.qa.autoReplyAria')}
                  />
                  <span>{autoReplySaving ? t('kefu.common.savingEllipsis') : t('kefu.common.aiAutoReply')}</span>
                </label>
              ) : null}

              <button
                type="button"
                className={`x1-lc-btn ${translationEnabled ? 'is-on' : ''}`}
                onClick={() => setTranslationEnabled(prev => !prev)}
                disabled={!selectedId}
                title={translationEnabled ? t('kefu.liveChat.translationOnTitle') : t('kefu.liveChat.translationOffTitle')}
              >
                <Globe2 size={14} />
                {translationEnabled ? (autoTranslating ? t('kefu.liveChat.translating') : t('kefu.liveChat.translationOn')) : t('kefu.liveChat.translationOff')}
              </button>

              <button
                type="button"
                className="x1-lc-btn"
                onClick={() => setShowFacts(prev => !prev)}
                disabled={!selectedId}
                title={t('kefu.liveChat.detailsTitle')}
              >
                {showFacts ? t('kefu.common.collapseDetails') : t('kefu.common.details')}
              </button>

              <button
                type="button"
                className={`x1-lc-btn ${selectedVisitorBlocked ? '' : 'x1-lc-btn-danger'}`}
                onClick={() => void onToggleVisitorBlock()}
                disabled={!selectedId || blockingVisitor}
                title={selectedVisitorBlocked ? t('kefu.liveChat.unblockTitle') : t('kefu.liveChat.blockTitle')}
              >
                <Ban size={14} />
                {blockingVisitor ? t('kefu.liveChat.blocking') : selectedVisitorBlocked ? t('kefu.liveChat.unblockVisitor') : t('kefu.liveChat.blockVisitor')}
              </button>

              <button
                type="button"
                className="x1-lc-btn"
                onClick={() => void onCloseConversation()}
                disabled={!selectedId || closing || selectedConvState === 'closed'}
                title={t('kefu.liveChat.archiveTitle')}
              >
                {closing ? t('kefu.liveChat.archiving') : t('kefu.liveChat.archive')}
              </button>
            </div>
          </div>

          {selectedId && (detail || selected) ? (
            <div className={`x1-lc-handoff-hint x1-lc-handoff-hint-${selectedConvState || 'none'}`}>
              {needsHumanAttention(detail || selected) || selectedVisitorBlocked ? <span className="x1-lc-handoff-dot" aria-hidden /> : null}
              <span>{selectedVisitorBlocked ? tpl('kefu.liveChat.handoff.blocked', detail?.visitor?.blocked_reason ? tpl('kefu.liveChat.handoff.blockedReason', detail.visitor.blocked_reason) : '') : handoffHint(detail || selected, selectedAiAutoReplyEnabled, t, tpl)}</span>
              <span className="x1-lc-handoff-meta">{assignmentLabel(detail || selected, t, tpl)}</span>
            </div>
          ) : null}

          {loadingDetail ? <div className="x1-lc-empty"><p>{t('kefu.liveChat.loadingDetail')}</p></div> : null}
          {detailError ? <div className="mr-state-error" style={{ margin: 20 }}>{detailError}</div> : null}

          {!loadingDetail && !detailError && !detail ? (
            <div className="x1-lc-empty x1-lc-empty-cta">
              <div className="x1-lc-empty-icon"><MessageCircle size={28} /></div>
              {setupReadyCount < setupSteps.length ? (
                <>
                  <strong>{tpl('kefu.liveChat.setupRemaining', String(setupSteps.length - setupReadyCount))}</strong>
                  <p>{tpl('kefu.liveChat.setupNext', nextSetupStep.label, nextSetupStep.hint)}</p>
                  <div className="x1-lc-empty-actions">
                    <button
                      type="button"
                      className="x1-lc-btn x1-lc-btn-primary"
                      onClick={() => navigate(nextSetupStep.route)}
                    >
                      {tpl('kefu.liveChat.setupGo', nextSetupStep.label)}
                    </button>
                    <button
                      type="button"
                      className="x1-lc-btn"
                      onClick={() => navigate('/workbench/kefu/settings?tab=tech-config')}
                    >
                      {t('kefu.liveChat.setupViewConfig')}
                    </button>
                  </div>
                </>
              ) : list.length === 0 ? (
                <>
                  <strong>{t('kefu.liveChat.readyTitle')}</strong>
                  <p>
                    {t('kefu.liveChat.readyDesc')}
                    {state === 'closed' ? t('kefu.liveChat.readyClosedHint') : ''}
                  </p>
                  <div className="x1-lc-empty-actions">
                    <button
                      type="button"
                      className="x1-lc-btn x1-lc-btn-primary"
                      onClick={() => navigate('/workbench/kefu/settings?tab=tech-config')}
                    >
                      {t('kefu.liveChat.readyViewCreds')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <strong>{t('kefu.liveChat.selectTitle')}</strong>
                  <p>{t('kefu.liveChat.selectDesc')}</p>
                </>
              )}
            </div>
          ) : null}

          {showFacts && detail ? (
            <section className="mr-empty" style={{ margin: '20px 20px 0' }}>
              <div className="mr-panel-head">
                <strong>{t('kefu.liveChat.factsTitle')}</strong>
                <span className="mr-badge">{assignmentLabel(detail, t, tpl)}</span>
              </div>
              <div className="mr-simple-list">
                <article className="mr-simple-item">
                  <div>
                    <strong>{t('kefu.liveChat.factsVisitor')}</strong>
                    <span>
                      {detail.visitor?.name || t('kefu.common.visitor')} · {detail.visitor?.email || detail.visitor?.external_user_id || t('kefu.liveChat.factsNoContact')}
                      {detail.visitor?.is_blocked ? ` · ${t('kefu.liveChat.blocked')}${detail.visitor.blocked_reason ? tpl('kefu.liveChat.handoff.blockedReason', detail.visitor.blocked_reason) : ''}` : ''}
                    </span>
                  </div>
                </article>
                <article className="mr-simple-item">
                  <div>
                    <strong>{t('kefu.liveChat.factsSource')}</strong>
                    <span>{storeLabel(detail, t, tpl) || t('kefu.common.defaultStore')} · {channelLabel(String(detail.channel || '')) || detail.channel || t('kefu.liveChat.channel.web')} · {detail.subject || t('kefu.liveChat.factsNoSubject')}</span>
                  </div>
                </article>
                <article className="mr-simple-item">
                  <div>
                    <strong>{t('kefu.liveChat.factsConversation')}</strong>
                    <span>{tpl('kefu.liveChat.factsRecentActivity', String(detail.id), prettyTime(detail.last_message_at || detail.created_at))}</span>
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          {quickAnswersOpen ? (
            <section className="mr-empty" style={{ margin: '20px 20px 0' }}>
              <div className="mr-panel-head">
                <strong>{t('kefu.liveChat.quickAnswersPanel')}</strong>
                <button type="button" className="mr-btn" onClick={() => setQuickAnswersOpen(false)}>{t('kefu.common.collapse')}</button>
              </div>
              {visibleQuickAnswers.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {visibleQuickAnswers.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="mr-btn"
                      disabled={!selectedId || sending || selectedVisitorBlocked}
                      title={item.content}
                      onClick={() => void sendQuickAnswer(item)}
                      style={{ maxWidth: '100%', justifyContent: 'flex-start' }}
                    >
                      <MessageSquareText size={14} />
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mr-inline-stack">
                  <span className="mr-muted">{t('kefu.liveChat.quickAnswersEmpty')}</span>
                  <button type="button" className="mr-btn" onClick={() => navigate('/workbench/kefu/settings?tab=quick-replies')}>
                    {t('kefu.liveChat.quickAnswersConfig')}
                  </button>
                </div>
              )}
            </section>
          ) : null}

          {suggestedReply ? (
            <section className="mr-empty" style={{ margin: '20px 20px 0' }}>
              <div className="mr-panel-head">
                <strong>{t('kefu.liveChat.suggestedTitle')}</strong>
                <button type="button" className="mr-btn" onClick={() => setSuggestedReply(null)}>{t('kefu.common.collapse')}</button>
              </div>
              {suggestedReply.corpusSuggestion ? (
                <div className="mr-inline-stack">
                  <span className="mr-muted">{t('kefu.liveChat.suggestedCorpus')}</span>
                  <p>{suggestedReply.corpusSuggestion}</p>
                  <button type="button" className="mr-btn" onClick={() => applySuggestedReply(suggestedReply.corpusSuggestion)}>{t('kefu.liveChat.useThis')}</button>
                </div>
              ) : null}
              {suggestedReply.suggestion ? (
                <div className="mr-inline-stack">
                  <span className="mr-muted">{t('kefu.liveChat.suggestedPolish')}</span>
                  <p>{suggestedReply.suggestion}</p>
                  <button type="button" className="mr-btn mr-btn-primary" onClick={() => applySuggestedReply(suggestedReply.suggestion)}>{t('kefu.liveChat.useThis')}</button>
                </div>
              ) : null}
              {suggestedReply.matches.length ? (
                <div className="mr-simple-list">
                  {suggestedReply.matches.slice(0, 3).map((match, index) => (
                    <article key={`${match.score}-${index}`} className="mr-simple-item">
                      <div>
                        <strong>{String(match.entry?.title || match.entry?.question || t('kefu.liveChat.matchBasis'))}</strong>
                        <span>{String(match.entry?.answer || match.entry?.content || '').slice(0, 120)}</span>
                      </div>
                      <span className="mr-badge">{tpl('kefu.liveChat.matchScore', String(match.score))}</span>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <div ref={messageListRef} className="x1-lc-messages">
            <div ref={olderTopSentinelRef} className="mr-msg-top-sentinel" aria-hidden />
            {olderMessagesHasMore || loadingOlderMessages ? (
              <div className="mr-msg-history-loader">
                <span className="mr-msg-history-hint">
                  {loadingOlderMessages ? t('kefu.liveChat.loadOlderLoading') : tpl('kefu.liveChat.loadOlderHint', String(LIVE_CHAT_MESSAGE_PAGE_SIZE))}
                </span>
                <button type="button" className="mr-btn" onClick={() => void loadOlderMessages()} disabled={loadingOlderMessages || !olderMessagesHasMore}>
                  {loadingOlderMessages ? t('kefu.common.loading') : t('kefu.liveChat.loadOlder')}
                </button>
              </div>
            ) : null}
            
            {detail?.id
              ? (detail.messages || []).map(msg => (
                  <LiveMessageArticle
                    key={msg.id}
                    msg={msg}
                    conversationId={detail.id}
                    languageLabel={msg.sender_role !== 'system' ? messageLanguageLabel(msg) : ''}
                    deliveryText={messageDeliveryText(msg)}
                    translationText={messageTranslationForAgent(msg)}
                    translationError={translationErrorText(msg)}
                    translationPending={translationPendingText(msg)}
                    onOpenPreview={openMediaPreview}
                    onDownloadFile={downloadLiveFile}
                  />
                ))
              : null}
          </div>

          {detail?.state === 'closed' ? (
            <div style={{ padding: '0 20px 10px', textAlign: 'center', fontSize: 13, color: 'var(--xiaoone-fg-mute)' }}>
              {t('kefu.liveChat.archivedComposerHint')}
            </div>
          ) : null}

          <form className="x1-lc-composer" onSubmit={onSend}>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
              onChange={e => void onPickFiles(e.target.files)}
            />
            <div className="x1-lc-composer-inner">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (draft.trim() && !sending) onSend(e as unknown as FormEvent<HTMLFormElement>);
                  }
                }}
                placeholder={!selectedId ? t('kefu.liveChat.composerNoSelection') : selectedVisitorBlocked ? t('kefu.liveChat.composerBlocked') : t('kefu.liveChat.composerPlaceholder')}
                disabled={!selectedId || sending || selectedVisitorBlocked}
              />
              <div className="x1-lc-composer-actions">
                <button
                  type="button"
                  className="x1-lc-icon-btn"
                  disabled={!selectedId || sending || selectedVisitorBlocked}
                  onClick={() => fileInputRef.current?.click()}
                  title={t('kefu.common.addAttachment')}
                >
                  <Paperclip size={18} />
                </button>
                <button
                  type="button"
                  className="x1-lc-icon-btn"
                  disabled={!selectedId || sending || selectedVisitorBlocked}
                  onClick={() => setWarehousePickerOpen(true)}
                  title={t('composer.warehouse.pick')}
                >
                  <Database size={18} />
                </button>
                <button 
                  type="submit" 
                  className={`x1-lc-icon-btn ${draft.trim() && !sending ? 'primary' : ''}`}
                  disabled={!selectedId || sending || selectedVisitorBlocked || !draft.trim()}
                  title={t('kefu.common.send')}
                >
                  <SendHorizontal size={18} />
                </button>
              </div>
            </div>
          </form>
        </main>
        </div>
      </section>

      <WarehouseAssetPickerDialog
        open={warehousePickerOpen}
        onOpenChange={setWarehousePickerOpen}
        title={t('composer.warehouse.dialogTitle')}
        description={t('composer.warehouse.dialogDesc')}
        selectingId={warehouseSelectingId}
        onSelect={onPickWarehouseAsset}
      />

      {mediaPreview ? (
        <div
          role="dialog"
          aria-modal
          aria-label={t('kefu.common.attachmentPreview')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(15, 18, 28, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => {
            setMediaPreview((p) => {
              if (p?.url)
                URL.revokeObjectURL(p.url)
              return null
            })
          }}
        >
          <button
            type="button"
            aria-label={t('kefu.common.closePreview')}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              border: 'none',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation()
              setMediaPreview((p) => {
                if (p?.url)
                  URL.revokeObjectURL(p.url)
                return null
              })
            }}
          >
            <X size={20} />
          </button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(960px, 96vw)', maxHeight: '90vh' }}>
            {mediaPreview.kind === 'image' ? (
              <img
                src={mediaPreview.url}
                alt={mediaPreview.name}
                style={{ maxWidth: '100%', maxHeight: '85vh', display: 'block', borderRadius: 8 }}
              />
            ) : (
              <video
                src={mediaPreview.url}
                controls
                playsInline
                style={{ maxWidth: '100%', maxHeight: '85vh', display: 'block', borderRadius: 8, background: '#000' }}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
