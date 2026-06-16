import type {
  AgentAttachment,
  AgentDomain,
  AgentGenerationTask,
  AgentMessage,
  AgentModelAvailability,
  AgentThread,
  AgentThreadDetail,
} from '@xiaoone/chat-kit'
import type { Locale } from '../i18n/types'
import { compactCommerceBrief, imageDimensions, normalizeImageSizeForGeneration, type ImageGenerationOptions, type PptComposerOptions, type VideoGenerationOptions, type VideoReferenceImage } from '../components/XiaooneComposer'
import { isSupportedReferenceImage } from '../lib/imageUploadFormats'
import { arkAssetUrl, normalizeArkAssetId } from '../lib/arkVirtualPortraits'
import type { RouteSuggestionPayload } from '../components/ChatStream'
import {
  definitionForModule,
  resolveWorkbenchRoute,
  routeForMarketingMode,
  type MarketingRouteMode,
} from '../app/workbenchRouteModel'
import {
  defaultGenerationModelForBusiness,
  defaultModeForBusiness,
  defaultModelForBusiness,
  defaultPluginForBusiness,
  LEGACY_MARKETING_PLATFORM_PLUGIN_KEYS,
  MARKETING_IMAGE_MODEL_KEYS,
  MARKETING_REASONING_MODEL_KEYS,
  MARKETING_VIDEO_MODEL_KEYS,
  getModels,
  XIAOONE_ARK_CHAT_MODEL_KEYS,
  type BusinessKey,
} from '../lib/composer'
import {
  getArkVideoTemplateCategoryLabels,
  getArkVideoTemplates,
  type ArkVideoTemplateSelection,
} from '../lib/arkTemplates'
import type { IconName } from '../components/Icon'
import { sanitizeAgentAssistantText } from '../lib/agentProtocolText'
import { uiT, uiTpl } from '../i18n/catalogResolve'
import { MODULES } from '../app/moduleRegistry'
import { routeForModule } from '../app/workbenchRouteModel'
import { AUTOMATION_AGENT_PLUGIN_KEYS } from '../lib/composer'


export const XIAOWAN_ASSISTANT_PLUGIN_KEY = 'xiaowan-asst'
export const XIAOWAN_CONSULTANT_PLUGIN_KEY = 'consultant'
export const XIAOWAN_WORKSPACE_MODE_KEY = 'xiaowan'
export const XIAOWAN_ARK_MODE_KEY = 'ark_chat'
export const ACTIVE_GENERATION_STATUSES = new Set(['submitted', 'queued', 'running'])
export const DEFAULT_VIDEO_OPTIONS: VideoGenerationOptions = {
  style_mode: 'rich',
  frame_mode: 'first',
  ratio: 'auto',
  resolution: '720p',
  duration: 5,
  count: 1,
  generate_audio: true,
}
export const DEFAULT_IMAGE_OPTIONS: ImageGenerationOptions = {
  style_mode: 'rich',
  group_mode: 'auto',
  resolution: '2K',
  ratio: '1:1',
  width: 2048,
  height: 2048,
  count: 1,
}

export function normalizeVideoTemplateState(raw: unknown, locale: Locale): ArkVideoTemplateSelection | null {
  if (!raw || typeof raw !== 'object')
    return null
  const value = raw as Partial<ArkVideoTemplateSelection>
  const id = String(value.id || '').trim()
  const label = String(value.label || '').trim()
  const category = value.category
  const virtualPortraitPolicy = value.virtualPortraitPolicy
  if (!id || !label)
    return null
  const known = getArkVideoTemplates(locale).find(template => template.id === id)
  if (known) {
    return {
      id: known.id,
      label: known.label,
      category: known.category,
      virtualPortraitPolicy: known.virtualPortraitPolicy,
    }
  }
  if (
    category !== 'clean'
    && category !== 'commerce'
    && category !== 'portrait'
    && category !== 'brand'
    && category !== 'social'
  ) {
    return null
  }
  if (virtualPortraitPolicy !== 'allowed' && virtualPortraitPolicy !== 'blocked')
    return null
  return { id, label, category, virtualPortraitPolicy }
}

export function videoTemplateFromThread(
  thread: AgentThread | AgentThreadDetail | null | undefined,
  locale: Locale,
): ArkVideoTemplateSelection | null {
  return normalizeVideoTemplateState(thread?.composer_state?.video_template, locale)
}

export function selectedArkVirtualPortraitFromOptions(options: VideoGenerationOptions): NonNullable<VideoGenerationOptions['reference_images']>[number] | null {
  const refs = options.reference_images || []
  for (const item of refs) {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    if (item?.source === 'ark_virtual_portrait' || url.startsWith('asset://'))
      return item
  }
  return null
}

const TEMPLATE_INTENT_MARKER = '【模板意图】'

function stripTemplateIntentBlock(text: string) {
  const markerIndex = text.indexOf(TEMPLATE_INTENT_MARKER)
  if (markerIndex < 0)
    return text.trim()
  return text.slice(0, markerIndex).trim()
}


export function selectedArkVirtualPortraitFromImageOptions(options?: ImageGenerationOptions | null): VideoReferenceImage | null {
  const refs = options?.reference_images || []
  for (const item of refs) {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    if (item?.source === 'ark_virtual_portrait' || url.startsWith('asset://'))
      return item
  }
  const assetId = normalizeArkAssetId(options?.virtual_portrait?.asset_id)
  if (!assetId)
    return null
  return {
    url: arkAssetUrl(assetId),
    role: 'reference_image',
    name: options?.virtual_portrait?.label,
    source: 'ark_virtual_portrait',
  }
}

type CreativeLayerModality = 'image' | 'video'

