import { api } from './httpClient'
import type { PluginItem } from './composer'
import type { Locale } from '../i18n/types'
import { uiT } from '../i18n/catalogResolve'

export interface ImageSkillRoleItem {
  role: string
  label_zh: string
  default_count?: number
  min_count?: number
  max_count?: number
}

export interface ShotSkillRoleItem {
  role: string
  label_zh: string
  duration?: number
}

export interface VideoOptionSpec {
  values?: string[]
  default?: string
}

export interface ContentSkillItem {
  id: string
  name_zh: string
  name_en: string
  description_zh: string
  description_en: string
  business: string
  modality: string
  recommended_count: number
  min_count: number
  max_count: number
  group_mode: 'auto' | 'storybook' | 'comic'
  output: string
  requires_vision?: boolean
  image_roles: ImageSkillRoleItem[]
  shot_roles?: ShotSkillRoleItem[]
  recommended_duration?: number
  min_duration?: number
  max_duration?: number
  platforms?: VideoOptionSpec
  ratios?: VideoOptionSpec
  resolutions?: VideoOptionSpec
  subtitle?: VideoOptionSpec
  voiceover?: VideoOptionSpec
  cta?: VideoOptionSpec
  upstream?: Record<string, unknown> | null
}

// Backward-compatible alias
export type ImageSkillItem = ContentSkillItem

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { expiresAt: number; items: ContentSkillItem[] }>()

export async function fetchImageSkills(business = 'marketing', modality = 'image'): Promise<ContentSkillItem[]> {
  const key = `${business}:${modality}`
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now())
    return cached.items
  const resp = await api.get('/api/v1/agent/skills/', {
    params: { business, modality },
  })
  const items = (resp.data?.data?.items || resp.data?.items || []) as ContentSkillItem[]
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, items })
  return items
}

export async function fetchVideoSkills(business = 'marketing'): Promise<ContentSkillItem[]> {
  return fetchImageSkills(business, 'video')
}

export function imageSkillToPluginItem(skill: ContentSkillItem, locale: Locale = 'zh'): PluginItem {
  const isTextSkill = skill.modality === 'text' || skill.output === 'text'
  const isVideoSkill = skill.modality === 'video' || skill.output === 'video'
  const requiresVision = Boolean(skill.requires_vision)
  const isEn = locale === 'en'
  const name = isEn ? (skill.name_en || skill.name_zh || skill.id) : (skill.name_zh || skill.name_en || skill.id)
  const description = isEn
    ? (skill.description_en || skill.description_zh)
    : skill.description_zh
  const requiresAttachment = uiT(locale, 'composer.skill.requiresAttachment')
  return {
    key: skill.id,
    label: name,
    icon: isVideoSkill ? 'video' : isTextSkill ? (requiresVision ? 'image' : 'pen-line') : 'image',
    hint: requiresVision ? `${description} · ${requiresAttachment}` : description,
    recommendedCount: skill.recommended_count,
    minCount: skill.min_count,
    maxCount: skill.max_count,
    modality: skill.modality,
    output: skill.output,
    requiresVision,
    imageRoles: (skill.image_roles || []).map(role => ({
      role: role.role,
      label: role.label_zh,
      defaultCount: role.default_count,
      minCount: role.min_count,
      maxCount: role.max_count,
    })),
    shotRoles: (skill.shot_roles || []).map(shot => ({
      role: shot.role,
      label: shot.label_zh,
      duration: shot.duration,
    })),
    videoOptions: skill.modality === 'video' ? {
      recommendedDuration: skill.recommended_duration,
      minDuration: skill.min_duration,
      maxDuration: skill.max_duration,
      platforms: skill.platforms,
      ratios: skill.ratios,
      resolutions: skill.resolutions,
      subtitle: skill.subtitle,
      voiceover: skill.voiceover,
      cta: skill.cta,
    } : undefined,
  }
}
