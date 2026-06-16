import { useCallback, useEffect, useMemo, useState, type DependencyList, type ReactNode } from 'react'
import { Languages, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router'
import { MODULES, TOPBAR_TRACKED_ROUTE_IDS } from '../app/moduleRegistry'
import { resolveWorkbenchRoute } from '../app/workbenchRouteModel'
import { DeployEnvBadge } from '@xiaoone/react-ui'
import { LocalIpRegionToggle, LocalPartnerRoleToggle, LocalRealNameToggle, RegionMismatchBanner, type RegionCode } from '@xiaoone/region'
import { usePreferences } from '../app/preferences'
import { useRealNameVerified } from '../lib/useRealNameVerified'
import { AssistantRuntimeStatus } from '../components/AssistantRuntimeStatus'
import { api } from '../lib/httpClient'
import { useAuthStore } from '../store/auth'

type TopbarSlot = {
  className?: string
  leading?: ReactNode
  actions?: ReactNode
}

const TOPBAR_SLOT_EVENT = 'merchant-react:topbar-slot'

export function useTopbarSlot(slot: TopbarSlot | null) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent<TopbarSlot | null>(TOPBAR_SLOT_EVENT, { detail: slot }))
    return () => {
      window.dispatchEvent(new CustomEvent<TopbarSlot | null>(TOPBAR_SLOT_EVENT, { detail: null }))
    }
  }, [slot])
}

/** Rebuild topbar slot when locale/t changes — use instead of useMemo + useTopbarSlot for i18n tabs. */
export function useLocalizedTopbarSlot(
  factory: () => TopbarSlot | null,
  deps: DependencyList,
) {
  const { locale, t } = usePreferences()
  const slot = useMemo(() => factory(), [locale, t, ...deps])
  useTopbarSlot(slot)
}

function useCurrentModule(pathname: string, search: string) {
  return useMemo(() => {
    const workbenchRoute = resolveWorkbenchRoute(pathname, search)
    if (workbenchRoute && MODULES[workbenchRoute.topbarModuleId])
      return MODULES[workbenchRoute.topbarModuleId]
    const matched = Object.values(MODULES)
      .filter(item => TOPBAR_TRACKED_ROUTE_IDS.has(item.id))
      .sort((a, b) => b.route.length - a.route.length)
      .find(item => pathname === item.route || pathname.startsWith(`${item.route}/`))
    return matched || MODULES.hero
  }, [pathname, search])
}

function viewStateLabel(pathname: string, search: string, t: (key: string, fallback?: string) => string) {
  if (pathname.startsWith('/workbench/live-chat') || pathname.startsWith('/workbench/kefu'))
    return t('view.kefu')
  if (pathname.startsWith('/workbench/account'))
    return t('view.account')
  if (pathname.startsWith('/workbench/team-management'))
    return t('view.teamManagement')
  if (pathname.startsWith('/workbench/archives'))
    return t('view.archives')
  if (pathname.startsWith('/workbench/generation-assets')) {
    const tab = new URLSearchParams(search).get('tab')
    if (tab === 'accelerator') return t('view.accelerator')
    if (tab === 'numbers') return t('view.usPhoneNumbers', '号码')
    if (tab === 'ad-card') return t('view.dcpayCards', '支付卡')
    return t('view.generationAssets')
  }
  if (pathname.startsWith('/workbench/us-numbers'))
    return t('view.usPhoneNumbers', '号码')
  if (pathname.startsWith('/workbench/dcpay-cards'))
    return t('view.dcpayCards', '支付卡')
  if (pathname.startsWith('/workbench/repository'))
    return t('view.news')
  if (pathname.startsWith('/workbench/skills'))
    return t('view.skills')
  if (
    pathname.startsWith('/workbench/assistant')
    || pathname.startsWith('/workbench/consultant')
    || pathname.startsWith('/workbench/system')
    || pathname.startsWith('/workbench/marketing')
    || pathname.startsWith('/workbench/support')
    || pathname.startsWith('/workbench/agency')
    || pathname.startsWith('/workbench/automation')
    || pathname.startsWith('/workbench/feedback')
  )
    return t('view.agent')
  return t('view.workbench')
}

function moduleLabel(id: string, fallback: string, t: (key: string, fallback?: string) => string) {
  const keyById: Record<string, string> = {
    dashboard: 'common.workbench.status.pageTitle',
    consultant: 'biz.consultant',
    system: 'biz.system',
    marketing: 'biz.marketing',
    marketingImage: 'biz.marketing.image',
    marketingVideo: 'biz.marketing.video',
    marketingCopy: 'biz.marketing.text',
    support: 'biz.support',
    agency: 'biz.agency',
    feedback: 'biz.feedback',
    automation: 'biz.automation',
    socialPosting: 'biz.socialPosting',
    repository: 'biz.repository',
    kefu: 'biz.kefu',
    fileLibrary: 'biz.file-library',
    account: 'menu.account',
    teamManagement: 'menu.team',
    archives: 'menu.archives',
    generationAssets: 'menu.generation-assets',
    usPhoneNumbers: 'menu.us-phone-numbers',
    dcpayCards: 'menu.dcpay-cards',
  }
  return keyById[id] ? t(keyById[id], fallback) : fallback
}

