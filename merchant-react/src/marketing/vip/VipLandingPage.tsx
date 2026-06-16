import { useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, ChevronDown, Globe, Sparkles } from 'lucide-react'
import { SitePreferencesProvider, useSitePreferences } from '../sitePreferences'
import { logoAssetsForTheme } from '../brandAssets'
import { PartnerBrandMark } from '../../components/PartnerBrandMark'
import { VIP_SECTIONS } from './vipContent'
import { fadeUp, staggerContainer } from './vipMotion'
import { VipOrbitCanvas } from './components/VipOrbitCanvas'
import { VipSectionShell } from './components/VipSectionShell'
import { VipGlassShot } from './components/VipGlassShot'
import { VipPlatformMarquee } from './components/VipPlatformMarquee'
import { getUserRegisterHref } from '../../lib/publicSite'
import './vip-landing.css'

function VipNav() {
  const { theme, t, tKey } = useSitePreferences()
  const brand = logoAssetsForTheme(theme)
  const registerHref = getUserRegisterHref()

  return (
    <nav className="vip-nav" aria-label={tKey("marketing.vip.nav.aria")}>
      <a href="#vip-hero" className="vip-nav__brand">
        <img src={brand.horizontal} alt="xiaoone" className="vip-nav__logo" />
      </a>
      <div className="vip-nav__actions">
        <a href="#vip-mission" className="vip-nav__link">
          {tKey('marketing.vip.nav.capabilities')}
        </a>
        <a href={registerHref} className="vip-nav__cta">
          {tKey('marketing.vip.nav.signUp')}
        </a>
      </div>
    </nav>
  )
}

function VipHero() {
  const { theme, t, tKey } = useSitePreferences()
  const brand = logoAssetsForTheme(theme)
  const registerHref = getUserRegisterHref()

  return (
    <header id="vip-hero" className="vip-hero">
      <div className="vip-hero__bg" aria-hidden />
      <div
        className="vip-hero__bg-img"
        style={{ backgroundImage: 'url(/vip/bg/hero-globe.png)' }}
        aria-hidden
      />
      <div className="vip-hero__noise" aria-hidden />
      <VipOrbitCanvas />

      <motion.div
        className="vip-hero__content"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.img
          variants={fadeUp}
          src={brand.horizontal}
          alt="xiaoone Logo"
          className="vip-hero__logo"
          fetchPriority="high"
        />
        <motion.img
          variants={fadeUp}
          src={brand.slogan}
          alt="xiaoone Slogan"
          className="vip-hero__slogan"
        />
        <motion.h1 variants={fadeUp} className="vip-hero__title">
          {tKey('marketing.vip.hero.title')}
        </motion.h1>
        <motion.p variants={fadeUp} className="vip-hero__subtitle">
          {tKey('marketing.vip.hero.subtitle')}
        </motion.p>
        <motion.div variants={fadeUp} className="vip-hero__cta-row">
          <a href={registerHref} className="vip-btn vip-btn--primary">
            {tKey('marketing.vip.hero.enter')}
            <ArrowRight size={18} />
          </a>
          <a href="#vip-mission" className="vip-btn vip-btn--ghost">
            {tKey('marketing.vip.hero.explore')}
          </a>
        </motion.div>
      </motion.div>

      <div className="vip-hero__scroll-hint" aria-hidden>
        <span>{tKey('marketing.vip.hero.scroll')}</span>
        <div className="vip-hero__scroll-line" />
        <ChevronDown size={16} />
      </div>
    </header>
  )
}

