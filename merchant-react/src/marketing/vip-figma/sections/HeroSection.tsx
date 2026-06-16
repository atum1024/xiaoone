import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useRef, useState } from 'react'
import { useSitePreferences } from '../../sitePreferences'
import { VIP_FIGMA_IMAGES } from '../vipFigmaAssets'
import { XiaooneBrandMark } from '../components/XiaooneBrandMark'
import { getUserRegisterHref } from '../../../lib/publicSite'

export function HeroSection() {
  const { t, tKey } = useSitePreferences()
  const containerRef = useRef<HTMLDivElement>(null)
  const registerHref = getUserRegisterHref()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    })
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src={VIP_FIGMA_IMAGES.heroEarth}
          alt="Glowing Earth"
          className="w-full h-full object-cover opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1117]/40 via-[#0f1117]/60 to-[#0f1117] pointer-events-none" />
      </div>

      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: 'linear' }}
          className="w-[800px] h-[800px] rounded-full border border-cyan-500/20 absolute"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 200, repeat: Infinity, ease: 'linear' }}
          className="w-[1200px] h-[1200px] rounded-full border border-violet-500/20 absolute"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="w-[600px] h-[600px] absolute"
        >
          <div className="w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_20px_#22d3ee] absolute -top-2 left-1/2 -translate-x-1/2" />
        </motion.div>
      </div>

      <div className="relative z-10 container mx-auto px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <XiaooneBrandMark variant="square" className="h-5 w-5" />
          <span className="text-sm font-medium text-cyan-50 tracking-wider">
            {t({ zh: 'VIP 首映', en: 'VIP PREMIERE' })}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mb-6"
        >
          <XiaooneBrandMark variant="horizontal" className="h-10 md:h-14 mx-auto w-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35 }}
          className="mb-8"
        >
          <XiaooneBrandMark variant="slogan" className="h-6 md:h-8 mx-auto w-auto opacity-90" />
        </motion.div>

        <motion.h1
          className="text-6xl md:text-8xl font-bold tracking-tight mb-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          style={{
            transform: `translate(${mousePosition.x * -0.02}px, ${mousePosition.y * -0.02}px)`,
          }}
        >
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white pb-2">
            {tKey('marketing.vipFigma.hero.line1')}
          </span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-violet-500">
            {tKey('marketing.vipFigma.hero.line2')}
          </span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-12 font-light leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          {tKey('marketing.vipFigma.hero.subtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <a
            href={registerHref}
            className="vip-figma-cta group relative inline-flex items-center px-8 py-4 rounded-full font-semibold text-lg overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-300 to-violet-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="vip-figma-cta__label relative z-10 flex items-center gap-3">
              {tKey('marketing.vipFigma.hero.cta')}
              <XiaooneBrandMark variant="square" tone="on-light" className="h-6 w-6" />
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        <span className="text-xs uppercase tracking-widest">
          {t({ zh: '向下滚动探索', en: 'Scroll to explore' })}
        </span>
        <motion.div
          className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent"
          animate={{ scaleY: [0, 1, 0], translateY: [0, 20, 40] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  )
}
