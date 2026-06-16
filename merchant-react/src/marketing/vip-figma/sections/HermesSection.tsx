import { motion } from 'motion/react'
import { Server, Bot, BarChart } from 'lucide-react'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useSitePreferences } from '../../sitePreferences'
import { VIP_FIGMA_IMAGES } from '../vipFigmaAssets'

export function HermesSection() {
  const { t } = useSitePreferences()

  const features = [
    {
      icon: <Server className="text-cyan-600" />,
      title: t({ zh: '高性能独享算力', en: 'Dedicated high-performance compute' }),
    },
    {
      icon: <Bot className="text-violet-600" />,
      title: t({ zh: '24h 自动化办公', en: '24/7 automated operations' }),
    },
    {
      icon: <BarChart className="text-teal-600" />,
      title: t({ zh: '全景竞品监控', en: 'Full competitor monitoring' }),
    },
  ]

  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2 w-full">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-cyan-600 font-mono text-xl tracking-wider mb-4"
            >
              06 // HERMES SERVERS
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold mb-6 text-slate-900"
            >
              {t({ zh: 'Hermes 高性能服务器', en: 'Hermes high-performance servers' })}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-600 mb-10"
            >
              {t({
                zh: '定制顾问 + AI 全自动工作流。为您的独立站和品牌提供 24h 不间断的自动化运营与竞品分析算力支持。',
                en: 'Custom advisors plus fully automated AI workflows — 24/7 operations and competitor analysis for your store and brand.',
              })}
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-w-0"
                >
                  <div className="w-12 h-12 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="font-semibold text-slate-800 text-sm leading-snug whitespace-nowrap">{item.title}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="md:w-1/2 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl shadow-cyan-900/10 border border-slate-200/50"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent z-10" />
              <ImageWithFallback
                src={VIP_FIGMA_IMAGES.hermes}
                alt="Futuristic Server Room"
                className="w-full h-[600px] object-cover"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