function buildCreativeLayerLines(params: {
  hasReferenceAttachments: boolean
  locale: Locale
  modality: CreativeLayerModality
}): string[] {
  if (!params.hasReferenceAttachments)
    return []
  const refLine = params.modality === 'video'
    ? (params.locale === 'en'
      ? 'User-uploaded images/videos/audio are the primary basis for this creation; subject, scene, and action should come from the actual uploaded assets and the user text. First/last frame assets follow their frame roles.'
      : '用户上传的图片/视频/音频是本次内容的主要依据，画面主体、场景、动作应优先来自素材实际内容与用户文字需求；首帧/尾帧素材按其镜头角色使用。')
    : (params.locale === 'en'
      ? 'User-uploaded images/videos/audio are the primary basis for this creation; subject, scene, and composition should come from the actual uploaded assets and the user text.'
      : '用户上传的图片/视频/音频是本次内容的主要依据，画面主体、场景、构图应优先来自素材实际内容与用户文字需求。')
  return [refLine]
}

export function composeMarketingImagePrompt(params: {
  content: string
  imageOptions: ImageGenerationOptions
  hasReferenceAttachments: boolean
  locale: Locale
}): string {
  const content = stripTemplateIntentBlock(params.content)
  if (params.imageOptions.style_mode === 'clean')
    return content
  const lines = buildCreativeLayerLines({
    hasReferenceAttachments: params.hasReferenceAttachments,
    locale: params.locale,
    modality: 'image',
  })
  if (!lines.length)
    return content
  const userNeed = params.locale === 'en'
    ? `User generation request: ${content || 'Generate an image from the current references.'}`
    : `用户生成需求：${content || '请根据当前参考素材生成图片'}`
  return `${lines.join('\n')}\n\n${userNeed}`
}

export function composeMarketingVideoPrompt(params: {
  content: string
  videoTemplate: ArkVideoTemplateSelection | null
  videoOptions: VideoGenerationOptions
  hasReferenceAttachments: boolean
  locale: Locale
}): string {
  const content = stripTemplateIntentBlock(params.content)
  if (params.videoOptions.style_mode === 'clean')
    return content
  const lines: string[] = []
  if (params.videoTemplate) {
    const categoryLabels = getArkVideoTemplateCategoryLabels(params.locale)
    const templatePrefix = params.locale === 'en' ? 'Video template' : '视频模板'
    const templateSuffix = params.locale === 'en'
      ? 'Keep this template\'s shot structure, pacing, and visual intent.'
      : '请保持该模板的镜头结构、节奏和画面意图。'
    lines.push(`${templatePrefix}: ${categoryLabels[params.videoTemplate.category]} / ${params.videoTemplate.label}. ${templateSuffix}`)
    const fullTemplate = getArkVideoTemplates(params.locale).find(item => item.id === params.videoTemplate?.id)
    if (fullTemplate?.prompt?.trim())
      lines.push(fullTemplate.prompt.trim())
  }
  lines.push(...buildCreativeLayerLines({
    hasReferenceAttachments: params.hasReferenceAttachments,
    locale: params.locale,
    modality: 'video',
  }))
  if (!lines.length)
    return content
  const userNeed = params.locale === 'en'
    ? `User generation request: ${content || 'Generate a video from the current reference assets.'}`
    : `用户生成需求：${content || '请根据当前参考素材生成视频'}`
  return `${lines.join('\n')}\n\n${userNeed}`
}

export function isMarketingMediaSubmitCommand(content: string) {
  const text = (content || '').trim().toLowerCase()
  if (!text)
    return false
  const isQuestion = ['吗', '？', '?', '是否', '要不要'].some(word => text.includes(word))
  if (isQuestion || ['不需要', '不用', '需要', '不生成', '先不', '不要', '取消', '等等', '等一下', '改', '修改', '调整'].some(word => text.includes(word)))
    return false
  const normalized = text.replace(/^[\s。.!！]+|[\s。.!！]+$/g, '')
  const exactSubmitPhrases = new Set([
    '确认',
    '确定',
    '开始',
    '可以',
    '行',
    '好',
    '好的',
    'ok',
    '生成',
    '开始吧',
    '可以了',
    '就这样生成',
    '按这个生成',
    '按这个做',
    '来一套',
    '做一套',
    '出一套',
    '立即生成',
    '马上生成',
    '开始执行',
    '执行',
    '提交',
    'submit',
    'go',
    '没问题',
    '就这样',
    'go ahead',
    'confirm',
    'generate now',
  ])
  if (exactSubmitPhrases.has(normalized))
    return true
  return ['开始生成', '确认生成', '直接生成', '现在生成', '生成吧', '立即生成', '马上生成', '按这个生成'].some(word => text.includes(word))
}
export const DEFAULT_PPT_OPTIONS: PptComposerOptions = {
  template: 'work_report',
  ratio: '16:9',
  slides: 12,
  tone: 'business',
}
const MARKETING_COMPOSER_PREFS_KEY = 'xiaoone-marketing-composer-prefs-v1'
const PPT_COMPOSER_PREFS_KEY = 'xiaoone-ppt-composer-prefs-v1'

type MarketingComposerPrefs = {
  reasoningModelByMode?: Partial<Record<MarketingRouteMode, string>>
  generationModelByMode?: Partial<Record<'image' | 'video', string>>
  imageOptions?: Partial<ImageGenerationOptions>
  videoOptions?: Partial<VideoGenerationOptions>
  targetLanguage?: string
}

export type MarketingComposerSessionState = {
  imageOptions?: Partial<ImageGenerationOptions>
  videoOptions?: Partial<VideoGenerationOptions>
  targetLanguage?: string
  videoTemplate?: ArkVideoTemplateSelection | null
}

export const MARKETING_REASONING_MODEL_SET = new Set<string>(MARKETING_REASONING_MODEL_KEYS)
export const MARKETING_IMAGE_MODEL_SET = new Set<string>(MARKETING_IMAGE_MODEL_KEYS)
export const MARKETING_VIDEO_MODEL_SET = new Set<string>(MARKETING_VIDEO_MODEL_KEYS)
const IMAGE_RATIO_SET = new Set<ImageGenerationOptions['ratio']>(['auto', '1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9'])

