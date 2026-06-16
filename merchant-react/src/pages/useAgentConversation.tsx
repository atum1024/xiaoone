import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Archive, Pencil, Trash2, Pin } from 'lucide-react'
import {
  getChatKit,
  ServiceCaseLiveSocket,
  type AgentAttachment,
  type AgentMessage,
  type AgentModelAvailability,
  type AgentThread,
  type AgentThreadDetail,
} from '@xiaoone/chat-kit'
import { usePreferences } from '../app/preferences'
import { uiTpl } from '../i18n/catalogResolve'
import { queryClient } from '../app/queryClient'
import type { ImageGenerationOptions, PptComposerOptions, VideoGenerationOptions } from '../components/XiaooneComposer'
import {
  ARK_IMAGE_MAX_REFERENCE,
  ARK_IMAGE_TOTAL_BUDGET,
  isWithinArkImageBudget,
} from '../lib/arkImageLimits'
import { isSupportedReferenceImage } from '../lib/imageUploadFormats'
import { AssistantRuntimeStatus, useAssistantRuntimeStatusQuery } from '../components/AssistantRuntimeStatus'
import { useLocalizedTopbarSlot } from '../layout/Topbar'
import { canonicalHomeForRouteContext, routeForModule, routeForThread } from '../app/workbenchRouteModel'
import {
  defaultModeForBusiness,
  getModels,
  MARKETING_REASONING_MODEL_KEYS,
  PROGRAMMER_HERMES_MODEL_KEYS,
} from '../lib/composer'
import { type ArkVideoTemplateSelection } from '../lib/arkTemplates'
import { toast } from '@xiaoone/react-ui'
import { useAuthStore } from '../store/auth'
import { manualServiceKeyFromThread, useManualServiceUnreadStore } from '../store/manualServiceUnreadStore'
import { readAccessToken } from '../lib/authEvents'
import { describeAxiosError } from '../lib/apiErrors'
import { sanitizeAgentAssistantText } from '../lib/agentProtocolText'
import { useAgentStore } from '../store/agent'
import { useChatPreferencesStore } from '../store/chatPreferences'
import { AGENT_QUERY_KEYS, removeAgentThreadQueryCaches, upsertAgentThreadQueryCaches, useAgentDomainThreads } from '../hooks/agentQueries'
import { assistantWorkstationBlockReason } from '../lib/workspaceStatusApi'
import type { RouteSuggestionPayload, UseImagesForVideoPayload } from '../components/ChatStream'
import {
  XIAOWAN_ASSISTANT_PLUGIN_KEY,
  XIAOWAN_CONSULTANT_PLUGIN_KEY,
  XIAOWAN_WORKSPACE_MODE_KEY,
  ACTIVE_GENERATION_STATUSES,
  MarketingComposerSessionState,
  preferredCopyTargetLanguage,
  preferredModelForBusiness,
  preferredGenerationModelForBusiness,
  normalizeImageOptions,
  preferredImageOptions,
  preferredVideoOptions,
  parseVideoReferenceAssetsParam,
  normalizeVideoOptions,
  stripTransientVideoReferenceOptions,
  stripTransientImageSessionOptions,
  composerSessionKeyForThread,
  imageOptionsFromComposerState,
  videoOptionsFromComposerState,
  targetLanguageFromComposerState,
  preferredPptOptions,
  writePptComposerPrefs,
  writeMarketingComposerPrefs,
  isPreviewableImage,
  isPreviewableVideo,
  resolveAvailableModelKey,
  ROUTE_SUGGESTION_PATHS,
  resolveAgentRouteContext,
  resolveAgentTopbarIcon,
  normalizeMarketingMode,
  defaultPluginForEntryMode,
  normalizePluginForEntryMode,
  conversationCopy,
  effectiveThreadMessageCount,
  videoTemplateFromThread,
  MARKETING_REASONING_MODEL_SET,
  MARKETING_IMAGE_MODEL_SET,
  MARKETING_VIDEO_MODEL_SET,
  MessageRuntime,
  normalizeCopyTargetLanguage,
  threadMatchesEntry,
  threadMatchesRouteMode,
  replaceGenerationTask,
  optimisticRetryGenerationTask,
  normalizeVideoReferenceAssets,
} from './agentConversationShared'
import { executeAgentConversationSend, type AgentSendContext } from './agentConversationSend'

export type AgentConversationPageKind = 'new' | 'detail'

export type UseAgentConversationOptions = {
  threadId?: string
}

export type AgentConversationComposerProps = {
  compact: true
  value: string
  onChange: (value: string) => void
  business: ReturnType<typeof resolveAgentRouteContext>['entry']
  hideBusinessPicker: true
  lockPlugin?: boolean
  lockMode: boolean
  plugin: string | null
  onPluginChange: (nextPlugin: string | null) => void
  mode: string | null
  onModeChange: (nextMode: string | null) => void
  model: string | null
  onModelChange: (nextModel: string | null) => void
  generationModel: string | null
  onGenerationModelChange: (nextModel: string | null) => void
  loading: boolean
  placeholder: string
  enableFileAttach: true
  attachButtonPlacement: 'left' | 'right'
  requirePlugin: boolean
  requireMode: boolean
  hidePlugin: boolean
  hideMode: boolean
  hideModel: boolean
  consultantModelAllowlist: string[] | null
  modelAvailability: Record<string, AgentModelAvailability>
  imageOptions: ImageGenerationOptions
  onImageOptionsChange: (next: ImageGenerationOptions) => void
  videoOptions: VideoGenerationOptions
  onVideoOptionsChange: (next: VideoGenerationOptions) => void
  videoTemplate: ArkVideoTemplateSelection | null
  onVideoTemplateChange: (next: ArkVideoTemplateSelection | null) => void
  videoTemplateLocked: boolean
  pptOptions: PptComposerOptions
  onPptOptionsChange: (next: PptComposerOptions) => void
  copyLanguage: string
  onCopyLanguageChange: (next: string) => void
  hasVideoInput: boolean
  hasAttachment: boolean
  attachmentNames: string[]
  referenceImageCount: number
  onSubmit: (contentOverride?: string) => Promise<void>
  stopActive: boolean
  onStop: () => void
  onAttachFile: (file: File) => void
  pendingAttachFiles: File[]
  onRemovePendingAttachFile: (index: number) => void
  leftExtraSlot: ReactNode
  rightExtraSlot: ReactNode
  aboveSlot: ReactNode
}

export type UseAgentConversationDetailSlice = {
  selectedId: string
  threadDetail: AgentThreadDetail | null
  visibleMessages: Array<AgentMessage & MessageRuntime & { content: string }>
  error: string
  detailLoading: boolean
  canRenderSelectedShell: boolean
  loadThreadDetail: (threadId: string) => Promise<void>
  refreshGenerationTask: (task: { id?: unknown }) => Promise<void>
  retryGenerationTask: (task: { id?: unknown }) => Promise<void>
  handleRouteSuggestion: (payload: RouteSuggestionPayload) => void
  handleUseImagesForVideo: (payload: UseImagesForVideoPayload) => void
  takeoverText: string
  selected: AgentThread | null
  pptOptions: PptComposerOptions
}

