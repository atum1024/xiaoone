import type { AgentAttachment, AgentGenerationTask } from '@xiaoone/chat-kit'
import { ARK_VIRTUAL_PORTRAITS, normalizeArkAssetId } from './arkVirtualPortraits'

type MessageLike = {
  role?: string
  attachments?: AgentAttachment[]
  generation_tasks?: AgentGenerationTask[]
}

type ReferenceImageLike = {
  url?: unknown
  image_url?: unknown
  data_url?: unknown
  cover_url?: unknown
  coverUrl?: unknown
  name?: unknown
  source?: unknown
  asset_id?: unknown
  assetId?: unknown
  source_attachment_id?: unknown
  sourceAttachmentId?: unknown
}

type AttachmentWithLocalReference = AgentAttachment & {
  local_preview_url?: unknown
  source_reference_asset_id?: unknown
  sourceReferenceAssetId?: unknown
  reference_image_url?: unknown
  referenceImageUrl?: unknown
}

export type ConversationMaterial = {
  key: string
  label: string
  kind: 'image' | 'video' | 'audio' | 'file'
  previewUrl?: string
  attachment?: AgentAttachment
  referenceImage?: ReferenceImageLike
  task?: AgentGenerationTask
}

function attachmentKind(att: AgentAttachment): ConversationMaterial['kind'] {
  const type = (att.content_type || '').split(';')[0].trim().toLowerCase()
  const name = (att.name || '').toLowerCase()
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|bmp)$/.test(name))
    return 'image'
  if (type.startsWith('video/') || /\.(mp4|m4v|mov|webm|avi|mkv)$/.test(name))
    return 'video'
  if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/.test(name))
    return 'audio'
  return 'file'
}

function safePreviewUrl(value: unknown): string {
  const url = String(value || '').trim()
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:image/'))
    return url
  return ''
}

function portraitCatalogPreviewUrl(assetId: string): string {
  const normalized = normalizeArkAssetId(assetId)
  if (!normalized)
    return ''
  const portrait = ARK_VIRTUAL_PORTRAITS.find(item => normalizeArkAssetId(item.assetId) === normalized)
  if (!portrait)
    return ''
  return safePreviewUrl(portrait.coverUrl || portrait.previewUrl)
}

function referencePreviewUrl(ref: ReferenceImageLike): string {
  const cover = safePreviewUrl(ref.cover_url || ref.coverUrl)
  if (cover)
    return cover
  const direct = safePreviewUrl(ref.url || ref.image_url || ref.data_url)
  if (direct)
    return direct
  const assetId = normalizeArkAssetId(String(ref.asset_id || ref.assetId || ref.url || ""))
  return portraitCatalogPreviewUrl(assetId)
}

function referenceAttachmentId(ref: ReferenceImageLike): string {
  return String(ref.source_attachment_id || ref.sourceAttachmentId || '').trim()
}

function referenceIdentities(ref: ReferenceImageLike): string[] {
  const identities: string[] = []
  const attachmentId = referenceAttachmentId(ref)
  if (attachmentId)
    identities.push(`attachment:${attachmentId}`)
  const assetId = String(ref.asset_id || ref.assetId || '').trim()
  if (assetId)
    identities.push(`asset:${normalizeArkAssetId(assetId) || assetId}`)
  const url = String(ref.url || ref.image_url || ref.data_url || ref.cover_url || ref.coverUrl || '').trim()
  if (url)
    identities.push(`url:${url}`)
  const previewUrl = referencePreviewUrl(ref)
  if (previewUrl && previewUrl !== url)
    identities.push(`url:${previewUrl}`)
  return identities.filter(Boolean)
}

function attachmentIdentities(att: AgentAttachment): string[] {
  const current = att as AttachmentWithLocalReference
  const identities: string[] = []
  const id = String(att.id || '').trim()
  if (id)
    identities.push(`attachment:${id}`)
  const assetId = normalizeArkAssetId(String(current.source_reference_asset_id || current.sourceReferenceAssetId || '').trim())
  if (assetId)
    identities.push(`asset:${assetId}`)
  const referenceUrl = safePreviewUrl(current.reference_image_url || current.referenceImageUrl || current.local_preview_url)
  if (referenceUrl)
    identities.push(`url:${referenceUrl}`)
  if (!identities.length)
    identities.push(`attachment:${attachmentFallbackIdentity(att)}`)
  return identities
}

function attachmentFallbackIdentity(att: AgentAttachment): string {
  return `${att.name}:${att.created_at}`
}

function taskReferenceImages(task: AgentGenerationTask): ReferenceImageLike[] {
  const result = task.result && typeof task.result === 'object' ? task.result as Record<string, unknown> : {}
  const options = result.generation_options && typeof result.generation_options === 'object'
    ? result.generation_options as Record<string, unknown>
    : {}
  const refs = Array.isArray(options.reference_images) ? options.reference_images : []
  return refs.filter((item): item is ReferenceImageLike => Boolean(item && typeof item === 'object'))
}

function tasksForUserMessage(messages: MessageLike[], messageIndex: number): AgentGenerationTask[] {
  const tasks: AgentGenerationTask[] = []
  for (let index = messageIndex + 1; index < messages.length; index += 1) {
    const message = messages[index]
    if (!message || message.role === 'user')
      break
    for (const task of message.generation_tasks || []) {
      if (task?.modality === 'image' || task?.modality === 'video')
        tasks.push(task)
    }
  }
  return tasks
}

export function conversationMaterialsForMessage(messages: MessageLike[], messageIndex: number): ConversationMaterial[] {
  const message = messages[messageIndex]
  if (!message || message.role !== 'user')
    return []

  const attachments = message.attachments || []
  const attachmentIds = new Set(attachments.map(att => String(att.id || '').trim()).filter(Boolean))
  const seen = new Set<string>()
  const materials: Omit<ConversationMaterial, 'label'>[] = []

  for (const task of tasksForUserMessage(messages, messageIndex)) {
    for (const ref of taskReferenceImages(task)) {
      const sourceAttachmentId = referenceAttachmentId(ref)
      if (sourceAttachmentId && attachmentIds.has(sourceAttachmentId))
        continue
      const identities = referenceIdentities(ref)
      if (!identities.length || identities.some(identity => seen.has(identity)))
        continue
      const previewUrl = referencePreviewUrl(ref)
      const assetId = normalizeArkAssetId(String(ref.asset_id || ref.assetId || ref.url || ""))
      const isPortrait = ref.source === 'ark_virtual_portrait' || String(ref.url || '').startsWith('asset://')
      if (!previewUrl && !(isPortrait && assetId))
        continue
      identities.forEach(identity => seen.add(identity))
      materials.push({
        key: `reference:${identities[0]}`,
        kind: 'image',
        previewUrl: previewUrl || undefined,
        referenceImage: ref,
        task,
      })
    }
  }

  for (const attachment of attachments) {
    const identities = attachmentIdentities(attachment)
    if (identities.some(identity => seen.has(identity)))
      continue
    identities.forEach(identity => seen.add(identity))
    materials.push({
      key: identities[0],
      kind: attachmentKind(attachment),
      attachment,
    })
  }

  return materials.map((item, index) => ({
    ...item,
    label: `素材${index + 1}`,
  }))
}
