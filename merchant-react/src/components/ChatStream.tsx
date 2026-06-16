import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './ChatStream.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, toast } from '@xiaoone/react-ui'
import { Check, Copy, ListChecks } from 'lucide-react'
import { Icon } from './Icon'
import { AsyncImage } from './AsyncImage'
import { getChatKit, type AgentAttachment, type AgentGenerationTask } from '@xiaoone/chat-kit'
import { authFetch } from '../lib/authFetch'
import { usePreferences } from '../app/preferences'
import type { Locale } from '../i18n/types'
import { uiT, uiTpl } from '../i18n/catalogResolve'
import { useWorkspaceStore } from '../store/workspace'
import { actionsForErrorCode, localeKeyForErrorCode } from '../lib/agentGenerationErrors'
import { protocolProgressText, sanitizeAgentAssistantText } from '../lib/agentProtocolText'
import { conversationMaterialsForMessage, type ConversationMaterial } from '../lib/agentConversationMaterials'

type UIChatAttachment = AgentAttachment & {
  local_preview_url?: string
}

type RuntimeArtifact = {
  type?: string
  name?: string
  mime_type?: string
  content_type?: string
  size?: number
  url?: string
  storage?: string
}

type RuntimePresentation = {
  plan?: {
    title?: string
    subtitle?: string
    theme?: { primary?: string; accent?: string; background?: string; text?: string }
    slide_count?: number
    slides?: Array<{
      title?: string
      subtitle?: string
      bullets?: string[]
      speaker_notes?: string
      visual_prompt?: string
    }>
    options?: { template?: string; ratio?: '16:9' | '4:3'; tone?: string; slides?: number }
  }
  upstream?: { provider?: string; model?: string; upstream_used?: boolean; warning?: string }
}

export interface UIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  content_preview?: string
  created_at?: string
  updated_at?: string
  thinking_ms?: number
  execution_ms?: number
  runtime_started_at?: number
  runtime_first_delta_at?: number | null
  metadata?: {
    runtime?: {
      thinking_ms?: number
      execution_ms?: number
      operation?: string
      artifacts?: RuntimeArtifact[]
      presentation?: RuntimePresentation
    }
  }
  status?: 'done' | 'streaming' | 'error' | string
  is_streaming?: boolean
  generation_tasks?: AgentGenerationTask[]
  attachments?: UIChatAttachment[]
}

export interface RouteSuggestionPayload {
  routeTo: 'system' | 'marketing' | 'support' | 'agency' | 'feedback'
  reason: string
  sourceMessageId: string
}

export interface UseImagesForVideoPayload {
  task: AgentGenerationTask
  referenceAssets: Array<{ asset_id: string; role?: string }>
}

interface Props {
  messages: UIChatMessage[]
  emptyTitle?: string
  emptyHint?: string
  domain?: string
  notifyStatusByMessageId?: Record<string, { target: string; status: string }>
  onRetryTask?: (task: AgentGenerationTask) => void
  onRefreshTask?: (task: AgentGenerationTask) => void
  onRouteTo?: (payload: RouteSuggestionPayload) => void
  onUseImagesForVideo?: (payload: UseImagesForVideoPayload) => void
  children?: React.ReactNode
}

const ROUTE_TARGETS = new Set(['system', 'marketing', 'support', 'agency', 'feedback'])

function extractRoutePayload(content: string): { routeTo: RouteSuggestionPayload['routeTo']; reason: string; cleanText: string } | null {
  const trimmed = (content || '').trim()
  if (!trimmed) return null
  const fenced = /<route_to>([\s\S]+?)<\/route_to>/m.exec(trimmed)
  if (fenced?.[1]) {
    try {
      const parsed = JSON.parse(fenced[1]) as { route_to?: string; reason?: string }
      if (!parsed.route_to || !ROUTE_TARGETS.has(parsed.route_to)) return null
      return {
        routeTo: parsed.route_to as RouteSuggestionPayload['routeTo'],
        reason: String(parsed.reason || '').trim(),
        cleanText: trimmed.replace(fenced[0], '').trim(),
      }
    } catch {
      // fallthrough
    }
  }
  const marker = trimmed.lastIndexOf('{"route_to"')
  if (marker < 0) return null
  const raw = trimmed.slice(marker)
  try {
    const parsed = JSON.parse(raw) as { route_to?: string; reason?: string }
    if (!parsed.route_to || !ROUTE_TARGETS.has(parsed.route_to)) return null
    return {
      routeTo: parsed.route_to as RouteSuggestionPayload['routeTo'],
      reason: String(parsed.reason || '').trim(),
      cleanText: trimmed.slice(0, marker).trimEnd(),
    }
  } catch {
    return null
  }
}

function humanizeLegacyTaskStatusText(content: string, locale: Locale): string {
  const text = (content || '').trim()
  if (!text) return ''
  if (/^已提交视频生成任务，状态：\s*(submitted|queued)/i.test(text))
    return uiT(locale, 'common.gen.queued')
  if (/^已提交视频生成任务，状态：\s*running/i.test(text))
    return uiT(locale, 'common.gen.running')
  if (/^已创建视频生成任务，状态：\s*(submitted|queued|running)/i.test(text))
    return uiT(locale, 'common.gen.created')
  return content
}

function taskAssistantText(task: AgentGenerationTask, locale: Locale): string | null {
  const label = task.modality === 'image' ? uiT(locale, 'common.gen.image') : uiT(locale, 'common.gen.video')
  if (isActiveTask(task))
    return uiTpl(locale, 'common.gen.submitted', label)
  if (task.status === 'succeeded') {
    if (task.modality === 'image') {
      const count = taskArtifacts(task).length
      return uiTpl(locale, 'common.gen.imageDone', String(count || 1))
    }
    return uiT(locale, 'common.gen.videoDone')
  }
  if (task.status === 'failed') {
    const count = taskArtifacts(task).length
    const reason = task.error_message || uiT(locale, 'common.gen.unknownReason')
    if (task.modality === 'image' && count > 0)
      return uiTpl(locale, 'common.gen.partialFailed', label, String(count), reason)
    return uiTpl(locale, 'common.gen.failed', label, reason)
  }
  return null
}

function renderMessageText(m: UIChatMessage, locale: Locale): string {
  if (m.role !== 'assistant') return m.content || m.content_preview || ''
  const generationTasks = m.generation_tasks || []
  const generationText = generationTasks.length > 0
    ? taskAssistantText(generationTasks[generationTasks.length - 1], locale)
    : null
  if (generationText)
    return generationText
  const contentWithoutProtocol = sanitizeAgentAssistantText(m.content || '')
  const clean = extractRoutePayload(contentWithoutProtocol)?.cleanText || contentWithoutProtocol
  return humanizeLegacyTaskStatusText(clean, locale)
}

function formatMessageTime(raw: string | undefined, locale: 'zh' | 'en') {
  if (!raw) return ''
  const ts = Date.parse(raw)
  if (!Number.isFinite(ts)) return ''
  return new Date(ts).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatThinkingSeconds(ms: number | undefined) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0)
    return ''
  return `${(ms / 1000).toFixed(1)}s`
}