export type UseAgentConversationReturn = {
  pageKind: AgentConversationPageKind
  routeContext: ReturnType<typeof resolveAgentRouteContext>
  entry: ReturnType<typeof resolveAgentRouteContext>['entry']
  label: string
  heroTitle: string
  copy: ReturnType<typeof conversationCopy>
  isPptEntry: boolean
  isMarketingMediaEntry: boolean
  isAssistantEntry: boolean
  composerProps: AgentConversationComposerProps
  detail?: UseAgentConversationDetailSlice
  setupAssistantTopbar?: boolean
}

type AutoSendDraftParams = {
  enabled?: boolean
  draftFromSearch: string
  selectedId: string
  currentConversationBusy: boolean
  locationPathname: string
  onSend: (contentOverride?: string) => Promise<void>
}

/** One-shot handoff from welcome-page ?draft= into the conversation send flow. */
export function useAgentConversationNewDraftAutoSend({
  enabled = true,
  draftFromSearch,
  selectedId,
  currentConversationBusy,
  locationPathname,
  onSend,
}: AutoSendDraftParams) {
  const autoSendDraftKeyRef = useRef('')

  useEffect(() => {
    if (!enabled)
      return
    const autoDraft = draftFromSearch.trim()
    if (!autoDraft || selectedId || currentConversationBusy)
      return
    const key = `${locationPathname}?draft=${autoDraft}`
    if (autoSendDraftKeyRef.current === key)
      return
    const timer = window.setTimeout(() => {
      if (autoSendDraftKeyRef.current === key)
        return
      autoSendDraftKeyRef.current = key
      void onSend(autoDraft)
    }, 0)
    return () => window.clearTimeout(timer)
  // `onSend` intentionally stays outside deps: the key guard makes this a one-shot
  // handoff from the welcome page draft into the existing conversation send flow.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationBusy, draftFromSearch, enabled, locationPathname, selectedId])
}

export function useAgentConversation(
  pageKind: AgentConversationPageKind,
  options: UseAgentConversationOptions = {},
): UseAgentConversationReturn {
  const isNewPage = pageKind === 'new'
  const isDetailPage = pageKind === 'detail'

  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { locale, t, tpl } = usePreferences()
  const routeContext = useMemo(
    () => resolveAgentRouteContext(location.pathname, location.search),
    [location.pathname, location.search],
  )
  const { domain, fallbackLabel, entry, assistant: isAssistantEntry = false } = routeContext
  const routeMode = routeContext.modeKey || undefined
  const agentThreadsQuery = useAgentDomainThreads(domain, isDetailPage)
  const agentThreads = isDetailPage ? (agentThreadsQuery.data?.items || []) : []
  const markAgentThreadRead = useChatPreferencesStore(s => s.markAgentThreadRead)
  const markAgentGenerationSeen = useChatPreferencesStore(s => s.markAgentGenerationSeen)
  const label = t(routeContext.labelKey, fallbackLabel)

  const threadFromRoute = isNewPage
    ? ''
    : (routeContext.threadId || options.threadId || '').trim()

  const draftFromSearch = isNewPage ? (searchParams.get('draft') || '') : ''
  const draftFromNavigationState = useMemo(() => {
    const state = location.state
    if (!state || typeof state !== 'object')
      return ''
    const value = (state as { draft?: unknown }).draft
    return typeof value === 'string' ? value.trim() : ''
  }, [location.state])
  const promptFromSearch = isNewPage ? (searchParams.get('prompt') || '') : ''
  const referenceAssetsFromSearch = isNewPage ? (searchParams.get('reference_assets') || '') : ''

  const initialPlugin = isAssistantEntry ? XIAOWAN_ASSISTANT_PLUGIN_KEY : defaultPluginForEntryMode(entry, routeMode)
  const supportsXiaooneConversationClassify = entry === 'consultant'
  const initialMode = isAssistantEntry || supportsXiaooneConversationClassify
    ? XIAOWAN_WORKSPACE_MODE_KEY
    : (routeMode || defaultModeForBusiness(entry, initialPlugin))

  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<AgentThreadDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeConversationKeys, setActiveConversationKeys] = useState<string[]>([])
  const [error, setError] = useState('')

  const [draft, setDraft] = useState(draftFromSearch || draftFromNavigationState)
  const [plugin, setPlugin] = useState<string | null>(initialPlugin)
  const [mode, setMode] = useState<string | null>(initialMode)
  const [model, setModel] = useState<string | null>(
    isAssistantEntry || supportsXiaooneConversationClassify
      ? null
      : preferredModelForBusiness(entry, initialMode, initialPlugin),
  )
  const [generationModel, setGenerationModel] = useState<string | null>(
    isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredGenerationModelForBusiness(entry, initialMode),
  )
  const [copyTargetLanguage, setCopyTargetLanguage] = useState<string>(() => preferredCopyTargetLanguage())
  const [imageOptions, setImageOptions] = useState<ImageGenerationOptions>(() => preferredImageOptions())
  const [videoOptions, setVideoOptions] = useState<VideoGenerationOptions>(() => preferredVideoOptions())
  const [selectedVideoTemplate, setSelectedVideoTemplate] = useState<ArkVideoTemplateSelection | null>(null)
  const [pptOptions, setPptOptions] = useState<PptComposerOptions>(() => preferredPptOptions())
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [modelAvailability, setModelAvailability] = useState<Record<string, AgentModelAvailability>>({})
  const [manualTakeoverNotice, setManualTakeoverNotice] = useState('')
  const [messageRuntimeById, setMessageRuntimeById] = useState<Record<string, MessageRuntime>>({})
  const assistantRuntimeStatusQuery = useAssistantRuntimeStatusQuery()
  const serviceCaseSocketRef = useRef<ServiceCaseLiveSocket | null>(null)
  const threadFromRouteRef = useRef(threadFromRoute)
  const selectedIdRef = useRef(selectedId)
  const detailRequestSeqRef = useRef(0)
  const optimisticPreviewUrlsRef = useRef<Set<string>>(new Set())
  const retryingTaskIdsRef = useRef<Set<string>>(new Set())
  const activeConversationKeysRef = useRef<Set<string>>(new Set())
  const activeStreamAbortByKeyRef = useRef<Record<string, AbortController>>({})
  const streamStopRequestedKeysRef = useRef<Set<string>>(new Set())
  const sessionComposerStateRef = useRef<Record<string, MarketingComposerSessionState>>({})

  const consultantAllowlist = useAuthStore((s) => {
    const m = s.currentMerchant()
    const keys = m?.consultant_allowed_model_keys
    return keys?.length ? keys : null
  })
  const reasoningModelCandidates = useCallback(() => {
    if (isAssistantEntry || supportsXiaooneConversationClassify)
      return []
    if (entry === 'marketing')
      return Array.from(MARKETING_REASONING_MODEL_KEYS)
    if (entry === 'software' && plugin === 'self')
      return Array.from(PROGRAMMER_HERMES_MODEL_KEYS)
    return getModels(locale).map(item => item.key)
  }, [entry, isAssistantEntry, locale, plugin, supportsXiaooneConversationClassify])

  const resolveSendModelKey = useCallback((current: string | null | undefined) => {
    if (isAssistantEntry || supportsXiaooneConversationClassify)
      return ''
    return resolveAvailableModelKey(current, reasoningModelCandidates(), modelAvailability)
  }, [isAssistantEntry, modelAvailability, reasoningModelCandidates, supportsXiaooneConversationClassify])

  const currentConversationKey = isDetailPage
    ? selectedId
    : (selectedId || `new:${location.pathname}`)
  const activeConversationKeySet = useMemo(() => new Set(activeConversationKeys), [activeConversationKeys])
  const currentConversationBusy = Boolean(currentConversationKey) && activeConversationKeySet.has(currentConversationKey)

  useEffect(() => {
    if (entry !== 'marketing')
      return
    sessionComposerStateRef.current[composerSessionKeyForThread(currentConversationKey, location.pathname)] = {
      imageOptions: stripTransientImageSessionOptions(imageOptions),
      videoOptions: stripTransientVideoReferenceOptions(videoOptions),
      targetLanguage: normalizeCopyTargetLanguage(copyTargetLanguage),
      videoTemplate: selectedVideoTemplate,
    }
  }, [copyTargetLanguage, currentConversationKey, entry, imageOptions, location.pathname, selectedVideoTemplate, videoOptions])

  const threads = useMemo(() => {
    if (isNewPage)
      return [] as AgentThread[]
    return agentThreads.filter(item => (
      threadMatchesEntry(item, entry, isAssistantEntry)
      && threadMatchesRouteMode(item, routeMode)
    ))
  }, [agentThreads, entry, isAssistantEntry, isNewPage, routeMode])

  const visibleMessages = useMemo(() => {
    if (isNewPage)
      return [] as Array<AgentMessage & MessageRuntime & { content: string }>
    return (detail?.messages || [])
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({
        ...message,
        content: message.content || (message.role === 'user' ? (message.content_preview || '') : ''),
        ...(messageRuntimeById[message.id] || {}),
      }))
  }, [detail?.messages, isNewPage, messageRuntimeById])

  const selected = useMemo(() => {
    if (isNewPage)
      return null
    return threads.find(item => item.id === selectedId) || null
  }, [isNewPage, selectedId, threads])

  const canRenderSelectedShell = isDetailPage && Boolean(selectedId && selected)

  const activeMarketingMode = entry === 'marketing'
    ? normalizeMarketingMode(routeMode || detail?.mode_key || selected?.mode_key || mode)
    : null
  const currentThreadTemplate = videoTemplateFromThread(detail || selected, locale)
  const videoTemplateLocked = entry === 'marketing' && activeMarketingMode === 'video' && currentConversationBusy
  const emptyThreadName = t('agent.untitled')
  const copy = conversationCopy(entry, locale, label, activeMarketingMode, plugin)
  const heroTitle = isAssistantEntry
    ? label
    : copy.title

  useEffect(() => {
    if (entry !== 'marketing' || activeMarketingMode !== 'video') {
      setSelectedVideoTemplate(null)
      return
    }
    if (selectedId)
      setSelectedVideoTemplate(currentThreadTemplate)
  }, [activeMarketingMode, currentThreadTemplate?.id, entry, selectedId])

  useEffect(() => {
    if (entry !== 'marketing')
      return
    const normalized = normalizeMarketingMode(mode)
    if (model && MARKETING_REASONING_MODEL_SET.has(model))
      writeMarketingComposerPrefs({ reasoningModelByMode: { [normalized]: model } })
  }, [entry, mode, model])

  useEffect(() => {
    if (entry !== 'marketing')
      return
    const normalized = normalizeMarketingMode(mode)
    if (normalized !== 'image' && normalized !== 'video')
      return
    const allowed = normalized === 'image' ? MARKETING_IMAGE_MODEL_SET : MARKETING_VIDEO_MODEL_SET
    if (generationModel && allowed.has(generationModel))
      writeMarketingComposerPrefs({ generationModelByMode: { [normalized]: generationModel } })
  }, [entry, mode, generationModel])

  useEffect(() => {
    if (entry === 'marketing')
      writeMarketingComposerPrefs({ imageOptions: stripTransientImageSessionOptions(imageOptions) })
  }, [entry, imageOptions])

  useEffect(() => {
    if (entry === 'marketing')
      writeMarketingComposerPrefs({ videoOptions: stripTransientVideoReferenceOptions(videoOptions) })
  }, [entry, videoOptions])

  useEffect(() => {
    if (entry === 'marketing')
      writeMarketingComposerPrefs({ targetLanguage: normalizeCopyTargetLanguage(copyTargetLanguage) })
  }, [copyTargetLanguage, entry])

  useEffect(() => {
    if (entry === 'support')
      writePptComposerPrefs(pptOptions)
  }, [entry, pptOptions])

  useEffect(() => {
    threadFromRouteRef.current = threadFromRoute
  }, [threadFromRoute])

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const markCurrentThreadRead = useCallback(() => {
    const openThread = detail?.id === selectedId ? detail : selected
    if (!selectedId || !openThread)
      return
    markAgentThreadRead(selectedId, effectiveThreadMessageCount(openThread))
    markAgentGenerationSeen(selectedId, openThread.latest_generation_updated_at)
  }, [detail, markAgentGenerationSeen, markAgentThreadRead, selected, selectedId])

  useEffect(() => {
    if (typeof document !== 'undefined' && document.hidden)
      return
    markCurrentThreadRead()
  }, [markCurrentThreadRead])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined')
      return
    const markVisibleThreadRead = () => {
      if (document.hidden)
        return
      markCurrentThreadRead()
    }
    document.addEventListener('visibilitychange', markVisibleThreadRead)
    window.addEventListener('focus', markVisibleThreadRead)
    return () => {
      document.removeEventListener('visibilitychange', markVisibleThreadRead)
      window.removeEventListener('focus', markVisibleThreadRead)
    }
  }, [markCurrentThreadRead])

  const releaseOptimisticPreviews = useCallback(() => {
    optimisticPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    optimisticPreviewUrlsRef.current.clear()
  }, [])

  const setConversationBusy = useCallback((key: string, busy: boolean) => {
    if (!key)
      return
    const keys = activeConversationKeysRef.current
    const changed = busy ? !keys.has(key) : keys.has(key)
    if (!changed)
      return
    if (busy)
      keys.add(key)
    else
      keys.delete(key)
    setActiveConversationKeys(Array.from(keys))
  }, [])

  const moveConversationBusyKey = useCallback((from: string, to: string) => {
    if (!from || !to || from === to)
      return
    const keys = activeConversationKeysRef.current
    const hadFrom = keys.delete(from)
    const hadTo = keys.has(to)
    if (hadFrom)
      keys.add(to)
    if (hadFrom || hadTo)
      setActiveConversationKeys(Array.from(keys))
  }, [])

  const createOptimisticAttachment = useCallback((file: File, threadId: string, index: number): AgentAttachment & { local_preview_url?: string } => {
    const now = new Date().toISOString()
    let localPreviewUrl = ''
    if (isPreviewableImage(file) || isPreviewableVideo(file)) {
      localPreviewUrl = URL.createObjectURL(file)
      optimisticPreviewUrlsRef.current.add(localPreviewUrl)
    }
    return {
      id: `local:${Date.now()}:${index}`,
      merchant_id: 0,
      user_id: 0,
      thread: threadId,
      message: null,
      source: 'user_upload',
      name: file.name,
      content_type: file.type || 'application/octet-stream',
      size: file.size,
      is_text: false,
      local_preview_url: localPreviewUrl,
      created_at: now,
      updated_at: now,
    }
  }, [])

  useEffect(() => {
    return () => {
      releaseOptimisticPreviews()
    }
  }, [releaseOptimisticPreviews])

  useEffect(() => {
    setPendingFiles([])
    releaseOptimisticPreviews()
  }, [location.pathname, releaseOptimisticPreviews, threadFromRoute])

  const reloadThreads = useCallback(async (focusThreadId = threadFromRoute) => {
    setError('')
    try {
      const { AgentThreadAPI } = getChatKit()
      await queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.threads(domain) })
      let payload = queryClient.getQueryData<{ items?: AgentThread[] }>(AGENT_QUERY_KEYS.threads(domain))
      if (!payload) {
        payload = await queryClient.fetchQuery({
          queryKey: AGENT_QUERY_KEYS.threads(domain),
          queryFn: () => AgentThreadAPI.list({ domain, archived: 'false', page_size: 80 }),
        })
      }
      const rows = ((payload?.items) || []).filter(item => (
        threadMatchesEntry(item, entry, isAssistantEntry)
        && threadMatchesRouteMode(item, routeMode)
      ))
      setSelectedId(prev => {
        if (focusThreadId && rows.some(item => item.id === focusThreadId))
          return focusThreadId
        if (!focusThreadId) {
          const currentThreadFromUrl = threadFromRouteRef.current
          if (currentThreadFromUrl && rows.some(item => item.id === currentThreadFromUrl))
            return currentThreadFromUrl
          return prev
        }
        return prev
      })
    } catch (err: any) {
      if (!focusThreadId && !selectedIdRef.current) {
        setSelectedId('')
      }
      setError(err.message || t('agent.loadThreadError'))
    }
  }, [domain, entry, isAssistantEntry, routeMode, threadFromRoute, t])

  useEffect(() => {
    if (currentConversationBusy)
      return
    const focusThreadId = selectedIdRef.current || threadFromRouteRef.current || ''
    if (focusThreadId && threads.some(item => item.id === focusThreadId)) {
      setSelectedId(focusThreadId)
      return
    }
    if (!threadFromRouteRef.current && !draftFromSearch.trim() && selectedIdRef.current && !threads.some(item => item.id === selectedIdRef.current))
      setSelectedId('')
  }, [currentConversationBusy, draftFromSearch, threads])

  function syncSidebarThreads() {
    queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.overview() }).catch(() => {})
    queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.sidebarThreads() }).catch(() => {})
  }

  function upsertSidebarThread(thread: AgentThread) {
    upsertAgentThreadQueryCaches(thread)
    useAgentStore.getState().upsertThread(thread)
  }

  function optimisticThreadSnapshot(
    base: AgentThread,
    input: string,
    reply = '',
    messageIncrement = 0,
  ): AgentThread {
    const now = new Date().toISOString()
    const title = base.title && base.title !== '新对话'
      ? base.title
      : (input.slice(0, 40) || emptyThreadName)
    const fallbackSummary = sanitizeAgentAssistantText(reply || input || '发送了附件')
    const visibleCount = detail?.id === base.id
      ? (isDetailPage ? visibleMessages.length : (detail?.messages?.length || 0))
      : 0
    const messageCount = Math.max(base.message_count || 0, visibleCount, (base.message_count || 0) + messageIncrement)
    return {
      ...base,
      title,
      summary: fallbackSummary.slice(0, 160),
      preview: fallbackSummary.slice(0, 160),
      message_count: messageCount,
      last_message_at: now,
      updated_at: now,
    }
  }

  async function ensureAssistantWorkstationReady() {
    const activeModeKey = (detail?.id === selectedId ? detail?.mode_key : selected?.mode_key) || mode || ''
    const requiresWorkspace = isAssistantEntry || supportsXiaooneConversationClassify || activeModeKey === XIAOWAN_WORKSPACE_MODE_KEY
    if (!requiresWorkspace)
      return true
    try {
      const result = await assistantRuntimeStatusQuery.refetch()
      const status = result.data ?? null
      const reason = assistantWorkstationBlockReason(status, locale)
      if (reason) {
        toast.warning(reason)
        return false
      }
      return true
    } catch (err: any) {
      toast.warning(assistantWorkstationBlockReason(null, locale, err?.message || t('common.agent.statusReadFailed')))
      return false
    }
  }

  useEffect(() => {
    if (!isDetailPage || !detail?.domain)
      return
    const k = manualServiceKeyFromThread(detail.domain, detail.plugin_key || '')
    if (k)
      useManualServiceUnreadStore.getState().clear(k)
  }, [detail?.domain, detail?.id, detail?.plugin_key, isDetailPage])

  const loadThreadDetailNoop = useCallback(async (_threadId: string) => {}, [])

  const loadThreadDetailImpl = useCallback(async (threadId: string) => {
    const seq = ++detailRequestSeqRef.current
    setDetailLoading(true)
    setError('')
    try {
      const { AgentThreadAPI } = getChatKit()
      const payload = await AgentThreadAPI.detail(threadId)
      if (seq !== detailRequestSeqRef.current || selectedIdRef.current !== threadId)
        return
      setDetail(prev => {
        if (!prev || prev.id !== payload.id)
          return payload
        const optimisticById = new Map((prev.messages || []).map(message => [message.id, message]))
        const mergedMessages = (payload.messages || []).map(serverMessage => {
          const optimistic = optimisticById.get(serverMessage.id)
          if (!optimistic)
            return serverMessage
          const serverAttachments = serverMessage.attachments || []
          const optimisticAttachments = optimistic.attachments || []
          const extraAttachments = optimisticAttachments.filter((item) => {
            const id = String(item.id || '').trim()
            return id.startsWith('local:') && !serverAttachments.some(att => String(att.id || '').trim() === id)
          })
          const mergedAttachments = extraAttachments.length
            ? [...serverAttachments, ...extraAttachments]
            : serverAttachments
          const serverTasks = serverMessage.generation_tasks || []
          const optimisticTasks = optimistic.generation_tasks || []
          const mergedTasks = serverTasks.length
            ? serverTasks
            : optimisticTasks
          if (mergedAttachments === serverAttachments && mergedTasks === serverTasks)
            return serverMessage
          return {
            ...serverMessage,
            attachments: mergedAttachments,
            generation_tasks: mergedTasks,
          }
        })
        return { ...payload, messages: mergedMessages }
      })
      upsertSidebarThread(payload)
      releaseOptimisticPreviews()
      setManualTakeoverNotice('')
      if (isAssistantEntry) {
        setPlugin(XIAOWAN_ASSISTANT_PLUGIN_KEY)
        setMode(XIAOWAN_WORKSPACE_MODE_KEY)
        setModel(null)
        setGenerationModel(null)
      } else {
        const nextMode = supportsXiaooneConversationClassify
          ? XIAOWAN_WORKSPACE_MODE_KEY
          : (payload.mode_key || routeMode || defaultModeForBusiness(entry, normalizePluginForEntryMode(entry, routeMode, payload.plugin_key)))
        const nextPlugin = supportsXiaooneConversationClassify
          ? XIAOWAN_CONSULTANT_PLUGIN_KEY
          : normalizePluginForEntryMode(entry, nextMode, payload.plugin_key)
        const canonicalRoute = routeForThread(payload)
        const currentRoute = `${location.pathname}${location.search}`
        if (
          canonicalRoute
          && canonicalRoute !== currentRoute
          && selectedIdRef.current === threadId
        ) {
          navigate(canonicalRoute, { replace: true })
        }
        setPlugin(nextPlugin)
        setMode(nextMode)
        setModel(supportsXiaooneConversationClassify ? null : preferredModelForBusiness(entry, nextMode, nextPlugin, payload.model_key || null))
        setGenerationModel(supportsXiaooneConversationClassify ? null : preferredGenerationModelForBusiness(entry, nextMode))
        if (entry === 'marketing') {
          setImageOptions(imageOptionsFromComposerState(payload.composer_state))
          setVideoOptions(videoOptionsFromComposerState(payload.composer_state))
          setCopyTargetLanguage(targetLanguageFromComposerState(payload.composer_state))
        }
      }
    } catch (err: any) {
      if (seq !== detailRequestSeqRef.current || selectedIdRef.current !== threadId)
        return
      setDetail(prev => prev?.id === threadId ? prev : null)
      setError(err.message || t('agent.loadDetailError'))
    } finally {
      if (seq === detailRequestSeqRef.current)
        setDetailLoading(false)
    }
  }, [entry, isAssistantEntry, location.pathname, location.search, navigate, releaseOptimisticPreviews, routeMode, supportsXiaooneConversationClassify, t])

  const loadThreadDetail = isDetailPage ? loadThreadDetailImpl : loadThreadDetailNoop

  const upsertGenerationTaskNoop = useCallback((_task: unknown) => {}, [])

  const upsertGenerationTaskImpl = useCallback((task: any) => {
    if (!task?.id)
      return
    useAgentStore.getState().putGenerationTaskSnapshot(task)
    useAgentStore.getState().handleRealtimeEvent('agent.generation.updated', { task })
    setDetail(prev => {
      if (!prev)
        return prev
      const messages = replaceGenerationTask(prev.messages || [], task)
      return messages === prev.messages ? prev : { ...prev, messages }
    })
  }, [])

  const upsertGenerationTask = isDetailPage ? upsertGenerationTaskImpl : upsertGenerationTaskNoop

  const refreshGenerationTask = useCallback(async (task: any) => {
    if (!isDetailPage || !task?.id)
      return
    try {
      const updated = await getChatKit().AgentGenerationTaskAPI.refresh(task.id)
      upsertGenerationTaskImpl(updated)
      if (!ACTIVE_GENERATION_STATUSES.has(updated.status)) {
        syncSidebarThreads()
        if (selectedId)
          void reloadThreads(selectedId)
      }
    } catch (err: unknown) {
      toast({ variant: 'destructive', description: describeAxiosError(err, '刷新生成状态失败') })
    }
  }, [isDetailPage, reloadThreads, selectedId, upsertGenerationTaskImpl])

  const retryGenerationTask = useCallback(async (task: any) => {
    if (!isDetailPage || !task?.id)
      return
    const taskId = String(task.id)
    if (retryingTaskIdsRef.current.has(taskId))
      return
    retryingTaskIdsRef.current.add(taskId)
    upsertGenerationTaskImpl(optimisticRetryGenerationTask(task))
    try {
      const updated = await getChatKit().AgentGenerationTaskAPI.retry(task.id)
      upsertGenerationTaskImpl(updated)
      syncSidebarThreads()
      if (selectedId)
        void reloadThreads(selectedId)
    } catch (err: unknown) {
      upsertGenerationTaskImpl(task)
      toast({ variant: 'destructive', description: describeAxiosError(err, '重新提交生成任务失败') })
    } finally {
      retryingTaskIdsRef.current.delete(taskId)
    }
  }, [isDetailPage, reloadThreads, selectedId, upsertGenerationTaskImpl])

  const handleRouteSuggestion = useCallback((payload: RouteSuggestionPayload) => {
    const target = ROUTE_SUGGESTION_PATHS[payload.routeTo]
    if (!target) {
      toast.warning('暂时无法跳转到该业务入口')
      return
    }
    navigate(target)
  }, [navigate])

  const handleUseImagesForVideo = useCallback((payload: UseImagesForVideoPayload) => {
    const referenceAssets = normalizeVideoReferenceAssets(payload.referenceAssets)
    if (!referenceAssets?.length) {
      toast.warning('这些图片暂时没有可用素材引用，请刷新生成任务后再试')
      return
    }
    const params = new URLSearchParams()
    params.set('reference_assets', JSON.stringify(referenceAssets))
    const prompt = String(payload.task.prompt || '').trim()
    if (prompt)
      params.set('prompt', prompt)
    const imageSkill = String(payload.task.result?.generation_options?.image_skill || '').trim()
    if (imageSkill)
      params.set('from_skill', imageSkill)
    navigate(`${routeForModule('marketingVideo')}?${params.toString()}`)
  }, [navigate])

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
    const modeSeed = routeMode
    const defaultMode = modeSeed || defaultModeForBusiness(entry, defaultPluginForEntryMode(entry, modeSeed))
    const nextMode = isAssistantEntry || supportsXiaooneConversationClassify
      ? XIAOWAN_WORKSPACE_MODE_KEY
      : defaultMode
    const nextPlugin = isAssistantEntry
      ? XIAOWAN_ASSISTANT_PLUGIN_KEY
      : supportsXiaooneConversationClassify
        ? XIAOWAN_CONSULTANT_PLUGIN_KEY
        : defaultPluginForEntryMode(entry, nextMode)
    setPlugin(nextPlugin)
    setMode(nextMode)
    setModel(isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredModelForBusiness(entry, nextMode, nextPlugin))
    setGenerationModel(isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredGenerationModelForBusiness(entry, nextMode))
    const incomingReferenceAssets = entry === 'marketing' && nextMode === 'video'
      ? parseVideoReferenceAssetsParam(referenceAssetsFromSearch)
      : undefined
    if (incomingReferenceAssets?.length) {
      setVideoOptions(prev => normalizeVideoOptions({
        ...prev,
        style_mode: 'rich',
        reference_assets: incomingReferenceAssets,
      }))
    }
    setDraft(draftFromSearch || draftFromNavigationState || promptFromSearch)
    if (threadFromRoute) {
      selectedIdRef.current = threadFromRoute
      setSelectedId(threadFromRoute)
      setDetail(prev => prev?.id === threadFromRoute ? prev : null)
    } else {
      selectedIdRef.current = ''
      setSelectedId('')
      setDetail(null)
    }
  }, [domain, draftFromNavigationState, draftFromSearch, entry, isAssistantEntry, location.pathname, promptFromSearch, referenceAssetsFromSearch, routeMode, supportsXiaooneConversationClassify, threadFromRoute])

  useEffect(() => {
    if (!threadFromRoute) {
      if (!draftFromSearch.trim()) {
        selectedIdRef.current = ''
        setSelectedId('')
        setDetail(null)
      }
      return
    }
    selectedIdRef.current = threadFromRoute
    setSelectedId(threadFromRoute)
  }, [draftFromSearch, threadFromRoute])

  useEffect(() => {
    if (!isDetailPage)
      return
    if (currentConversationBusy && detail?.id === selectedId)
      return
    if (!selectedId) {
      detailRequestSeqRef.current += 1
      setDetail(null)
      setDetailLoading(false)
      return
    }
    void loadThreadDetailImpl(selectedId)
  }, [currentConversationBusy, detail?.id, isDetailPage, loadThreadDetailImpl, selectedId])

  useEffect(() => {
    if (!isDetailPage || !selectedId)
      return
    const activeTasks = (detail?.messages || [])
      .flatMap(m => m.generation_tasks || [])
      .filter(task => ACTIVE_GENERATION_STATUSES.has(task.status))
    if (!activeTasks.length)
      return
    let cursor = 0
    const firstRefresh = window.setTimeout(() => {
      if (document.hidden) return
      void refreshGenerationTask(activeTasks[0])
    }, 1800)
    const timer = window.setInterval(() => {
      if (document.hidden) return
      const task = activeTasks[cursor % activeTasks.length]
      cursor += 1
      void refreshGenerationTask(task)
    }, 3500)
    return () => {
      window.clearTimeout(firstRefresh)
      window.clearInterval(timer)
    }
  }, [detail?.messages, isDetailPage, refreshGenerationTask, selectedId])

  useEffect(() => {
    if (!isDetailPage)
      return
    const sc = detail?.service_case
    const caseId = sc?.id
    const isOpen = sc && sc.status !== 'completed' && sc.status !== 'closed'

    if (!selectedId || !caseId || !isOpen) {
      serviceCaseSocketRef.current?.close()
      serviceCaseSocketRef.current = null
      return
    }

    if (serviceCaseSocketRef.current != null)
      return

    const sock = new ServiceCaseLiveSocket(
      () => readAccessToken() || null,
      caseId,
      {
        onMessage: (env) => {
          const scData = env.case
          setDetail(prev => {
            if (!prev || prev.id !== selectedId)
              return prev
            const msgs = prev.messages ?? []
            const exists = msgs.some(m => String(m.id) === String(env.message.id))
            const updated = exists
              ? msgs.map(m => String(m.id) === String(env.message.id) ? { ...m, ...env.message } as AgentMessage : m)
              : [...msgs, env.message as unknown as AgentMessage]
            return {
              ...prev,
              messages: updated,
              service_case: { ...prev.service_case, ...scData } as typeof prev.service_case,
            }
          })
          if (scData.ai_reply_enabled === true) {
            setManualTakeoverNotice('')
          } else if (scData.assigned_platform_user_id && scData.ai_reply_enabled === false) {
            setManualTakeoverNotice('运营人员已接管，AI 暂停自动回复。')
          }
          void loadThreadDetailImpl(selectedId)
          void reloadThreads(selectedId)
          syncSidebarThreads()
        },
        onState: (env) => {
          const scData = env.case
          setDetail(prev => {
            if (!prev || prev.id !== selectedId)
              return prev
            return { ...prev, service_case: { ...prev.service_case, ...scData } as typeof prev.service_case }
          })
          if (scData.ai_reply_enabled === true) {
            setManualTakeoverNotice('')
          } else if (scData.assigned_platform_user_id && scData.ai_reply_enabled === false) {
            setManualTakeoverNotice('运营人员已接管，AI 暂停自动回复。')
          }
          void loadThreadDetailImpl(selectedId)
          void reloadThreads(selectedId)
          syncSidebarThreads()
        },
      },
    )
    sock.connect()
    serviceCaseSocketRef.current = sock

    return () => {
      sock.close()
      serviceCaseSocketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailPage, selectedId, detail?.service_case?.id, detail?.service_case?.status])

  function resetToHero() {
    stopAiReply()
    const nextMode = isAssistantEntry || supportsXiaooneConversationClassify
      ? XIAOWAN_WORKSPACE_MODE_KEY
      : (routeMode || defaultModeForBusiness(entry, defaultPluginForEntryMode(entry, routeMode)))
    const nextPlugin = isAssistantEntry
      ? XIAOWAN_ASSISTANT_PLUGIN_KEY
      : supportsXiaooneConversationClassify
        ? XIAOWAN_CONSULTANT_PLUGIN_KEY
        : defaultPluginForEntryMode(entry, nextMode)
    selectedIdRef.current = ''
    releaseOptimisticPreviews()
    setSelectedId('')
    setDetail(null)
    setDraft('')
    setPendingFiles([])
    setPlugin(nextPlugin)
    setMode(nextMode)
    setModel(isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredModelForBusiness(entry, nextMode, nextPlugin))
    setGenerationModel(isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredGenerationModelForBusiness(entry, nextMode))
    setImageOptions(preferredImageOptions())
    setVideoOptions(preferredVideoOptions())
    setManualTakeoverNotice('')
    if (isNewPage) {
      setSearchParams({}, { replace: true })
    } else {
      navigate(canonicalHomeForRouteContext(routeContext), { replace: true })
    }
  }

  function handlePluginChange(nextPlugin: string | null) {
    setPlugin(nextPlugin)
    const nextMode = supportsXiaooneConversationClassify
      ? XIAOWAN_WORKSPACE_MODE_KEY
      : (routeMode || defaultModeForBusiness(entry, nextPlugin))
    setMode(nextMode)
    setModel(isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredModelForBusiness(entry, nextMode, nextPlugin))
    setGenerationModel(isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredGenerationModelForBusiness(entry, nextMode))
    setImageOptions(preferredImageOptions())
    setVideoOptions(preferredVideoOptions())
    setSelectedVideoTemplate(null)
  }

  function handleModeChange(nextMode: string | null) {
    const nextPlugin = entry === 'marketing' ? defaultPluginForEntryMode(entry, nextMode) : plugin
    if (entry === 'marketing')
      setPlugin(nextPlugin)
    setMode(nextMode)
    setModel(isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredModelForBusiness(entry, nextMode, nextPlugin))
    setGenerationModel(isAssistantEntry || supportsXiaooneConversationClassify ? null : preferredGenerationModelForBusiness(entry, nextMode))
    if (nextMode === 'image')
      setImageOptions(preferredImageOptions())
    if (nextMode === 'video')
      setVideoOptions(preferredVideoOptions())
    if (nextMode !== 'video')
      setSelectedVideoTemplate(null)
  }

  async function onRenameThread() {
    if (!isDetailPage || !selectedId) return
    const title = window.prompt(t('agent.renamePrompt'), selected?.title || detail?.title || '')
    if (!title?.trim()) return
    try {
      const updated = await getChatKit().AgentThreadAPI.update(selectedId, { title: title.trim() })
      upsertSidebarThread(updated)
      await reloadThreads(selectedId)
      await loadThreadDetailImpl(selectedId)
    } catch (err: unknown) {
      toast({ variant: 'destructive', description: describeAxiosError(err, t('agent.sendError')) })
    }
  }

  async function onTogglePin() {
    if (!isDetailPage || !selectedId) return
    try {
      const updated = await getChatKit().AgentThreadAPI.update(selectedId, { pinned: !selected?.pinned })
      upsertSidebarThread(updated)
      await reloadThreads(selectedId)
    } catch (err: unknown) {
      toast({ variant: 'destructive', description: describeAxiosError(err, t('agent.sendError')) })
    }
  }

  async function onArchiveThread() {
    if (!isDetailPage || !selectedId) return
    const ok = window.confirm(t('agent.archiveConfirm'))
    if (!ok) return
    try {
      const updated = await getChatKit().AgentThreadAPI.update(selectedId, { archived: true })
      upsertSidebarThread(updated)
      resetToHero()
      await reloadThreads('')
    } catch (err: unknown) {
      toast({ variant: 'destructive', description: describeAxiosError(err, t('agent.sendError')) })
    }
  }

  async function onDeleteThread() {
    if (!isDetailPage || !selectedId) return
    const ok = window.confirm(t('agent.deleteConfirm'))
    if (!ok) return
    try {
      await getChatKit().AgentThreadAPI.destroy(selectedId)
      removeAgentThreadQueryCaches(selectedId, domain)
      useAgentStore.getState().removeThread(selectedId, domain)
      resetToHero()
      await reloadThreads('')
    } catch (err: unknown) {
      toast({ variant: 'destructive', description: describeAxiosError(err, t('agent.sendError')) })
    }
  }

  function stopAiReply() {
    const controller = activeStreamAbortByKeyRef.current[currentConversationKey]
    if (!controller || controller.signal.aborted)
      return
    streamStopRequestedKeysRef.current.add(currentConversationKey)
    controller.abort()
  }

  function buildSendContext(): AgentSendContext {
    return {
      locale, t, tpl, navigate,
      locationPathname: location.pathname,
      domain, entry, routeMode,
      moduleId: routeContext.moduleId,
      routeContext,
      isAssistantEntry, emptyThreadName,
      draft, pendingFiles, plugin, mode, model, generationModel,
      copyTargetLanguage, imageOptions, videoOptions, selectedVideoTemplate, pptOptions,
      existingThreadId: isNewPage ? '' : selectedId,
      selected, detail, messageRuntimeById,
      setDraft, setPendingFiles, setImageOptions, setVideoOptions, setModel, setError, setManualTakeoverNotice,
      setDetail, setMessageRuntimeById,
      setSelectedId, selectedIdRef, threadFromRouteRef,
      resolveSendModelKey, ensureAssistantWorkstationReady,
      setConversationBusy, moveConversationBusyKey, createOptimisticAttachment,
      upsertSidebarThread, optimisticThreadSnapshot, upsertGenerationTask,
      reloadThreads, loadThreadDetail, syncSidebarThreads,
      markAgentThreadRead, markAgentGenerationSeen,
      activeStreamAbortByKeyRef, streamStopRequestedKeysRef, activeConversationKeysRef,
      allowCreateThread: isNewPage,
    }
  }

  async function onSend(contentOverride?: string) {
    await executeAgentConversationSend(buildSendContext(), contentOverride)
  }

  useAgentConversationNewDraftAutoSend({
    enabled: isNewPage,
    draftFromSearch,
    selectedId,
    currentConversationBusy,
    locationPathname: location.pathname,
    onSend,
  })

  function onAttachFile(file: File) {
    const isImageDesignMode = entry === 'marketing' && (activeMarketingMode === 'image' || mode === 'image')
    if (isImageDesignMode && isSupportedReferenceImage(file)) {
      const currentReferenceCount = pendingFiles.filter(isSupportedReferenceImage).length
      if (currentReferenceCount >= ARK_IMAGE_MAX_REFERENCE) {
        toast.warning(uiTpl(locale, 'composer.image.quota.maxReference', String(ARK_IMAGE_MAX_REFERENCE)))
        return
      }
      const outputCount = imageOptions.count
      if (!isWithinArkImageBudget(currentReferenceCount + 1, outputCount)) {
        toast.warning(uiTpl(
          locale,
          'composer.image.quota.attachBlocked',
          String(currentReferenceCount),
          String(outputCount),
          String(ARK_IMAGE_TOTAL_BUDGET),
        ))
        return
      }
    }
    setPendingFiles(prev => [...prev, file])
  }

  const handleImageOptionsChange = useCallback((next: ImageGenerationOptions) => {
    setImageOptions(normalizeImageOptions(next))
  }, [])

  const handleVideoOptionsChange = useCallback((next: VideoGenerationOptions) => {
    setVideoOptions(normalizeVideoOptions(next))
  }, [])

  const isConsultantTheme = entry === 'consultant'
  const isPlatformDefaultAgentEntry = entry === 'feedback' || entry === 'support' || entry === 'agency'
  const isRouteLockedMarketingMode = entry === 'marketing' && Boolean(routeMode)
  const showXiaooneConversationClassify = supportsXiaooneConversationClassify
  const hidePluginPicker = isAssistantEntry || showXiaooneConversationClassify
  const hideModePicker = isAssistantEntry ? true : (isRouteLockedMarketingMode || showXiaooneConversationClassify)
  const hideConversationModelPicker = isAssistantEntry || isPlatformDefaultAgentEntry || isConsultantTheme
  const requirePluginSelection = isAssistantEntry ? false : !isConsultantTheme
  const consultantModelAllowlistForComposer = showXiaooneConversationClassify ? null : consultantAllowlist
  const xiaooneConversationClassSlot = null
  const xiaooneWorkspaceRuntimeSlot = null
  const xiaooneAttachButtonPlacement = supportsXiaooneConversationClassify
    ? 'left'
    : 'right'
  const attachablePendingFiles = pendingFiles
  const imageReferenceAttachmentCount = useMemo(
    () => attachablePendingFiles.filter(isSupportedReferenceImage).length,
    [attachablePendingFiles],
  )
  const imagePortraitReferenceCount = useMemo(
    () => (imageOptions.reference_images || []).filter((item) => {
      const url = typeof item?.url === 'string' ? item.url.trim() : ''
      return item?.source === 'ark_virtual_portrait' || url.startsWith('asset://')
    }).length,
    [imageOptions.reference_images],
  )
  const composerReferenceImageCount = entry === 'marketing' && mode === 'image'
    ? imageReferenceAttachmentCount + imagePortraitReferenceCount
    : 0
  const hasVideoInputAttachment = pendingFiles.some(file => file.type.startsWith('video/'))
  const composerAboveSlot = null

  const serviceCase = detail?.service_case
  const manualTakeoverActive = Boolean(serviceCase?.assigned_platform_user_id && !serviceCase?.ai_reply_enabled)
  const takeoverText = manualTakeoverNotice || (manualTakeoverActive ? t('common.agent.manualTakeover') : '')

  const threadTitle = selected?.title || detail?.title || emptyThreadName
  const hasMeaningfulThreadTitle = (() => {
    const title = (threadTitle || '').trim()
    return Boolean(title) && title !== emptyThreadName && title !== '新对话' && title !== '未命名对话'
  })()
  const TopbarModuleIcon = resolveAgentTopbarIcon(entry, routeMode, isAssistantEntry)
  const topbarHandlersRef = useRef({
    resetToHero,
    onRenameThread,
    onTogglePin,
    onArchiveThread,
    onDeleteThread,
  })
  topbarHandlersRef.current = {
    resetToHero,
    onRenameThread,
    onTogglePin,
    onArchiveThread,
    onDeleteThread,
  }
  const onTopbarNewChat = useCallback(() => {
    topbarHandlersRef.current.resetToHero()
  }, [])
  const onTopbarRenameThread = useCallback(() => {
    void topbarHandlersRef.current.onRenameThread()
  }, [])
  const onTopbarTogglePin = useCallback(() => {
    void topbarHandlersRef.current.onTogglePin()
  }, [])
  const onTopbarArchiveThread = useCallback(() => {
    void topbarHandlersRef.current.onArchiveThread()
  }, [])
  const onTopbarDeleteThread = useCallback(() => {
    void topbarHandlersRef.current.onDeleteThread()
  }, [])

  useLocalizedTopbarSlot(() => {
    if (isNewPage) {
      if (!isAssistantEntry)
        return null
      return {
        className: 'mr-topbar--agent-thread is-assistant-entry is-assistant-new-chat',
        leading: (
          <div className="mr-agent-thread-left is-assistant">
            <AssistantRuntimeStatus />
          </div>
        ),
      }
    }
    return {
      className: `mr-topbar--agent-thread${isAssistantEntry ? ' is-assistant-entry' : ''}`,
      leading: (
        <div className={`mr-agent-thread-left${isAssistantEntry ? ' is-assistant' : ''}`}>
          <div className="mr-agent-thread-heading mr-agent-thread-heading--hover-menu">
            <div
              className="mr-topbar-current"
              title={hasMeaningfulThreadTitle ? `${label} · ${threadTitle}` : label}
            >
              <span className="mr-topbar-module-icon" aria-hidden>
                <TopbarModuleIcon size={16} strokeWidth={1.9} />
              </span>
              <strong>{label}</strong>
              {hasMeaningfulThreadTitle ? <span>{threadTitle}</span> : null}
            </div>
            <div className="mr-agent-title-menu" role="menu" aria-label={t('agent.threadActionsAria', '对话操作')}>
              <button type="button" className="mr-agent-more-item" role="menuitem" onClick={onTopbarArchiveThread}>
                <Archive size={13} />
                {t('agent.archive', '归档')}
              </button>
              <button type="button" className="mr-agent-more-item is-danger" role="menuitem" onClick={onTopbarDeleteThread}>
                <Trash2 size={13} />
                {t('agent.delete', '删除')}
              </button>
              <button type="button" className="mr-agent-more-item" role="menuitem" onClick={onTopbarRenameThread}>
                <Pencil size={13} />
                {t('agent.rename', '重命名')}
              </button>
              <button type="button" className="mr-agent-more-item" role="menuitem" onClick={onTopbarTogglePin}>
                <Pin size={13} />
                {selected?.pinned ? t('common.agent.unpin', '取消置顶') : t('common.agent.pin', '置顶')}
              </button>
            </div>
          </div>
        </div>
      ),
      actions: (
        <>
          <button type="button" className="mr-btn mr-btn-primary" onClick={onTopbarNewChat}>
            <Pencil size={14} />
            {t('agent.newChat', '新对话')}
          </button>
        </>
      ),
    }
  }, [
    isAssistantEntry,
    isNewPage,
    label,
    hasMeaningfulThreadTitle,
    onTopbarArchiveThread,
    onTopbarDeleteThread,
    onTopbarNewChat,
    onTopbarRenameThread,
    onTopbarTogglePin,
    selected?.pinned,
    threadTitle,
    t,
  ])

  const isPptEntry = entry === 'support'
  const isMarketingMediaEntry = entry === 'marketing' && (activeMarketingMode === 'image' || activeMarketingMode === 'video')

  const composerProps: AgentConversationComposerProps = {
    compact: true,
    value: draft,
    onChange: setDraft,
    business: entry,
    hideBusinessPicker: true,
    ...(isDetailPage ? { lockPlugin: isRouteLockedMarketingMode } : {}),
    lockMode: isConsultantTheme || isPlatformDefaultAgentEntry || isRouteLockedMarketingMode,
    plugin,
    onPluginChange: handlePluginChange,
    mode,
    onModeChange: handleModeChange,
    model,
    onModelChange: setModel,
    generationModel,
    onGenerationModelChange: setGenerationModel,
    loading: currentConversationBusy,
    placeholder: isAssistantEntry
      ? t(isNewPage ? 'composer.conv.assistant.hero' : 'composer.conv.assistant.thread')
      : (isNewPage ? copy.heroPlaceholder : copy.threadPlaceholder),
    enableFileAttach: true,
    attachButtonPlacement: xiaooneAttachButtonPlacement,
    requirePlugin: requirePluginSelection,
    requireMode: isAssistantEntry ? false : !isConsultantTheme,
    hidePlugin: hidePluginPicker,
    hideMode: hideModePicker,
    hideModel: hideConversationModelPicker,
    consultantModelAllowlist: consultantModelAllowlistForComposer,
    modelAvailability: isAssistantEntry || supportsXiaooneConversationClassify ? {} : modelAvailability,
    imageOptions,
    onImageOptionsChange: handleImageOptionsChange,
    videoOptions,
    onVideoOptionsChange: handleVideoOptionsChange,
    videoTemplate: selectedVideoTemplate,
    onVideoTemplateChange: setSelectedVideoTemplate,
    videoTemplateLocked,
    pptOptions,
    onPptOptionsChange: setPptOptions,
    copyLanguage: copyTargetLanguage,
    onCopyLanguageChange: setCopyTargetLanguage,
    hasVideoInput: hasVideoInputAttachment,
    hasAttachment: attachablePendingFiles.length > 0,
    attachmentNames: attachablePendingFiles.map(file => file.name),
    referenceImageCount: composerReferenceImageCount,
    onSubmit: onSend,
    stopActive: currentConversationBusy,
    onStop: stopAiReply,
    onAttachFile,
    pendingAttachFiles: attachablePendingFiles,
    onRemovePendingAttachFile: (index) => setPendingFiles(prev => prev.filter((_, idx) => idx !== index)),
    leftExtraSlot: null,
    rightExtraSlot: null,
    aboveSlot: composerAboveSlot,
  }

  const result: UseAgentConversationReturn = {
    pageKind,
    routeContext,
    entry,
    label,
    heroTitle,
    copy,
    isPptEntry,
    isMarketingMediaEntry,
    isAssistantEntry,
    composerProps,
  }

  if (isNewPage && isAssistantEntry)
    result.setupAssistantTopbar = true

  if (isDetailPage) {
    result.detail = {
      selectedId,
      threadDetail: detail,
      visibleMessages,
      error,
      detailLoading,
      canRenderSelectedShell,
      loadThreadDetail,
      refreshGenerationTask,
      retryGenerationTask,
      handleRouteSuggestion,
      handleUseImagesForVideo,
      takeoverText,
      selected,
      pptOptions,
    }
  }

  return result
}
