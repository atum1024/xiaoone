import { motion, useScroll, useTransform } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { useRef } from 'react'
import { useSitePreferences } from '../../sitePreferences'
import { XiaooneBrandMark } from '../components/XiaooneBrandMark'
import { XiaooneColorfulSlogan } from '../components/XiaooneColorfulSlogan'
import { getUserRegisterHref } from '../../../lib/publicSite'

export function FinalCtaSection() {
  const { t, tKey } = useSitePreferences()
  const containerRef = useRef<HTMLDivElement>(null)
  const registerHref = getUserRegisterHref()
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end end'],
  })

  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.5, 1])

  return (
    <section ref={containerRef} className="py-40 relative overflow-hidden">
      <motion.div
        style={{ scale, opacity }}
        className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
      >
        <div className="absolute w-[80vw] h-[80vw] bg-cyan-500/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute w-[60vw] h-[60vw] bg-violet-600/30 blur-[150px] rounded-full mix-blend-screen translate-x-1/4" />
      </motion.div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-4 h-4 text-violet-400" />
          <XiaooneBrandMark variant="square" className="h-5 w-5" />
          <span className="text-sm font-medium text-violet-50 tracking-wider">
            {t({ zh: '准备启航', en: 'READY TO LAUNCH' })}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-10"
        >
          <XiaooneColorfulSlogan className="text-lg md:text-2xl" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-6xl md:text-8xl font-bold tracking-tight mb-12"
        >
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 pb-2">
            {tKey('marketing.vipFigma.finalCta.line1')}
          </span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-violet-500">
            {tKey('marketing.vipFigma.finalCta.line2')}
          </span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <a
            href={registerHref}
            className="vip-figma-cta group relative inline-flex items-center justify-center px-10 py-5 rounded-full font-bold text-xl overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:shadow-[0_0_80px_rgba(34,211,238,0.5)] transition-shadow"
            aria-label={tKey('marketing.vipFigma.finalCta.aria')}
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-300 to-violet-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <XiaooneBrandMark variant="square" tone="on-light" className="relative z-10 h-9 w-9" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