function topbarLabels(pathname: string, search: string, currentLabel: string, heroBusinessLabel: string, t: (key: string, fallback?: string) => string) {
  if (pathname === '/workbench')
    return { title: t('common.workbench.status.pageTitle', '仪表盘'), sub: '' }
  if (pathname.startsWith('/workbench/kefu') || pathname.startsWith('/workbench/live-chat'))
    return { title: t('biz.kefu', '客服'), sub: '' }
  if (pathname.startsWith('/workbench/repository'))
    return { title: t('view.repository'), sub: '' }
  if (pathname.startsWith('/workbench/generation-assets'))
    return { title: currentLabel, sub: '' }
  if (pathname.startsWith('/workbench/hermes'))
    return { title: currentLabel, sub: '' }
  if (pathname.startsWith('/workbench/us-numbers'))
    return { title: currentLabel, sub: '' }
  if (pathname.startsWith('/workbench/dcpay-cards'))
    return { title: currentLabel, sub: '' }
  if (pathname.startsWith('/workbench/account'))
    return { title: currentLabel, sub: '' }
  const businessRoute = [
    '/workbench/assistant',
    '/workbench/consultant',
    '/workbench/system',
    '/workbench/marketing',
    '/workbench/support',
    '/workbench/agency',
    '/workbench/automation',
    '/workbench/feedback',
  ].some(route => pathname === route || pathname.startsWith(`${route}/`))
  if (businessRoute)
    return { title: currentLabel, sub: '' }
  return { title: currentLabel, sub: viewStateLabel(pathname, search, t) }
}


export function Topbar() {
  const location = useLocation()
  const { locale, theme, t, toggleLocale, toggleTheme } = usePreferences()
  const auth = useAuthStore()
  const { verified: realNameVerified } = useRealNameVerified()
  const current = useCurrentModule(location.pathname, location.search)
  const [topbarError, setTopbarError] = useState('')
  const [heroBusinessLabel, setHeroBusinessLabel] = useState('')
  const [slot, setSlot] = useState<TopbarSlot | null>(null)
  const labels = topbarLabels(location.pathname, location.search, moduleLabel(current.id, current.label, t), heroBusinessLabel, t)
  const workbenchRoute = resolveWorkbenchRoute(location.pathname, location.search)
  const ModuleIcon = current.icon
  const isAuthWorkbenchRoute = location.pathname.startsWith('/workbench')
    && !location.pathname.startsWith('/login')
    && !location.pathname.startsWith('/register')
  const showPreferenceActions = isAuthWorkbenchRoute
  const showAssistantStatus = Boolean(workbenchRoute && workbenchRoute.path === '/workbench/assistant' && workbenchRoute.pageKind === 'new')
  const leading = slot?.leading || (showAssistantStatus ? <AssistantRuntimeStatus /> : null)
  const actions = slot?.actions || null
  const hasTopbarSlot = Boolean(slot?.className || leading || actions)

  const syncLocalBillingRegion = useCallback(async (region: RegionCode) => {
    if (!auth.user)
      return
    try {
      await api.patch('/api/v1/iam/account/debug-region/', { region })
      await auth.fetchMe()
      setTopbarError('')
    } catch {
      setTopbarError(locale === 'zh' ? '账号区域切换失败' : 'Account region switch failed')
    }
  }, [auth, locale])

  useEffect(() => {
    setTopbarError('')
    if (location.pathname !== '/workbench')
      setHeroBusinessLabel('')
  }, [location.pathname])

  useEffect(() => {
    function onHeroBusiness(event: Event) {
      const detail = (event as CustomEvent<{ label?: string } | null>).detail
      setHeroBusinessLabel(detail?.label || '')
    }
    window.addEventListener('merchant-react:hero-business', onHeroBusiness)
    return () => window.removeEventListener('merchant-react:hero-business', onHeroBusiness)
  }, [])

  useEffect(() => {
    function onTopbarSlot(event: Event) {
      setSlot((event as CustomEvent<TopbarSlot | null>).detail || null)
    }
    window.addEventListener(TOPBAR_SLOT_EVENT, onTopbarSlot)
    return () => window.removeEventListener(TOPBAR_SLOT_EVENT, onTopbarSlot)
  }, [])

  return (
    <>
    <RegionMismatchBanner locale={locale} />
    <header className={`mr-topbar${hasTopbarSlot ? ' has-slot' : ''}${slot?.className ? ` ${slot.className}` : ''}`}>
      <div className="mr-topbar-left">
        <div className="mr-topbar-current" title={labels.sub ? `${labels.title} · ${labels.sub}` : labels.title}>
          {ModuleIcon ? (
            <span className="mr-topbar-module-icon" aria-hidden>
              <ModuleIcon size={16} strokeWidth={1.9} />
            </span>
          ) : null}
          <strong>{labels.title}</strong>
          {labels.sub ? <span>{labels.sub}</span> : null}
        </div>
        {topbarError ? <div className="mr-topbar-error">{topbarError}</div> : null}
      </div>

      {leading ? <div className="mr-topbar-context">{leading}</div> : null}

      <div className="mr-topbar-actions">
        <DeployEnvBadge />
        {actions ? <div className="mr-topbar-slot-actions">{actions}</div> : null}
        {showPreferenceActions ? (
          <>
            <span className="mr-topbar-preferences">
              <button type="button" className="mr-icon-btn" aria-label={theme === 'dark' ? t('top.theme.light') : t('top.theme.dark')} onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button type="button" className="mr-icon-btn" aria-label={t('top.lang.toggle')} onClick={toggleLocale}>
                <Languages size={14} />
                <span>{locale === 'zh' ? '中' : 'EN'}</span>
              </button>
              <LocalIpRegionToggle locale={locale} className="mr-icon-btn mr-local-ip-toggle" onToggleRegion={syncLocalBillingRegion} />
              <LocalRealNameToggle locale={locale} verified={realNameVerified} className="mr-icon-btn mr-local-realname-toggle" />
              <LocalPartnerRoleToggle locale={locale} className="mr-icon-btn mr-local-partner-toggle" />
            </span>
          </>
        ) : null}
      </div>
    </header>
    </>
  )
}
