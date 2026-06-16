import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { useSitePreferences } from '../../sitePreferences'

export function DevSection() {
  const { t } = useSitePreferences()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const tiltX = useTransform(scrollYProgress, [0, 1], [20, -20])
  const tiltY = useTransform(scrollYProgress, [0, 1], [20, -20])

  return (
    <section ref={containerRef} className="py-32 relative overflow-hidden bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-teal-600 font-mono text-xl tracking-wider mb-4"
          >
            07 // DEVELOPMENT
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6 text-slate-900"
          >
            {t({ zh: '网站 / 软件 / App 开发', en: 'Website / software / app development' })}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600"
          >
            {t({
              zh: '独立站、品牌官网、帮助中心。多端设备适配，提供极致流畅的用户体验。',
              en: 'Standalone stores, brand sites, and help centers — responsive across devices with a smooth experience.',
            })}
          </motion.p>
        </div>

        <div className="relative h-[600px] flex items-center justify-center perspective-[1000px]">
          <motion.div
            style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: 'preserve-3d' }}
            className="relative w-full max-w-4xl h-full"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[800px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="p-8 flex gap-8">
                <div className="w-1/4 space-y-4">
                  <div className="h-8 bg-slate-100 rounded-md w-full" />
                  <div className="h-8 bg-slate-100 rounded-md w-3/4" />
                  <div className="h-8 bg-slate-100 rounded-md w-5/6" />
                </div>
                <div className="w-3/4 space-y-4">
                  <div className="h-48 bg-slate-50 rounded-xl border border-slate-100" />
                  <div className="flex gap-4">
                    <div className="h-32 bg-slate-50 rounded-xl border border-slate-100 w-1/2" />
                    <div className="h-32 bg-slate-50 rounded-xl border border-slate-100 w-1/2" />
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="hidden md:block absolute -right-12 top-20 w-64 p-6 bg-white rounded-2xl shadow-xl border border-slate-100"
            >
              <Smartphone className="text-teal-500 mb-4 w-8 h-8" />
              <div className="h-4 bg-slate-100 rounded w-full mb-2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </motion.div>

            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="hidden md:block absolute -left-12 bottom-20 w-64 p-6 bg-white rounded-2xl shadow-xl border border-slate-100"
            >
              <Monitor className="text-cyan-500 mb-4 w-8 h-8" />
              <div className="h-4 bg-slate-100 rounded w-full mb-2" />
              <div className="h-4 bg-slate-100 rounded w-4/5" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
