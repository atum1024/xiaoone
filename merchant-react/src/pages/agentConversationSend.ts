import { flushSync } from 'react-dom'
import {
  getChatKit,
  type AgentAttachment,
  type AgentMessage,
  type AgentThread,
  type AgentThreadDetail,
} from '@xiaoone/chat-kit'
import type { NavigateFunction } from 'react-router'
import { compactCommerceBrief } from '../components/XiaooneComposer'
import type { ImageGenerationOptions, PptComposerOptions, VideoGenerationOptions } from '../components/XiaooneComposer'
import { isSupportedReferenceImage } from '../lib/imageUploadFormats'
import { normalizeArkAssetId } from '../lib/arkVirtualPortraits'
import { queryClient } from '../app/queryClient'
import { canonicalHomeForRouteContext, routeForThread, type WorkbenchRouteContext } from '../app/workbenchRouteModel'
import type { BusinessKey } from '../lib/composer'
import type { AgentDomain } from '@xiaoone/chat-kit'
import { toast } from '@xiaoone/react-ui'
import { manualServiceKeyFromThread, useManualServiceUnreadStore } from '../store/manualServiceUnreadStore'
import { describeAxiosError } from '../lib/apiErrors'
import { sanitizeAgentAssistantText } from '../lib/agentProtocolText'
import { useAgentStore } from '../store/agent'
import { AGENT_QUERY_KEYS, removeAgentThreadQueryCaches, upsertAgentThreadQueryCaches } from '../hooks/agentQueries'
import type { Locale } from '../i18n/types'
import type { ArkVideoTemplateSelection } from '../lib/arkTemplates'
import {
  assistantRuntimeErrorText,
  composeMarketingImagePrompt,
  composeMarketingVideoPrompt,
  effectiveThreadMessageCount,
  estimateTypewriterRefreshDelay,
  isMarketingMediaSubmitCommand,
  marketingComposerStateForThreadCreate,
  MessageRuntime,
  normalizeCopyTargetLanguage,
  normalizeMarketingMode,
  selectedArkVirtualPortraitFromImageOptions,
  selectedArkVirtualPortraitFromOptions,
  buildImageSendOptimisticAttachments,
  buildVideoSendOptimisticAttachments,
  clearImageComposerMaterials,
  clearVideoComposerMaterials,
} from './agentConversationShared'

export type AgentSendContext = {
  locale: Locale
  t: (key: string, fallback?: string) => string
  tpl: (key: string, ...args: string[]) => string
  navigate: NavigateFunction
  locationPathname: string
  domain: AgentDomain
  entry: BusinessKey
  routeMode?: string
  moduleId: string
  routeContext: WorkbenchRouteContext
  isAssistantEntry: boolean
  emptyThreadName: string
  draft: string
  pendingFiles: File[]
  plugin: string | null
  mode: string | null
  model: string | null
  generationModel: string | null
  copyTargetLanguage: string
  imageOptions: ImageGenerationOptions
  videoOptions: VideoGenerationOptions
  selectedVideoTemplate: ArkVideoTemplateSelection | null
  pptOptions: PptComposerOptions
  existingThreadId: string
  selected: AgentThread | null
  detail: AgentThreadDetail | null
  messageRuntimeById: Record<string, MessageRuntime>
  setDraft: (v: string) => void
  setPendingFiles: (v: File[] | ((prev: File[]) => File[])) => void
  setImageOptions: (v: ImageGenerationOptions | ((prev: ImageGenerationOptions) => ImageGenerationOptions)) => void
  setVideoOptions: (v: VideoGenerationOptions | ((prev: VideoGenerationOptions) => VideoGenerationOptions)) => void
  setModel: (v: string | null) => void
  setError: (v: string) => void
  setManualTakeoverNotice: (v: string) => void
  setDetail: (v: AgentThreadDetail | null | ((prev: AgentThreadDetail | null) => AgentThreadDetail | null)) => void
  setMessageRuntimeById: (v: Record<string, MessageRuntime> | ((prev: Record<string, MessageRuntime>) => Record<string, MessageRuntime>)) => void
  setSelectedId?: (v: string) => void
  selectedIdRef?: { current: string }
  threadFromRouteRef?: { current: string }
  resolveSendModelKey: (current: string | null | undefined) => string
  ensureAssistantWorkstationReady: () => Promise<boolean>
  setConversationBusy: (key: string, busy: boolean) => void
  moveConversationBusyKey: (from: string, to: string) => void
  createOptimisticAttachment: (file: File, threadId: string, index: number) => AgentAttachment & { local_preview_url?: string }
  upsertSidebarThread: (thread: AgentThread) => void
  optimisticThreadSnapshot: (base: AgentThread, input: string, reply?: string, messageIncrement?: number) => AgentThread
  upsertGenerationTask: (task: unknown) => void
  reloadThreads: (focusThreadId?: string) => Promise<void>
  loadThreadDetail: (threadId: string) => Promise<void>
  syncSidebarThreads: () => void
  markAgentThreadRead: (threadId: string, count: number) => void
  markAgentGenerationSeen: (threadId: string, ts?: string | null) => void
  activeStreamAbortByKeyRef: { current: Record<string, AbortController> }
  streamStopRequestedKeysRef: { current: Set<string> }
  activeConversationKeysRef: { current: Set<string> }
  allowCreateThread: boolean
  onThreadCreated?: (thread: AgentThread) => void
}

