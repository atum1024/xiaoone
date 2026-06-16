import { motion } from 'motion/react'
import { Award, Percent, RefreshCw } from 'lucide-react'
import { useSitePreferences } from '../../sitePreferences'

export function PartnersSection() {
  const { t } = useSitePreferences()

  const benefits = [
    {
      icon: <Award className="text-amber-400" />,
      title: t({ zh: '算力点奖励', en: 'Compute credit rewards' }),
      desc: t({ zh: '邀请注册即可获得丰厚算力点', en: 'Earn generous compute credits for every referral signup' }),
    },
    {
      icon: <Percent className="text-emerald-400" />,
      title: t({ zh: '最低六折券', en: 'Up to 40% off coupons' }),
      desc: t({ zh: '专享采购折扣，大幅降低成本', en: 'Exclusive procurement discounts to cut costs' }),
    },
    {
      icon: <RefreshCw className="text-cyan-400" />,
      title: t({ zh: '差价补回', en: 'Spread rebates' }),
      desc: t({ zh: '专属收款账户返点流向解构', en: 'Dedicated payout accounts with transparent rebate flows' }),
    },
  ]

  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-amber-400 font-mono text-xl tracking-wider mb-4"
          >
            12 // PARTNERS
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            {t({ zh: '超级伙伴计划', en: 'Super partner program' })}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400"
          >
            {t({
              zh: '与我们一起成长。成为超级伙伴，享受行业最高级别的返点与专属扶持。',
              en: 'Grow with us. Become a super partner for top-tier rebates and dedicated support.',
            })}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-8 rounded-3xl text-center relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 mx-auto bg-black/30 rounded-2xl flex items-center justify-center mb-6 border border-white/5">
                {benefit.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-white">{benefit.title}</h3>
              <p className="text-slate-400">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
