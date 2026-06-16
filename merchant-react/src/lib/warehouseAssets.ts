import type { AgentMaterialAsset } from '@xiaoone/chat-kit'
import { authFetch } from './authFetch'

export type WarehouseAssetKind = 'image' | 'video' | 'file'

export const WAREHOUSE_PREVIEW_FETCH_TIMEOUT_MS = 15_000
export const WAREHOUSE_VIDEO_FRAME_TIMEOUT_MS = 12_000

const WAREHOUSE_PREVIEW_CACHE_NAME = 'xiaoone-warehouse-preview-v1'
const WAREHOUSE_PREVIEW_MAX_CACHE_BYTES = 8 * 1024 * 1024
const warehousePreviewMemoryCache = new Map<string, Blob>()

export type WarehouseAssetPreviewFailureReason = 'none' | 'http_error' | 'timeout' | 'empty_blob' | 'unsupported_type' | 'cors_or_network' | 'no_candidate'

export type WarehouseAssetPreviewResult = {
  url: string
  revoke: boolean
  reason: WarehouseAssetPreviewFailureReason
  sourceUrl?: string
  status?: number
  contentType?: string
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}

export function warehouseAssetRequestUrl(url: string) {
  const value = url.trim()
  if (!value)
    return ''
  if (/^https?:\/\//i.test(value))
    return value
  if (/^(?:blob|data):/i.test(value))
    return value
  if (value.startsWith('/'))
    return value
  return `/${value.replace(/^\/+/, '')}`
}

function generationTaskArtifactUrl(asset: AgentMaterialAsset) {
  if (asset.source !== 'generation_task' || !asset.task)
    return ''
  const index = Number.isFinite(Number(asset.artifact_index)) ? Number(asset.artifact_index) : 0
  return `/api/v1/agent/generation-tasks/${encodeURIComponent(asset.task)}/artifact/?index=${index}`
}

function messageArtifactUrl(asset: AgentMaterialAsset) {
  if (asset.source !== 'message_artifact' || !asset.message)
    return ''
  const index = Number.isFinite(Number(asset.artifact_index)) ? Number(asset.artifact_index) : 0
  return `/api/v1/agent/messages/${encodeURIComponent(asset.message)}/artifact/?index=${index}`
}

function attachmentDownloadEndpoint(asset: AgentMaterialAsset) {
  if (asset.source !== 'user_upload')
    return ''
  const attachmentId = asset.id.startsWith('attachment:')
    ? asset.id.slice('attachment:'.length)
    : asset.id
  if (!attachmentId)
    return ''
  return `/api/v1/agent/attachments/${encodeURIComponent(attachmentId)}/download/`
}

function attachmentPreviewEndpoint(asset: AgentMaterialAsset) {
  if (asset.kind !== 'image')
    return ''
  const endpoint = attachmentDownloadEndpoint(asset)
  return endpoint ? `${endpoint}?proxy=1` : ''
}

function warehouseAssetProxyUrls(asset: AgentMaterialAsset) {
  return uniqueUrls([
    generationTaskArtifactUrl(asset),
    messageArtifactUrl(asset),
    attachmentDownloadEndpoint(asset),
  ])
}

function warehouseAssetPreviewProxyUrls(asset: AgentMaterialAsset) {
  return uniqueUrls([
    generationTaskArtifactUrl(asset),
    messageArtifactUrl(asset),
    attachmentPreviewEndpoint(asset),
  ])
}

function uniqueUrls(values: Array<string | undefined | null>) {
  const seen = new Set<string>()
  return values
    .map(value => warehouseAssetRequestUrl(String(value || '') ))
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
}

export function warehouseAssetPreviewCandidates(asset: AgentMaterialAsset) {
  const proxyUrls = asset.kind === 'video' ? [] : warehouseAssetPreviewProxyUrls(asset)
  const fullMediaPreviewUrls = asset.kind === 'video' ? [] : [asset.url, asset.download_url]
  const directUrls = uniqueUrls([
    asset.thumbnail_url,
    asset.cover_url,
    asset.preview_url,
    ...fullMediaPreviewUrls,
  ])
  return uniqueUrls([...proxyUrls, ...directUrls])
}

export function warehouseAssetDownloadCandidates(asset: AgentMaterialAsset) {
  const proxyUrls = warehouseAssetProxyUrls(asset)
  const directUrls = uniqueUrls([
    asset.download_url,
    asset.url,
    asset.preview_url,
  ]).filter(url => !isExternalHttpUrl(url))
  return uniqueUrls([...proxyUrls, ...directUrls])
}

export function warehouseAssetDownloadUrl(asset: AgentMaterialAsset) {
  return warehouseAssetDownloadCandidates(asset)[0] || ''
}

export function warehouseAssetPlaybackUrl(asset: AgentMaterialAsset) {
  if (asset.kind !== 'video')
    return ''
  return warehouseAssetRequestUrl(asset.playback_url || warehouseAssetDownloadUrl(asset))
}

export function warehouseAssetHasDirectCover(asset: AgentMaterialAsset) {
  return Boolean(
    warehouseAssetRequestUrl(asset.cover_url || '')
    || warehouseAssetRequestUrl(asset.thumbnail_url || '')
    || warehouseAssetRequestUrl(asset.preview_url || ''),
  )
}

function isExternalHttpUrl(url: string) {
  if (!/^https?:\/\//i.test(url))
    return false
  try {
    return new URL(url).origin !== window.location.origin
  }
  catch {
    return false
  }
}

function previewUrlLooksLikeImage(url: string) {
  return /\.(?:png|jpe?g|webp|gif|avif|svg)(?:[?#]|$)/i.test(url)
}

function canUseWarehousePreviewCache() {
  return typeof caches !== 'undefined'
}

async function cachedWarehousePreviewBlob(url: string) {
  const memoryBlob = warehousePreviewMemoryCache.get(url)
  if (memoryBlob)
    return memoryBlob
  if (!canUseWarehousePreviewCache())
    return null
  try {
    const cache = await caches.open(WAREHOUSE_PREVIEW_CACHE_NAME)
    const cached = await cache.match(url)
    if (!cached || !cached.ok)
      return null
    const blob = await cached.blob()
    if (blob.size <= 0)
      return null
    warehousePreviewMemoryCache.set(url, blob)
    return blob
  }
  catch {
    return null
  }
}

async function putCachedWarehousePreviewBlob(url: string, blob: Blob, contentType?: string) {
  if (blob.size <= 0 || blob.size > WAREHOUSE_PREVIEW_MAX_CACHE_BYTES)
    return
  const type = (blob.type || contentType || '').split(';')[0].trim().toLowerCase()
  if (type && !type.startsWith('image/'))
    return
  warehousePreviewMemoryCache.set(url, blob)
  if (!canUseWarehousePreviewCache())
    return
  try {
    const headers = new Headers()
    if (type)
      headers.set('content-type', type)
    headers.set('x-xiaoone-cache-created-at', String(Date.now()))
    const cache = await caches.open(WAREHOUSE_PREVIEW_CACHE_NAME)
    await cache.put(url, new Response(blob, { headers }))
  }
  catch {
    // Browser cache is an optimization; preview loading should not depend on it.
  }
}

type FetchWarehouseAssetOptions = {
  timeoutMs?: number
  signal?: AbortSignal
}

async function fetchWarehouseAsset(url: string, options?: FetchWarehouseAssetOptions) {
  const timeoutMs = options?.timeoutMs
  const externalSignal = options?.signal
  if (externalSignal?.aborted)
    throw new DOMException('Aborted', 'AbortError')

  const controller = new AbortController()
  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true })

  let timer: number | undefined
  if (timeoutMs && timeoutMs > 0) {
    timer = window.setTimeout(() => controller.abort(), timeoutMs)
  }

  try {
    return isExternalHttpUrl(url)
      ? fetch(url, { signal: controller.signal })
      : authFetch(url, { signal: controller.signal })
  }
  finally {
    if (timer)
      window.clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

function previewBlobIsUsable(asset: AgentMaterialAsset, blob: Blob, sourceUrl = '') {
  if (blob.size <= 0)
    return false
  const type = blob.type.toLowerCase()
  if (!type)
    return asset.kind === 'video' ? previewUrlLooksLikeImage(sourceUrl) : true
  if (asset.kind === 'image')
    return type.startsWith('image/')
  if (asset.kind === 'video')
    return type.startsWith('image/')
  return type.startsWith('image/') || type.startsWith('video/')
}

function warehouseVideoFrameCandidates(asset: AgentMaterialAsset) {
  return uniqueUrls([
    warehouseAssetPlaybackUrl(asset),
    ...warehouseAssetDownloadCandidates(asset),
  ])
}

function drawVideoFrameToBlob(video: HTMLVideoElement): Promise<Blob | null> {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height)
    return Promise.resolve(null)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return Promise.resolve(null)
  try {
    ctx.drawImage(video, 0, 0, width, height)
  }
  catch {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    canvas.toBlob((frameBlob) => resolve(frameBlob && frameBlob.size > 0 ? frameBlob : null), 'image/jpeg', 0.86)
  })
}

async function captureVideoFrameFromElement(
  video: HTMLVideoElement,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<WarehouseAssetPreviewResult> {
  if (signal?.aborted)
    return { url: '', revoke: false, reason: 'timeout' }

  return new Promise((resolve) => {
    let settled = false
    const finish = (result: WarehouseAssetPreviewResult) => {
      if (settled)
        return
      settled = true
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      video.pause()
      video.removeAttribute('src')
      video.load()
      resolve(result)
    }
    const onAbort = () => finish({ url: '', revoke: false, reason: 'timeout' })
    const timer = window.setTimeout(() => finish({ url: '', revoke: false, reason: 'timeout' }), timeoutMs)
    signal?.addEventListener('abort', onAbort, { once: true })

    const capture = async () => {
      const frameBlob = await drawVideoFrameToBlob(video)
      if (!frameBlob) {
        finish({ url: '', revoke: false, reason: 'cors_or_network' })
        return
      }
      finish({
        url: URL.createObjectURL(frameBlob),
        revoke: true,
        reason: 'none',
        contentType: frameBlob.type || 'image/jpeg',
      })
    }

    video.addEventListener('loadeddata', () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1
      video.currentTime = Math.min(0.12, duration * 0.02)
    }, { once: true })
    video.addEventListener('seeked', () => void capture(), { once: true })
    video.addEventListener('error', () => finish({ url: '', revoke: false, reason: 'cors_or_network' }), { once: true })
  })
}

async function captureWarehouseVideoFirstFrameFromUrl(
  videoUrl: string,
  options?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<WarehouseAssetPreviewResult> {
  const timeoutMs = options?.timeoutMs ?? WAREHOUSE_VIDEO_FRAME_TIMEOUT_MS
  const signal = options?.signal
  if (signal?.aborted)
    return { url: '', revoke: false, reason: 'timeout', sourceUrl: videoUrl }

  const requestUrl = warehouseAssetRequestUrl(videoUrl)
  if (!requestUrl)
    return { url: '', revoke: false, reason: 'no_candidate', sourceUrl: videoUrl }

  const directVideo = document.createElement('video')
  directVideo.muted = true
  directVideo.playsInline = true
  directVideo.preload = 'metadata'
  directVideo.crossOrigin = 'anonymous'
  directVideo.src = requestUrl
  directVideo.load()

  const directResult = await captureVideoFrameFromElement(directVideo, timeoutMs, signal)
  if (directResult.url)
    return { ...directResult, sourceUrl: videoUrl }
  if (signal?.aborted)
    return { url: '', revoke: false, reason: 'timeout', sourceUrl: videoUrl }

  // Cross-origin taint or metadata-only failure: fall back to a bounded blob fetch.
  let sourceObjectUrl = ''
  try {
    const resp = await fetchWarehouseAsset(requestUrl, { timeoutMs, signal })
    if (!resp.ok)
      return { url: '', revoke: false, reason: 'http_error', sourceUrl: videoUrl, status: resp.status }
    const blob = await resp.blob()
    if (blob.size <= 0)
      return { url: '', revoke: false, reason: 'empty_blob', sourceUrl: videoUrl, status: resp.status }
    sourceObjectUrl = URL.createObjectURL(blob)
    const blobVideo = document.createElement('video')
    blobVideo.muted = true
    blobVideo.playsInline = true
    blobVideo.preload = 'auto'
    blobVideo.src = sourceObjectUrl
    blobVideo.load()
    const blobResult = await captureVideoFrameFromElement(blobVideo, timeoutMs, signal)
    if (blobResult.url)
      return { ...blobResult, sourceUrl: videoUrl }
    return blobResult.reason === 'none'
      ? { url: '', revoke: false, reason: 'unsupported_type', sourceUrl: videoUrl }
      : { ...blobResult, sourceUrl: videoUrl }
  }
  catch (error: any) {
    return {
      url: '',
      revoke: false,
      reason: error?.name === 'AbortError' ? 'timeout' : 'cors_or_network',
      sourceUrl: videoUrl,
    }
  }
  finally {
    if (sourceObjectUrl)
      URL.revokeObjectURL(sourceObjectUrl)
  }
}


export async function resolveWarehouseAssetMediaSource(
  asset: AgentMaterialAsset,
  options?: { fallbackUrl?: string; timeoutMs?: number; signal?: AbortSignal },
): Promise<WarehouseAssetPreviewResult> {
  if (asset.kind !== 'image' && asset.kind !== 'video')
    return { url: '', revoke: false, reason: 'no_candidate' }

  const fallbackUrl = warehouseAssetRequestUrl(options?.fallbackUrl || '')
  const candidates = asset.kind === 'video'
    ? uniqueUrls([warehouseAssetPlaybackUrl(asset), ...warehouseAssetDownloadCandidates(asset)])
    : uniqueUrls([
        ...warehouseAssetDownloadCandidates(asset),
        asset.download_url,
        asset.url,
        asset.preview_url,
        fallbackUrl,
      ])
  let lastFailure: WarehouseAssetPreviewResult = { url: '', revoke: false, reason: 'no_candidate' }

  for (const url of candidates) {
    if (!url)
      continue
    if (options?.signal?.aborted)
      return { url: '', revoke: false, reason: 'timeout', sourceUrl: url }
    if (/^(?:blob|data):/i.test(url))
      return { url, revoke: false, reason: 'none', sourceUrl: url }
    if (isExternalHttpUrl(url))
      return { url, revoke: false, reason: 'none', sourceUrl: url }
    try {
      const resp = await fetchWarehouseAsset(url, { timeoutMs: options?.timeoutMs, signal: options?.signal })
      if (!resp.ok) {
        lastFailure = { url: '', revoke: false, reason: 'http_error', sourceUrl: url, status: resp.status, contentType: resp.headers.get('content-type') || undefined }
        continue
      }
      const blob = await resp.blob()
      if (blob.size <= 0) {
        lastFailure = { url: '', revoke: false, reason: 'empty_blob', sourceUrl: url, status: resp.status, contentType: blob.type || resp.headers.get('content-type') || undefined }
        continue
      }
      return {
        url: URL.createObjectURL(blob),
        revoke: true,
        reason: 'none',
        sourceUrl: url,
        status: resp.status,
        contentType: blob.type || resp.headers.get('content-type') || undefined,
      }
    }
    catch (error: any) {
      lastFailure = { url: '', revoke: false, reason: error?.name === 'AbortError' ? 'timeout' : 'cors_or_network', sourceUrl: url }
    }
  }
  if (fallbackUrl)
    return { url: fallbackUrl, revoke: false, reason: 'none', sourceUrl: fallbackUrl }
  return lastFailure
}

export async function resolveWarehouseVideoFramePreview(
  asset: AgentMaterialAsset,
  options?: { skipUrls?: string[]; timeoutMs?: number; signal?: AbortSignal },
): Promise<WarehouseAssetPreviewResult> {
  if (asset.kind !== 'video')
    return { url: '', revoke: false, reason: 'no_candidate' }

  const skip = new Set((options?.skipUrls || []).map(value => warehouseAssetRequestUrl(value)))
  let lastFailure: WarehouseAssetPreviewResult = { url: '', revoke: false, reason: 'no_candidate' }

  for (const videoUrl of warehouseVideoFrameCandidates(asset)) {
    if (!videoUrl || skip.has(videoUrl))
      continue
    const frameResult = await captureWarehouseVideoFirstFrameFromUrl(videoUrl, {
      timeoutMs: options?.timeoutMs,
      signal: options?.signal,
    })
    if (frameResult.url)
      return frameResult
    lastFailure = frameResult
    if (options?.signal?.aborted)
      break
  }
  return lastFailure
}

export async function resolveWarehouseAssetPreview(
  asset: AgentMaterialAsset,
  options?: { skipUrls?: string[]; timeoutMs?: number; signal?: AbortSignal },
): Promise<WarehouseAssetPreviewResult> {
  const skip = new Set((options?.skipUrls || []).map(value => warehouseAssetRequestUrl(value)))
  const timeoutMs = options?.timeoutMs ?? WAREHOUSE_PREVIEW_FETCH_TIMEOUT_MS
  const signal = options?.signal
  let lastFailure: WarehouseAssetPreviewResult = { url: '', revoke: false, reason: 'no_candidate' }

  for (const url of warehouseAssetPreviewCandidates(asset)) {
    if (skip.has(url))
      continue
    if (signal?.aborted)
      return { url: '', revoke: false, reason: 'timeout' }
    if (isExternalHttpUrl(url))
      return { url, revoke: false, reason: 'none', sourceUrl: url }
    try {
      const cachedBlob = await cachedWarehousePreviewBlob(url)
      if (cachedBlob && previewBlobIsUsable(asset, cachedBlob, url))
        return { url: URL.createObjectURL(cachedBlob), revoke: true, reason: 'none', sourceUrl: url, contentType: cachedBlob.type || undefined }
      const resp = await fetchWarehouseAsset(url, { timeoutMs, signal })
      if (!resp.ok) {
        lastFailure = { url: '', revoke: false, reason: 'http_error', sourceUrl: url, status: resp.status, contentType: resp.headers.get('content-type') || undefined }
        continue
      }
      const blob = await resp.blob()
      if (blob.size <= 0) {
        lastFailure = { url: '', revoke: false, reason: 'empty_blob', sourceUrl: url, status: resp.status, contentType: blob.type || resp.headers.get('content-type') || undefined }
        continue
      }
      if (!previewBlobIsUsable(asset, blob, url)) {
        lastFailure = { url: '', revoke: false, reason: 'unsupported_type', sourceUrl: url, status: resp.status, contentType: blob.type || resp.headers.get('content-type') || undefined }
        continue
      }
      await putCachedWarehousePreviewBlob(url, blob, blob.type || resp.headers.get('content-type') || undefined)
      return { url: URL.createObjectURL(blob), revoke: true, reason: 'none', sourceUrl: url, status: resp.status, contentType: blob.type || resp.headers.get('content-type') || undefined }
    }
    catch (error: any) {
      lastFailure = { url: '', revoke: false, reason: error?.name === 'AbortError' ? 'timeout' : 'cors_or_network', sourceUrl: url }
    }
  }
  return lastFailure
}

export function warehouseAssetFileName(asset: AgentMaterialAsset, blob: Blob) {
  const rawName = (asset.name || `warehouse-${asset.kind || 'asset'}`)
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `warehouse-${asset.kind || 'asset'}`
  if (/\.[a-z0-9]{2,8}$/i.test(rawName))
    return rawName
  const mimeType = (blob.type || asset.mime_type || '').split(';')[0].trim().toLowerCase()
  const ext = MIME_EXTENSIONS[mimeType] || (asset.kind === 'video' ? 'mp4' : asset.kind === 'image' ? 'png' : 'bin')
  return `${rawName}.${ext}`
}

function warehouseAssetFileFromBlob(asset: AgentMaterialAsset, blob: Blob) {
  const fallbackType = asset.kind === 'image'
    ? 'image/png'
    : asset.kind === 'video'
      ? 'video/mp4'
      : 'application/octet-stream'
  const type = (blob.type || asset.mime_type || fallbackType).split(';')[0].trim() || fallbackType
  const fileBlob = blob.type ? blob : new Blob([blob], { type })
  return new File([fileBlob], warehouseAssetFileName(asset, fileBlob), { type })
}

export async function warehouseAssetToFile(asset: AgentMaterialAsset) {
  const candidates = warehouseAssetDownloadCandidates(asset)
  if (candidates.length === 0)
    throw new Error('warehouse_asset_not_downloadable')

  for (const url of candidates) {
    try {
      const resp = await fetchWarehouseAsset(url)
      if (!resp.ok)
        continue
      const blob = await resp.blob()
      if (blob.size <= 0)
        continue
      return warehouseAssetFileFromBlob(asset, blob)
    }
    catch {
      // Try the next candidate; same-origin proxy should succeed before external URLs.
    }
  }
  throw new Error('warehouse_asset_download_failed')
}
