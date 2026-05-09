import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './LiveChatShellPage.css'
import { Bot, CheckCheck, ChevronLeft, Download, FileText, Film, Globe2, Image as ImageIcon, MessageCircle, Paperclip, RefreshCw, SendHorizontal, Sparkles, X } from 'lucide-react'
import { assignDefined, getChatKit, type LiveAttachmentMeta, type LiveConversation, type LiveConversationDetail, type LiveChannel, type LiveMessage, type LiveState } from '@xiaoone/chat-kit'
import { ApiError } from '../lib/apiErrors'
import { useLiveChatStore, type LiveAgentPanelHandlers } from '../store/liveChat'
import { useMediaMinWidth } from '../hooks/useMediaMinWidth'

const TABS: Array<{ key: LiveState; label: string }> = [
  { key: 'waiting', label: '等待中' },
  { key: 'active', label: '进行中' },
  { key: 'closed', label: '已归档' },
]

const CHANNEL_OPTIONS = [
  { value: '', label: '全部渠道' },
  { value: 'web', label: '网页' },
  { value: 'official_site', label: '官网' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'wecom', label: '企业微信' },
] as const

const CHANNEL_LABEL: Record<string, string> = {
  web: '网页',
  official_site: '官网',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  wecom: '企业微信',
}

/** 与后端 `message_limit` / `limit` 对齐；最大 50（见 chat_core serializers）。 */
const LIVE_CHAT_MESSAGE_PAGE_SIZE = 20

interface SuggestedReplyState {
  suggestion: string
  corpusSuggestion: string
  matches: Array<{
    score: number
    matched_terms?: string[]
    entry?: Record<string, any>
  }>
}

const LANGUAGE_LABEL: Record<string, string> = {
  'zh-CN': '中文',
  'zh-TW': '繁中',
  'en-US': 'EN',
  ja: '日语',
  ko: '韩语',
  es: '西语',
  fr: '法语',
  de: '德语',
  pt: '葡语',
  ru: '俄语',
  ar: '阿语',
  th: '泰语',
  vi: '越语',
}

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

function stateLabel(state?: string) {
  if (state === 'waiting')
    return '等待中'
  if (state === 'active')
    return '进行中'
  if (state === 'closed')
    return '已归档'
  return '未选择'
}

function assignmentLabel(row?: LiveConversationDetail | LiveConversation | null) {
  if (!row)
    return '未分配'
  if (row.assigned_kefu_agent_name)
    return `客服：${row.assigned_kefu_agent_name}`
  if (row.assigned_agent_id)
    return `客服 #${row.assigned_agent_id}`
  return '未接管'
}

function senderLabel(role?: string, name?: string) {
  if (name)
    return name
  if (role === 'visitor')
    return '访客'
  if (role === 'agent')
    return '客服'
  if (role === 'bot')
    return '自动回复'
  return '系统'
}

function storeLabel(row?: { store_name?: string; store_id?: string } | null) {
  if (!row)
    return ''
  if (row.store_name)
    return row.store_name
  if (row.store_id)
    return `店铺 #${row.store_id}`
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
    const ua = a.visitor_unread_count ?? 0
    const ub = b.visitor_unread_count ?? 0
    if (ub !== ua) return ub - ua
    const ta = new Date(a.last_message_at || a.created_at || 0).getTime()
    const tb = new Date(b.last_message_at || b.created_at || 0).getTime()
    return tb - ta
  })
}

function messageLanguageMetadata(content: string) {
  if (/[\u4e00-\u9fff]/.test(content)) return { detected_language: 'zh-CN', language_label: '中文' }
  if (/[A-Za-z]/.test(content)) return { detected_language: 'en-US', language_label: 'EN' }
  return { detected_language: 'zh-CN', language_label: '中文' }
}

