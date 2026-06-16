import { motion } from 'motion/react'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useSitePreferences } from '../../sitePreferences'
import { VIP_FIGMA_IMAGES } from '../vipFigmaAssets'

export function CreationSection() {
  const { t } = useSitePreferences()

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-violet-600 font-mono text-xl tracking-wider mb-4"
          >
            05 // CREATION
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold mb-6 text-slate-900"
          >
            {t({ zh: '世界一流的', en: 'World-class' })}
            <br />
            {t({ zh: '多媒体创作', en: 'multimedia creation' })}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600"
          >
            {t({
              zh: '图片、视频、文案，一键反推热点提示词。让您的品牌素材瞬间具备国际一流水准。',
              en: 'Images, video, and copy — reverse-engineer trending prompts in one click for world-class brand assets.',
            })}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="rounded-[2.5rem] overflow-hidden relative h-[600px] group"
          >
            <ImageWithFallback
              src={VIP_FIGMA_IMAGES.creation1}
              alt="Skincare Product Poster"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-10">
              <div>
                <span className="text-white/80 font-mono text-sm mb-2 block">AI GENERATED</span>
                <h3 className="text-white text-2xl font-semibold">
                  {t({ zh: '护肤品海报样板', en: 'Skincare poster sample' })}
                </h3>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-rows-2 gap-8 h-[600px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="rounded-[2.5rem] overflow-hidden relative group"
            >
              <ImageWithFallback
                src={VIP_FIGMA_IMAGES.creation2}
                alt="Sneaker Fashion Ad"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                <div>
                  <span className="text-white/80 font-mono text-sm mb-1 block">AI GENERATED</span>
                  <h3 className="text-white text-xl font-semibold">
                    {t({ zh: '潮鞋创意广告', en: 'Sneaker creative ad' })}
                  </h3>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="rounded-[2.5rem] bg-indigo-50 p-10 flex flex-col justify-center"
            >
              <h3 className="text-2xl font-semibold text-indigo-900 mb-4">
                {t({ zh: '"一键反推热点提示词"', en: '"Reverse-engineer trending prompts"' })}
              </h3>
              <p className="text-indigo-700/80 leading-relaxed mb-6">
                {t({
                  zh: '无需枯燥学习，拖入全网爆款即可提取风格、布光、材质，融合自有商品一键成片。',
                  en: 'Drop in viral content to extract style, lighting, and materials — then blend your product into finished assets.',
                })}
              </p>
              <div className="w-12 h-1 bg-indigo-500 rounded-full" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
