import { motion } from 'motion/react'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useSitePreferences } from '../../sitePreferences'
import { VIP_FIGMA_IMAGES } from '../vipFigmaAssets'
import { Box, FileText, Receipt } from 'lucide-react'

export function EnterpriseSection() {
  const { t } = useSitePreferences()

  const steps = [
    {
      icon: <Box className="w-6 h-6" />,
      title: t({ zh: '跨境物流', en: 'Cross-border logistics' }),
      desc: t({ zh: '全球仓储与头程配送', en: 'Global warehousing and first-mile delivery' }),
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: t({ zh: '关关易报关', en: 'Guanguanyi customs filing' }),
      desc: t({ zh: '智能秒级通关申报', en: 'Smart second-level customs declarations' }),
    },
    {
      icon: <Receipt className="w-6 h-6" />,
      title: t({ zh: '阳光退税', en: 'Compliant tax refunds' }),
      desc: t({ zh: '合规获取出口退税', en: 'Compliant export tax refund processing' }),
    },
  ]

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src={VIP_FIGMA_IMAGES.enterprise}
          alt="Logistics Container Ship"
          className="w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1117] via-[#0f1117]/80 to-transparent" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-violet-400 font-mono text-xl tracking-wider mb-4"
          >
            11 // ENTERPRISE SERVICES
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            {t({ zh: '企业企服全链路', en: 'Full-stack enterprise services' })}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400"
          >
            {t({
              zh: '从物流配送、报关通关到出口退税，打造闭环的 B2B 企服体系。',
              en: 'From logistics and customs to export tax refunds — a closed-loop B2B service stack.',
            })}
          </motion.p>
        </div>

        <div className="relative max-w-4xl">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full overflow-hidden hidden md:block">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 w-full origin-left"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.5 }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + idx * 0.3 }}
                className="relative bg-[#1a1d24] border border-white/10 p-8 rounded-3xl z-10 hover:border-cyan-500/50 transition-colors"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20">
                  {step.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