function optimisticAgentMessage(detail: LiveConversationDetail | null, id: string, content: string): LiveMessage {
  const now = new Date().toISOString()
  return {
    id,
    conversation: detail?.id || '',
    sender_role: 'agent',
    sender_id: String(detail?.assigned_agent_id || ''),
    sender_name: detail?.assigned_kefu_agent_name || '我',
    content,
    content_translated: '',
    content_type: 'text',
    metadata: {
      ...messageLanguageMetadata(content),
      pending: true,
    },
    delivered_at: null,
    read_at: null,
    is_demo: !!detail?.is_demo,
    created_at: now,
    client_message_id: id,
  }
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
        {msg.content || '系统消息'}
      </div>
    )
  }

  const isAgentSide = msg.sender_role === 'agent' || msg.sender_role === 'bot'
  const who = senderLabel(msg.sender_role, msg.sender_name)

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
                aria-label="查看大图"
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
                aria-label="播放视频"
              >
                <Film size={28} />
                <span>点击播放</span>
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
        
        {msg.content ? <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div> : att ? null : <div>（空消息）</div>}
        
        {translationText ? (
          <div className="mr-live-msg-translation">
            <span>译文</span>
            <p>{translationText}</p>
          </div>
        ) : null}
        {translationError ? <div className="mr-live-msg-translation-error">{translationError}</div> : null}
        {!translationError && translationPending ? <div className="mr-live-msg-translation-pending">{translationPending}</div> : null}
      </div>
    </div>
  )
}

