import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useSitePreferences } from '../../sitePreferences'

export function SubjectSection() {
  const { t } = useSitePreferences()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], ['20%', '-20%'])
  const opacity = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.1])

  return (
    <section ref={containerRef} className="relative min-h-[80vh] flex items-center justify-center overflow-hidden py-32">
      <motion.div
        style={{ y, opacity, scale }}
        className="container mx-auto px-6 text-center z-10"
      >
        <div className="inline-block mb-6">
          <span className="text-violet-400 font-mono text-xl tracking-wider">02 // MISSION</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-bold leading-tight max-w-5xl mx-auto">
          {t({ zh: '让普通人面向', en: 'Help everyday founders reach' })}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
            {t({ zh: '全球窗口', en: 'a global window' })}
          </span>
          {t({ zh: '创业，', en: ' and build,' })}
          <br />
          {t({ zh: '售卖产品与服务。', en: 'selling products and services.' })}
        </h2>
      </motion.div>

      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          style={{ opacity: useTransform(scrollYProgress, [0.3, 0.5], [0, 0.1]) }}
          className="absolute left-[10%] right-[10%] top-[20%] bottom-[20%] border border-white/20 rounded-3xl"
        />
      </div>
    </section>
  )
}
