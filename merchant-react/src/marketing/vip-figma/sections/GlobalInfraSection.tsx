import { motion } from 'motion/react'
import { Zap, Smartphone, CreditCard } from 'lucide-react'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useSitePreferences } from '../../sitePreferences'
import { VIP_FIGMA_IMAGES } from '../vipFigmaAssets'

export function GlobalInfraSection() {
  const { t } = useSitePreferences()

  const cards = [
    {
      icon: <Zap className="w-8 h-8 text-cyan-400" />,
      title: t({ zh: '全球加速网络', en: 'Global acceleration network' }),
      desc: t({
        zh: '专线直连，毫秒级访问全球主流平台与社交网络。',
        en: 'Dedicated lines deliver millisecond access to major global platforms and social networks.',
      }),
    },
    {
      icon: <Smartphone className="w-8 h-8 text-teal-400" />,
      title: t({ zh: '美国原生号码', en: 'US native phone numbers' }),
      desc: t({
        zh: '一键获取真实美国号码，无缝注册验证各类海外服务。',
        en: 'Get real US numbers in one click for seamless overseas service registration and verification.',
      }),
    },
    {
      icon: <CreditCard className="w-8 h-8 text-violet-400" />,
      title: t({ zh: '广告支付卡', en: 'Ad payment cards' }),
      desc: t({
        zh: '无限开卡，支持 FB/Google/TikTok 等多平台广告扣费。',
        en: 'Unlimited card issuance for ad spend across FB, Google, TikTok, and more.',
      }),
    },
  ]

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
        <ImageWithFallback
          src={VIP_FIGMA_IMAGES.infra}
          alt="Network Base"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0f1117]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-cyan-400 font-mono text-xl tracking-wider mb-4"
          >
            03 // INFRASTRUCTURE
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            {t({ zh: '全备的全球化', en: 'Complete global' })}
            <br />
            {t({ zh: '基础能力', en: 'infrastructure' })}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400"
          >
            {t({
              zh: '网络、通信、支付，一站式解决出海基建痛点。',
              en: 'Network, communications, and payments — one stop for go-global infrastructure.',
            })}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-6 p-4 bg-white/5 rounded-2xl inline-block">
                {card.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-white">{card.title}</h3>
              <p className="text-slate-400 leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