function messageThinkingText(m: UIChatMessage, now: number, locale: Locale) {
  if (m.role !== 'assistant')
    return ''
  const streaming = isStreamingMessage(m)
  const hasRuntimeStarted = typeof m.runtime_started_at === 'number' && Number.isFinite(m.runtime_started_at)
  const hasFirstDelta = typeof m.runtime_first_delta_at === 'number' && Number.isFinite(m.runtime_first_delta_at)
  const liveThinking = streaming && hasRuntimeStarted && !hasFirstDelta
    ? Math.max(0, now - (m.runtime_started_at as number))
    : (m.thinking_ms ?? m.metadata?.runtime?.thinking_ms)
  const thinking = formatThinkingSeconds(liveThinking)
  if (!thinking)
    return ''
  return streaming && hasRuntimeStarted && !hasFirstDelta
    ? uiTpl(locale, 'common.gen.thinking', thinking)
    : uiTpl(locale, 'common.gen.think', thinking)
}

function isStreamingMessage(m: UIChatMessage): boolean {
  return Boolean(m.is_streaming || m.status === 'streaming')
}

function advanceTypewriterText(current: string, target: string): string {
  if (!target) return ''
  if (!target.startsWith(current) || current.length > target.length) return ''
  const targetChars = Array.from(target)
  const currentLength = Array.from(current).length
  return targetChars.slice(0, currentLength + 1).join('')
}

function TypingDots({ label }: { label: string }) {
  return (
    <span className="msg-typing-dots" aria-label={label}>
      <i />
      <i />
      <i />
    </span>
  )
}

function routeBadgeText(routeTo: RouteSuggestionPayload['routeTo'], locale: Locale): string {
  const map: Record<RouteSuggestionPayload['routeTo'], string> = {
    system: uiT(locale, 'common.domain.software'),
    marketing: uiT(locale, 'common.domain.marketing'),
    support: uiT(locale, 'common.domain.support'),
    agency: uiT(locale, 'common.domain.agency'),
    feedback: uiT(locale, 'common.domain.feedback'),
  }
  return map[routeTo]
}

function notifyChannelLabel(target: string, locale: Locale): string {
  const map: Record<string, string> = {
    telegram: 'Telegram',
    feishu: uiT(locale, 'common.domain.feishu'),
    wecom: uiT(locale, 'common.domain.wecom'),
  }
  return map[target] || target
}

function taskTitle(task: AgentGenerationTask, locale: Locale) {
  return task.modality === 'image' ? uiT(locale, 'common.gen.imageGen') : uiT(locale, 'common.gen.videoGen')
}

function taskStatusLabel(status: AgentGenerationTask['status'], locale: Locale, isLiveDraft = false) {
  const map: Record<string, string> = {
    draft: isLiveDraft ? uiT(locale, 'common.gen.status.draft') : uiT(locale, 'common.gen.status.draftPending'),
    submitted: uiT(locale, 'common.gen.status.submitted'),
    queued: uiT(locale, 'common.gen.status.queued'),
    running: uiT(locale, 'common.gen.status.running'),
    succeeded: uiT(locale, 'common.gen.status.succeeded'),
    failed: uiT(locale, 'common.gen.status.failed'),
    canceled: uiT(locale, 'common.gen.status.canceled'),
  }
  return map[status] || status
}

function taskModalityLabel(task: AgentGenerationTask, locale: Locale) {
  return task.modality === 'image' ? uiT(locale, 'common.gen.image') : uiT(locale, 'common.gen.video')
}

function taskEstimateLabel(task: AgentGenerationTask, locale: Locale) {
  return task.modality === 'image' ? uiT(locale, 'common.gen.eta.image') : uiT(locale, 'common.gen.eta.video')
}

function taskOptionsLabel(task: AgentGenerationTask, locale: Locale) {
  const options = task.result?.generation_options
  if (!options || typeof options !== 'object')
    return ''
  if (task.modality === 'image') {
    const parts = [
      options.group_mode && options.group_mode !== 'auto' ? String(options.group_mode) : '',
      options.size ? String(options.size) : '',
      options.requested_count ? uiTpl(locale, 'common.gen.countSheet', String(options.requested_count)) : '',
    ].filter(Boolean)
    return parts.length ? uiTpl(locale, 'common.gen.settings', parts.join(' · ')) : ''
  }
  const parts = [
    options.ratio ? String(options.ratio) : '',
    options.resolution ? String(options.resolution) : '',
    options.duration ? uiTpl(locale, 'common.gen.durationSec', String(options.duration)) : '',
    options.requested_count ? uiTpl(locale, 'common.gen.countStrip', String(options.requested_count)) : '',
    options.generate_audio === false ? uiT(locale, 'common.gen.noAudio') : options.generate_audio === true ? uiT(locale, 'common.gen.withAudio') : '',
  ].filter(Boolean)
  return parts.length ? uiTpl(locale, 'common.gen.settings', parts.join(' · ')) : ''
}

function parseTimeMs(raw: string | null | undefined) {
  if (!raw)
    return Number.NaN
  const ts = Date.parse(raw)
  return Number.isFinite(ts) ? ts : Number.NaN
}

function taskStartedAt(task: AgentGenerationTask, messageStartedAt?: string) {
  const attemptTs = parseTimeMs(task.result?.attempt_started_at)
  if (Number.isFinite(attemptTs))
    return attemptTs

  const taskTs = parseTimeMs(task.created_at) || parseTimeMs(task.updated_at)
  const messageTs = parseTimeMs(messageStartedAt)
  const fallbackTs = Number.isFinite(taskTs) ? taskTs : Date.now()
  if (Number.isFinite(messageTs) && messageTs > fallbackTs)
    return messageTs
  return fallbackTs
}

function formatElapsed(ms: number, locale: Locale) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes <= 0) return uiTpl(locale, 'common.gen.elapsedSec', String(seconds))
  return uiTpl(locale, 'common.gen.elapsedMinSec', String(minutes), String(seconds).padStart(2, '0'))
}

function taskEstimatedProgress(task: AgentGenerationTask, now: number, messageStartedAt?: string) {
  const elapsed = Math.max(0, now - taskStartedAt(task, messageStartedAt))
  const tauSeconds = task.modality === 'image' ? 30 : 90
  const tauMs = tauSeconds * 1000
  const curve = Math.round(95 * (1 - Math.exp(-elapsed / tauMs)))
  const floor = task.status === 'queued' ? 12 : task.status === 'running' ? 40 : 4
  return Math.max(4, Math.min(95, Math.max(curve, floor)))
}

function taskProgressValue(task: AgentGenerationTask, now: number, messageStartedAt?: string) {
  if (task.status === 'succeeded') return 100
  if (task.status === 'failed' || task.status === 'canceled') return 100
  if (typeof task.progress === 'number')
    return Math.max(4, Math.min(99, task.progress))
  return taskEstimatedProgress(task, now, messageStartedAt)
}