function VipSectionContent({
  titleZh,
  titleEn,
  bodyZh,
  bodyEn,
  chips,
  shots,
  samples,
  extra,
  reverse,
}: {
  titleZh: string
  titleEn: string
  bodyZh: string
  bodyEn: string
  chips?: { zh: string; en: string }[]
  shots?: { src: string; altZh: string; altEn: string }[]
  samples?: { src: string; altZh: string; altEn: string }[]
  extra?: ReactNode
  reverse?: boolean
}) {
  const { t } = useSitePreferences()
  const hasVisual = (shots?.length ?? 0) > 0 || (samples?.length ?? 0) > 0 || extra

  return (
    <div
      className={[
        'vip-section__grid',
        hasVisual && (reverse ? 'vip-section__grid--split-reverse' : 'vip-section__grid--split'),
      ].filter(Boolean).join(' ')}
    >
      <div className="vip-section__copy">
        <motion.h2 className="vip-section__title" variants={fadeUp}>
          {t({ zh: titleZh, en: titleEn })}
        </motion.h2>
        <motion.p className="vip-section__body" variants={fadeUp}>
          {t({ zh: bodyZh, en: bodyEn })}
        </motion.p>
        {chips?.length ? (
          <motion.div className="vip-chips" variants={fadeUp}>
            {chips.map(chip => (
              <span key={chip.zh} className="vip-chip">
                {t({ zh: chip.zh, en: chip.en })}
              </span>
            ))}
          </motion.div>
        ) : null}
        {extra}
      </div>

      {hasVisual ? (
        <div className="vip-section__visual">
          {samples?.length === 1 && !shots?.length ? (
            <motion.div className="vip-sample-hero" variants={fadeUp}>
              <img src={samples[0].src} alt={t({ zh: samples[0].altZh, en: samples[0].altEn })} loading="lazy" decoding="async" />
            </motion.div>
          ) : null}

          {samples && samples.length > 1 ? (
            <motion.div className="vip-poster-wall" variants={fadeUp}>
              {samples.map(sample => (
                <div key={sample.src} className="vip-poster-wall__item">
                  <img src={sample.src} alt={t({ zh: sample.altZh, en: sample.altEn })} loading="lazy" decoding="async" />
                </div>
              ))}
            </motion.div>
          ) : null}

          {shots?.length === 1 ? (
            <VipGlassShot src={shots[0].src} alt={t({ zh: shots[0].altZh, en: shots[0].altEn })} tilt="right" />
          ) : null}

          {shots && shots.length > 1 ? (
            <div className="vip-shots-duo">
              {shots.map((shot, i) => (
                <VipGlassShot
                  key={shot.src}
                  src={shot.src}
                  alt={t({ zh: shot.altZh, en: shot.altEn })}
                  tilt={i % 2 === 0 ? 'left' : 'right'}
                />
              ))}
            </div>
          ) : null}

          {samples?.length === 1 && (shots?.length ?? 0) > 0 ? (
            <motion.div className="vip-sample-hero" variants={fadeUp} style={{ marginTop: '1rem' }}>
              <img src={samples[0].src} alt={t({ zh: samples[0].altZh, en: samples[0].altEn })} loading="lazy" decoding="async" />
            </motion.div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function VipLandingBody() {
  const { t, tKey } = useSitePreferences()
  const registerHref = getUserRegisterHref()

  useEffect(() => {
    document.documentElement.classList.add('vip-landing-page')
    const prevTitle = document.title
    document.title = tKey('marketing.vip.pageTitle')
    return () => {
      document.documentElement.classList.remove('vip-landing-page')
      document.title = prevTitle
    }
  }, [tKey])

  return (
    <div className="vip-landing">
      <VipNav />
      <VipHero />

      {VIP_SECTIONS.map((section, i) => {
        const reverse = i % 2 === 1

        if (section.id === 'social') {
          return (
            <VipSectionShell
              key={section.id}
              id={`vip-${section.id}`}
              tone={section.tone}
              index={section.index}
            >
              <VipSectionContent
                titleZh={section.titleZh}
                titleEn={section.titleEn}
                bodyZh={section.bodyZh}
                bodyEn={section.bodyEn}
                shots={section.shots}
                extra={<VipPlatformMarquee />}
              />
            </VipSectionShell>
          )
        }

        if (section.id === 'kefu') {
          return (
            <VipSectionShell
              key={section.id}
              id={`vip-${section.id}`}
              tone={section.tone}
              index={section.index}
              bgImage={section.bgImage}
            >
              <VipSectionContent
                titleZh={section.titleZh}
                titleEn={section.titleEn}
                bodyZh={section.bodyZh}
                bodyEn={section.bodyEn}
                shots={section.shots}
                reverse={reverse}
                extra={
                  <motion.div className="vip-translate-demo" variants={fadeUp}>
                    <div className="vip-translate-demo__bubble vip-translate-demo__bubble--guest">
                      <div className="vip-translate-demo__label">EN</div>
                      What is your return policy for international orders?
                    </div>
                    <div className="vip-translate-demo__bubble vip-translate-demo__bubble--ai">
                      <div className="vip-translate-demo__label">{t({ zh: 'AI · 中文', en: 'AI · Chinese' })}</div>
                      {t({
                        zh: '国际订单支持 14 天无理由退货，详情已根据您的语料库自动回复。',
                        en: 'International orders support 14-day returns. Details were auto-replied from your corpus.',
                      })}
                    </div>
                  </motion.div>
                }
              />
            </VipSectionShell>
          )
        }

        if (section.id === 'settlement') {
          return (
            <VipSectionShell
              key={section.id}
              id={`vip-${section.id}`}
              tone={section.tone}
              index={section.index}
            >
              <VipSectionContent
                titleZh={section.titleZh}
                titleEn={section.titleEn}
                bodyZh={section.bodyZh}
                bodyEn={section.bodyEn}
                samples={section.samples}
                extra={
                  <motion.div className="vip-settlement-brands" variants={fadeUp}>
                    <PartnerBrandMark brand="wechat" size={28} />
                    <PartnerBrandMark brand="alipay" size={28} />
                    <span className="vip-chip">
                      <Globe size={14} style={{ display: 'inline', marginRight: 4 }} />
                      {tKey('marketing.vip.settlement.chip')}
                    </span>
                  </motion.div>
                }
              />
            </VipSectionShell>
          )
        }

        if (section.id === 'trade') {
          return (
            <VipSectionShell
              key={section.id}
              id={`vip-${section.id}`}
              tone={section.tone}
              index={section.index}
            >
              <VipSectionContent
                titleZh={section.titleZh}
                titleEn={section.titleEn}
                bodyZh={section.bodyZh}
                bodyEn={section.bodyEn}
                samples={section.samples}
                reverse={reverse}
                extra={
                  <motion.div className="vip-timeline" variants={fadeUp}>
                    {[
                      t({ zh: '物流', en: 'Logistics' }),
                      t({ zh: '报关', en: 'Customs' }),
                      t({ zh: '退税', en: 'Tax refund' }),
                    ].map(step => (
                      <div key={step} className="vip-timeline__step">{step}</div>
                    ))}
                  </motion.div>
                }
              />
            </VipSectionShell>
          )
        }

        if (section.id === 'partner') {
          return (
            <VipSectionShell
              key={section.id}
              id={`vip-${section.id}`}
              tone={section.tone}
              index={section.index}
            >
              <VipSectionContent
                titleZh={section.titleZh}
                titleEn={section.titleEn}
                bodyZh={section.bodyZh}
                bodyEn={section.bodyEn}
                shots={section.shots}
                extra={
                  <motion.div className="vip-partner-flow" variants={fadeUp}>
                    <div className="vip-partner-flow__row">
                      <Sparkles size={16} className="vip-partner-flow__arrow" />
                      {t({ zh: '分享用户 → 获得算力点奖励', en: 'Share users → earn compute credits' })}
                    </div>
                    <div className="vip-partner-flow__row">
                      <Sparkles size={16} className="vip-partner-flow__arrow" />
                      {t({ zh: '超级伙伴最低六折券 → 自定义折扣', en: 'Super partner 60% floor → custom discount' })}
                    </div>
                    <div className="vip-partner-flow__row">
                      <Sparkles size={16} className="vip-partner-flow__arrow" />
                      {t({ zh: '差价补回 → 指定收款账户', en: 'Spread paid → designated account' })}
                    </div>
                  </motion.div>
                }
              />
            </VipSectionShell>
          )
        }

        if (section.id === 'closer') {
          const brand = logoAssetsForTheme('dark')
          return (
            <footer id="vip-closer" className="vip-closer">
              <div
                className="vip-closer__bg"
                style={{ backgroundImage: `url(${section.bgImage})` }}
                aria-hidden
              />
              <div className="vip-closer__content">
                <motion.img
                  src={brand.horizontal}
                  alt="xiaoone"
                  className="vip-closer__logo"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                />
                <motion.h2
                  className="vip-closer__title"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                >
                  {t({ zh: section.titleZh, en: section.titleEn })}
                </motion.h2>
                <motion.p
                  className="vip-closer__body"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  {t({ zh: section.bodyZh, en: section.bodyEn })}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  <a href={registerHref} className="vip-btn vip-btn--primary">
                    {tKey('marketing.vip.closer.cta')}
                    <ArrowRight size={18} />
                  </a>
                </motion.div>
              </div>
            </footer>
          )
        }

        return (
          <VipSectionShell
            key={section.id}
            id={`vip-${section.id}`}
            tone={section.tone}
            index={section.index}
            bgImage={section.bgImage}
          >
            <VipSectionContent
              titleZh={section.titleZh}
              titleEn={section.titleEn}
              bodyZh={section.bodyZh}
              bodyEn={section.bodyEn}
              chips={section.chips}
              shots={section.shots}
              samples={section.samples}
              reverse={reverse}
            />
          </VipSectionShell>
        )
      })}
    </div>
  )
}

export function VipLandingPage() {
  return (
    <SitePreferencesProvider>
      <VipLandingBody />
    </SitePreferencesProvider>
  )
}
