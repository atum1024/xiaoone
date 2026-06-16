import { motion, useScroll, useTransform, useSpring } from 'motion/react'
import { useRef, MouseEvent, useState } from 'react'
import { Smartphone, Monitor, Tablet } from 'lucide-react'
import { ImageWithFallback } from '../../components/figma/ImageWithFallback'
import { useSitePreferences } from '../../sitePreferences'
import { VIP_FIGMA_IMAGES } from '../vipFigmaAssets'
import { XiaooneBrandMark } from '../components/XiaooneBrandMark'

function TiltCard({ children, className }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const maxRotate = 10
    const rotX = ((y - centerY) / centerY) * -maxRotate
    const rotY = ((x - centerX) / centerX) * maxRotate

    setRotateX(rotX)
    setRotateY(rotY)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX, rotateY }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ perspective: 1000 }}
      className={`relative ${className}`}
    >
      <div className="w-full h-full pointer-events-none transform-style-3d">
        {children}
      </div>
    </motion.div>
  )
}

export function EcosystemSection() {
  const { t } = useSitePreferences()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  const yParallax = useTransform(smoothProgress, [0, 1], [100, -100])
  const rotate3d = useTransform(smoothProgress, [0, 0.5, 1], [10, 0, -10])

  const items = [
    {
      id: 'mobile',
      title: t({ zh: '移动端 App', en: 'Mobile apps' }),
      desc: t({
        zh: 'iOS与Android原生应用，随时随地掌控全局',
        en: 'Native iOS and Android apps to stay in control anywhere',
      }),
      image: VIP_FIGMA_IMAGES.ecoMobile,
      icon: <Smartphone className="w-6 h-6" />,
      colSpan: 'md:col-span-1',
      showBrand: false,
    },
    {
      id: 'tablet',
      title: t({ zh: '自有品牌平板', en: 'Branded tablets' }),
      desc: t({
        zh: '大屏视野，专为创作者与管理者定制的交互体验',
        en: 'Large-screen experiences tailored for creators and managers',
      }),
      image: VIP_FIGMA_IMAGES.ecoTablet,
      icon: <Tablet className="w-6 h-6" />,
      colSpan: 'md:col-span-1',
      showBrand: true,
    },
    {
      id: 'minipc',
      title: t({ zh: '自有品牌迷你主机', en: 'Branded mini PCs' }),
      desc: t({
        zh: '桌面级算力，小巧机身蕴藏无限潜能',
        en: 'Desktop-grade power in a compact form factor',
      }),
      image: VIP_FIGMA_IMAGES.ecoMinipc,
      icon: <Monitor className="w-6 h-6" />,
      colSpan: 'md:col-span-2',
      showBrand: true,
    },
  ]

  return (
    <section ref={containerRef} className="py-32 relative overflow-hidden bg-[#0f1117]">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-50">
        <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] bg-violet-600/20 blur-[150px] rounded-full mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] bg-cyan-600/20 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="mb-20 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-cyan-400 font-mono text-xl tracking-wider mb-4 flex items-center justify-center gap-3"
          >
            <span className="w-12 h-[1px] bg-cyan-400/50" />
            13 // ECOSYSTEM
            <span className="w-12 h-[1px] bg-cyan-400/50" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
          >
            {t({ zh: '全端覆盖，', en: 'Every device,' })}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              {t({ zh: '即将震撼上线', en: ' launching soon' })}
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400"
          >
            {t({
              zh: '从指尖到桌面，我们正在构建属于您的无缝数字体验。iOS 与 Android 客户端、自有品牌平板及迷你主机，只为您突破界限。',
              en: 'From mobile to desktop, we are building a seamless digital experience — iOS and Android clients, branded tablets, and mini PCs to break every boundary.',
            })}
          </motion.p>
        </div>

        <div className="w-full overflow-hidden mb-24 py-4 relative border-y border-white/5">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0f1117] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0f1117] to-transparent z-10" />
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 20 }}
            className="flex whitespace-nowrap items-center gap-8 text-2xl font-black text-white/5 tracking-widest uppercase"
          >
            <span>COMING SOON</span> <span>•</span> <span>IOS & ANDROID</span> <span>•</span> <span>MINI PC</span> <span>•</span> <span>TABLET</span> <span>•</span>
            <span>COMING SOON</span> <span>•</span> <span>IOS & ANDROID</span> <span>•</span> <span>MINI PC</span> <span>•</span> <span>TABLET</span> <span>•</span>
            <span>COMING SOON</span> <span>•</span> <span>IOS & ANDROID</span> <span>•</span> <span>MINI PC</span> <span>•</span> <span>TABLET</span> <span>•</span>
            <span>COMING SOON</span> <span>•</span> <span>IOS & ANDROID</span> <span>•</span> <span>MINI PC</span> <span>•</span> <span>TABLET</span> <span>•</span>
          </motion.div>
        </div>

        <motion.div
          style={{ y: yParallax, rotateX: rotate3d }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto perspective-[2000px]"
        >
          {items.map((item) => (
            <TiltCard key={item.id} className={`${item.colSpan} h-[400px] md:h-[500px]`}>
              <div className="w-full h-full rounded-3xl border border-white/10 bg-[#161922]/80 backdrop-blur-xl overflow-hidden group relative flex flex-col justify-end">
                <div className="absolute inset-0 z-0">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-30 saturate-50 group-hover:saturate-100 group-hover:opacity-100 transition-all duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/80 to-[#0f1117]/20 transition-opacity duration-700 ease-out group-hover:opacity-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/40 to-transparent opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100" />
                </div>

                <div className="relative z-10 p-8 md:p-12 transform transition-transform duration-500 translate-y-4 group-hover:translate-y-0 flex-1 flex flex-col justify-end">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg group-hover:scale-110 transition-transform duration-500">
                      {item.icon}
                    </div>
                    {item.showBrand && (
                      <div className="opacity-70 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                        <XiaooneBrandMark variant="square" className="h-9 w-9" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-3 tracking-tight drop-shadow-md">
                    {item.title}
                  </h3>
                  <p className="text-lg text-slate-300 max-w-md opacity-80 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-sm">
                    {item.desc}
                  </p>
                </div>

                <div className="absolute top-6 right-6 px-4 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-400 text-xs font-medium tracking-wider backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                  COMING SOON
                </div>
              </div>
            </TiltCard>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