function resolveSendContent(ctx: AgentSendContext, rawContent: string, fileCount: number) {
  const trimmed = rawContent.trim()
  if (trimmed) return trimmed
  if (fileCount <= 0) return ''
  const { entry, mode, routeMode } = ctx
  if (entry === 'marketing' && (mode === 'video' || routeMode === 'video')) return '请根据参考素材生成视频'
  if (entry === 'marketing' && (mode === 'image' || routeMode === 'image')) return '请根据参考素材生成图片'
  return '发送了附件'
}

function copyTextGenerationOptions(ctx: AgentSendContext) {
  const targetLanguage = normalizeCopyTargetLanguage(ctx.copyTargetLanguage)
  const options: Record<string, unknown> = {}
  if (targetLanguage !== 'auto')
    options.target_language = targetLanguage
  const commerceBrief = compactCommerceBrief(ctx.imageOptions.commerce_brief || ctx.videoOptions.commerce_brief)
  if (commerceBrief)
    options.commerce_brief = commerceBrief
  const portrait = selectedArkVirtualPortraitFromImageOptions(ctx.imageOptions)
    || selectedArkVirtualPortraitFromOptions(ctx.videoOptions)
  if (portrait) {
    const assetId = normalizeArkAssetId(portrait.asset_id || portrait.url || ctx.imageOptions.virtual_portrait?.asset_id)
    if (assetId) {
      options.virtual_portrait = {
        asset_id: assetId,
        label: portrait.name || ctx.imageOptions.virtual_portrait?.label,
        hint: ctx.imageOptions.virtual_portrait?.hint,
      }
    }
  }
  return Object.keys(options).length ? options : null
}

function isArkVirtualPortraitReference(item?: NonNullable<VideoGenerationOptions['reference_images']>[number]) {
  const url = typeof item?.url === 'string' ? item.url.trim() : ''
  return item?.source === 'ark_virtual_portrait' || url.startsWith('asset://')
}

function videoGenerationOptionsForRequest(videoOptions: VideoGenerationOptions) {
  if (videoOptions.style_mode !== 'clean')
    return videoOptions
  const portraitRefs = (videoOptions.reference_images || []).filter(isArkVirtualPortraitReference)
  const cleanOptions: VideoGenerationOptions = { ...videoOptions }
  delete cleanOptions.reference_images
  delete cleanOptions.reference_assets
  delete cleanOptions.shots
  delete cleanOptions.video_skill
  delete cleanOptions.platform
  delete cleanOptions.subtitle
  delete cleanOptions.voiceover
  delete cleanOptions.cta
  if (portraitRefs.length)
    cleanOptions.reference_images = portraitRefs
  if (normalizeArkAssetId(videoOptions.virtual_portrait?.asset_id))
    cleanOptions.virtual_portrait = videoOptions.virtual_portrait
  return cleanOptions
}


function hasMarketingImageGenerationReference(
  imageOptions: ImageGenerationOptions,
  sendFiles: File[],
): boolean {
  if (sendFiles.some(isSupportedReferenceImage))
    return true
  if (String(imageOptions.template_id || '').trim())
    return true
  if (selectedArkVirtualPortraitFromImageOptions(imageOptions))
    return true
  return (imageOptions.reference_images || []).some((item) => {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    return Boolean(url)
  })
}

