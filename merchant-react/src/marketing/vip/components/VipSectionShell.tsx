import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { VipSectionTone } from '../vipContent'
import { fadeUp, staggerContainer } from '../vipMotion'

interface VipSectionShellProps {
  id: string
  tone: VipSectionTone
  index: number
  bgImage?: string
  children: ReactNode
  className?: string
}

export function VipSectionShell({
  id,
  tone,
  index,
  bgImage,
  children,
  className,
}: VipSectionShellProps) {
  const indexLabel = String(index).padStart(2, '0')

  return (
    <section
      id={id}
      className={['vip-section', `vip-section--${tone}`, className].filter(Boolean).join(' ')}
      data-vip-tone={tone}
    >
      {bgImage ? (
        <div
          className="vip-section__bg"
          style={{ backgroundImage: `url(${bgImage})` }}
          aria-hidden
        />
      ) : null}
      <div className="vip-section__aurora" aria-hidden />
      <div className="vip-section__noise" aria-hidden />

      <motion.div
        className="vip-section__inner"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <motion.span className="vip-section__index" variants={fadeUp}>
          {indexLabel}
        </motion.span>
        {children}
      </motion.div>
    </section>
  )
}
