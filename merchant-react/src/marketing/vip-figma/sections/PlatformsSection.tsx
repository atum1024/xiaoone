import { motion } from 'motion/react'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { Icon } from '../../../components/Icon'
import { useSitePreferences } from '../../sitePreferences'
import { VIP_FIGMA_IMAGES, VIP_FIGMA_PLATFORMS } from '../vipFigmaAssets'

export function PlatformsSection() {
  const { tKey } = useSitePreferences()
  const marqueeItems = [...VIP_FIGMA_PLATFORMS, ...VIP_FIGMA_PLATFORMS]

  return (
    <section className="py-32 relative overflow-hidden bg-[#0f1117]">
      <div className="container mx-auto px-6 relative z-10 mb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-teal-400 font-mono text-xl tracking-wider mb-4"
        >
          04 // SOCIAL REACH
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold mb-6"
        >
          {tKey('marketing.vipFigma.platforms.title')}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-xl text-slate-400 max-w-2xl mx-auto"
        >
          {tKey('marketing.vipFigma.platforms.subtitle')}
        </motion.p>
      </div>

      <div className="relative flex overflow-x-hidden group mb-20">
        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#0f1117] to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#0f1117] to-transparent z-10" />

        <motion.div
          className="flex whitespace-nowrap w-max items-center"
          animate={{ x: [0, '-50%'] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 30,
              ease: 'linear',
            },
          }}
        >
          {marqueeItems.map((platform, idx) => (
            <div
              key={`${platform.id}-${idx}`}
              className="mx-8 flex items-center gap-4 text-2xl md:text-4xl font-bold text-white/30 hover:text-white/70 transition-colors cursor-default"
            >
              <Icon name={platform.icon} size={36} className="shrink-0" />
              <span>{platform.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] to-transparent z-10" />
          <ImageWithFallback
            src={VIP_FIGMA_IMAGES.social}
            alt="Social Media Marketing"
            className="w-full h-[600px] object-cover opacity-80"
          />
        </motion.div>
      </div>
    </section>
  )
}
