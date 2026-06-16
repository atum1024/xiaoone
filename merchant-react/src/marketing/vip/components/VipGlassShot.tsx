import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useIsMobile, usePrefersReducedMotion } from '../vipMotion'

interface VipGlassShotProps {
  src: string
  alt: string
  priority?: boolean
  tilt?: 'left' | 'right' | 'none'
}

export function VipGlassShot({ src, alt, priority = false, tilt = 'right' }: VipGlassShotProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const mobile = useIsMobile()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotateY = useTransform(scrollYProgress, [0, 1], tilt === 'left' ? [8, -6] : tilt === 'right' ? [-8, 6] : [0, 0])
  const y = useTransform(scrollYProgress, [0, 1], [24, -24])

  const motionProps = reduced || mobile
    ? {}
    : { style: { rotateY, y }, whileHover: { scale: 1.02 } }

  return (
    <motion.div
      ref={ref}
      className={['vip-glass-shot', tilt !== 'none' && `vip-glass-shot--${tilt}`].filter(Boolean).join(' ')}
      {...motionProps}
    >
      <div className="vip-glass-shot__glow" aria-hidden />
      <img
        src={src}
        alt={alt}
        className="vip-glass-shot__img"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={(e) => {
          const img = e.currentTarget
          if (!img.dataset.fallback) {
            img.dataset.fallback = '1'
            img.src = '/vip/bg/luminous-workspace.png'
          }
        }}
      />
    </motion.div>
  )
}
