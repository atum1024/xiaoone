import { motion } from 'motion/react'
import { MessageSquare, Globe2, Sparkles } from 'lucide-react'
import { useSitePreferences } from '../../sitePreferences'

export function CustomerServiceSection() {
  const { t } = useSitePreferences()

  const messages = [
    {
      text: 'Hello, I need help with my order.',
      lang: 'en',
      translation: t({ zh: '你好，我的订单需要帮助。', en: 'Hello, I need help with my order.' }),
    },
    {
      text: 'Bonjour, je voudrais savoir...',
      lang: 'fr',
      translation: t({ zh: '你好，我想了解...', en: 'Hello, I would like to know...' }),
    },
    {
      text: 'Hola, ¿cómo puedo pagar?',
      lang: 'es',
      translation: t({ zh: '你好，我该如何支付？', en: 'Hello, how can I pay?' }),
    },
  ]

  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2 w-full order-2 md:order-1">
            <div className="relative max-w-lg mx-auto">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 rounded-3xl blur-xl" />
              <div className="relative bg-[#1a1d24] border border-white/10 rounded-3xl p-6 h-[400px] md:h-[500px] flex flex-col justify-end overflow-hidden">
                <div className="space-y-6">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + idx * 0.4 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                          {msg.lang.toUpperCase()}
                        </div>
                        <div>
                          <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-2xl rounded-tl-none mb-2 inline-block">
                            {msg.text}
                          </div>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            whileInView={{ opacity: 1, height: 'auto' }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 + idx * 0.4 }}
                            className="bg-cyan-900/40 text-cyan-200 px-4 py-2 rounded-2xl rounded-bl-none text-sm border border-cyan-500/20 inline-block ml-4"
                          >
                            <Sparkles className="w-3 h-3 inline mr-1 text-cyan-400" />
                            {msg.translation}
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="md:w-1/2 w-full order-1 md:order-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-cyan-400 font-mono text-xl tracking-wider mb-4"
            >
              09 // CUSTOMER SUPPORT
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold mb-6 text-balance"
            >
              {t({ zh: '全球客服平台 AI 回复与实时翻译', en: 'Global support with AI replies and live translation' })}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-400 mb-10 text-pretty max-w-xl"
            >
              {t({
                zh: '无惧语言壁垒。内置多语言实时翻译与 AI 辅助回复，和全世界客户畅通沟通。',
                en: 'Break language barriers with real-time translation and AI-assisted replies for customers worldwide.',
              })}
            </motion.p>

            <div className="flex flex-col sm:flex-row sm:flex-nowrap gap-3 sm:gap-6">
              <div className="flex items-center gap-2 text-cyan-300 whitespace-nowrap">
                <Globe2 className="w-5 h-5 shrink-0" />
                {t({ zh: '100+ 语言支持', en: '100+ languages' })}
              </div>
              <div className="flex items-center gap-2 text-violet-300 whitespace-nowrap">
                <MessageSquare className="w-5 h-5 shrink-0" />
                {t({ zh: '智能情绪分析', en: 'Sentiment analysis' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