function taskLiveDetail(task: AgentGenerationTask, now: number, locale: Locale, isLiveDraft = false, messageStartedAt?: string) {
  if (!isActiveTask(task) && !isLiveDraft) {
    if (task.status === 'succeeded') return uiTpl(locale, 'common.gen.done', taskModalityLabel(task, locale))
    if (task.status === 'failed') {
      const count = taskArtifacts(task).length
      const reason = task.error_message || uiT(locale, 'common.gen.unknownReason')
      if (count > 0) return uiTpl(locale, 'common.gen.partialFailed', taskModalityLabel(task, locale), String(count), reason)
      return uiTpl(locale, 'common.gen.failed', taskModalityLabel(task, locale), reason)
    }
    if (task.status === 'canceled') return uiTpl(locale, 'common.gen.status.canceled', taskModalityLabel(task, locale))
    return taskStatusLabel(task.status, locale)
  }
  const elapsed = formatElapsed(now - taskStartedAt(task, messageStartedAt), locale)
  const status = isLiveDraft
    ? uiT(locale, 'common.gen.status.draft')
    : task.status === 'queued'
    ? uiT(locale, 'common.gen.status.queued')
    : task.status === 'running'
      ? uiT(locale, 'common.gen.status.running')
      : uiT(locale, 'common.gen.status.submitted')
  return `${status} · ${elapsed} · ${taskEstimateLabel(task, locale)}`
}

function taskArtifacts(task: AgentGenerationTask): any[] {
  return Array.isArray(task.result?.artifacts) ? task.result!.artifacts : []
}

function generationArtifactEndpoint(task: AgentGenerationTask, index: number) {
  return videoArtifactEndpoint(task, index)
}

function preferPlatformArtifactSrc(task: AgentGenerationTask, item: any, index: number) {
  const direct = String(item?.playback_url || item?.url || item?.uri || '').trim()
  if (direct.startsWith('/api/')) return direct
  if (item?.storage === 'hermes_local') return generationArtifactEndpoint(task, index)
  if (direct.startsWith('http://') || direct.startsWith('https://')) return generationArtifactEndpoint(task, index)
  return direct || generationArtifactEndpoint(task, index)
}

function taskVideos(task: AgentGenerationTask): string[] {
  const videosInArtifacts = taskArtifacts(task)
    .map((item: any, index: number) => {
      if (item?.type !== 'video') return ''
      return preferPlatformArtifactSrc(task, item, index)
    })
    .filter(Boolean)
  if (videosInArtifacts.length > 0)
    return Array.from(new Set(videosInArtifacts))

  const artifacts: string[] = []
  const raw = task.result?.raw || {}
  const samples = raw?.response?.generateVideoResponse?.generatedSamples || raw?.generateVideoResponse?.generatedSamples || raw?.generatedSamples || []
  for (const sample of samples) {
    const video = sample?.video || sample?.videoFile
    const src = typeof video === 'string' ? video : video?.url || video?.uri
    if (src != null && src !== '') artifacts.push(String(src))
  }
  for (const key of ['video_url', 'videoUrl', 'url', 'uri'] as const) {
    const v = raw?.[key]
    if (v != null && v !== '') artifacts.push(String(v))
  }

  if (artifacts.length === 0 && task.status === 'succeeded')
    artifacts.push(videoArtifactEndpoint(task, 0))

  return Array.from(new Set(artifacts))
}

function videoKey(task: AgentGenerationTask, index: number) {
  return `${task.id}:${index}`
}

function videoArtifactEndpoint(task: AgentGenerationTask, index: number) {
  return `/api/v1/agent/generation-tasks/${task.id}/artifact/?index=${index}`
}

function artifactSrc(task: AgentGenerationTask, item: any, index: number) {
  if (item?.b64_json) return `data:${item.mime_type || 'image/png'};base64,${item.b64_json}`
  return preferPlatformArtifactSrc(task, item, index)
}

function artifactNeedsAuthFetch(src: string) {
  return src.startsWith('/api/')
}

function messageArtifacts(message: UIChatMessage): RuntimeArtifact[] {
  const artifacts = message.metadata?.runtime?.artifacts
  return Array.isArray(artifacts) ? artifacts.filter((item): item is RuntimeArtifact => !!item && typeof item === 'object') : []
}

function messageArtifactEndpoint(message: UIChatMessage, index: number) {
  return `/api/v1/agent/messages/${message.id}/artifact/?index=${index}`
}

