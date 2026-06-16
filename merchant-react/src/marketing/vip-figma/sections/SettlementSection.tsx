import { motion } from 'motion/react'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { ShieldCheck, ArrowRightLeft } from 'lucide-react'
import { PartnerBrandMark } from '../../../components/PartnerBrandMark'
import { useSitePreferences } from '../../sitePreferences'
import { VIP_FIGMA_IMAGES } from '../vipFigmaAssets'

export function SettlementSection() {
  const { t } = useSitePreferences()

  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6 text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-teal-400 font-mono text-xl tracking-wider mb-4"
        >
          10 // GLOBAL SETTLEMENT
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold mb-6"
        >
          {t({ zh: '安全合规的全球结汇', en: 'Secure, compliant global settlement' })}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-xl text-slate-400 mb-16 flex items-center justify-center gap-3 flex-wrap"
        >
          <span className="inline-flex items-center gap-2">
            <PartnerBrandMark brand="wechat" size={24} />
            {t({ zh: '微信', en: 'WeChat' })}
          </span>
          <span>/</span>
          <span className="inline-flex items-center gap-2">
            <PartnerBrandMark brand="alipay" size={24} />
            {t({ zh: '支付宝', en: 'Alipay' })}
          </span>
          <span>
            {t({
              zh: '直接收款。联合国际持牌结算机构，资金流向全程透明可追溯。',
              en: 'Direct payouts. Licensed global settlement partners with fully traceable fund flows.',
            })}
          </span>
        </motion.p>

        <div className="relative mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl overflow-hidden h-[400px] relative border border-white/10"
          >
            <ImageWithFallback
              src={VIP_FIGMA_IMAGES.settlement}
              alt="Global Finance Flow"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-transparent to-transparent" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-8 bg-black/40 p-6 rounded-2xl backdrop-blur-md border border-white/10">
                <div className="text-center">
                  <div className="text-3xl mb-2">🇺🇸 $</div>
                  <div className="text-sm text-slate-300">
                    {t({ zh: 'USD 收款', en: 'USD collection' })}
                  </div>
                </div>

                <div className="relative w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-cyan-400 w-1/2"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                  <ArrowRightLeft className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400 bg-black/40 rounded-full p-1 w-6 h-6" />
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <PartnerBrandMark brand="wechat" size={28} />
                    <PartnerBrandMark brand="alipay" size={28} />
                  </div>
                  <div className="text-sm text-slate-300">
                    {t({ zh: '微信 / 支付宝入账', en: 'WeChat / Alipay payout' })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center gap-8 text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" />
            <span>{t({ zh: '持牌机构担保', en: 'Licensed partner guarantee' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" />
            <span>{t({ zh: 'T+1 极速到账', en: 'T+1 fast settlement' })}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
