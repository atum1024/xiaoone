import { useEffect, useMemo, useState } from 'react'
import { Building2, Languages, MessageSquare, Moon, Sun, Users } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { useAuthStore } from '../store/auth'
import { MODULES, TOPBAR_TRACKED_ROUTE_IDS } from '../app/moduleRegistry'
import { usePreferences } from '../app/preferences'

function useCurrentModule(pathname: string) {
  return useMemo(() => {
    const matched = Object.values(MODULES)
      .filter(item => TOPBAR_TRACKED_ROUTE_IDS.has(item.id))
      .sort((a, b) => b.route.length - a.route.length)
      .find(item => pathname === item.route || pathname.startsWith(`${item.route}/`))
    return matched || MODULES.hero
  }, [pathname])
}

function viewStateLabel(pathname: string, t: (key: string, fallback?: string) => string) {
  if (pathname.startsWith('/workbench/live-chat') || pathname.startsWith('/workbench/kefu'))
    return t('view.kefu')
  if (pathname.startsWith('/workbench/account'))
    return t('view.account')
  if (pathname.startsWith('/workbench/team-management'))
    return t('view.teamManagement')
  if (pathname.startsWith('/workbench/platform-team'))
    return t('view.platformTeam')
  if (pathname.startsWith('/workbench/archives'))
    return t('view.archives')
  if (pathname.startsWith('/workbench/generation-assets'))
    return t('view.generationAssets')
  if (pathname.startsWith('/workbench/skills'))
    return t('view.skills')
  if (
    pathname.startsWith('/workbench/consultant')
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
      consultant: 'biz.consultant',
      system: 'biz.system',
      marketing: 'biz.marketing',
      support: 'biz.support',
      agency: 'biz.agency',
      feedback: 'biz.feedback',
      automation: 'biz.automation',
      kefu: 'biz.kefu',
      fileLibrary: 'biz.file-library',
      teamChat: 'view.team-chat',
    }
  return keyById[id] ? t(keyById[id], fallback) : fallback
}

function topbarLabels(pathname: string, currentLabel: string, heroBusinessLabel: string, t: (key: string, fallback?: string) => string) {
  if (heroBusinessLabel && pathname === '/workbench')
    return { title: t('view.agent'), sub: heroBusinessLabel }
  if (pathname === '/workbench')
    return { title: t('biz.consultant'), sub: '' }
  const businessRoute = [
    '/workbench/consultant',
    '/workbench/system',
    '/workbench/marketing',
    '/workbench/support',
    '/workbench/agency',
    '/workbench/automation',
    '/workbench/feedback',
  ].some(route => pathname === route || pathname.startsWith(`${route}/`))
  if (businessRoute)
    return { title: t('view.agent'), sub: currentLabel }
  return { title: currentLabel, sub: viewStateLabel(pathname, t) }
}

export function Topbar() {
  const auth = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { locale, theme, t, toggleLocale, toggleTheme } = usePreferences()
  const current = useCurrentModule(location.pathname)
  const merchant = auth.merchants.find(m => m.id === auth.currentMerchantId) || auth.merchants[0]
  const isPlatformAdmin = Boolean(auth.user?.is_platform_admin)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState('')
  const [platformBusy, setPlatformBusy] = useState(false)
  const [heroBusinessLabel, setHeroBusinessLabel] = useState('')
  const labels = topbarLabels(location.pathname, moduleLabel(current.id, current.label, t), heroBusinessLabel, t)

  useEffect(() => {
    setSwitchError('')
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

  async function onMerchantChange(code: string) {
    if (!code || code === merchant?.code)
      return
    setSwitching(true)
    setSwitchError('')
    try {
      await auth.switchMerchant(code)
    }
    catch (err) {
      setSwitchError(err instanceof Error ? err.message : t('top.switchMerchantError'))
    }
    finally {
      setSwitching(false)
    }
  }

  async function openPlatformTeam() {
    if (!isPlatformAdmin || platformBusy)
      return
    setPlatformBusy(true)
    setSwitchError('')
    try {
      if (!auth.hasPlatformSession()) {
        await auth.elevatePlatform()
      }
      navigate(MODULES.platformTeam.route)
    }
    catch (err) {
      setSwitchError(err instanceof Error ? err.message : t('top.platformUnavailable'))
    }
    finally {
      setPlatformBusy(false)
    }
  }

  return (
    <header className="mr-topbar">
      <div className="mr-topbar-left">
        <MessageSquare size={14} />
        <strong className="mr-topbar-title">{labels.title}</strong>
        {labels.sub ? <span className="mr-topbar-sub">· {labels.sub}</span> : null}
        <span className="mr-topbar-divider">·</span>
        <span className="mr-topbar-merchant">{merchant ? `${merchant.name || merchant.code} · ${merchant.code}` : t('top.merchant.none')}</span>
        {switchError ? <div className="mr-topbar-error">{switchError}</div> : null}
      </div>

      <div className="mr-topbar-actions">
        {auth.merchants.length > 1 ? (
          <label className="mr-merchant-switch">
            <Building2 size={14} />
            <select
              value={merchant?.code || ''}
              disabled={switching}
              onChange={event => void onMerchantChange(event.target.value)}
            >
              {auth.merchants.map(item => (
                <option key={item.id} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        {isPlatformAdmin ? (
          <button type="button" className="mr-icon-btn" aria-label={t('top.platformTeam')} onClick={() => void openPlatformTeam()} disabled={platformBusy}>
            <Users size={14} />
          </button>
        ) : null}
        <button type="button" className="mr-icon-btn" aria-label={theme === 'dark' ? t('top.theme.light') : t('top.theme.dark')} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button type="button" className="mr-icon-btn" aria-label={t('top.lang.toggle')} onClick={toggleLocale}>
          <Languages size={14} />
          <span>{locale === 'zh' ? '中' : 'EN'}</span>
        </button>
      </div>
    </header>
  )
}
