import { PLATFORM_BRAND_ICONS, SOCIAL_PLATFORM_OPTIONS } from '../../lib/socialApi'
import type { IconName } from '../../components/Icon'

export const VIP_FIGMA_IMAGES = {
  heroEarth: '/vip/figma/hero-earth.jpg',
  infra: '/vip/figma/infra.jpg',
  social: '/vip/figma/social.jpg',
  creation1: '/vip/figma/creation-1.jpg',
  creation2: '/vip/figma/creation-2.jpg',
  hermes: '/vip/figma/hermes.jpg',
  settlement: '/vip/figma/settlement.jpg',
  enterprise: '/vip/figma/enterprise.jpg',
  ecoMobile: '/vip/figma/eco-mobile.jpg',
  ecoTablet: '/vip/figma/eco-tablet.jpg',
  ecoMinipc: '/vip/figma/eco-minipc.jpg',
} as const

export const VIP_FIGMA_PLATFORMS = SOCIAL_PLATFORM_OPTIONS.map(option => ({
  id: option.value,
  label: option.label,
  icon: PLATFORM_BRAND_ICONS[option.value] as IconName,
}))
