import { api } from './httpClient'
import officialArkVirtualPortraits from '../data/arkVirtualPortraits.json'

export interface ArkVirtualPortrait {
  id: string
  label: string
  assetId: string
  hint?: string
  coverUrl?: string
  videoUrl?: string
  previewUrl?: string
  status?: string
  source?: string
  metadata?: Record<string, unknown>
}

export interface ArkVirtualPortraitSyncResult {
  items: ArkVirtualPortrait[]
  total: number
  count: number
  status: 'ok' | 'needs_credentials' | 'needs_subscription' | 'sync_failed' | string
  source?: string
  message?: string
  credentialRequired?: boolean
  projectName?: string
  updatedAt?: string
}

const STATIC_ARK_VIRTUAL_PORTRAITS: ArkVirtualPortrait[] =
  (officialArkVirtualPortraits as ArkVirtualPortrait[]).map((item) => ({
    ...item,
    source: item.source || 'ark_experience_center',
  }))
const CACHE_TTL_MS = 60_000

const ASSET_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/
let remoteCache: { expiresAt: number; result: ArkVirtualPortraitSyncResult } | null = null

export function normalizeArkAssetId(input: string | null | undefined): string {
  const raw = String(input || '').trim()
  if (!raw)
    return ''
  const withoutScheme = raw.startsWith('asset://') ? raw.slice('asset://'.length) : raw
  return ASSET_ID_RE.test(withoutScheme) ? withoutScheme : ''
}

export function arkAssetUrl(input: string | null | undefined): string {
  const assetId = normalizeArkAssetId(input)
  return assetId ? `asset://${assetId}` : ''
}

function normalizePortrait(item: unknown): ArkVirtualPortrait | null {
  if (!item || typeof item !== 'object')
    return null
  const raw = item as Record<string, unknown>
  const assetId = normalizeArkAssetId(String(raw.assetId || raw.asset_id || raw.asset || raw.url || ''))
  if (!assetId)
    return null
  const label = String(raw.label || raw.name || assetId).trim()
  const hint = String(raw.hint || raw.description || raw.desc || raw.status || '').trim()
  const coverUrl = String(raw.coverUrl || raw.cover_url || raw.imageUrl || raw.image_url || raw.url || '').trim()
  const videoUrl = String(raw.videoUrl || raw.video_url || '').trim()
  const previewUrl = String(raw.previewUrl || raw.preview_url || '').trim()
  return {
    id: String(raw.id || assetId).trim() || assetId,
    label: label || assetId,
    assetId,
    hint: hint || undefined,
    coverUrl: coverUrl && !coverUrl.startsWith('asset://') ? coverUrl : undefined,
    videoUrl: videoUrl || undefined,
    previewUrl: previewUrl || undefined,
    status: String(raw.status || '').trim() || undefined,
    source: String(raw.source || '').trim() || undefined,
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata as Record<string, unknown> : undefined,
  }
}

function portraitsFromEnv(): ArkVirtualPortrait[] {
  const raw = import.meta.env?.VITE_ARK_VIRTUAL_PORTRAITS_JSON
  if (!raw)
    return []
  try {
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed) ? parsed : []
    return items.map(normalizePortrait).filter(Boolean) as ArkVirtualPortrait[]
  } catch {
    return []
  }
}

export const ARK_VIRTUAL_PORTRAITS: ArkVirtualPortrait[] = [
  ...STATIC_ARK_VIRTUAL_PORTRAITS,
  ...portraitsFromEnv(),
]

function mergePortraits(remoteItems: ArkVirtualPortrait[], localItems = ARK_VIRTUAL_PORTRAITS): ArkVirtualPortrait[] {
  const byAsset = new Map<string, ArkVirtualPortrait>()
  for (const item of [...localItems, ...remoteItems]) {
    const normalized = normalizePortrait(item)
    if (!normalized)
      continue
    const existing = byAsset.get(normalized.assetId)
    byAsset.set(normalized.assetId, { ...existing, ...normalized })
  }
  return Array.from(byAsset.values())
}

export async function fetchArkVirtualPortraits(force = false): Promise<ArkVirtualPortraitSyncResult> {
  if (!force && remoteCache && remoteCache.expiresAt > Date.now())
    return remoteCache.result

  const resp = await api.get('/api/v1/agent/ark/virtual-portraits/', {
    params: force ? { force: 1 } : undefined,
  })
  const payload = resp.data?.data || resp.data || {}
  const remoteItems = Array.isArray(payload.items)
    ? payload.items.map(normalizePortrait).filter(Boolean) as ArkVirtualPortrait[]
    : []
  const result: ArkVirtualPortraitSyncResult = {
    items: mergePortraits(remoteItems),
    total: Number(payload.total || remoteItems.length || 0),
    count: Number(payload.count || remoteItems.length || 0),
    status: String(payload.status || 'ok'),
    source: String(payload.source || '').trim() || undefined,
    message: String(payload.message || '').trim() || undefined,
    credentialRequired: Boolean(payload.credential_required ?? payload.credentialRequired),
    projectName: String(payload.projectName || payload.project_name || '').trim() || undefined,
    updatedAt: String(payload.updatedAt || payload.updated_at || '').trim() || undefined,
  }
  remoteCache = { expiresAt: Date.now() + CACHE_TTL_MS, result }
  return result
}