export function LiveChatShellPage() {
  const liveChatStore = useLiveChatStore()
  const isDesktop = useMediaMinWidth(721)
  const [state, setState] = useState<LiveState>('waiting')
  const [search, setSearch] = useState('')
  const [storeId, setStoreId] = useState('')
  const [channel, setChannel] = useState('')
  const [stores, setStores] = useState<any[]>([])
  const [closedCount, setClosedCount] = useState(0)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [olderMessagesHasMore, setOlderMessagesHasMore] = useState(false)
  const [olderMessagesCursor, setOlderMessagesCursor] = useState('')
  const [sending, setSending] = useState(false)
  const [takingOver, setTakingOver] = useState(false)
  const [closing, setClosing] = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState(false)
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const selectedIdRef = useRef('')
  const stateRef = useRef<LiveState>('waiting')
  const listRef = useRef<LiveConversation[]>([])
  const detailRef = useRef<LiveConversationDetail | null>(null)
  const pendingAutoTranslationsRef = useRef(new Set<string>())
  const pendingWsSendsRef = useRef(new Map<string, { content: string; optimisticId: string; timer: ReturnType<typeof setTimeout> }>())
  const countRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const olderTopSentinelRef = useRef<HTMLDivElement | null>(null)
  const loadOlderMessagesRef = useRef<() => Promise<void>>(async () => {})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewState>(null)

  const selected = useMemo(
    () => list.find(row => row.id === selectedId) || null,
    [list, selectedId],
  )
  selectedIdRef.current = selectedId
  stateRef.current = state
  listRef.current = list
  detailRef.current = detail

  /** 详情未返回前用列表行状态兜底，避免进行中会话仍短暂可点「接管」。 */
  const selectedConvState = detail?.state ?? selected?.state

  const wsStatus = useMemo<'connecting' | 'open' | 'closed' | 'no-token'>(() => {
    const s = liveChatStore.agentWsStatus
    if (s === 'no-token') return 'no-token'
    if (s === 'open') return 'open'
    if (s === 'closed') return 'closed'
    return 'connecting'
  }, [liveChatStore.agentWsStatus])

  const wsStatusLabel = useMemo(() => {
    if (wsStatus === 'open') return '实时通道已连接（轮询兜底待机）'
    if (wsStatus === 'connecting') return '实时通道连接中…'
    if (wsStatus === 'no-token') return '请先登录'
    if (liveChatStore.isPollingFallback()) return '实时通道不可用，正在轮询兜底（15s）'
    return '实时通道已断开，重连中'
  }, [liveChatStore, wsStatus])

  const tabStats = useMemo(() => ({
    waiting: { count: liveChatStore.waitingCount, unread: liveChatStore.waitingVisitorUnreadSum },
    active: { count: liveChatStore.activeCount, unread: liveChatStore.activeVisitorUnreadSum },
    closed: { count: closedCount, unread: 0 },
  }), [
    liveChatStore.activeCount,
    liveChatStore.activeVisitorUnreadSum,
    liveChatStore.waitingCount,
    liveChatStore.waitingVisitorUnreadSum,
    closedCount,
  ])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const byState = list.filter(item => item.state === state)
    if (!q)
      return byState
    return byState.filter((item) => {
      const fields = [
        item.visitor?.name || '',
        item.store_name || '',
        item.subject || '',
        item.last_message_preview || '',
      ]
      return fields.some(text => text.toLowerCase().includes(q))
    })
  }, [list, search, state])

  const loadClosedCount = useCallback(async () => {
    try {
      const params = {
        store_id: storeId || undefined,
        channel: (channel || undefined) as LiveChannel | undefined,
        search: search.trim() || undefined,
        state: 'closed' as LiveState,
      }
      const closed = await getChatKit().ChatAPI.conversations({ ...params, page_size: 1 })
      const total = typeof closed.total === 'number' ? closed.total : closed.items.length
      setClosedCount(total)
    }
    catch {
      setClosedCount(0)
    }
  }, [channel, search, storeId])

  const loadList = useCallback(async (preserve = true, forceSelectId = '', stateForRequest?: LiveState) => {
    setLoadingList(true)
    setListError('')
    try {
      const effectiveState = stateForRequest ?? state
      const params = {
        state: effectiveState,
        store_id: storeId || undefined,
        channel: (channel || undefined) as LiveChannel | undefined,
        search: search.trim() || undefined,
      }
      const res = await getChatKit().ChatAPI.conversations(params)
      const merged = sortConversations(res.items)
      setList(merged)
      const currentSelectedId = selectedIdRef.current
      if (forceSelectId && merged.some(item => item.id === forceSelectId)) {
        setSelectedId(forceSelectId)
        return
      }
      if (preserve && currentSelectedId && merged.some(item => item.id === currentSelectedId)) {
        return
      }
      setSelectedId(merged[0]?.id || '')
    }
    catch (err) {
      if (err instanceof ApiError)
        setListError(err.message || '会话列表加载失败')
      else
        setListError('会话列表加载失败')
      setList([])
      setSelectedId('')
    }
    finally {
      setLoadingList(false)
    }
  }, [channel, search, state, storeId])

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setDetail(null)
      return
    }
    setLoadingDetail(true)
    setDetailError('')
    try {
      const data = await getChatKit().ChatAPI.detail(id, { message_limit: LIVE_CHAT_MESSAGE_PAGE_SIZE })
      setDetail(data)
      setOlderMessagesHasMore(!!data.messages_page?.has_more)
      setOlderMessagesCursor(data.messages_page?.before_cursor || data.messages[0]?.id || '')
      setSuggestedReply(null)
    }
    catch (err) {
      if (err instanceof ApiError)
        setDetailError(err.message || '会话详情加载失败')
      else
        setDetailError('会话详情加载失败')
      setDetail(null)
    }
    finally {
      setLoadingDetail(false)
    }
  }, [])

  const scheduleRefreshLiveCounts = useCallback((delayMs = 320) => {
    if (countRefreshTimerRef.current) clearTimeout(countRefreshTimerRef.current)
    countRefreshTimerRef.current = setTimeout(() => {
      countRefreshTimerRef.current = null
      liveChatStore.fetchCounts().catch(() => {})
      loadClosedCount().catch(() => {})
    }, delayMs)
  }, [liveChatStore, loadClosedCount])

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
      setDetailError('加载更早消息失败')
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
    if (!detail?.id || loadingDetail) return
    const id = detail.id
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = messageListRef.current
        if (!el || detailRef.current?.id !== id) return
        el.scrollTop = el.scrollHeight
      })
    })
  }, [detail?.id, loadingDetail])

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
      setDetailError('无法加载附件预览')
    }
  }, [])

  const downloadLiveFile = useCallback(async (meta: LiveAttachmentMeta) => {
    const cid = selectedIdRef.current
    if (!cid)
      return
    if (!window.confirm(`下载文件「${meta.name}」？`))
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
      setDetailError('下载失败')
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
    void loadClosedCount()
  }, [loadClosedCount, loadList])

  useEffect(() => {
    let alive = true
    void getChatKit().StoreAPI.list().then((res) => {
      if (alive)
        setStores(res.items)
    }).catch(() => {
      if (alive)
        setStores([])
    })
    return () => {
      alive = false
    }
  }, [])

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
    const currentTab = stateRef.current
    const currentSelectedId = selectedIdRef.current
    if (currentSelectedId === conv.id && conv.state !== currentTab) {
      setState(conv.state)
      setSelectedId(conv.id)
      setList([])
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
  }, [appendInPlace, scheduleRefreshLiveCounts])

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
    setDetailError(error || '发送失败')
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
    function buildAgentPanelHandlers(): LiveAgentPanelHandlers {
      return {
        onReady: () => {
          const current = selectedIdRef.current
          const selectedConv = listRef.current.find(item => item.id === current)
          if (current && selectedConv?.state !== 'closed') liveChatStore.agentJoin(current)
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
          if (event === 'message' || event === 'state') {
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

    liveChatStore.ensureAgentRealtime()
    liveChatStore.attachAgentPanel(buildAgentPanelHandlers())
    liveChatStore.fetchCounts().catch(() => {})
    loadClosedCount().catch(() => {})
    return () => {
      const current = selectedIdRef.current
      if (current) liveChatStore.agentLeave(current)
      liveChatStore.attachAgentPanel(null)
      clearPendingSends()
      if (countRefreshTimerRef.current) {
        clearTimeout(countRefreshTimerRef.current)
        countRefreshTimerRef.current = null
      }
    }
  }, [bumpListMeta, clearPendingSends, compensateSelectedMessages, liveChatStore, loadClosedCount, settlePendingSend, updateMessageInPlace])

  useEffect(() => {
    if (wsStatus === 'open')
      return
    const timer = window.setInterval(() => {
      void loadList(true)
      if (selectedIdRef.current)
        void loadDetail(selectedIdRef.current)
      scheduleRefreshLiveCounts()
    }, 10000)
    return () => window.clearInterval(timer)
  }, [loadDetail, loadList, scheduleRefreshLiveCounts, wsStatus])

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
    if (selectedId && current?.state !== 'closed') liveChatStore.agentJoin(selectedId)
    return () => {
      if (selectedId) liveChatStore.agentLeave(selectedId)
    }
  }, [list, liveChatStore, selectedId])

  useEffect(() => {
    if (isDesktop) setMobileDetailOpen(false)
  }, [isDesktop])

  useEffect(() => {
    if (!isDesktop) setMobileDetailOpen(false)
  }, [isDesktop, state])

  function messageLanguage(msg: LiveMessage): string {
    const raw = String(msg.metadata?.detected_language || '')
    if (raw) return raw
    const text = msg.content || ''
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh-CN'
    if (/[A-Za-z]/.test(text)) return 'en-US'
    return detail?.visitor?.locale || 'zh-CN'
  }

  function messageLanguageLabel(msg: LiveMessage): string {
    const code = messageLanguage(msg)
    return LANGUAGE_LABEL[code] || code
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
    const latest = [...rows].reverse().find(m => m.sender_role === 'visitor')
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
    return text ? `译文暂不可用：${text}` : '译文暂不可用'
  }

  function translationPendingText(msg: LiveMessage): string {
    if (!translationEnabled || !isTranslatableMessage(msg)) return ''
    const targetLanguage = translateTargetForMessage(msg)
    if (sameLanguage(messageLanguage(msg), targetLanguage) || messageTranslationForAgent(msg)) return ''
    return translationStatus(msg) === 'pending' ? '译文生成中' : ''
  }

  function messageDeliveryText(msg: LiveMessage): string {
    const rawState = msg.metadata?.delivery_state
    const deliveryState = typeof rawState === 'string' ? rawState : ''
    if (deliveryState === 'read') return '已读'
    if (deliveryState === 'delivered') return '已送达'
    if (msg.metadata?.send_failed) return '发送失败'
    if (msg.metadata?.pending) return '发送中'
    if (msg.sender_role === 'agent') return '已发送'
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
    try {
      const res = await getChatKit().ChatAPI.takeover(id)
      if (res?.conversation)
        setDetail(prev => prev ? ({ ...prev, ...res.conversation }) : (res.conversation as LiveConversationDetail))
      // setState 异步：必须同步更新 ref，且 loadList 显式拉「进行中」，否则仍请求「等待中」导致列表与计数不同步
      stateRef.current = 'active'
      setState('active')
      await loadList(true, id, 'active')
      await loadDetail(id)
      scheduleRefreshLiveCounts()
    }
    catch (err) {
      if (err instanceof ApiError)
        setDetailError(err.message || '接管失败')
      else
        setDetailError('接管失败')
    }
    finally {
      setTakingOver(false)
    }
  }

  async function onCloseConversation() {
    if (!selectedId)
      return
    setClosing(true)
    setDetailError('')
    const id = selectedId
    try {
      const res = await getChatKit().ChatAPI.close(id)
      if (res?.conversation)
        setDetail(prev => prev ? ({ ...prev, ...res.conversation }) : (res.conversation as LiveConversationDetail))
      stateRef.current = 'closed'
      setState('closed')
      await loadList(true, id, 'closed')
      await loadDetail(id)
      scheduleRefreshLiveCounts()
    }
    catch (err) {
      if (err instanceof ApiError)
        setDetailError(err.message || '归档失败')
      else
        setDetailError('归档失败')
    }
    finally {
      setClosing(false)
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
        setDetailError('暂无可用建议回复')
    }
    catch (err) {
      if (err instanceof ApiError)
        setDetailError(err.message || '建议回复生成失败')
      else
        setDetailError('建议回复生成失败')
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

  async function onPickFiles(files: FileList | null) {
    const f = files?.[0]
    if (!f || !selectedId)
      return
    setSending(true)
    setDetailError('')
    try {
      const att = await getChatKit().ChatAPI.uploadLiveAttachment(selectedId, f)
      const cap = draft.trim()
      if (wsStatus === 'open' && detail?.state !== 'closed') {
        const clientMessageId = liveChatStore.agentSendMessage(selectedId, cap, att.id)
        if (!clientMessageId) {
          setDetailError('发送失败，请稍后重试')
          return
        }
        if (cap) appendInPlace(optimisticAgentMessage(detail, clientMessageId, cap))
        const timer = setTimeout(() => {
          const pending = pendingWsSendsRef.current.get(clientMessageId)
          pendingWsSendsRef.current.delete(clientMessageId)
          if (pending) markOptimisticFailed(pending.optimisticId)
          setDraft(cap)
          setDetailError('发送超时，请重试')
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
          setState('active')
        scheduleRefreshLiveCounts()
      }
    }
    catch (err) {
      if (err instanceof ApiError)
        setDetailError(err.message || '附件发送失败')
      else
        setDetailError('附件发送失败')
    }
    finally {
      setSending(false)
      if (fileInputRef.current)
        fileInputRef.current.value = ''
    }
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !selectedId)
      return
    setSending(true)
    setDetailError('')
    try {
      if (wsStatus === 'open' && detail?.state !== 'closed') {
        const clientMessageId = liveChatStore.agentSendMessage(selectedId, content)
        if (!clientMessageId) {
          setDetailError('发送失败，请稍后重试')
          return
        }
        appendInPlace(optimisticAgentMessage(detail, clientMessageId, content))
        const timer = setTimeout(() => {
          const pending = pendingWsSendsRef.current.get(clientMessageId)
          pendingWsSendsRef.current.delete(clientMessageId)
          if (pending) markOptimisticFailed(pending.optimisticId)
          setDraft(content)
          setDetailError('发送超时，请重试')
        }, 10000)
        pendingWsSendsRef.current.set(clientMessageId, { content, optimisticId: clientMessageId, timer })
        setDraft('')
        scheduleRefreshLiveCounts(80)
      }
      else {
        await getChatKit().ChatAPI.send(selectedId, content)
        setDraft('')
        await loadDetail(selectedId)
        await loadList(true)
        const current = detail?.state
        if (current === 'closed')
          setState('active')
        scheduleRefreshLiveCounts()
      }
    }
    catch (err) {
      if (err instanceof ApiError)
        setDetailError(err.message || '消息发送失败')
      else
        setDetailError('消息发送失败')
    }
    finally {
      setSending(false)
    }
  }

  return (
    <div className="x1-lc-container">
      <header className="x1-lc-header">
        <div className="x1-lc-header-top">
          <h1><Sparkles size={18} className="mr-muted" /> 客户会话处理台</h1>
          <div className="x1-lc-status">
            <RefreshCw size={14} className={loadingList ? "animate-spin" : ""} style={{ cursor: 'pointer' }} onClick={() => void loadList(true)} />
            {wsStatusLabel}
          </div>
        </div>
        
        <div className="x1-lc-header-toolbar">
          <div className="x1-lc-tabs" role="tablist" aria-label="会话状态">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`x1-lc-tab ${state === tab.key ? 'is-active' : ''}`}
                onClick={() => setState(tab.key)}
              >
                {tab.label}
                <b>{tabStats[tab.key].count}</b>
                {tabStats[tab.key].unread > 0 ? <em>{tabStats[tab.key].unread > 99 ? '99+' : tabStats[tab.key].unread}</em> : null}
              </button>
            ))}
          </div>

          <div className="x1-lc-filters">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜访客、主题、会话内容" />
            <select value={storeId} onChange={e => setStoreId(e.target.value)} aria-label="按店铺筛选">
              <option value="">全部店铺</option>
              {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
            <select value={channel} onChange={e => setChannel(e.target.value)} aria-label="按渠道筛选">
              {CHANNEL_OPTIONS.map(item => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className={`x1-lc-body x1-lc-shell ${mobileDetailOpen && !isDesktop ? 'is-mobile-detail' : ''}`}>
        <aside className="x1-lc-sidebar">
          <div className="x1-lc-sidebar-head">
            <MessageCircle size={16} className="mr-muted" /> 会话列表
          </div>
          <div className="x1-lc-list">
            {loadingList ? <div className="x1-lc-empty"><p>加载中...</p></div> : null}
            {listError ? <div className="mr-state-error" style={{ margin: 8 }}>{listError}</div> : null}
            {!loadingList && !listError && filtered.length === 0 ? (
              <div className="x1-lc-empty">
                <div className="x1-lc-empty-icon"><MessageCircle size={24} /></div>
                <p>{state === 'closed' ? '暂无归档会话' : '当前没有会话'}</p>
              </div>
            ) : null}
            
            {filtered.map(row => (
              <button
                key={row.id}
                type="button"
                className={`x1-lc-item ${row.id === selectedId ? 'is-active' : ''}`}
                onClick={() => {
                  setSelectedId(row.id)
                  if (!isDesktop) setMobileDetailOpen(true)
                }}
              >
                <div className="x1-lc-item-top">
                  <strong>{row.visitor?.name || '访客'}</strong>
                  <time>{row.visitor_unread_count ? `未读 ${row.visitor_unread_count}` : prettyTime(row.last_message_at)}</time>
                </div>
                <div className="x1-lc-item-bottom">
                  <span className="x1-lc-item-badge">{stateLabel(row.state)}</span>
                  <span>{storeLabel(row) || '默认店铺'} · {CHANNEL_LABEL[String(row.channel || '')] || row.channel || '网页'}</span>
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
              <h2>{selected?.visitor?.name || '会话区'}</h2>
              {selectedId && <span className="x1-lc-badge">{stateLabel(detail?.state || selected?.state)}</span>}
            </div>
            
            <div className="x1-lc-main-actions">
              <button
                type="button"
                className={`x1-lc-btn ${translationEnabled ? 'x1-lc-btn-primary' : ''}`}
                onClick={() => setTranslationEnabled(prev => !prev)}
                disabled={!selectedId}
                title={translationEnabled ? (autoTranslating ? '翻译中...' : '关闭翻译') : '开启翻译'}
              >
                <Globe2 size={14} />
                {translationEnabled ? (autoTranslating ? '翻译中…' : '关闭翻译') : '翻译'}
              </button>
              <button type="button" className="x1-lc-btn" onClick={() => setShowFacts(prev => !prev)} disabled={!selectedId}>
                {showFacts ? '收起详情' : '详情'}
              </button>
              <button type="button" className="x1-lc-btn" onClick={() => void onSuggestReply()} disabled={!selectedId || aiSuggesting}>
                <Bot size={14} />
                {aiSuggesting ? '生成中...' : '建议'}
              </button>
              <button
                type="button"
                className="x1-lc-btn"
                onClick={() => void onTakeOver()}
                disabled={!selectedId || takingOver || selectedConvState === 'closed' || selectedConvState === 'active'}
              >
                <CheckCheck size={14} />
                {takingOver ? '接管中...' : '接管'}
              </button>
              <button type="button" className="x1-lc-btn" onClick={() => void onCloseConversation()} disabled={!selectedId || closing || selectedConvState === 'closed'}>
                {closing ? '归档中...' : '归档'}
              </button>
            </div>
          </div>

          {loadingDetail ? <div className="x1-lc-empty"><p>会话加载中...</p></div> : null}
          {detailError ? <div className="mr-state-error" style={{ margin: 20 }}>{detailError}</div> : null}
          
          {!loadingDetail && !detailError && !detail ? (
            <div className="x1-lc-empty">
              <div className="x1-lc-empty-icon"><MessageCircle size={24} /></div>
              <strong>请选择左侧会话</strong>
              <p>进入会话后，可先接管，再发送回复。</p>
            </div>
          ) : null}

          {showFacts && detail ? (
            <section className="mr-empty" style={{ margin: '20px 20px 0' }}>
              <div className="mr-panel-head">
                <strong>会话详情</strong>
                <span className="mr-badge">{assignmentLabel(detail)}</span>
              </div>
              <div className="mr-simple-list">
                <article className="mr-simple-item">
                  <div>
                    <strong>访客</strong>
                    <span>{detail.visitor?.name || '访客'} · {detail.visitor?.email || detail.visitor?.external_user_id || '未提供联系方式'}</span>
                  </div>
                </article>
                <article className="mr-simple-item">
                  <div>
                    <strong>来源</strong>
                    <span>{storeLabel(detail) || '默认店铺'} · {CHANNEL_LABEL[String(detail.channel || '')] || detail.channel || '网页'} · {detail.subject || '无主题'}</span>
                  </div>
                </article>
                <article className="mr-simple-item">
                  <div>
                    <strong>会话</strong>
                    <span>ID: {detail.id} · 最近活动 {prettyTime(detail.last_message_at || detail.created_at)}</span>
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          {suggestedReply ? (
            <section className="mr-empty" style={{ margin: '20px 20px 0' }}>
              <div className="mr-panel-head">
                <strong>建议回复</strong>
                <button type="button" className="mr-btn" onClick={() => setSuggestedReply(null)}>收起</button>
              </div>
              {suggestedReply.corpusSuggestion ? (
                <div className="mr-inline-stack">
                  <span className="mr-muted">匹配建议</span>
                  <p>{suggestedReply.corpusSuggestion}</p>
                  <button type="button" className="mr-btn" onClick={() => applySuggestedReply(suggestedReply.corpusSuggestion)}>使用这段</button>
                </div>
              ) : null}
              {suggestedReply.suggestion ? (
                <div className="mr-inline-stack">
                  <span className="mr-muted">润色建议</span>
                  <p>{suggestedReply.suggestion}</p>
                  <button type="button" className="mr-btn mr-btn-primary" onClick={() => applySuggestedReply(suggestedReply.suggestion)}>使用这段</button>
                </div>
              ) : null}
              {suggestedReply.matches.length ? (
                <div className="mr-simple-list">
                  {suggestedReply.matches.slice(0, 3).map((match, index) => (
                    <article key={`${match.score}-${index}`} className="mr-simple-item">
                      <div>
                        <strong>{String(match.entry?.title || match.entry?.question || '匹配依据')}</strong>
                        <span>{String(match.entry?.answer || match.entry?.content || '').slice(0, 120)}</span>
                      </div>
                      <span className="mr-badge">匹配 {match.score}</span>
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
                  {loadingOlderMessages ? '加载更早消息…' : `上滑或继续下拉至顶部，每次加载 ${LIVE_CHAT_MESSAGE_PAGE_SIZE} 条`}
                </span>
                <button type="button" className="mr-btn" onClick={() => void loadOlderMessages()} disabled={loadingOlderMessages || !olderMessagesHasMore}>
                  {loadingOlderMessages ? '加载中…' : '加载更早消息'}
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
              当前会话已归档。发送消息后会话将恢复到进行中。
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
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim() && !sending) onSend(e as unknown as FormEvent<HTMLFormElement>);
                  }
                }}
                placeholder={selectedId ? '输入回复内容 (Enter 发送, Shift+Enter 换行)...' : '请先选择会话'}
                disabled={!selectedId || sending}
              />
              <div className="x1-lc-composer-actions">
                <button
                  type="button"
                  className="x1-lc-icon-btn"
                  disabled={!selectedId || sending}
                  onClick={() => fileInputRef.current?.click()}
                  title="添加附件"
                >
                  <Paperclip size={18} />
                </button>
                <button 
                  type="submit" 
                  className={`x1-lc-icon-btn ${draft.trim() && !sending ? 'primary' : ''}`}
                  disabled={!selectedId || sending || !draft.trim()}
                  title="发送"
                >
                  <SendHorizontal size={18} />
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>

      {mediaPreview ? (
        <div
          role="dialog"
          aria-modal
          aria-label="附件预览"
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
            aria-label="关闭预览"
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