function fileSize(size = 0) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${size || 0} B`
}

function isImageAttachment(att: AgentAttachment) {
  return (att.content_type || '').split(';')[0].trim().toLowerCase().startsWith('image/')
}

function isVideoAttachment(att: AgentAttachment) {
  const type = (att.content_type || '').split(';')[0].trim().toLowerCase()
  const name = (att.name || '').toLowerCase()
  return type.startsWith('video/') || /\.(mp4|m4v|mov|webm|avi|mkv)$/.test(name)
}

function imageAttachmentPreviewUrl(att: UIChatAttachment, cachedUrls: Record<string, string>) {
  return cachedUrls[att.id] || (isLocalAttachment(att) ? att.local_preview_url || '' : '')
}

function videoAttachmentPreviewUrl(att: UIChatAttachment, cachedUrls: Record<string, string>) {
  return cachedUrls[att.id] || (isLocalAttachment(att) ? att.local_preview_url || '' : '')
}


function materialCardLabel(material: ConversationMaterial, index?: number) {
  if (material.label)
    return material.label
  if (typeof index === 'number')
    return `素材${index + 1}`
  const name = String(material.attachment?.name || material.referenceImage?.name || '').trim()
  const match = name.match(/@?素材\d+/)
  if (match)
    return match[0].replace(/^@/, '')
  return name || '素材'
}

function renderUserMaterialPreview(
  material: ConversationMaterial,
  imageUrls: Record<string, string>,
  videoUrls: Record<string, string>,
  imageLoading: Record<string, boolean>,
  imageErrors: Record<string, boolean>,
  locale: Locale,
) {
  const att = material.attachment as UIChatAttachment | undefined
  if (att && isVideoAttachment(att)) {
    const src = videoAttachmentPreviewUrl(att, videoUrls)
    return src
      ? <video src={src} muted playsInline preload="metadata" />
      : <Icon name="video" size={16} />
  }
  if (att && isImageAttachment(att)) {
    const src = imageAttachmentPreviewUrl(att, imageUrls) || undefined
    const failed = Boolean(imageErrors[att.id])
    const pending = Boolean(imageLoading[att.id]) || (!failed && (!src || isLocalAttachment(att)))
    return (
      <AsyncImage
        src={src}
        alt=""
        pending={pending}
        failed={failed}
        loadingLabel={uiT(locale, 'common.image.loading')}
        failedLabel={uiT(locale, 'common.image.loadFailed')}
      />
    )
  }
  if (material.kind === 'image') {
    return (
      <AsyncImage
        src={material.previewUrl || undefined}
        alt=""
        pending={!material.previewUrl}
        failed={false}
        loadingLabel={uiT(locale, 'common.image.loading')}
        failedLabel={uiT(locale, 'common.image.loadFailed')}
      />
    )
  }
  if (material.kind === 'video') {
    return material.previewUrl
      ? <video src={material.previewUrl} muted playsInline preload="metadata" />
      : <Icon name="video" size={16} />
  }
  return <Icon name="file" size={16} />
}
function isLocalAttachment(att: AgentAttachment) {
  return String(att.id || '').startsWith('local:')
}

function attachmentPreviewEndpoint(att: AgentAttachment) {
  return `/api/v1/agent/attachments/${att.id}/download/?proxy=1`
}

function isTextAttachment(att: AgentAttachment) {
  const type = (att.content_type || '').split(';')[0].trim().toLowerCase()
  const name = (att.name || '').toLowerCase()
  return type.startsWith('text/') || ['application/json', 'application/xml', 'application/yaml', 'application/x-yaml'].includes(type) || /\.(cfg|conf|csv|env|ini|json|log|md|markdown|sql|text|toml|tsv|txt|xml|ya?ml)$/.test(name)
}

function isActiveTask(task: AgentGenerationTask) {
  return ['submitted', 'queued', 'running'].includes(task.status)
}

function isLiveTask(task: AgentGenerationTask, messageStreaming: boolean) {
  return isActiveTask(task) || (task.status === 'draft' && messageStreaming)
}

function taskProgressMeta(task: AgentGenerationTask, isLiveDraft: boolean) {
  if (isLiveDraft) return '正在连接生成引擎'
  if (task.modality === 'image') {
    if (task.status === 'submitted') return '已向 Seedream 发起生成请求'
    if (task.status === 'queued') return '图片任务正在排队'
    if (task.status === 'running') return 'Seedream 正在生成图片'
  }
  if (task.upstream_task_id) return '任务已进入上游队列'
  return '等待上游返回任务号'
}

export function ChatStream({
  messages,
  domain,
  notifyStatusByMessageId,
  onRetryTask,
  onRefreshTask,
  onRouteTo,
  onUseImagesForVideo,
  children,
}: Props) {
  const { t, locale } = usePreferences()
  const ws = useWorkspaceStore()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const copyResetTimerRef = useRef<number | null>(null)

  const [videoObjectUrls, setVideoObjectUrls] = useState<Record<string, string>>({})
  const [videoLoading, setVideoLoading] = useState<Record<string, boolean>>({})
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({})
  const [imageObjectUrls, setImageObjectUrls] = useState<Record<string, string>>({})
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({})
  const [attachmentImageUrls, setAttachmentImageUrls] = useState<Record<string, string>>({})
  const [attachmentImageErrors, setAttachmentImageErrors] = useState<Record<string, boolean>>({})
  const [attachmentImageLoading, setAttachmentImageLoading] = useState<Record<string, boolean>>({})
  const [attachmentVideoUrls, setAttachmentVideoUrls] = useState<Record<string, string>>({})
  const [now, setNow] = useState(() => Date.now())

  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null)
  const [downloadFile, setDownloadFile] = useState<AgentAttachment | null>(null)
  const [textFile, setTextFile] = useState<AgentAttachment | null>(null)
  const [textContent, setTextContent] = useState('')
  const [textLoading, setTextLoading] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [typewriterText, setTypewriterText] = useState<Record<string, string>>({})
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesRef = useRef(messages)

  const hasMessages = messages.length > 0
  const activeTaskClockKey = useMemo(() =>
    messages
      .flatMap(m => (m.generation_tasks || []).map(task => ({ task, streaming: isStreamingMessage(m) })))
      .filter(({ task, streaming }) => isLiveTask(task, streaming))
      .map(({ task }) => task.id)
      .join('|'),
  [messages])
  const liveThinkingClockKey = useMemo(() =>
    messages
      .filter(m => isStreamingMessage(m) && typeof m.runtime_started_at === 'number' && typeof m.runtime_first_delta_at !== 'number')
      .map(m => `${m.id}:${m.runtime_started_at}`)
      .join('|'),
  [messages])

  // Scroll signature intentionally excludes m.content to avoid triggering a
  // layout effect + rAF on every streaming token. We track:
  //   - message count (new message arrived)
  //   - last message id (message replaced)
  //   - whether any message is currently streaming (streaming started/ended)
  //   - last message content length bucket (large chunk arrived, coarse-grained)
  const scrollSignature = useMemo(() => {
    const last = messages[messages.length - 1];
    const streaming = messages.some(isStreamingMessage) ? '1' : '0';
    const lenBucket = last ? Math.floor((last.content?.length ?? 0) / 80) : 0;
    return `${messages.length}:${last?.id ?? ''}:${streaming}:${lenBucket}`;
  }, [messages])

  const typewriterScrollSignature = useMemo(() =>
    Object.entries(typewriterText)
      .map(([id, text]) => `${id}:${Math.floor(Array.from(text).length / 36)}`)
      .join('|'),
  [typewriterText])

  const typewriterTargetKey = useMemo(() =>
    messages
      .filter(m => m.role === 'assistant')
      .map(m => `${m.id}:${isStreamingMessage(m) ? '1' : '0'}:${renderMessageText(m, locale).length}`)
      .join('|'),
  [messages, locale])

  // Stable dependency key for the media-fetch effect below; avoids recreating
  // the string on every parent re-render when message content hasn't changed.
  const mediaFetchKey = useMemo(() =>
    messages.map(m =>
      `${m.id}:${(m.attachments || []).map(a => `${a.id}:${a.updated_at}`).join(',')}:${(m.generation_tasks || []).map(t => `${t.id}:${t.status}:${t.updated_at}`).join(',')}`
    ).join('|'),
  [messages])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useLayoutEffect(() => {
    const scrollToBottom = () => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight
      }
    }
    scrollToBottom()
    const raf = requestAnimationFrame(scrollToBottom)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [scrollSignature, typewriterScrollSignature])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionPreference = () => setReducedMotion(mediaQuery.matches)
    syncMotionPreference()
    mediaQuery.addEventListener('change', syncMotionPreference)
    return () => {
      mediaQuery.removeEventListener('change', syncMotionPreference)
    }
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      setTypewriterText({})
      return
    }
    setTypewriterText((prev) => {
      const next = { ...prev }
      let changed = false
      for (const m of messages) {
        if (m.role !== 'assistant') continue
        const target = renderMessageText(m, locale)
        const current = prev[m.id]
        if (!isStreamingMessage(m)) {
          if (current != null && current !== target) {
            if (!target.startsWith(current) || current.length > target.length) {
              next[m.id] = ''
              changed = true
            }
          } else if (current != null) {
            delete next[m.id]
            changed = true
          }
          continue
        }
        if (current == null || !target.startsWith(current) || current.length > target.length) {
          next[m.id] = ''
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [messages, reducedMotion, typewriterTargetKey])

  useEffect(() => {
    if (!activeTaskClockKey && !liveThinkingClockKey)
      return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), liveThinkingClockKey ? 50 : 1000)
    return () => window.clearInterval(timer)
  }, [activeTaskClockKey, liveThinkingClockKey])

  useEffect(() => {
    if (reducedMotion) return
    const timer = window.setInterval(() => {
      setTypewriterText((prev) => {
        const byId = new Map(messagesRef.current.map(m => [m.id, m]))
        const next = { ...prev }
        let changed = false
        for (const [id, current] of Object.entries(prev)) {
          const message = byId.get(id)
          if (!message || message.role !== 'assistant') {
            delete next[id]
            changed = true
            continue
          }
          const target = renderMessageText(message, locale)
          if (current === target) {
            if (isStreamingMessage(message))
              continue
            delete next[id]
            changed = true
            continue
          }
          const advanced = advanceTypewriterText(current, target)
          if (advanced !== current) {
            next[id] = advanced
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 22)
    return () => {
      window.clearInterval(timer)
    }
  }, [reducedMotion])

  useEffect(() => {
    const ensureVideoBlob = async (task: AgentGenerationTask, index: number, src: string) => {
      if (src && !artifactNeedsAuthFetch(src))
        return
      const key = videoKey(task, index)
      if (videoObjectUrls[key] || videoLoading[key]) return
      setVideoLoading((prev) => ({ ...prev, [key]: true }))
      try {
        const resp = await authFetch(src || videoArtifactEndpoint(task, index))
        if (!resp.ok) throw new Error(`视频文件加载失败：${resp.status}`)
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        setVideoObjectUrls((prev) => ({ ...prev, [key]: url }))
        setVideoErrors((prev) => {
          const rest = { ...prev }
          delete rest[key]
          return rest
        })
      } catch (e: any) {
        setVideoErrors((prev) => ({ ...prev, [key]: e?.message || '视频文件加载失败' }))
      } finally {
        setVideoLoading((prev) => {
          const rest = { ...prev }
          delete rest[key]
          return rest
        })
      }
    }

    const ensureImageArtifact = async (task: AgentGenerationTask, index: number) => {
      const key = videoKey(task, index)
      if (imageObjectUrls[key] || imageLoading[key] || imageErrors[key]) return
      const item = taskArtifacts(task)[index]
      const directSrc = artifactSrc(task, item, index)
      if (directSrc && !artifactNeedsAuthFetch(directSrc)) {
        setImageObjectUrls((prev) => ({ ...prev, [key]: directSrc }))
        return
      }
      setImageLoading((prev) => ({ ...prev, [key]: true }))
      try {
        const endpoint = directSrc && artifactNeedsAuthFetch(directSrc)
          ? directSrc
          : videoArtifactEndpoint(task, index)
        const resp = await authFetch(endpoint)
        if (!resp.ok) throw new Error(`图片加载失败：${resp.status}`)
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        setImageObjectUrls((prev) => ({ ...prev, [key]: url }))
        setImageErrors((prev) => {
          const rest = { ...prev }
          delete rest[key]
          return rest
        })
      } catch (e: any) {
        setImageErrors((prev) => ({ ...prev, [key]: e?.message || '图片加载失败' }))
      } finally {
        setImageLoading((prev) => {
          const rest = { ...prev }
          delete rest[key]
          return rest
        })
      }
    }

    const ensureAttachmentImageUrl = async (att: UIChatAttachment) => {
      if (isLocalAttachment(att) || attachmentImageUrls[att.id] || attachmentImageErrors[att.id] || attachmentImageLoading[att.id])
        return attachmentImageUrls[att.id]
      setAttachmentImageLoading((prev) => ({ ...prev, [att.id]: true }))
      try {
        const resp = await authFetch(attachmentPreviewEndpoint(att))
        if (!resp.ok) throw new Error('图片加载失败')
        const blob = await resp.blob()
        if (!blob.type.toLowerCase().startsWith('image/')) throw new Error('图片加载失败')
        const url = URL.createObjectURL(blob)
        setAttachmentImageUrls((prev) => ({ ...prev, [att.id]: url }))
        setAttachmentImageErrors((prev) => {
          const rest = { ...prev }
          delete rest[att.id]
          return rest
        })
      } catch {
        setAttachmentImageErrors((prev) => ({ ...prev, [att.id]: true }))
      } finally {
        setAttachmentImageLoading((prev) => {
          const rest = { ...prev }
          delete rest[att.id]
          return rest
        })
      }
    }

    const ensureAttachmentVideoUrl = async (att: UIChatAttachment) => {
      if (isLocalAttachment(att) || attachmentVideoUrls[att.id]) return attachmentVideoUrls[att.id]
      try {
        const resp = await authFetch(attachmentPreviewEndpoint(att))
        if (!resp.ok) throw new Error('视频加载失败')
        const blob = await resp.blob()
        if (!blob.type.toLowerCase().startsWith('video/')) throw new Error('视频加载失败')
        const url = URL.createObjectURL(blob)
        setAttachmentVideoUrls((prev) => ({ ...prev, [att.id]: url }))
      } catch {
        // ignore
      }
    }

    messages.forEach(m => {
      m.generation_tasks?.forEach(task => {
        if (task.modality === 'video' && task.status === 'succeeded') {
          taskVideos(task).forEach((src, index) => ensureVideoBlob(task, index, src))
        }
        if (task.modality === 'image' && task.status === 'succeeded') {
          taskArtifacts(task).forEach((_item, index) => ensureImageArtifact(task, index))
        }
      })
      m.attachments?.forEach(att => {
        if (isImageAttachment(att) && !attachmentImageUrls[att.id]) {
          ensureAttachmentImageUrl(att)
        }
        if (isVideoAttachment(att) && !attachmentVideoUrls[att.id]) {
          ensureAttachmentVideoUrl(att)
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaFetchKey])

  useEffect(() => {
    return () => {
      Object.values(videoObjectUrls).forEach(URL.revokeObjectURL)
      Object.values(imageObjectUrls).forEach(URL.revokeObjectURL)
      Object.values(attachmentImageUrls).forEach(URL.revokeObjectURL)
      Object.values(attachmentVideoUrls).forEach(URL.revokeObjectURL)
      if (copyResetTimerRef.current != null)
        window.clearTimeout(copyResetTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const triggerRoute = (m: UIChatMessage) => {
    const payload = extractRoutePayload(m.content || '')
    if (!payload) return
    onRouteTo?.({ routeTo: payload.routeTo, reason: payload.reason, sourceMessageId: m.id })
  }

  const openAttachment = async (att: AgentAttachment) => {
    if (isImageAttachment(att)) {
      try {
        let url = imageAttachmentPreviewUrl(att as UIChatAttachment, attachmentImageUrls)
        if (!url) {
          const resp = await authFetch(attachmentPreviewEndpoint(att))
          if (!resp.ok) throw new Error('图片加载失败')
          const blob = await resp.blob()
          if (!blob.type.toLowerCase().startsWith('image/')) throw new Error('图片加载失败')
          url = URL.createObjectURL(blob)
          setAttachmentImageUrls((prev) => ({ ...prev, [att.id]: url }))
        }
        setImagePreview({ url, name: att.name })
      } catch {
        toast.error('图片加载失败')
      }
      return
    }
    if (isTextAttachment(att)) {
      setTextFile(att)
      setTextContent('')
      setTextLoading(true)
      try {
        const r = await getChatKit().AgentAttachmentAPI.readTextFile(att.id)
        setTextFile(r.attachment)
        setTextContent(r.content)
      } catch (e: any) {
        setTextFile(null)
        toast.error(e?.response?.data?.message || '打开文本文件失败')
      } finally {
        setTextLoading(false)
      }
      return
    }
    setDownloadFile(att)
  }

  const openMaterial = async (material: ConversationMaterial) => {
    if (material.attachment) {
      await openAttachment(material.attachment)
      return
    }
    if (material.previewUrl)
      window.open(material.previewUrl, '_blank', 'noopener,noreferrer')
  }

  const downloadAttachment = async (att: AgentAttachment) => {
    try {
      const resp = await authFetch(`/api/v1/agent/attachments/${att.id}/download/`)
      if (!resp.ok) throw new Error('下载失败')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = att.name || 'attachment'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setDownloadFile(null)
    } catch {
      toast.error('下载失败')
    }
  }

  const downloadMessageArtifact = async (message: UIChatMessage, artifact: RuntimeArtifact, index: number) => {
    try {
      if (artifact.url && /^https?:\/\//i.test(artifact.url)) {
        window.open(artifact.url, '_blank', 'noopener,noreferrer')
        return
      }
      const resp = await authFetch(messageArtifactEndpoint(message, index))
      if (!resp.ok) throw new Error('下载失败')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = artifact.name || 'presentation.pptx'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e: any) {
      toast.error(e?.message || '下载失败')
    }
  }

  const copyTaskPrompt = async (task: AgentGenerationTask) => {
    try {
      await navigator.clipboard.writeText(task.prompt || '')
      toast.success('已复制提示词')
    } catch {}
  }

  const copyMessageText = async (messageId: string, text: string) => {
    const content = text.trim()
    if (!content)
      return
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      toast.success(locale === 'zh' ? '已复制文案' : 'Copied')
      if (copyResetTimerRef.current != null)
        window.clearTimeout(copyResetTimerRef.current)
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedMessageId(null)
        copyResetTimerRef.current = null
      }, 1200)
    } catch {
      toast.error(locale === 'zh' ? '复制失败' : 'Copy failed')
    }
  }

  const taskErrorText = (task: AgentGenerationTask) => {
    if (task.error_code) return t(localeKeyForErrorCode(task.error_code))
    return task.error_message || ''
  }

  const gotoRecharge = () => {
    ws.showAccount?.('platform')
  }

  const videoPlaybackSrc = (task: AgentGenerationTask, rawSrc: string, index: number) => {
    const local = videoObjectUrls[videoKey(task, index)]
    if (local) return local
    if (artifactNeedsAuthFetch(rawSrc)) return ''
    return rawSrc.includes('generativelanguage.googleapis.com') ? '' : rawSrc
  }

  const videoPlaybackState = (task: AgentGenerationTask, index: number) => {
    const key = videoKey(task, index)
    if (videoErrors[key]) return videoErrors[key]
    if (videoLoading[key]) return '视频文件准备中...'
    return ''
  }

  const markVideoElementLoading = (task: AgentGenerationTask, index: number) => {
    const key = videoKey(task, index)
    if (videoObjectUrls[key])
      return
    setVideoLoading((prev) => ({ ...prev, [key]: true }))
  }

  const markVideoElementReady = (task: AgentGenerationTask, index: number) => {
    const key = videoKey(task, index)
    setVideoLoading((prev) => {
      const rest = { ...prev }
      delete rest[key]
      return rest
    })
    setVideoErrors((prev) => {
      const rest = { ...prev }
      delete rest[key]
      return rest
    })
  }

  const markVideoElementError = (task: AgentGenerationTask, index: number) => {
    const key = videoKey(task, index)
    setVideoLoading((prev) => {
      const rest = { ...prev }
      delete rest[key]
      return rest
    })
    setVideoErrors((prev) => ({ ...prev, [key]: '视频加载失败，可刷新任务或稍后重试' }))
  }

  const imageDisplaySrc = (task: AgentGenerationTask, item: any, index: number) => {
    const key = videoKey(task, index)
    const cached = imageObjectUrls[key]
    if (cached) return cached
    const direct = artifactSrc(task, item, index)
    if (direct && !artifactNeedsAuthFetch(direct)) return direct
    return ''
  }

  return (
    <>
      <div ref={scrollerRef} className="chat-scroller">
        {hasMessages ? (
	          messages.map((m, messageIndex) => {
	            const renderedText = renderMessageText(m, locale)
	            const progressText = m.role === 'assistant' ? protocolProgressText(m.content || '') : ''
	            const progressOnly = Boolean(progressText && renderedText === progressText)
	            const visibleText = m.role === 'assistant' ? (typewriterText[m.id] ?? renderedText) : renderedText
	            const isStreaming = isStreamingMessage(m)
	            const isTypewriting = m.role === 'assistant' && typewriterText[m.id] != null && visibleText !== renderedText
	            const routePayload = m.role === 'assistant' && !isTypewriting ? extractRoutePayload(m.content || '') : null
            const generationTasks = m.generation_tasks || []
            const runtimeArtifacts = m.role === 'assistant' ? messageArtifacts(m) : []
            const displayUserMaterials = m.role === 'user'
              ? conversationMaterialsForMessage(messages, messageIndex)
              : []
            const displayAttachments = (m.attachments || []).filter(att =>
              !(m.role === 'assistant' && generationTasks.length > 0 && att.source === 'ai_output' && isVideoAttachment(att)),
            )
	            const createdAt = m.created_at || m.updated_at
	            const messageTime = formatMessageTime(createdAt, locale)
	            const thinkingText = messageThinkingText(m, now, locale)
	            const showCopy = m.role === 'assistant' && renderedText.trim() && !progressOnly
	            return (
	              <div key={m.id} className={`msg-row is-${m.role}`}>
	                <div className="msg-col">
                  <div className="msg-meta">
                    <span className="msg-role">{m.role === 'assistant' ? 'xiaoone' : '我'}</span>
                    {messageTime && <time className="msg-time" dateTime={createdAt}>{messageTime}</time>}
                    {thinkingText && <span className="msg-thinking">{thinkingText}</span>}
                    {showCopy && (
                      <button
                        type="button"
                        className={`msg-copy-btn msg-copy-btn--meta ${copiedMessageId === m.id ? 'is-copied' : ''}`}
                        onClick={() => void copyMessageText(m.id, renderedText)}
                        aria-label={locale === 'zh' ? '复制文案' : 'Copy message'}
                        title={locale === 'zh' ? '复制文案' : 'Copy message'}
                      >
                        {copiedMessageId === m.id ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
	                  {(!progressOnly || !progressText) && (
	                    <div className={`msg-bubble ${(isStreaming || isTypewriting) ? 'is-streaming' : ''}`}>
	                      {visibleText ? (
	                      <pre>{visibleText}</pre>
	                      ) : isStreaming ? (
	                        <TypingDots label={t('common.gen.typing')} />
	                      ) : (
	                        <pre />
	                      )}
	                    </div>
	                  )}
	                  {progressText && (
	                    <div className={`msg-progress-card ${(isStreaming || isTypewriting) ? 'is-live' : ''}`}>
	                      <span className="msg-progress-icon" aria-hidden="true">
	                        <ListChecks size={15} />
	                      </span>
	                      <span>{progressText}</span>
	                    </div>
	                  )}
	                  {generationTasks.length > 0 && (
                    <div className="task-stack">
                      {generationTasks.map((task) => {
                        const live = isLiveTask(task, isStreaming || isTypewriting)
                        const liveDraft = task.status === 'draft' && live
                        const progress = taskProgressValue(task, now, createdAt)
                        const progressStateClass = task.status === 'succeeded' ? 'is-complete' : ''
                        const videos = task.modality === 'video' ? taskVideos(task) : []
                        const artifacts = taskArtifacts(task)
                        const hasArtifacts = artifacts.length > 0 || videos.length > 0
                        const optionsLabel = taskOptionsLabel(task, locale)
                        return (
                          <div key={task.id} className={`task-card is-${task.status} is-${task.modality} ${live ? 'is-live' : ''}`}>
                            <div className="task-head">
                              <div>
                                <strong>{taskTitle(task, locale)}</strong>
                                <small>{task.provider} · {task.model_key}</small>
                              </div>
                              <span className="task-status">{taskStatusLabel(task.status, locale, liveDraft)}</span>
                            </div>
                            <div className="task-live">
                              <div className="task-live-main">
                                <Icon name={task.modality === 'image' ? 'image' : 'video'} size={16} />
                                <span>{taskLiveDetail(task, now, locale, liveDraft, createdAt)}</span>
                              </div>
                              {live && (
                                <small>{task.modality === 'image' ? '生成画面已开始循环预览，完成后会替换为真实图片' : '自动刷新中，完成后会直接出现在这里'}</small>
                              )}
                              {optionsLabel && <small className="task-options">{optionsLabel}</small>}
                            </div>
                            {(live || task.status === 'succeeded') && (
                              <div className={`task-progress ${progressStateClass}`} aria-label={`生成进度 ${progress}%`}>
                                <span style={{ width: `${progress}%` }} />
                              </div>
                            )}
                            {live && (
                              <div className="task-progress-meta">
                                <span>{`${progress}%`}</span>
                                <span>{taskProgressMeta(task, liveDraft)}</span>
                              </div>
                            )}
                            {task.status === 'failed' && taskErrorText(task) ? (
                              <p className="task-error">{taskErrorText(task)}</p>
                            ) : task.error_message ? (
                              <p className="task-error">{task.error_message}</p>
                            ) : null}

                            {task.status === 'failed' ? (
                              <div className="task-actions">
                                {actionsForErrorCode(task.error_code, task).map((action) => {
                                  if (action === 'refresh') return <button key={action} type="button" onClick={() => onRefreshTask?.(task)}>{t('agent.gen.action.refresh')}</button>
                                  if (action === 'retry') return <button key={action} type="button" onClick={() => onRetryTask?.(task)}>{t('agent.gen.action.retry')}</button>
                                  if (action === 'copyPrompt') return <button key={action} type="button" onClick={() => void copyTaskPrompt(task)}>{t('agent.gen.action.copyPrompt')}</button>
                                  if (action === 'recharge') return <button key={action} type="button" onClick={gotoRecharge}>{t('agent.gen.action.recharge')}</button>
                                  return null
                                })}
                              </div>
                            ) : live ? (
                              <div className="task-actions">
                                <button type="button" onClick={() => onRefreshTask?.(task)}>立即刷新</button>
                              </div>
                            ) : null}

                            {live && !hasArtifacts && (
                              <div className={`task-preview is-${task.modality}`}>
                                {task.modality === 'image' ? (
                                  <>
                                    <div className="task-preview-frame frame-1" />
                                    <div className="task-preview-frame frame-2" />
                                    <div className="task-preview-frame frame-3" />
                                    <div className="task-preview-frame frame-4" />
                                    <div className="task-preview-grain" />
                                    <div className="task-preview-scan" />
                                  </>
                                ) : (
                                  <>
                                    <div className="task-preview-blur" />
                                    <div className="task-preview-shine" />
                                  </>
                                )}
                              </div>
                            )}

                            {task.modality === 'image' && artifacts.length > 0 && (
                              <div className="task-images">
                                {artifacts.map((item, idx) => {
                                  const src = imageDisplaySrc(task, item, idx)
                                  const key = videoKey(task, idx)
                                  const role = item?.role
                                  const roleLabel = item?.role_label
                                  const previewName = roleLabel || uiT(locale, 'common.gen.image')
                                  const canPreview = Boolean(src) && !imageErrors[key]
                                  return (
                                    <div key={idx} className="task-image-item" data-role={role || ''}>
                                      <button
                                        type="button"
                                        className="task-image-open"
                                        onClick={() => {
                                          if (!canPreview) return
                                          setImagePreview({ url: src, name: previewName })
                                        }}
                                        disabled={!canPreview}
                                        aria-label={locale === 'zh' ? `查看图片：${previewName}` : `View image: ${previewName}`}
                                      >
                                        <AsyncImage
                                          src={src || undefined}
                                          alt={previewName}
                                          frameClassName="task-image-frame"
                                          pending={Boolean(imageLoading[key]) || (!src && !imageErrors[key])}
                                          failed={Boolean(imageErrors[key])}
                                          loadingLabel={uiT(locale, 'common.image.loading')}
                                          failedLabel={imageErrors[key] || uiT(locale, 'common.image.loadFailed')}
                                        />
                                      </button>
                                      {roleLabel ? <span className="task-image-role-label">{roleLabel}</span> : null}
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* 用这些图生成视频：暂时隐藏 */}

                            {task.modality === 'video' && videos.length > 0 && (
                              <div className="task-videos">
                                {videos.map((src, idx) => (
                                  <div key={`${task.id}-${idx}-${src}`} className="task-video-item">
                                    {(() => {
                                      const state = videoPlaybackState(task, idx)
                                      return (
                                        <>
                                    <video
                                      controls
                                      playsInline
                                      preload="metadata"
                                      src={videoPlaybackSrc(task, src, idx)}
                                      onLoadStart={() => markVideoElementLoading(task, idx)}
                                      onLoadedMetadata={() => markVideoElementReady(task, idx)}
                                      onCanPlay={() => markVideoElementReady(task, idx)}
                                      onError={() => markVideoElementError(task, idx)}
                                    />
                                          {state && (
                                            <p className="task-video-state">{state}</p>
                                          )}
                                          {state && (
                                            <div className="task-actions">
                                              <button type="button" onClick={() => onRefreshTask?.(task)}>重试加载视频</button>
                                            </div>
                                          )}
                                        </>
                                      )
                                    })()}
                                  </div>
                                ))}
                              </div>
                            )}

                            {task.modality === 'video' && task.status === 'succeeded' && videos.length === 0 && (
                              <div className="task-actions">
                                <button type="button" onClick={() => onRefreshTask?.(task)}>加载视频</button>
                              </div>
                            )}

                            {task.upstream_task_id && (
                              <div className="task-meta">
                                任务 ID：{task.upstream_task_id}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {routePayload && (
                    <div className="route-chip-wrap">
                      <button type="button" className="route-chip" onClick={() => triggerRoute(m)}>
                        <Icon name="link" size={12} />
                        {routeBadgeText(routePayload.routeTo, locale)}
                      </button>
                      {routePayload.reason && (
                        <small>{routePayload.reason}</small>
                      )}
                    </div>
                  )}
                  {m.role === 'assistant' && notifyStatusByMessageId?.[m.id] && (
                    <div className="route-chip-wrap">
                      <span className="route-chip">
                        <Icon name="send" size={12} />
                        {notifyChannelLabel(notifyStatusByMessageId[m.id].target, locale)}
                      </span>
                      <small>Hermes Agent · {notifyStatusByMessageId[m.id].status}</small>
                    </div>
                  )}
                {runtimeArtifacts.length > 0 && (
                  <div className="msg-files">
                    {runtimeArtifacts.map((artifact, idx) => (
                      domain === 'support' ? (
                        // In the PPT domain the preview pane in the right panel handles download;
                        // show a lightweight indicator instead of a duplicate download button.
                        <div key={`${m.id}-artifact-${idx}`} className="msg-file msg-file--ppt-hint">
                          <Icon name="package" size={20} />
                          <div>
                            <strong>{artifact.name || 'presentation.pptx'}</strong>
                            <small>{fileSize(artifact.size || 0)} · PPTX</small>
                            <small className="msg-file-hint">请在右侧预览面板下载</small>
                          </div>
                        </div>
                      ) : (
                        <button
                          key={`${m.id}-artifact-${idx}`}
                          type="button"
                          className="msg-file"
                          onClick={() => void downloadMessageArtifact(m, artifact, idx)}
                        >
                          <Icon name="package" size={20} />
                          <div>
                            <strong>{artifact.name || 'presentation.pptx'}</strong>
                            <small>{fileSize(artifact.size || 0)} · {artifact.mime_type || artifact.content_type || 'PPTX'}</small>
                            <small className="msg-file-hint">点击下载</small>
                          </div>
                        </button>
                      )
                    ))}
                  </div>
                )}
                {m.role === 'user' && displayUserMaterials.length > 0 && (
                  <div className="msg-material-bar" aria-label={locale === 'zh' ? '已发送素材' : 'Sent materials'}>
                    {displayUserMaterials.map((material, materialIndex) => (
                      <article key={material.key} className="msg-material-card">
                        <button
                          type="button"
                          className="msg-material-card__body"
                          onClick={() => void openMaterial(material)}
                          title={materialCardLabel(material, materialIndex)}
                        >
                          <span className="msg-material-card__preview" aria-hidden="true">
                            {renderUserMaterialPreview(
                              material,
                              attachmentImageUrls,
                              attachmentVideoUrls,
                              attachmentImageLoading,
                              attachmentImageErrors,
                              locale,
                            )}
                          </span>
                          <span className="msg-material-card__label">{materialCardLabel(material, materialIndex)}</span>
                        </button>
                      </article>
                    ))}
                  </div>
                )}
                {m.role !== 'user' && displayAttachments.length > 0 && (
                  <div className="msg-files">
                      {displayAttachments.map((att) =>
                        isImageAttachment(att) ? (
                          <button key={att.id} type="button" className="msg-image-link" onClick={() => openAttachment(att)}>
                            <AsyncImage
                              src={imageAttachmentPreviewUrl(att, attachmentImageUrls) || undefined}
                              alt={att.name}
                              pending={Boolean(attachmentImageLoading[att.id]) || (!imageAttachmentPreviewUrl(att, attachmentImageUrls) && !attachmentImageErrors[att.id] && !isLocalAttachment(att))}
                              failed={Boolean(attachmentImageErrors[att.id])}
                              loadingLabel={uiT(locale, 'common.image.loading')}
                              failedLabel={uiT(locale, 'common.image.loadFailed')}
                            />
                          </button>
                        ) : isVideoAttachment(att) ? (
                          <div key={att.id} className="msg-video-link">
                            {videoAttachmentPreviewUrl(att, attachmentVideoUrls) ? (
                              <video
                                src={videoAttachmentPreviewUrl(att, attachmentVideoUrls)}
                                controls
                                preload="metadata"
                                playsInline
                              />
                            ) : (
                              <span>视频加载中</span>
                            )}
                            <div className="msg-video-meta">
                              <strong>{att.name}</strong>
                              <small>{fileSize(att.size)} · {att.content_type || 'video/mp4'}</small>
                            </div>
                          </div>
                        ) : (
                          <button key={att.id} type="button" className="msg-file" onClick={() => openAttachment(att)}>
                            <Icon name="package" size={20} />
                            <div>
                              <strong>{att.name}</strong>
                              <small>{fileSize(att.size)} · {att.content_type || '未知类型'}</small>
                              <small className="msg-file-hint">点击下载</small>
                            </div>
                          </button>
                        )
                      )}
                  </div>
                )}
              </div>
            </div>
          )})
        ) : children}
      </div>

      <Dialog open={!!imagePreview} onOpenChange={(open) => !open && setImagePreview(null)}>
        <DialogContent className="max-w-[min(920px,94vw)]">
          <DialogHeader>
            <DialogTitle>{imagePreview?.name || '图片预览'}</DialogTitle>
          </DialogHeader>
          {imagePreview && <img className="agent-preview-img" src={imagePreview.url} alt={imagePreview.name} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!downloadFile} onOpenChange={(open) => !open && setDownloadFile(null)}>
        <DialogContent className="max-w-[min(460px,92vw)]">
          <DialogHeader>
            <DialogTitle>文件下载</DialogTitle>
          </DialogHeader>
          {downloadFile && (
            <div className="agent-file-detail">
              <Icon name="package" size={22} />
              <div>
                <strong>{downloadFile.name}</strong>
                <small>{fileSize(downloadFile.size)} · {downloadFile.content_type || '未知类型'}</small>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadFile(null)}>取消</Button>
            {downloadFile && <Button onClick={() => void downloadAttachment(downloadFile)}>下载</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!textFile} onOpenChange={(open) => !open && setTextFile(null)}>
        <DialogContent className="max-w-[min(860px,92vw)]">
          <DialogHeader>
            <DialogTitle>{textFile?.name || '文本文件'}</DialogTitle>
          </DialogHeader>
          {textLoading ? (
            <div className="agent-text-loading">加载中...</div>
          ) : (
            <pre className="agent-text-content">{textContent}</pre>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTextFile(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
