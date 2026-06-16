import { api } from './httpClient'
import type { IconName } from '../components/Icon'

const BASE = '/api/v1/channels/social'

function unwrap<T>(payload: unknown): T {
  const p = payload as { data?: T } | null | undefined
  return (p?.data ?? p) as T
}

export interface SocialAccount {
  id: string
  merchant_id: number
  provider: string
  name: string
  extras?: {
    linked_platforms?: string[]
    display_names?: Array<{ platform?: string; username?: string }>
    title?: string
    primary_profile?: boolean
  }
  enabled: boolean
  credentials?: { configured?: boolean }
  created_at: string
  updated_at: string
}

export interface SocialLinkStart {
  linking_url: string
  account_id: string
  provider_mode: string
  linking_mode?: 'primary_dashboard' | 'user_profile_jwt' | string
}

export async function startSocialLink(redirect?: string): Promise<SocialLinkStart> {
  const params = redirect ? { redirect } : undefined
  const r = await api.get(`${BASE}/link/start/`, { params })
  return unwrap<SocialLinkStart>(r.data)
}

export async function listSocialAccounts(): Promise<{ items: SocialAccount[]; provider_mode: string }> {
  const r = await api.get(`${BASE}/accounts/`)
  return unwrap<{ items: SocialAccount[]; provider_mode: string }>(r.data)
}

export async function deleteSocialAccount(accountId: string): Promise<void> {
  await api.delete(`${BASE}/accounts/${accountId}/`)
}

export const SOCIAL_PLATFORM_OPTIONS = [
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'gmb', label: 'Google Business Profile' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'threads', label: 'Threads' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'youtube', label: 'YouTube' },
] as const

export const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  SOCIAL_PLATFORM_OPTIONS.map(option => [option.value, option.label]),
)

export const PLATFORM_BRAND_ICONS: Record<string, IconName> = {
  bluesky: 'brand-bluesky',
  facebook: 'brand-facebook',
  gmb: 'brand-googlebusiness',
  instagram: 'brand-instagram',
  linkedin: 'brand-linkedin',
  pinterest: 'brand-pinterest',
  reddit: 'brand-reddit',
  snapchat: 'brand-snapchat',
  telegram: 'brand-telegram',
  threads: 'brand-threads',
  tiktok: 'brand-tiktok',
  twitter: 'brand-x',
  youtube: 'brand-youtube',
}

export interface PlatformPostCaps {
  maxImages: number
  maxVideos: number
  titleRequired: boolean
  titleOptional: boolean
  mediaRequired: boolean
  bodySupported: boolean
  bodyMaxChars: number
  videoSupported: boolean
}

export const PLATFORM_POST_CAPS: Record<string, PlatformPostCaps> = {
  bluesky:    { maxImages: 4,  maxVideos: 1, titleRequired: false, titleOptional: false, mediaRequired: false, bodySupported: true,  bodyMaxChars: 300,   videoSupported: true  },
  facebook:   { maxImages: 10, maxVideos: 1, titleRequired: false, titleOptional: false, mediaRequired: false, bodySupported: true,  bodyMaxChars: 63206, videoSupported: true  },
  gmb:        { maxImages: 1,  maxVideos: 0, titleRequired: false, titleOptional: false, mediaRequired: false, bodySupported: true,  bodyMaxChars: 1500,  videoSupported: false },
  instagram:  { maxImages: 10, maxVideos: 1, titleRequired: false, titleOptional: false, mediaRequired: true,  bodySupported: true,  bodyMaxChars: 2200,  videoSupported: true  },
  linkedin:   { maxImages: 9,  maxVideos: 1, titleRequired: false, titleOptional: true,  mediaRequired: false, bodySupported: true,  bodyMaxChars: 3000,  videoSupported: true  },
  pinterest:  { maxImages: 1,  maxVideos: 1, titleRequired: false, titleOptional: true,  mediaRequired: true,  bodySupported: true,  bodyMaxChars: 500,   videoSupported: true  },
  reddit:     { maxImages: 1,  maxVideos: 0, titleRequired: true,  titleOptional: false, mediaRequired: false, bodySupported: true,  bodyMaxChars: 40000, videoSupported: false },
  snapchat:   { maxImages: 1,  maxVideos: 1, titleRequired: false, titleOptional: false, mediaRequired: true,  bodySupported: true,  bodyMaxChars: 250,   videoSupported: true  },
  telegram:   { maxImages: 1,  maxVideos: 1, titleRequired: false, titleOptional: false, mediaRequired: false, bodySupported: true,  bodyMaxChars: 4096,  videoSupported: true  },
  threads:    { maxImages: 20, maxVideos: 1, titleRequired: false, titleOptional: false, mediaRequired: false, bodySupported: true,  bodyMaxChars: 500,   videoSupported: true  },
  tiktok:     { maxImages: 35, maxVideos: 1, titleRequired: false, titleOptional: false, mediaRequired: true,  bodySupported: true,  bodyMaxChars: 2200,  videoSupported: true  },
  twitter:    { maxImages: 4,  maxVideos: 1, titleRequired: false, titleOptional: false, mediaRequired: false, bodySupported: true,  bodyMaxChars: 280,   videoSupported: true  },
  youtube:    { maxImages: 0,  maxVideos: 1, titleRequired: true,  titleOptional: false, mediaRequired: true,  bodySupported: true,  bodyMaxChars: 5000,  videoSupported: true  },
}

export function getPlatformCaps(platform: string): PlatformPostCaps {
  return PLATFORM_POST_CAPS[platform] ?? { maxImages: 0, maxVideos: 0, titleRequired: false, titleOptional: false, mediaRequired: false, bodySupported: true, bodyMaxChars: 0, videoSupported: false }
}
