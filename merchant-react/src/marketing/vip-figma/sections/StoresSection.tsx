import { motion } from 'motion/react'
import { CheckCircle } from 'lucide-react'
import { Icon } from '../../../components/Icon'
import type { IconName } from '../../../components/Icon'
import { useSitePreferences } from '../../sitePreferences'

const stores: { name: string; icon: IconName; color: string }[] = [
  { name: 'App Store', icon: 'brand-appstore', color: 'from-slate-700 to-slate-900' },
  { name: 'Google Play', icon: 'brand-googleplay', color: 'from-emerald-600 to-teal-900' },
  { name: 'Huawei', icon: 'brand-huawei', color: 'from-red-600 to-rose-900' },
  { name: 'Xiaomi', icon: 'brand-xiaomi', color: 'from-orange-500 to-amber-700' },
]

export function StoresSection() {
  const { t } = useSitePreferences()

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-violet-600/10 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-cyan-600/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-violet-400 font-mono text-xl tracking-wider mb-4"
          >
            08 // APP STORES
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            {t({ zh: '备案与上架绿通顾问', en: 'Filing and app-store launch advisory' })}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400"
          >
            {t({
              zh: '网站、App、小程序一站式合规备案，助力 Apple/Google/Huawei/Xiaomi 全平台上架。',
              en: 'One-stop compliance filing for websites, apps, and mini programs — launch on Apple, Google, Huawei, and Xiaomi.',
            })}
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stores.map((store, idx) => (
            <motion.div
              key={store.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + idx * 0.1, type: 'spring' }}
              className={`relative overflow-hidden rounded-3xl aspect-square flex flex-col items-center justify-center bg-gradient-to-br ${store.color} border border-white/10 group cursor-pointer`}
            >
              <div className="text-white mb-4 group-hover:scale-110 transition-transform">
                <Icon name={store.icon} size={48} />
              </div>
              <span className="font-semibold text-white/90">{store.name}</span>

              <motion.div
                initial={{ opacity: 0, scale: 2 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 + idx * 0.2, type: 'spring' }}
                className="absolute top-4 right-4"
              >
                <CheckCircle className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_10px_#34d399]" />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