function hasMarketingVideoGenerationReference(
  videoOptions: VideoGenerationOptions,
  selectedVideoTemplate: ArkVideoTemplateSelection | null,
  sendFiles: File[],
): boolean {
  if (sendFiles.some(file => isSupportedReferenceImage(file) || file.type.startsWith('video/')))
    return true
  if (selectedVideoTemplate)
    return true
  if (String(videoOptions.template_id || '').trim())
    return true
  if (selectedArkVirtualPortraitFromOptions(videoOptions))
    return true
  return (videoOptions.reference_images || []).some((item) => {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    return Boolean(url)
  })
}

export async function executeAgentConversationSend(ctx: AgentSendContext, contentOverride?: string) {
  const sendFiles = ctx.pendingFiles
  const inputWasEmpty = !(contentOverride ?? ctx.draft).trim()
  const resolvedContent = resolveSendContent(ctx, contentOverride ?? ctx.draft, sendFiles.length)
  const effectiveMarketingMode = ctx.entry === 'marketing'
    ? normalizeMarketingMode(ctx.mode || ctx.routeMode)
    : null
  const shouldComposeVideoPrompt = effectiveMarketingMode === 'video'
    && !isMarketingMediaSubmitCommand(resolvedContent)
  const shouldComposeImagePrompt = effectiveMarketingMode === 'image'
    && !isMarketingMediaSubmitCommand(resolvedContent)
  const imageGenerationReference = shouldComposeImagePrompt
    && hasMarketingImageGenerationReference(ctx.imageOptions, sendFiles)
  const videoGenerationReference = shouldComposeVideoPrompt
    && hasMarketingVideoGenerationReference(ctx.videoOptions, ctx.selectedVideoTemplate, sendFiles)
  const hasGenerationReference = imageGenerationReference || videoGenerationReference
  let content = shouldComposeVideoPrompt
    ? composeMarketingVideoPrompt({
        content: resolvedContent,
        videoTemplate: ctx.selectedVideoTemplate,
        videoOptions: ctx.videoOptions,
        hasReferenceAttachments: videoGenerationReference,
        locale: ctx.locale,
      })
    : shouldComposeImagePrompt
      ? composeMarketingImagePrompt({
          content: resolvedContent,
          imageOptions: ctx.imageOptions,
          hasReferenceAttachments: imageGenerationReference,
          locale: ctx.locale,
        })
      : resolvedContent
  if (!content.trim() && hasGenerationReference) {
    content = shouldComposeVideoPrompt
      ? (ctx.locale === 'en' ? 'Generate a video from the current reference assets.' : '请根据当前参考素材生成视频')
      : (ctx.locale === 'en' ? 'Generate an image from the current references.' : '请根据当前参考素材生成图片')
  }
  const startKey = ctx.existingThreadId || `new:${ctx.locationPathname}`
  if (ctx.activeConversationKeysRef.current.has(startKey))
    return
  if (!content.trim() && sendFiles.length === 0) {
    toast.warning(ctx.t('composer.send.needContent'))
    return
  }
  if (!await ctx.ensureAssistantWorkstationReady()) return
  const sendModelKey = ctx.isAssistantEntry ? '' : ctx.resolveSendModelKey(ctx.model)
  const requestedModelKey = (ctx.model || '').trim()
  if (!ctx.isAssistantEntry && !sendModelKey) {
    toast.warning(ctx.t('composer.model.noModelConfigured'))
    return
  }
  if (!ctx.isAssistantEntry && requestedModelKey && sendModelKey && sendModelKey !== requestedModelKey) {
    ctx.setModel(sendModelKey)
    toast.warning(ctx.tpl('composer.model.fallbackSwitched', ctx.model ? sendModelKey : sendModelKey))
  }
  ctx.setConversationBusy(startKey, true)
  ctx.setError('')

  let cleanupKey = startKey
  try {
    const { AgentThreadAPI, AgentAttachmentAPI, streamThreadChat } = getChatKit()
    let threadId = ctx.existingThreadId
    let createdThread: AgentThread | null = null
    if (!threadId) {
      if (!ctx.allowCreateThread)
        return
      const created = ctx.isAssistantEntry
        ? await AgentThreadAPI.createAssistant({ title: content.slice(0, 32) || ctx.emptyThreadName })
        : await AgentThreadAPI.create({
            domain: ctx.domain,
            title: content.slice(0, 32) || ctx.emptyThreadName,
            plugin_key: ctx.plugin || '',
            mode_key: ctx.mode || '',
            model_key: sendModelKey || '',
            composer_state: ctx.entry === 'marketing' ? marketingComposerStateForThreadCreate({
              mode: ctx.mode || ctx.routeMode,
              imageOptions: ctx.imageOptions,
              videoOptions: ctx.videoOptions,
              targetLanguage: ctx.copyTargetLanguage,
              videoTemplate: ctx.selectedVideoTemplate,
            }) : undefined,
          })
      createdThread = created
      threadId = created.id
      cleanupKey = threadId
      ctx.moveConversationBusyKey(startKey, threadId)
      ctx.upsertSidebarThread(created)
      if (ctx.selectedIdRef)
        ctx.selectedIdRef.current = created.id
      ctx.setSelectedId?.(created.id)
      ctx.onThreadCreated?.(created)
      ctx.navigate(routeForThread(created), { replace: true })
      ctx.setDetail({ ...created, messages: [] })
    }

    const streamId = `stream:${Date.now()}`
    const userMessageId = `user:${Date.now()}`
    const isImageMarketingSend = effectiveMarketingMode === 'image'
    const isVideoMarketingSend = effectiveMarketingMode === 'video'
    const fallbackFileAttachments = isImageMarketingSend || isVideoMarketingSend
      ? []
      : sendFiles.map((file, index) => ctx.createOptimisticAttachment(file, threadId, index))
    const optimisticMaterialPack = isImageMarketingSend
      ? buildImageSendOptimisticAttachments({
          threadId,
          sendFiles,
          imageOptions: ctx.imageOptions,
          createFileAttachment: ctx.createOptimisticAttachment,
        })
      : isVideoMarketingSend
        ? buildVideoSendOptimisticAttachments({
            threadId,
            sendFiles,
            videoOptions: ctx.videoOptions,
            createFileAttachment: ctx.createOptimisticAttachment,
          })
        : {
            all: fallbackFileAttachments,
            portraits: [] as Array<AgentAttachment & { local_preview_url?: string }>,
            files: fallbackFileAttachments,
          }
    const optimisticAttachments = optimisticMaterialPack.all
    const portraitMaterialAttachments = optimisticMaterialPack.portraits
    const fileOptimisticAttachments = optimisticMaterialPack.files
    const userMessage: AgentMessage = {
      id: userMessageId,
      role: 'user',
      content,
      attachments: optimisticAttachments,
      created_at: new Date().toISOString(),
    } as any
    const assistantMessage: AgentMessage = {
      id: streamId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      status: 'streaming',
      generation_tasks: [],
      runtime_started_at: Date.now(),
      runtime_first_delta_at: null,
      thinking_ms: 0,
      execution_ms: 0,
    } as any
    let streamingMsgIndex = -1

    flushSync(() => {
      ctx.setDetail(prev => {
        const baseDetail = prev?.id === threadId
          ? prev
          : createdThread?.id === threadId
            ? ({ ...createdThread, messages: [] } as AgentThreadDetail)
            : ctx.selected?.id === threadId
              ? ({ ...ctx.selected, messages: [] } as AgentThreadDetail)
              : null
        if (!baseDetail) return prev
        const msgs = [...(baseDetail.messages || []), userMessage, assistantMessage]
        streamingMsgIndex = msgs.length - 1
        return { ...baseDetail, messages: msgs }
      })
      ctx.setDraft('')
      ctx.setPendingFiles([])
      if (isImageMarketingSend) {
        ctx.setImageOptions(prev => clearImageComposerMaterials(prev))
      }
      if (isVideoMarketingSend) {
        ctx.setVideoOptions(prev => clearVideoComposerMaterials(prev))
      }
    })
    const optimisticBaseThread = createdThread || ctx.selected || ctx.detail
    if (optimisticBaseThread) {
      const sentThread = ctx.optimisticThreadSnapshot(optimisticBaseThread, content, content, 2)
      ctx.upsertSidebarThread(sentThread)
      ctx.markAgentThreadRead(threadId, sentThread.message_count)
      ctx.markAgentGenerationSeen(threadId, sentThread.latest_generation_updated_at)
    }
    const abortController = new AbortController()
    ctx.activeStreamAbortByKeyRef.current[threadId] = abortController
    ctx.streamStopRequestedKeysRef.current.delete(threadId)

    const patchUserMessage = (attachments: AgentAttachment[]) => {
      ctx.setDetail(prev => {
        if (!prev || prev.id !== threadId) return prev
        return {
          ...prev,
          messages: prev.messages.map(msg => msg.id === userMessageId ? { ...msg, attachments } : msg),
        }
      })
    }

    const patchStreamingMsg = (patch: Partial<AgentMessage>) => {
      ctx.setDetail(prev => {
        if (!prev || prev.id !== threadId) return prev
        const idx = streamingMsgIndex
        if (idx >= 0 && idx < prev.messages.length && prev.messages[idx].id === streamId) {
          const msgs = prev.messages.slice()
          msgs[idx] = { ...msgs[idx], ...patch }
          return { ...prev, messages: msgs }
        }
        const fallbackIdx = prev.messages.findIndex(m => m.id === streamId)
        if (fallbackIdx < 0) return prev
        streamingMsgIndex = fallbackIdx
        const msgs = prev.messages.slice()
        msgs[fallbackIdx] = { ...msgs[fallbackIdx], ...patch }
        return { ...prev, messages: msgs }
      })
    }

    const patchRuntimeById = (ids: Array<string | null | undefined>, patch: MessageRuntime) => {
      const uniqueIds = Array.from(new Set(ids.filter(Boolean) as string[]))
      if (!uniqueIds.length)
        return
      ctx.setMessageRuntimeById(prev => {
        let changed = false
        const next = { ...prev }
        for (const id of uniqueIds) {
          const merged = { ...(next[id] || {}), ...patch }
          if (merged.thinking_ms !== next[id]?.thinking_ms || merged.execution_ms !== next[id]?.execution_ms) {
            next[id] = merged
            changed = true
          }
        }
        return changed ? next : prev
      })
    }

    let received = ''
    let streamFailed = false
    let streamStopped = false
    let streamRequestStarted = false
    let preStreamFailed = false
    let serverAssistantMessageId = ''
    const streamStartedAt = performance.now()
    const streamStartedWallAt = Date.now()
    let firstDeltaAt: number | null = null
    let firstDeltaWallAt: number | null = null
    const maxTokens = ctx.entry === 'marketing' && effectiveMarketingMode !== 'image' && effectiveMarketingMode !== 'video' ? 900 : null
    try {
      const attachmentIds: string[] = []
      const uploadedAttachments: AgentAttachment[] = []
      for (let index = 0; index < sendFiles.length; index += 1) {
        const file = sendFiles[index]
        const attachment = await AgentAttachmentAPI.upload(
          file,
          threadId,
          ctx.entry === 'marketing' && normalizeMarketingMode(ctx.mode || ctx.routeMode) === 'text'
            ? { purpose: 'copy_reference' }
            : undefined,
        )
        const optimistic = fileOptimisticAttachments[index]
        const displayAttachment = {
          ...attachment,
          name: optimistic?.name || attachment.name,
          ...(optimistic?.local_preview_url ? { local_preview_url: optimistic.local_preview_url } : {}),
        } as AgentAttachment
        attachmentIds.push(attachment.id)
        uploadedAttachments.push(displayAttachment)
        patchUserMessage([
          ...portraitMaterialAttachments,
          ...uploadedAttachments,
          ...fileOptimisticAttachments.slice(index + 1),
        ])
      }

      streamRequestStarted = true
      for await (const evt of streamThreadChat(
        threadId,
        content,
        attachmentIds,
        ctx.isAssistantEntry ? '' : sendModelKey,
        ctx.isAssistantEntry ? '' : (ctx.generationModel || ''),
        ctx.entry === 'marketing' && effectiveMarketingMode === 'image'
          ? {
              ...ctx.imageOptions,
              image_skill: ctx.imageOptions.style_mode === 'clean'
                ? undefined
                : (ctx.imageOptions.image_skill || ctx.plugin || undefined),
            }
          : ctx.entry === 'marketing' && effectiveMarketingMode === 'video'
            ? videoGenerationOptionsForRequest(ctx.videoOptions)
            : ctx.entry === 'marketing' && normalizeMarketingMode(ctx.mode || ctx.routeMode) === 'text'
              ? copyTextGenerationOptions(ctx)
            : ctx.entry === 'support'
              ? ctx.pptOptions
              : null,
        maxTokens,
        abortController.signal,
        { locale: ctx.locale, inputWasEmpty },
      )) {
        if (evt.type === 'thread_meta' && evt.assistant_message_id) {
          serverAssistantMessageId = evt.assistant_message_id
          const currentRuntime = ctx.messageRuntimeById[streamId]
          if (currentRuntime)
            patchRuntimeById([serverAssistantMessageId], currentRuntime)
        }
        if (evt.generation_task) {
          patchStreamingMsg({ generation_tasks: [evt.generation_task] as any })
          ctx.upsertGenerationTask(evt.generation_task)
          const brief = String((evt.generation_task as any)?.result?.reasoning?.brief || '').trim()
          if (brief) {
            const briefNow = performance.now()
            if (firstDeltaAt == null) {
              firstDeltaAt = briefNow
              firstDeltaWallAt = Date.now()
              patchStreamingMsg({
                thinking_ms: Math.round(firstDeltaAt - streamStartedAt),
                execution_ms: 0,
                runtime_started_at: streamStartedWallAt,
                runtime_first_delta_at: firstDeltaWallAt,
              } as any)
              patchRuntimeById([streamId, serverAssistantMessageId], {
                thinking_ms: Math.round(firstDeltaAt - streamStartedAt),
                execution_ms: 0,
                runtime_started_at: streamStartedWallAt,
                runtime_first_delta_at: firstDeltaWallAt,
              })
            }
            if (!received.trim()) {
              received = brief
              patchStreamingMsg({
                content: received,
                status: 'streaming',
                execution_ms: Math.max(0, Math.round(briefNow - (firstDeltaAt || briefNow))),
              } as any)
            }
          }
        }
        if (evt.finish && evt.presentation && typeof evt.presentation === 'object' && Object.keys(evt.presentation).length > 0) {
          patchStreamingMsg({
            metadata: {
              runtime: {
                operation: 'presentation_generate',
                artifacts: (evt.artifacts || []) as any,
                presentation: evt.presentation,
              },
            },
          } as any)
        }
        if (evt.type === 'reasoning' && firstDeltaAt == null) {
          firstDeltaAt = performance.now()
          firstDeltaWallAt = Date.now()
          patchStreamingMsg({
            thinking_ms: Math.round(firstDeltaAt - streamStartedAt),
            execution_ms: 0,
            runtime_started_at: streamStartedWallAt,
            runtime_first_delta_at: firstDeltaWallAt,
          } as any)
          patchRuntimeById([streamId, serverAssistantMessageId], {
            thinking_ms: Math.round(firstDeltaAt - streamStartedAt),
            execution_ms: 0,
            runtime_started_at: streamStartedWallAt,
            runtime_first_delta_at: firstDeltaWallAt,
          })
        }
        if (evt.delta) {
          const now = performance.now()
          if (firstDeltaAt == null) {
            firstDeltaAt = now
            firstDeltaWallAt = Date.now()
            patchStreamingMsg({
              thinking_ms: Math.round(firstDeltaAt - streamStartedAt),
              execution_ms: 0,
              runtime_started_at: streamStartedWallAt,
              runtime_first_delta_at: firstDeltaWallAt,
            } as any)
            patchRuntimeById([streamId, serverAssistantMessageId], {
              thinking_ms: Math.round(firstDeltaAt - streamStartedAt),
              execution_ms: 0,
              runtime_started_at: streamStartedWallAt,
              runtime_first_delta_at: firstDeltaWallAt,
            })
          }
          received += evt.delta
          patchStreamingMsg({
            content: received,
            status: 'streaming',
            execution_ms: Math.max(0, Math.round(now - firstDeltaAt)),
          } as any)
          patchRuntimeById([streamId, serverAssistantMessageId], {
            execution_ms: Math.max(0, Math.round(now - firstDeltaAt)),
          })
        }
        if (evt.type === 'error') {
          streamFailed = true
          received = assistantRuntimeErrorText(evt.message || 'Stream error', evt.error_code || '', ctx.locale)
          patchStreamingMsg({ content: received, status: 'error' })
        }
        if (evt.type === 'manual_takeover') {
          received = evt.message || '运营人员已接管，AI 暂停自动回复。'
          ctx.setManualTakeoverNotice(received)
          patchStreamingMsg({ content: received, status: 'done' })
          const dom = ctx.detail?.domain ?? ctx.domain
          const pk = ctx.detail?.plugin_key ?? ctx.plugin ?? ''
          const mk = manualServiceKeyFromThread(dom, pk)
          if (mk)
            useManualServiceUnreadStore.getState().bump(mk)
        }
      }
    } catch (err: any) {
      if (ctx.streamStopRequestedKeysRef.current.has(threadId) || abortController.signal.aborted || err?.name === 'AbortError') {
        streamStopped = true
        received = received || '已停止回复，可以继续输入。'
        patchStreamingMsg({ content: received, status: 'done' })
      } else if (!streamRequestStarted) {
        preStreamFailed = true
        streamFailed = true
        received = describeAxiosError(err, ctx.t('agent.sendError'))
        patchStreamingMsg({ content: received, status: 'error' })
      } else {
        streamFailed = true
        received = assistantRuntimeErrorText(err.message || 'Stream error', '', ctx.locale)
        patchStreamingMsg({ content: received, status: 'error' })
      }
    }

    const streamEndedAt = performance.now()
    const thinkingMs = Math.round((firstDeltaAt ?? streamEndedAt) - streamStartedAt)
    const executionMs = firstDeltaAt == null ? 0 : Math.max(0, Math.round(streamEndedAt - firstDeltaAt))
    patchRuntimeById([streamId, serverAssistantMessageId], {
      thinking_ms: thinkingMs,
      execution_ms: executionMs,
      runtime_started_at: streamStartedWallAt,
      runtime_first_delta_at: firstDeltaWallAt,
    })
    ctx.setDetail(prev => prev && prev.id === threadId
      ? {
          ...prev,
          messages: prev.messages.map(msg => msg.id === streamId
            ? {
                ...msg,
                status: streamFailed ? 'error' : 'done',
                thinking_ms: thinkingMs,
                execution_ms: executionMs,
              } as any
            : msg,
          ),
        }
      : prev)
    const cachedThread = queryClient.getQueryData<{ items?: AgentThread[] }>(AGENT_QUERY_KEYS.threads(ctx.domain))
      ?.items
      ?.find(item => item.id === threadId)
    const finalBaseThread = cachedThread || createdThread || ctx.selected || ctx.detail
    if (finalBaseThread)
      ctx.upsertSidebarThread(ctx.optimisticThreadSnapshot(finalBaseThread, content, received || content, 0))

    if (streamStopped) {
      ctx.syncSidebarThreads()
      return
    }

    if (preStreamFailed) {
      if (createdThread) {
        try {
          await AgentThreadAPI.destroy(threadId)
          removeAgentThreadQueryCaches(threadId, ctx.domain)
          useAgentStore.getState().removeThread(threadId, ctx.domain)
          ctx.navigate(canonicalHomeForRouteContext(ctx.routeContext), { replace: true })
          if (ctx.selectedIdRef)
            ctx.selectedIdRef.current = ''
          ctx.setSelectedId?.('')
          ctx.setDetail(null)
        } catch {}
      }
      ctx.setDraft(content)
      ctx.setPendingFiles(sendFiles)
      toast({ variant: 'destructive', description: received })
      if (!createdThread)
        void ctx.reloadThreads(threadId)
      ctx.syncSidebarThreads()
      return
    }

    const shouldKeepFocus = (ctx.selectedIdRef?.current === threadId)
      || (ctx.threadFromRouteRef?.current === threadId)
    void ctx.reloadThreads(shouldKeepFocus ? threadId : '')
    const refreshDelay = streamFailed ? 0 : estimateTypewriterRefreshDelay(received)
    window.setTimeout(() => {
      if (ctx.selectedIdRef?.current === threadId || ctx.threadFromRouteRef?.current === threadId) {
        void ctx.loadThreadDetail(threadId).then(ctx.syncSidebarThreads)
        return
      }
      ctx.syncSidebarThreads()
    }, refreshDelay)
  } catch (err: unknown) {
    toast({ variant: 'destructive', description: describeAxiosError(err, ctx.t('agent.sendError')) })
  } finally {
    delete ctx.activeStreamAbortByKeyRef.current[cleanupKey]
    ctx.streamStopRequestedKeysRef.current.delete(cleanupKey)
    ctx.setConversationBusy(cleanupKey, false)
    ctx.setConversationBusy(startKey, false)
  }
}