function readMarketingComposerPrefs(): MarketingComposerPrefs {
  if (typeof window === 'undefined')
    return {}
  try {
    const raw = window.localStorage.getItem(MARKETING_COMPOSER_PREFS_KEY)
    if (!raw)
      return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function writeMarketingComposerPrefs(patch: MarketingComposerPrefs) {
  if (typeof window === 'undefined')
    return
  try {
    const current = readMarketingComposerPrefs()
    const next: MarketingComposerPrefs = {
      ...current,
      ...patch,
      reasoningModelByMode: {
        ...(current.reasoningModelByMode || {}),
        ...(patch.reasoningModelByMode || {}),
      },
      generationModelByMode: {
        ...(current.generationModelByMode || {}),
        ...(patch.generationModelByMode || {}),
      },
    }
    window.localStorage.setItem(MARKETING_COMPOSER_PREFS_KEY, JSON.stringify(next))
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

export function normalizeCopyTargetLanguage(value?: unknown): string {
  const normalized = String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, 80) : 'auto'
}

export function preferredCopyTargetLanguage(): string {
  return normalizeCopyTargetLanguage(readMarketingComposerPrefs().targetLanguage || 'auto')
}

function preferredMarketingReasoningModel(modeKey: string | null | undefined, fallback: string | null): string | null {
  const normalized = normalizeMarketingMode(modeKey)
  const saved = readMarketingComposerPrefs().reasoningModelByMode?.[normalized]
  if (saved && MARKETING_REASONING_MODEL_SET.has(saved))
    return saved
  if (fallback && MARKETING_REASONING_MODEL_SET.has(fallback))
    return fallback
  return defaultModelForBusiness('marketing', normalized, defaultPluginForBusiness('marketing', normalized))
}

function preferredMarketingGenerationModel(modeKey: string | null | undefined, fallback?: string | null): string | null {
  const normalized = normalizeMarketingMode(modeKey)
  if (normalized !== 'image' && normalized !== 'video')
    return null
  const saved = readMarketingComposerPrefs().generationModelByMode?.[normalized]
  const allowed = normalized === 'image' ? MARKETING_IMAGE_MODEL_SET : MARKETING_VIDEO_MODEL_SET
  if (saved && allowed.has(saved))
    return saved
  if (fallback && allowed.has(fallback))
    return fallback
  return defaultGenerationModelForBusiness('marketing', normalized)
}

export function preferredModelForBusiness(key: BusinessKey, modeKey: string | null | undefined, pluginKey: string | null | undefined, fallback?: string | null): string | null {
  if (key === 'marketing')
    return preferredMarketingReasoningModel(modeKey, fallback || defaultModelForBusiness(key, modeKey, pluginKey))
  return fallback || defaultModelForBusiness(key, modeKey, pluginKey)
}

export function preferredGenerationModelForBusiness(key: BusinessKey, modeKey: string | null | undefined): string | null {
  if (key === 'marketing')
    return preferredMarketingGenerationModel(modeKey)
  return defaultGenerationModelForBusiness(key, modeKey)
}

export function normalizeImageOptions(options?: Partial<ImageGenerationOptions> | null): ImageGenerationOptions {
  const merged = { ...DEFAULT_IMAGE_OPTIONS, ...(options || {}) }
  const groupMode = merged.group_mode === 'storybook' || merged.group_mode === 'comic'
    ? merged.group_mode
    : 'auto'
  let count = Math.max(1, Math.min(15, Math.round(Number(merged.count) || DEFAULT_IMAGE_OPTIONS.count)))
  const roleCountsRaw = options?.role_counts
  let roleCounts: Record<string, number> | undefined
  if (roleCountsRaw && typeof roleCountsRaw === 'object') {
    const parsed: Record<string, number> = {}
    for (const [key, value] of Object.entries(roleCountsRaw)) {
      const role = String(key || '').trim()
      const nextCount = Math.max(0, Math.min(15, Math.round(Number(value) || 0)))
      if (role && nextCount > 0)
        parsed[role] = nextCount
    }
    const total = Object.values(parsed).reduce((sum, value) => sum + value, 0)
    if (total > 0) {
      roleCounts = parsed
      count = Math.max(1, Math.min(15, total))
    }
  }
  const resolution: ImageGenerationOptions['resolution'] = merged.resolution === '4K' ? '4K' : '2K'
  const ratio: ImageGenerationOptions['ratio'] = IMAGE_RATIO_SET.has(merged.ratio as ImageGenerationOptions['ratio'])
    ? merged.ratio as ImageGenerationOptions['ratio']
    : DEFAULT_IMAGE_OPTIONS.ratio
  const fallbackSize = imageDimensions(resolution, ratio)
  const rawWidth = Number(merged.width)
  const rawHeight = Number(merged.height)
  const safeSize = normalizeImageSizeForGeneration(
    Number.isFinite(rawWidth) && rawWidth >= 64 && rawWidth <= 6000 ? rawWidth : fallbackSize.width,
    Number.isFinite(rawHeight) && rawHeight >= 64 && rawHeight <= 6000 ? rawHeight : fallbackSize.height,
  )
  const next: ImageGenerationOptions = {
    ...merged,
    style_mode: merged.style_mode === 'clean' ? 'clean' : 'rich',
    group_mode: groupMode,
    resolution,
    ratio,
    width: safeSize.width,
    height: safeSize.height,
    count,
  }
  if (roleCounts)
    next.role_counts = roleCounts
  else
    delete next.role_counts
  const commerceBrief = compactCommerceBrief(options?.commerce_brief)
  if (commerceBrief)
    next.commerce_brief = commerceBrief
  else
    delete next.commerce_brief
  return next
}

export function preferredImageOptions(): ImageGenerationOptions {
  const saved = readMarketingComposerPrefs().imageOptions || {}
  return normalizeImageOptions(saved)
}

export function preferredVideoOptions(): VideoGenerationOptions {
  const saved = readMarketingComposerPrefs().videoOptions || {}
  return stripTransientVideoReferenceOptions(normalizeVideoOptions(saved))
}

function normalizeVideoReferenceImages(items: unknown): VideoGenerationOptions['reference_images'] {
  if (!Array.isArray(items))
    return undefined
  const normalized = items.map((item) => {
    const current: Record<string, unknown> = item && typeof item === 'object' ? item as Record<string, unknown> : { url: item }
    const url = String(current.url || current.data_url || current.image_url || '').trim()
    if (!url.startsWith('asset://'))
      return null
    const rawRole = String(current.role || current.image_role || 'reference_image').trim()
    const role = rawRole === 'first_frame' || rawRole === 'last_frame' ? rawRole : 'reference_image'
    const coverUrl = String(current.cover_url || '').trim()
    return {
      url,
      role,
      name: String(current.name || '').trim() || undefined,
      source: String(current.source || '').trim() || undefined,
      ...(coverUrl ? { cover_url: coverUrl } : {}),
    }
  }).filter(Boolean) as NonNullable<VideoGenerationOptions['reference_images']>
  return normalized.length ? normalized.slice(0, 9) : undefined
}

export function normalizeVideoReferenceAssets(items: unknown): VideoGenerationOptions['reference_assets'] {
  if (!Array.isArray(items))
    return undefined
  const normalized = items.map((item) => {
    const current: Record<string, unknown> = item && typeof item === 'object' ? item as Record<string, unknown> : { asset_id: item }
    const assetId = String(current.asset_id || current.id || '').trim()
    if (!/^task:[^:]+:\d+$/.test(assetId))
      return null
    const role = String(current.role || '').trim()
    return {
      asset_id: assetId,
      ...(role ? { role } : {}),
    }
  }).filter(Boolean) as NonNullable<VideoGenerationOptions['reference_assets']>
  return normalized.length ? normalized.slice(0, 9) : undefined
}

export function parseVideoReferenceAssetsParam(raw: string): VideoGenerationOptions['reference_assets'] {
  const value = raw.trim()
  if (!value)
    return undefined
  try {
    return normalizeVideoReferenceAssets(JSON.parse(value))
  } catch {
    return undefined
  }
}

export function normalizeVideoOptions(options?: Partial<VideoGenerationOptions> | null): VideoGenerationOptions {
  const next: VideoGenerationOptions = {
    ...DEFAULT_VIDEO_OPTIONS,
    ...(options || {}),
    style_mode: options?.style_mode === 'clean' ? 'clean' : 'rich',
    frame_mode: 'first',
    count: 1,
  }
  const referenceImages = normalizeVideoReferenceImages(options?.reference_images)
  if (referenceImages)
    next.reference_images = referenceImages
  else
    delete next.reference_images
  const referenceAssets = normalizeVideoReferenceAssets(options?.reference_assets)
  if (referenceAssets)
    next.reference_assets = referenceAssets
  else
    delete next.reference_assets
  const commerceBrief = compactCommerceBrief(options?.commerce_brief)
  if (commerceBrief)
    next.commerce_brief = commerceBrief
  else
    delete next.commerce_brief
  return next
}

export function stripTransientVideoReferenceOptions(options: VideoGenerationOptions): VideoGenerationOptions {
  const next: VideoGenerationOptions = { ...options, count: 1 }
  const portraitRefs = (options.reference_images || []).filter(
    r => r?.source === 'ark_virtual_portrait' || String(r?.url || '').startsWith('asset://'),
  )
  if (portraitRefs.length)
    next.reference_images = portraitRefs
  else
    delete next.reference_images
  delete next.reference_assets
  return next
}

export function stripTransientImageSessionOptions(options: ImageGenerationOptions): ImageGenerationOptions {
  const next: ImageGenerationOptions = { ...options }
  delete next.reference_images
  delete next.virtual_portrait
  return next
}

export function composerSessionKeyForThread(threadKey: string | null | undefined, pathname: string) {
  return threadKey && !threadKey.startsWith('new:') ? `thread:${threadKey}` : `new:${pathname}`
}

export function imageOptionsFromComposerState(state: unknown): ImageGenerationOptions {
  const raw = state && typeof state === 'object' ? (state as Record<string, unknown>).image_options : null
  return normalizeImageOptions(raw && typeof raw === 'object' ? raw as Partial<ImageGenerationOptions> : {})
}

export function videoOptionsFromComposerState(state: unknown): VideoGenerationOptions {
  const raw = state && typeof state === 'object' ? (state as Record<string, unknown>).video_options : null
  return stripTransientVideoReferenceOptions(normalizeVideoOptions(raw && typeof raw === 'object' ? raw as Partial<VideoGenerationOptions> : {}))
}

export function targetLanguageFromComposerState(state: unknown): string {
  const raw = state && typeof state === 'object' ? (state as Record<string, unknown>).target_language : ''
  return normalizeCopyTargetLanguage(raw || 'auto')
}

export function marketingComposerStateForThreadCreate(params: {
  mode: string | null | undefined
  imageOptions: ImageGenerationOptions
  videoOptions: VideoGenerationOptions
  targetLanguage: string
  videoTemplate?: ArkVideoTemplateSelection | null
}) {
  const mode = normalizeMarketingMode(params.mode)
  const state: Record<string, unknown> = {
    target_language: normalizeCopyTargetLanguage(params.targetLanguage),
  }
  if (mode === 'image')
    state.image_options = stripTransientImageSessionOptions(params.imageOptions)
  if (mode === 'video') {
    state.video_options = stripTransientVideoReferenceOptions(params.videoOptions)
    if (params.videoTemplate)
      state.video_template = params.videoTemplate
  }
  return state
}

function readPptComposerPrefs(): Partial<PptComposerOptions> {
  if (typeof window === 'undefined')
    return {}
  try {
    const raw = window.localStorage.getItem(PPT_COMPOSER_PREFS_KEY)
    if (!raw)
      return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function preferredPptOptions(): PptComposerOptions {
  return { ...DEFAULT_PPT_OPTIONS, ...readPptComposerPrefs() }
}

export function writePptComposerPrefs(options: PptComposerOptions) {
  if (typeof window === 'undefined')
    return
  try {
    window.localStorage.setItem(PPT_COMPOSER_PREFS_KEY, JSON.stringify(options))
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function runtimeErrorMessage(raw: string) {
  const message = (raw || '').trim()
  if (!message.startsWith('{') || !message.endsWith('}')) return message
  try {
    const payload = JSON.parse(message)
    if (!payload || typeof payload !== 'object') return message
    const data = payload.data && typeof payload.data === 'object' ? payload.data : {}
    const candidates = [
      payload.message,
      payload.detail,
      payload.error,
      payload.error_code,
      data.message,
      data.detail,
      data.error,
      data.error_code,
    ]
    for (const item of candidates) {
      if (typeof item === 'string' && item.trim()) return item.trim()
    }
  } catch {
    return message
  }
  return message
}

export function assistantRuntimeErrorText(raw: string, errorCode = '', locale: Locale = 'zh') {
  const message = runtimeErrorMessage(raw)
  if (!message) return uiT(locale, 'common.agent.unavailable')
  const haystack = `${message} ${raw}`
  if (errorCode === 'insufficient_balance' || /insufficient[_ ]?(balance|points)|余额不足/i.test(`${message} ${raw}`)) {
    return uiT(locale, 'common.agent.insufficientBalance')
  }
  if (errorCode === 'model_unavailable' || /model[_ -]?unavailable|not authorized|forbidden|403|模型.*(无权限|未开通|未授权)/i.test(haystack)) {
    return uiT(locale, 'common.agent.modelUnavailable')
  }
  if (errorCode === 'bad_api_key') {
    return uiT(locale, 'common.agent.badCredentials')
  }
  if (
    errorCode === 'network_error'
    || /stream failed:\s*5\d\d/i.test(haystack)
    || /failed to fetch|networkerror|load failed|connection.*(closed|reset|aborted)|server disconnected|服务.*(重启|中断)/i.test(haystack)
  ) {
    return uiT(locale, 'common.agent.connectionLost')
  }
  if (errorCode === 'upstream_timeout' || /timeout|timed out|超时/i.test(haystack)) {
    return uiT(locale, 'common.agent.timeout')
  }
  if (/assistant runtime|endpoint unavailable|dispatch/i.test(message)) {
    return uiT(locale, 'common.agent.runtimeUnavailable')
  }
  return message
}

export function estimateTypewriterRefreshDelay(content: string) {
  const ticks = Array.from(content || '').length
  if (!ticks) return 0
  return Math.min(8000, Math.max(550, ticks * 22 + 180))
}

export function isPreviewableImage(file: File) {
  return isSupportedReferenceImage(file)
}

export function isPreviewableVideo(file: File) {
  const type = file.type.split(';')[0].trim().toLowerCase()
  const name = (file.name || '').toLowerCase()
  return type.startsWith('video/') || /\.(mp4|m4v|mov|webm)$/.test(name)
}


export function videoMaterialLabel(index: number) {
  return `素材${index}`
}

type OptimisticMaterialAttachment = AgentAttachment & {
  local_preview_url?: string
  source_reference_asset_id?: string
  reference_image_url?: string
}

function isMarketingPortraitReference(item?: VideoReferenceImage | null) {
  const url = typeof item?.url === 'string' ? item.url.trim() : ''
  return item?.source === 'ark_virtual_portrait' || url.startsWith('asset://')
}

export function listImagePortraitReferences(options?: Pick<ImageGenerationOptions, 'reference_images'> | null): VideoReferenceImage[] {
  return (options?.reference_images || []).filter(isMarketingPortraitReference)
}

export function listVideoPortraitReferences(options?: Pick<VideoGenerationOptions, 'reference_images'> | null): VideoReferenceImage[] {
  return (options?.reference_images || []).filter(isMarketingPortraitReference)
}

function buildMediaSendOptimisticAttachments(params: {
  threadId: string
  sendFiles: File[]
  portraitRefs: VideoReferenceImage[]
  createFileAttachment: (file: File, threadId: string, index: number) => AgentAttachment & { local_preview_url?: string }
}): {
  all: OptimisticMaterialAttachment[]
  portraits: OptimisticMaterialAttachment[]
  files: OptimisticMaterialAttachment[]
} {
  const portraits: OptimisticMaterialAttachment[] = []
  let materialIndex = 0
  for (const ref of params.portraitRefs) {
    const now = new Date().toISOString()
    const label = videoMaterialLabel(materialIndex + 1)
    const previewUrl = String(ref.cover_url || (String(ref.url || '').startsWith('http') ? ref.url : '')).trim()
    const assetId = normalizeArkAssetId(ref.asset_id || ref.url)
    const referenceUrl = String(ref.url || '').trim()
    portraits.push({
      id: `local:portrait:${Date.now()}:${materialIndex}`,
      merchant_id: 0,
      user_id: 0,
      thread: params.threadId,
      message: null,
      source: 'user_upload',
      name: ref.name || label,
      content_type: 'image/jpeg',
      size: 0,
      is_text: false,
      local_preview_url: previewUrl || undefined,
      source_reference_asset_id: assetId || undefined,
      reference_image_url: referenceUrl || undefined,
      created_at: now,
      updated_at: now,
    })
    materialIndex += 1
  }
  const files: OptimisticMaterialAttachment[] = params.sendFiles.map((file, fileIndex) => {
    const attachment = params.createFileAttachment(file, params.threadId, materialIndex + fileIndex)
    const label = videoMaterialLabel(materialIndex + fileIndex + 1)
    return { ...attachment, name: label }
  })
  return { all: [...portraits, ...files], portraits, files }
}

export function buildImageSendOptimisticAttachments(params: {
  threadId: string
  sendFiles: File[]
  imageOptions: ImageGenerationOptions
  createFileAttachment: (file: File, threadId: string, index: number) => AgentAttachment & { local_preview_url?: string }
}) {
  return buildMediaSendOptimisticAttachments({
    threadId: params.threadId,
    sendFiles: params.sendFiles,
    portraitRefs: listImagePortraitReferences(params.imageOptions),
    createFileAttachment: params.createFileAttachment,
  })
}

export function buildVideoSendOptimisticAttachments(params: {
  threadId: string
  sendFiles: File[]
  videoOptions: VideoGenerationOptions
  createFileAttachment: (file: File, threadId: string, index: number) => AgentAttachment & { local_preview_url?: string }
}) {
  return buildMediaSendOptimisticAttachments({
    threadId: params.threadId,
    sendFiles: params.sendFiles,
    portraitRefs: listVideoPortraitReferences(params.videoOptions),
    createFileAttachment: params.createFileAttachment,
  })
}

export function clearImageComposerMaterials(options: ImageGenerationOptions): ImageGenerationOptions {
  return stripTransientImageSessionOptions(normalizeImageOptions(options))
}

export function clearVideoComposerMaterials(options: VideoGenerationOptions): VideoGenerationOptions {
  const next = normalizeVideoOptions(options)
  delete next.reference_images
  delete next.reference_assets
  next.count = 1
  return next
}

export type MarketingExpertBadge = { label: string; icon: IconName }
export type XiaooneConversationClass = 'workspace' | 'ark'

export const ARK_CHAT_MODEL_SET = new Set<string>(XIAOONE_ARK_CHAT_MODEL_KEYS)

export function xiaooneConversationClassFromMode(modeKey?: string | null): XiaooneConversationClass {
  return (modeKey || '').trim() === XIAOWAN_WORKSPACE_MODE_KEY ? 'workspace' : 'ark'
}

export function resolveXiaooneConversationClass(raw?: string | null): XiaooneConversationClass | null {
  const value = (raw || '').trim().toLowerCase()
  if (value === 'workspace' || value === 'ark')
    return value
  if (value === 'tokenplan')
    return 'ark'
  return null
}

export function resolveRequestedArkModel(raw?: string | null): string | null {
  const requested = (raw || '').trim()
  if (requested && ARK_CHAT_MODEL_SET.has(requested))
    return requested
  return null
}

export function resolveArkModelKey(raw?: string | null): string {
  const requested = (raw || '').trim()
  if (requested && ARK_CHAT_MODEL_SET.has(requested))
    return requested
  return XIAOONE_ARK_CHAT_MODEL_KEYS[0]
}

export function modelLabel(key: string, locale: Locale) {
  return getModels(locale).find(item => item.key === key)?.label || key
}

function firstAvailableModelKey(keys: readonly string[], availability: Record<string, AgentModelAvailability>) {
  const candidates = Array.from(new Set(keys.filter(Boolean)))
  if (!candidates.length)
    return ''
  const hasAvailability = candidates.some(key => Boolean(availability[key]))
  if (!hasAvailability)
    return candidates[0]
  return candidates.find(key => availability[key]?.available === true) || ''
}

export function resolveAvailableModelKey(
  current: string | null | undefined,
  keys: readonly string[],
  availability: Record<string, AgentModelAvailability>,
) {
  const selected = (current || '').trim()
  const candidates = Array.from(new Set(keys.filter(Boolean)))
  if (!candidates.length)
    return selected
  const fallback = firstAvailableModelKey(candidates, availability)
  const hasAvailability = candidates.some(key => Boolean(availability[key]))
  if (!selected)
    return fallback
  if (!candidates.includes(selected))
    return fallback
  if (hasAvailability && availability[selected]?.available !== true)
    return fallback
  return selected
}

export const ROUTE_SUGGESTION_PATHS: Record<RouteSuggestionPayload['routeTo'], string> = {
  system: routeForModule('system'),
  marketing: routeForModule('marketingCopy'),
  support: routeForModule('support'),
  agency: routeForModule('agency'),
  feedback: routeForModule('feedback'),
}

export function resolveAgentRouteContext(pathname: string, search: string) {
  const route = resolveWorkbenchRoute(pathname, search)
  return route?.kind === 'agent' ? route : definitionForModule('marketingCopy')
}

export function resolveAgentTopbarIcon(
  entry: BusinessKey,
  routeMode: MarketingRouteMode | undefined,
  isAssistantEntry: boolean,
) {
  if (isAssistantEntry)
    return MODULES.newChat.icon
  if (entry === 'software')
    return MODULES.system.icon
  if (entry === 'automation')
    return MODULES.automation.icon
  if (entry === 'marketing') {
    if (routeMode === 'image')
      return MODULES.marketingImage.icon
    if (routeMode === 'video')
      return MODULES.marketingVideo.icon
    return MODULES.marketingCopy.icon
  }
  if (entry === 'support')
    return MODULES.support.icon
  if (entry === 'agency')
    return MODULES.agency.icon
  if (entry === 'feedback')
    return MODULES.feedback.icon
  return MODULES.consultant.icon
}

export function normalizeMarketingMode(modeKey?: string | null): MarketingRouteMode {
  return modeKey === 'image' || modeKey === 'video' ? modeKey : 'text'
}

const MARKETING_STATIC_PLUGIN_KEYS = new Set(LEGACY_MARKETING_PLATFORM_PLUGIN_KEYS)

export function defaultPluginForEntryMode(key: BusinessKey, modeKey?: string | null): string | null {
  return defaultPluginForBusiness(key, key === 'marketing' ? normalizeMarketingMode(modeKey) : modeKey)
}

export function normalizePluginForEntryMode(key: BusinessKey, modeKey: string | null | undefined, pluginKey?: string | null): string | null {
  const current = (pluginKey || '').trim()
  if (key === 'marketing') {
    if (current && !MARKETING_STATIC_PLUGIN_KEYS.has(current))
      return current
    return defaultPluginForEntryMode(key, modeKey)
  }
  return current || defaultPluginForEntryMode(key, modeKey)
}

export function createOptimisticGenerationTask(params: {
  id: string
  threadId: string
  messageId: string
  mode: MarketingRouteMode
  modelKey: string | null | undefined
  prompt: string
  imageOptions: ImageGenerationOptions
  videoOptions: VideoGenerationOptions
}): AgentGenerationTask | null {
  if (params.mode !== 'image' && params.mode !== 'video')
    return null
  const now = new Date().toISOString()
  const imageCommerceBrief = compactCommerceBrief(params.imageOptions.commerce_brief)
  const videoCommerceBrief = compactCommerceBrief(params.videoOptions.commerce_brief)
  const generationOptions = params.mode === 'image'
    ? {
        style_mode: params.imageOptions.style_mode,
        group_mode: params.imageOptions.group_mode,
        ratio: params.imageOptions.ratio,
        resolution: params.imageOptions.resolution,
        size: `${params.imageOptions.width}x${params.imageOptions.height}`,
        width: params.imageOptions.width,
        height: params.imageOptions.height,
        count: params.imageOptions.count,
        requested_count: params.imageOptions.count,
        ...(params.imageOptions.reference_images?.length ? { reference_images: params.imageOptions.reference_images } : {}),
        ...(params.imageOptions.virtual_portrait ? { virtual_portrait: params.imageOptions.virtual_portrait } : {}),
        ...(imageCommerceBrief ? { commerce_brief: imageCommerceBrief } : {}),
      }
    : {
        style_mode: params.videoOptions.style_mode,
        ratio: params.videoOptions.ratio,
        resolution: params.videoOptions.resolution,
        duration: params.videoOptions.duration,
        requested_count: 1,
        generate_audio: params.videoOptions.generate_audio,
        ...(params.videoOptions.reference_images?.length ? { reference_images: params.videoOptions.reference_images } : {}),
        ...(videoCommerceBrief ? { commerce_brief: videoCommerceBrief } : {}),
      }
  return {
    id: params.id,
    merchant_id: 0,
    user_id: 0,
    thread: params.threadId,
    message: params.messageId,
    provider: 'volcengine_ark',
    model_key: params.modelKey || (params.mode === 'image' ? 'seedream-5.0-lite' : 'seedance-2.0'),
    model: '',
    modality: params.mode,
    prompt: params.prompt,
    upstream_task_id: '',
    status: 'draft',
    progress: 4,
    result: { generation_options: generationOptions },
    raw_response: null,
    error_message: '',
    error_code: '',
    completed_at: null,
    created_at: now,
  updated_at: now,
  }
}

function hasMarketingMediaIntent(content: string, mode: MarketingRouteMode) {
  if (mode !== 'image' && mode !== 'video')
    return false
  const text = (content || '').trim().toLowerCase()
  if (!text)
    return false
  const normalized = text.replace(/^[\s。.!！]+|[\s。.!！]+$/g, '')
  if (['你好', '您好', 'hi', 'hello', 'hey', '在吗', '在不在', '早上好', '中午好', '下午好', '晚上好'].includes(normalized))
    return false
  const isQuestion = ['可以', '能不能', '多久', '怎么', '如何', '什么', '是否', '吗', '？', '?'].some(word => text.includes(word))
  const forceGenerate = ['开始生成', '确认生成', '直接生成', '现在生成', '生成吧'].some(word => text.includes(word))
  if (isQuestion && !forceGenerate)
    return false
  const mediaWords = [
    '生成',
    '画',
    '做一张',
    '出图',
    '图片',
    '照片',
    '海报',
    '封面',
    'banner',
    'logo',
    '修图',
    '视频',
    '剪辑',
    '镜头',
    '动画',
    '短片',
    '分镜',
    'generate',
    'image',
    'photo',
    'poster',
    'video',
  ]
  const editWords = ['改成', '去掉', '去除', '替换', '保留', '背景', '抠图', '调色', '放大', '缩小']
  if (mediaWords.some(word => text.includes(word)) || editWords.some(word => text.includes(word)))
    return true
  return Array.from(normalized).length >= 8
}

function marketingRouteForMode(modeKey?: string | null) {
  return routeForMarketingMode(normalizeMarketingMode(modeKey))
}

export function marketingExpertForMode(modeKey?: string | null, translate?: (key: string, fallback?: string) => string): MarketingExpertBadge {
  const normalized = normalizeMarketingMode(modeKey)
  if (normalized === 'image')
    return { label: translate?.('biz.marketing.image', '图片设计') || '图片设计', icon: 'image' }
  if (normalized === 'video')
    return { label: translate?.('biz.marketing.video', '视频制作') || '视频制作', icon: 'video' }
  return { label: translate?.('biz.marketing.text', '文案生成') || '文案生成', icon: 'pen-line' }
}

const AGENCY_PLACEHOLDER_PLUGIN_KEYS = new Set([
  'enterprise',
  'license',
  'logistics',
  'settlement',
  'software-dev',
  'tax-consult',
  'mini-program',
  'domestic-app',
  'apple-store',
  'google-play',
])

function agencyPlaceholderKeyForPlugin(pluginKey?: string | null) {
  const normalized = String(pluginKey || '').trim()
  return AGENCY_PLACEHOLDER_PLUGIN_KEYS.has(normalized) ? normalized : 'default'
}

export function conversationCopy(entry: BusinessKey, locale: Locale, label: string, modeKey?: MarketingRouteMode | null, pluginKey?: string | null) {
  if (entry === 'marketing') {
    if (modeKey === 'image') {
      return {
        title: uiT(locale, 'composer.conv.image.title'),
        heroPlaceholder: uiT(locale, 'composer.conv.image.hero'),
        threadPlaceholder: uiT(locale, 'composer.conv.image.thread'),
      }
    }
    if (modeKey === 'video') {
      return {
        title: uiT(locale, 'composer.conv.video.title'),
        heroPlaceholder: uiT(locale, 'composer.conv.video.hero'),
        threadPlaceholder: uiT(locale, 'composer.conv.video.thread'),
      }
    }
    return {
      title: uiT(locale, 'composer.conv.text.title'),
      heroPlaceholder: uiT(locale, 'composer.conv.text.hero'),
      threadPlaceholder: uiT(locale, 'composer.conv.text.thread'),
    }
  }
  if (entry === 'automation') {
    return {
      title: uiT(locale, 'composer.conv.automation.title'),
      heroPlaceholder: uiT(locale, 'composer.conv.automation.hero'),
      threadPlaceholder: uiT(locale, 'composer.conv.automation.thread'),
    }
  }
  if (entry === 'software') {
    return {
      title: uiT(locale, 'composer.conv.software.title'),
      heroPlaceholder: uiT(locale, 'composer.conv.software.hero'),
      threadPlaceholder: uiT(locale, 'composer.conv.software.thread'),
    }
  }
  if (entry === 'support') {
    return {
      title: uiT(locale, 'composer.conv.support.title'),
      heroPlaceholder: uiT(locale, 'composer.conv.support.hero'),
      threadPlaceholder: uiT(locale, 'composer.conv.support.thread'),
    }
  }
  if (entry === 'agency') {
    const placeholderKey = agencyPlaceholderKeyForPlugin(pluginKey)
    return {
      title: uiT(locale, 'composer.conv.agency.title'),
      heroPlaceholder: uiT(
        locale,
        `composer.conv.agency.plugin.${placeholderKey}.hero`,
        uiT(locale, 'composer.conv.agency.hero'),
      ),
      threadPlaceholder: uiT(
        locale,
        `composer.conv.agency.plugin.${placeholderKey}.thread`,
        uiT(locale, 'composer.conv.agency.thread'),
      ),
    }
  }
  if (entry === 'feedback') {
    return {
      title: uiT(locale, 'composer.conv.feedback.title'),
      heroPlaceholder: uiT(locale, 'composer.conv.feedback.hero'),
      threadPlaceholder: uiT(locale, 'composer.conv.feedback.thread'),
    }
  }
  const isXiaoone = label === 'xiaoone'
  return {
    title: isXiaoone
      ? uiT(locale, 'composer.conv.default.title')
      : uiTpl(locale, 'composer.conv.default.titleNamed', label),
    heroPlaceholder: uiT(locale, 'composer.conv.default.hero'),
    threadPlaceholder: isXiaoone
      ? uiT(locale, 'composer.conv.assistant.thread')
      : uiTpl(locale, 'composer.conv.default.thread', label),
  }
}

export function threadMatchesEntry(thread: AgentThread, entry: BusinessKey, assistant = false) {
  const plugin = thread.plugin_key || ''
  if (assistant) return thread.domain === 'general' && plugin === XIAOWAN_ASSISTANT_PLUGIN_KEY
  if (entry === 'automation') return thread.domain === 'general' && AUTOMATION_AGENT_PLUGIN_KEYS.includes(plugin)
  if (entry === 'consultant') return plugin === 'consultant'
  if (entry === 'software') return thread.domain === 'general' && plugin !== 'consultant' && plugin !== XIAOWAN_ASSISTANT_PLUGIN_KEY
  return thread.domain === entry
}

export function threadMatchesRouteMode(thread: AgentThread, routeMode?: MarketingRouteMode) {
  if (!routeMode || thread.domain !== 'marketing')
    return true
  const mode = thread.mode_key || 'text'
  if (routeMode === 'text')
    return mode !== 'image' && mode !== 'video'
  return mode === routeMode
}

export function replaceGenerationTask(messages: AgentMessage[], task: any): AgentMessage[] {
  let changed = false
  const next = messages.map((message) => {
    const tasks = message.generation_tasks || []
    const matchesMessage = task.message && String(message.id) === String(task.message)
    const taskIndex = tasks.findIndex(item => String(item.id) === String(task.id))
    if (!matchesMessage && taskIndex < 0)
      return message
    changed = true
    const updatedTasks = taskIndex >= 0
      ? tasks.map(item => String(item.id) === String(task.id) ? task : item)
      : [...tasks, task]
    const content = generationTaskMessageContent(task)
    return {
      ...message,
      generation_tasks: updatedTasks,
      ...(content ? { content, content_preview: content.slice(0, 256), status: 'done' as const } : {}),
    }
  })
  return changed ? next : messages
}

function generationTaskMessageContent(task: AgentGenerationTask): string | null {
  const label = task.modality === 'image' ? '图片' : '视频'
  if (ACTIVE_GENERATION_STATUSES.has(task.status))
    return `${label}生成任务已提交，正在生成中。`
  if (task.status === 'succeeded') {
    if (task.modality === 'image') {
      const count = Array.isArray(task.result?.artifacts) ? task.result.artifacts.length : 0
      return `图片已生成完成，共 ${count || 1} 张。`
    }
    return '视频已生成完成。'
  }
  if (task.status === 'failed') {
    const count = Array.isArray(task.result?.artifacts) ? task.result.artifacts.length : 0
    if (task.modality === 'image' && count > 0)
      return `图片部分生成完成，已生成 ${count} 张；剩余图片失败：${task.error_message || '上游未返回明确原因'}`
    return `${label}生成失败：${task.error_message || '上游未返回明确原因'}`
  }
  return null
}

export function optimisticRetryGenerationTask(task: AgentGenerationTask): AgentGenerationTask {
  const result = task.result && typeof task.result === 'object' && !Array.isArray(task.result)
    ? { ...task.result }
    : {}
  delete result.artifacts
  delete result.raw
  delete result.batch_upstream_task_ids
  delete result.storage
  delete result.storage_error
  const progress = typeof task.progress === 'number'
    ? Math.max(10, Math.min(99, task.progress))
    : 10
  return {
    ...task,
    status: 'submitted',
    progress,
    result,
    raw_response: {},
    upstream_task_id: '',
    error_message: '',
    error_code: '',
    completed_at: null,
    updated_at: new Date().toISOString(),
  }
}

export function effectiveThreadMessageCount(thread: AgentThread | AgentThreadDetail | null | undefined) {
  if (!thread)
    return 0
  const detailMessages = 'messages' in thread && Array.isArray(thread.messages) ? thread.messages.length : 0
  return Math.max(thread.message_count || 0, detailMessages)
}

export type MessageRuntime = {
  thinking_ms?: number
  execution_ms?: number
  runtime_started_at?: number
  runtime_first_delta_at?: number | null
}
