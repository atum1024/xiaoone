import { motion, useScroll, useSpring } from 'motion/react'
import { useEffect, useRef } from 'react'
import { SitePreferencesProvider, useSitePreferences } from '../sitePreferences'
import { HeroSection } from './sections/HeroSection'
import { SubjectSection } from './sections/SubjectSection'
import { GlobalInfraSection } from './sections/GlobalInfraSection'
import { PlatformsSection } from './sections/PlatformsSection'
import { CreationSection } from './sections/CreationSection'
import { HermesSection } from './sections/HermesSection'
import { DevSection } from './sections/DevSection'
import { StoresSection } from './sections/StoresSection'
import { CustomerServiceSection } from './sections/CustomerServiceSection'
import { SettlementSection } from './sections/SettlementSection'
import { EnterpriseSection } from './sections/EnterpriseSection'
import { PartnersSection } from './sections/PartnersSection'
import { EcosystemSection } from './sections/EcosystemSection'
import { FinalCtaSection } from './sections/FinalCtaSection'
import './vip-figma.css'

function VipFigmaBody() {
  const { tKey } = useSitePreferences()
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  useEffect(() => {
    document.documentElement.classList.add('vip-figma-page')
    const previousTitle = document.title
    document.title = tKey('marketing.vipFigma.pageTitle')
    return () => {
      document.documentElement.classList.remove('vip-figma-page')
      document.title = previousTitle
    }
  }, [tKey])

  return (
    <div
      ref={containerRef}
      className="bg-[#0f1117] text-white min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-50 overflow-hidden"
    >
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-violet-500 z-50 origin-left"
        style={{ scaleX: smoothProgress }}
      />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/30 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-cyan-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[40%] bg-teal-600/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col">
        <HeroSection />
        <SubjectSection />

        <div className="relative bg-[#0f1117]">
          <GlobalInfraSection />
        </div>

        <PlatformsSection />

        <div className="bg-[#f8fafc] text-slate-900 rounded-t-[3rem] transition-colors duration-1000">
          <CreationSection />
          <HermesSection />
          <DevSection />
        </div>

        <div className="bg-[#0f1117] text-white rounded-t-[3rem] -mt-12 pt-12 transition-colors duration-1000 relative z-20">
          <StoresSection />
          <CustomerServiceSection />
          <SettlementSection />
          <EnterpriseSection />
          <PartnersSection />
          <EcosystemSection />
          <FinalCtaSection />
        </div>
      </div>
    </div>
  )
}

export function VipFigmaPage() {
  return (
    <SitePreferencesProvider>
      <VipFigmaBody />
    </SitePreferencesProvider>
  )
}
