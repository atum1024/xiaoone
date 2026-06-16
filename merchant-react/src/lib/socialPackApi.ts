import { api } from './httpClient'

const BASE = '/api/v1/agent/social-packs'

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | null | undefined
  return (p?.data ?? p) as T
}

export type SocialPackStatus = 'draft' | 'pending' | 'sent'
export type SocialMaterialKind = 'text' | 'image' | 'video'

export interface SocialMaterialItemPayload {
  kind: SocialMaterialKind
  attachment_id?: string
  remote_ref_id?: string
  text_content?: string
  sort_order?: number
}

export interface SocialMaterialItem extends SocialMaterialItemPayload {
  id: string
  created_at?: string
  updated_at?: string
}

export interface PlatformOptions {
  subreddit?: string
  youTubeTitle?: string
  youTubeVisibility?: 'public' | 'unlisted' | 'private'
  pinterestTitle?: string
  pinterestBoardId?: string
  linkedinTitle?: string
  [key: string]: unknown
}

export interface SocialMaterialPack {
  id: string
  merchant_id: number
  user_id: number
  name: string
  title: string
  text: string
  status: SocialPackStatus
  channel_account_id: string
  platforms: string[]
  platform_options: PlatformOptions
  schedule_kind: string
  scheduled_at: string | null
  last_error: string
  last_posted_at: string | null
  items: SocialMaterialItem[]
  latest_post?: SocialPostRecord | null
  created_at: string
  updated_at: string
}

export type SocialChargeStatus = 'pending' | 'charged' | 'failed' | 'waived'

export interface SocialPostRecord {
  id: string
  status: string
  platforms: string[]
  external_post_id: string
  ref_id: string
  results: Array<Record<string, unknown>>
  charged_points: number
  charge_status: SocialChargeStatus
  has_url: boolean
  error_code: string
  error_message: string
  posted_at: string | null
  analytics_snapshot: Record<string, unknown>
  analytics_updated_at: string | null
  top_comments_snapshot: Record<string, unknown>
  comments_updated_at: string | null
}

export interface SocialPricingQuote {
  kind: string
  points: number
  currency: string
  platforms?: Array<{ platform: string; points: number }>
  monthly_profile_points?: number
}

export async function listSocialPacks(status?: SocialPackStatus): Promise<SocialMaterialPack[]> {
  const params: Record<string, string | number> = { page_size: 100 }
  if (status) params.status = status
  const r = await api.get(`${BASE}/`, { params })
  const body = unwrap<{ items?: SocialMaterialPack[] } | SocialMaterialPack[]>(r.data)
  if (Array.isArray(body)) return body
  return body.items || []
}

export async function createSocialPack(payload: {
  name: string
  title?: string
  text: string
  channel_account_id?: string
  platforms?: string[]
  platform_options?: PlatformOptions
  items?: SocialMaterialItemPayload[]
}): Promise<SocialMaterialPack> {
  const r = await api.post(`${BASE}/`, payload)
  return unwrap<SocialMaterialPack>(r.data)
}

export async function updateSocialPack(id: string, payload: Partial<{
  name: string
  text: string
  channel_account_id: string
  platforms: string[]
  items: SocialMaterialItemPayload[]
}>): Promise<SocialMaterialPack> {
  const r = await api.patch(`${BASE}/${id}/`, payload)
  return unwrap<SocialMaterialPack>(r.data)
}

export async function deleteSocialPack(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}/`)
}

export async function publishSocialPack(id: string, platforms?: string[]): Promise<{ pack: SocialMaterialPack; post: SocialPostRecord }> {
  const r = await api.post(`${BASE}/${id}/publish/`, platforms?.length ? { platforms } : {})
  return unwrap<{ pack: SocialMaterialPack; post: SocialPostRecord }>(r.data)
}

export async function scheduleSocialPack(id: string, payload: {
  scheduled_at: string
  schedule_kind?: string
  channel_account_id?: string
  platforms?: string[]
}): Promise<{ pack: SocialMaterialPack; post: SocialPostRecord }> {
  const r = await api.post(`${BASE}/${id}/schedule/`, payload)
  return unwrap<{ pack: SocialMaterialPack; post: SocialPostRecord }>(r.data)
}

export async function fetchSocialPricing(platforms: string[]): Promise<SocialPricingQuote> {
  const r = await api.get('/api/v1/agent/social-pricing/', {
    params: { platforms: platforms.join(',') },
  })
  return unwrap<SocialPricingQuote>(r.data)
}

export interface QuickPublishPayload {
  name?: string
  title?: string
  text: string
  channel_account_id?: string
  platforms: string[]
  platform_options?: PlatformOptions
  items?: SocialMaterialItemPayload[]
  schedule_kind?: 'manual' | 'once'
  scheduled_at?: string
}

export async function quickPublishSocialPack(payload: QuickPublishPayload): Promise<{ pack: SocialMaterialPack; post: SocialPostRecord }> {
  const r = await api.post(`${BASE}/quick-publish/`, payload)
  return unwrap<{ pack: SocialMaterialPack; post: SocialPostRecord }>(r.data)
}

export async function fetchPostAnalytics(packId: string, postId: string, refresh = false): Promise<Record<string, unknown>> {
  const r = await api.get(`${BASE}/${packId}/posts/${postId}/analytics/`, {
    params: refresh ? { refresh: 1 } : undefined,
  })
  return unwrap<Record<string, unknown>>(r.data)
}

export async function fetchPostComments(packId: string, postId: string, refresh = false): Promise<Record<string, unknown>> {
  const r = await api.get(`${BASE}/${packId}/posts/${postId}/comments/`, {
    params: refresh ? { refresh: 1 } : undefined,
  })
  return unwrap<Record<string, unknown>>(r.data)
}

export async function postComment(packId: string, postId: string, comment: string, platforms: string[]): Promise<Record<string, unknown>> {
  const r = await api.post('/api/v1/channels/social/post-comments/', {
    id: postId,
    comment,
    platforms,
  })
  return unwrap<Record<string, unknown>>(r.data)
}

export async function replyComment(commentId: string, comment: string, platform: string, options?: { searchPlatformId?: boolean }): Promise<Record<string, unknown>> {
  const r = await api.post('/api/v1/channels/social/post-comments/reply/', {
    id: commentId,
    comment,
    platform,
    searchPlatformId: Boolean(options?.searchPlatformId),
  })
  return unwrap<Record<string, unknown>>(r.data)
}
