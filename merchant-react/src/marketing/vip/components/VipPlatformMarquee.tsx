import { motion } from 'motion/react'
import { VIP_PLATFORMS } from '../vipContent'
import { usePrefersReducedMotion } from '../vipMotion'
import { useSitePreferences } from '../../sitePreferences'

export function VipPlatformMarquee() {
  const { t } = useSitePreferences()
  const reduced = usePrefersReducedMotion()
  const items = [...VIP_PLATFORMS, ...VIP_PLATFORMS]

  return (
    <div className="vip-marquee" aria-label={t({ zh: '13 个海外社交平台', en: '13 overseas social platforms' })}>
      <div className="vip-marquee__fade vip-marquee__fade--left" aria-hidden />
      <div className="vip-marquee__fade vip-marquee__fade--right" aria-hidden />
      <motion.div
        className="vip-marquee__track"
        animate={reduced ? undefined : { x: ['0%', '-50%'] }}
        transition={reduced ? undefined : { duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((platform, i) => (
          <span key={`${platform.id}-${i}`} className="vip-marquee__pill">
            <span className="vip-marquee__dot" aria-hidden />
            {platform.label}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
