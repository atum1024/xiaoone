import { useCallback, useRef, useState, type CSSProperties } from 'react'
import { Menu, PanelLeftClose, Pencil, Search, Settings2 } from 'lucide-react'

import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { MODULES, SIDEBAR_SECTIONS } from '../app/moduleRegistry'
import {
  AUTOMATION_AGENT_PLUGIN_KEYS,
  CONSULTANT_PLUGIN_KEY,
  XIAOWAN_ASSISTANT_PLUGIN_KEY,
  isWorkbenchAgentModuleId,
  resolveWorkbenchRoute,
  routeForModule,
  routeForThread,
  type WorkbenchModuleId,
} from '../app/workbenchRouteModel'
import { AgentThreadSearchDialog } from '../pages/AgentThreadSearchDialog'
import { useAuthStore } from '../store/auth'
import { usePreferences } from '../app/preferences'
import { useWorkspaceStore } from '../store/workspace'
import { useLiveChatStore } from '../store/liveChat'
import { useManualServiceUnreadStore, type ManualServiceBusinessKey } from '../store/manualServiceUnreadStore'
import { useChatPreferencesStore } from '../store/chatPreferences'
import { displayPlanName } from '../lib/planLabels'
import { displayUserName } from '../lib/userDisplay'
import { SIDEBAR_COLLAPSED_WIDTH } from './sidebarLayout'
import { useAgentDomainThreads, useAgentSidebarThreads } from '../hooks/agentQueries'
import { DefaultAvatar } from '../components/DefaultAvatar'
import { PersonalUpgradeDialog } from '../components/PersonalUpgradeDialog'

const MODULE_TO_MANUAL: Partial<Record<string, ManualServiceBusinessKey>> = {
  system: 'software',
  marketing: 'marketing',
  marketingImage: 'marketing',
  marketingVideo: 'marketing',
  marketingCopy: 'marketing',
  support: 'support',
  agency: 'agency',
  feedback: 'feedback',
}
const SETTINGS_SECTION_BY_MODULE: Record<string, 'account' | 'team' | 'archives' | 'partner'> = {
  account: 'account',
  teamManagement: 'team',
  archives: 'archives',
  partnerPlan: 'partner',
}
const SETTINGS_ENTRY_ORDER = ['account', 'teamManagement', 'archives', 'partnerPlan'] as const

export function Sidebar() {
  const auth = useAuthStore()
  const { locale, t, tpl, theme } = usePreferences()
  const location = useLocation()
  const navigate = useNavigate()

  const [searchOpen, setSearchOpen] = useState(false)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState('')

  const workspace = useWorkspaceStore()
  const liveChat = useLiveChatStore()
  const agentThreadUnreadCount = useChatPreferencesStore(s => s.agentThreadUnreadCount)
  const agentGenerationNeedsAttention = useChatPreferencesStore(s => s.agentGenerationNeedsAttention)
  const markAgentThreadRead = useChatPreferencesStore(s => s.markAgentThreadRead)
  const markAgentGenerationSeen = useChatPreferencesStore(s => s.markAgentGenerationSeen)
  const manualCounts = useManualServiceUnreadStore(s => s.counts)
  const canUseMenu = (id: string) => auth.hasMenuAccess(id)
  const sidebarThreads = useAgentSidebarThreads()
  const generalThreadsQuery = useAgentDomainThreads('general', canUseMenu('consultant') || canUseMenu('system'))
  const generalThreads = generalThreadsQuery.data?.items || sidebarThreads.data?.general || []
  const marketingThreadsQuery = useAgentDomainThreads('marketing', canUseMenu('marketingImage') || canUseMenu('marketingVideo') || canUseMenu('marketingCopy'))
  const marketingThreads = marketingThreadsQuery.data?.items || sidebarThreads.data?.marketing || []
  const supportThreads = sidebarThreads.data?.support || []
  const agencyThreads = sidebarThreads.data?.agency || []
  const feedbackThreads = sidebarThreads.data?.feedback || []

  const collapsed = workspace.sidebarCollapsed
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : workspace.sidebarWidth
  const logoShape = collapsed ? 'square' : 'horizontal'
  const logoTone = theme === 'dark' ? 'night' : 'day'
  const sidebarStyle = {
    '--mr-sidebar-width': `${sidebarWidth}px`,
  } as CSSProperties
  const sidebarRef = useRef<HTMLElement>(null)
  const currentWorkbenchRoute = resolveWorkbenchRoute(location.pathname, location.search)
  const activeThreadId = currentWorkbenchRoute?.threadId || ''
  const userName = displayUserName(auth.user)
  const planLabel = displayPlanName(auth.subscriptionPlanCode, locale)
  const profileTitle = `${userName} · ${planLabel}`
  const storesMax = Number(auth.storesMax || 0)
  const teamSeatsMax = Number(auth.teamSeatsMax || 0)

  function guardPersonalLimit(itemId: string): boolean {
    if (itemId === 'kefu' && storesMax <= 0) {
      setUpgradeFeature(t('common.upgrade.stores.feature'))
      setUpgradeDialogOpen(true)
      return true
    }
    if (itemId === 'teamManagement' && teamSeatsMax <= 0) {
      setUpgradeFeature(t('common.upgrade.team.feature'))
      setUpgradeDialogOpen(true)
      return true
    }
    return false
  }


  function openSettingsPage() {
    const entryId = SETTINGS_ENTRY_ORDER.find(id => canUseMenu(id))
    if (!entryId) return
    if (guardPersonalLimit(entryId)) return
    const section = SETTINGS_SECTION_BY_MODULE[entryId]
    if (section === 'account') {
      workspace.showAccount('platform')
      navigate('/workbench/account')
      return
    }
    workspace.showAccount('settings', section)
    navigate(`/workbench/account?section=${section}`)
  }

  function labelForModule(id: string, fallback: string) {
    const keyById: Record<string, string> = {
      dashboard: 'common.module.dashboard.label',
      newChat: 'qa.new-chat',
      search: 'qa.search',
      kefu: 'qa.live-chat',
      automation: 'qa.automation',
      socialPosting: 'biz.socialPosting',
      hermesPanel: 'view.hermes',
      consultant: 'biz.consultant',
      system: 'biz.system',
      marketing: 'biz.marketing',
      marketingImage: 'biz.marketing.image',
      marketingVideo: 'biz.marketing.video',
      marketingCopy: 'biz.marketing.text',
      support: 'biz.support',
      agency: 'biz.agency',
      feedback: 'biz.feedback',
      repository: 'qa.repository',
      fileLibrary: 'qa.file-library',
      account: 'menu.account',
      teamManagement: 'menu.team',
      archives: 'menu.archives',
      partnerPlan: 'menu.partner',
      generationAssets: 'menu.generation-assets',
      usPhoneNumbers: 'menu.us-phone-numbers',
      dcpayCards: 'menu.dcpay-cards',
      standaloneSite: 'common.module.standaloneSite.label',
    }
    return keyById[id] ? t(keyById[id], fallback) : fallback
  }

  function sectionTitle(id: string, fallback: string) {
    if (id === 'quick') return t('common.module.section.quick', fallback)
    if (id === 'business') return t('section.business')
    if (id === 'consultant') return t('section.consultant')
    return fallback
  }

  function relativeTime(input?: string | null) {
    if (!input) return ''
    const timestamp = new Date(input).getTime()
    if (!timestamp || Number.isNaN(timestamp)) return ''
    const diff = Date.now() - timestamp
    if (diff < 60_000) return t('common.time.justNow')
    if (diff < 3_600_000) return tpl('common.time.minutes', String(Math.max(1, Math.round(diff / 60_000))))
    if (diff < 86_400_000) return tpl('common.time.hours', String(Math.max(1, Math.round(diff / 3_600_000))))
    if (diff < 30 * 86_400_000) return tpl('common.time.days', String(Math.max(1, Math.round(diff / 86_400_000))))
    return new Date(timestamp).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' })
  }

  function toggleBusinessItem(id: string) {
    workspace.toggleCategory(id as any)
  }

  function moduleHomeRoute(moduleId: string, fallbackRoute?: string) {
    if (!isWorkbenchAgentModuleId(moduleId) && moduleId !== 'newChat')
      return fallbackRoute || ''
    return routeForModule(moduleId as WorkbenchModuleId)
  }

  function moduleRouteMatches(moduleId: string, pathname: string, search = '') {
    const route = resolveWorkbenchRoute(pathname, search)
    if (!route) return false
    if (moduleId === 'newChat') return route.kind === 'home'
    return route.moduleId === moduleId
  }

  function openBusinessNewConversation(moduleId: string) {
    const heroRoute = moduleHomeRoute(moduleId)
    if (!heroRoute) return
    workspace.setCategoryExpanded(moduleId as any, true)
    navigate(heroRoute)
  }

  function getThreadsForModule(moduleId: string) {
    if (moduleId === 'system') {
      return generalThreads.filter(t => {
        const plugin = String((t as any).plugin_key || '')
        return plugin !== 'consultant' && plugin !== XIAOWAN_ASSISTANT_PLUGIN_KEY && !AUTOMATION_AGENT_PLUGIN_KEYS.has(plugin)
      }).slice(0, 5) || []
    }
    if (moduleId === 'consultant') {
      return generalThreads.filter(t => {
        const plugin = String((t as any).plugin_key || '')
        return plugin === XIAOWAN_ASSISTANT_PLUGIN_KEY || plugin === CONSULTANT_PLUGIN_KEY
      }).slice(0, 5) || []
    }
    if (moduleId === 'marketingImage' || moduleId === 'marketingVideo' || moduleId === 'marketingCopy') {
      const expected = moduleId === 'marketingImage' ? 'image' : moduleId === 'marketingVideo' ? 'video' : 'text'
      return marketingThreads.filter(t => {
        const mode = String((t as any).mode_key || 'text')
        if (expected === 'text') return mode !== 'image' && mode !== 'video'
        return mode === expected
      }).slice(0, 5) || []
    }
    if (moduleId === 'support')
      return supportThreads.slice(0, 5)
    if (moduleId === 'agency')
      return agencyThreads.slice(0, 5)
    if (moduleId === 'feedback')
      return feedbackThreads.slice(0, 5)
    return []
  }

  function renderThreadChildren(moduleId: string, route: string, solo = false) {
    const threads = getThreadsForModule(moduleId)
    const childrenClassName = solo ? 'mr-nav-children mr-nav-children--solo' : 'mr-nav-children'
    const heroRoute = moduleHomeRoute(moduleId, route)
    const hasCurrentDraft = moduleId !== 'consultant' && Boolean(heroRoute && location.pathname === heroRoute && !activeThreadId)
    const draftTitle = `${labelForModule(moduleId, MODULES[moduleId]?.label || t('sidebar.defaultChat'))} · ${t('agent.newChat', '新对话')}`
    const draftChild = hasCurrentDraft ? (
      <NavLink key="current-draft-thread" to={heroRoute} className="mr-nav-child is-active">
        <span className="mr-nav-child-title">
          <span className="mr-nav-child-text">{draftTitle}</span>
        </span>
      </NavLink>
    ) : null

    if (threads.length === 0) {
      return (
        <div className={childrenClassName}>
          {draftChild || <div className="mr-empty-hint">{t('sidebar.emptyThreads')}</div>}
        </div>
      )
    }
    return (
      <div className={childrenClassName}>
        {draftChild}
        {threads.map((thread: any) => {
          const threadRoute = routeForThread(thread)
          const isActive = location.pathname === threadRoute
          const needsAttention = !isActive && (agentGenerationNeedsAttention(thread) || agentThreadUnreadCount(thread) > 0)
          return (
            <NavLink
              key={thread.id}
              to={threadRoute}
              className={isActive ? 'mr-nav-child is-active' : 'mr-nav-child'}
              onClick={() => {
                markAgentThreadRead(thread.id, thread.message_count || 0)
                markAgentGenerationSeen(thread.id, thread.latest_generation_updated_at)
              }}
            >
              <span className="mr-nav-child-title">
                <span className="mr-nav-child-text">{thread.title || t('sidebar.newAgentThread')}</span>
                {needsAttention ? (
                  <span
                    className="mr-nav-child-dot"
                    aria-label={t('sidebar.generationComplete')}
                    title={t('sidebar.generationComplete')}
                  />
                ) : null}
              </span>
              <small>{relativeTime(thread.last_message_at || thread.updated_at || thread.created_at)}</small>
            </NavLink>
          )
        })}
      </div>
    )
  }


  const beginSidebarResize = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const pointerId = event.pointerId
    event.currentTarget.setPointerCapture(pointerId)

    const onMove = (moveEvent: PointerEvent) => {
      const rect = sidebarRef.current?.getBoundingClientRect()
      if (!rect) return
      workspace.applySidebarResize(moveEvent.clientX - rect.left)
    }

    const onEnd = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      document.body.classList.remove('mr-sidebar-resizing')
    }

    document.body.classList.add('mr-sidebar-resizing')
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }, [workspace])

  return (
    <aside
      ref={sidebarRef}
      className={collapsed ? 'mr-sidebar is-collapsed' : 'mr-sidebar'}
      style={sidebarStyle}
    >
      <div className="mr-sidebar-header">
        {!collapsed && (
          <Link
            to="/"
            className="mr-brand"
            aria-label={t('sidebar.backToSite', '返回官网')}
            title={t('sidebar.backToSite', '返回官网')}
          >
            <img
              src={`/logo/${logoShape}-${logoTone}.png`}
              alt={t('brand.name')}
              className="mr-brand-logo"
            />
          </Link>
        )}
        <button 
          className="mr-icon-btn mr-sidebar-toggle"
          onClick={() => workspace.toggleSidebarCollapsed()}
          title={collapsed ? t('sidebar.expand', '展开导航') : t('sidebar.collapse', '收起导航')}
        >
          {collapsed ? <Menu size={20} strokeWidth={1.5} /> : <PanelLeftClose size={20} strokeWidth={1.5} />}
        </button>
      </div>

      <nav className="mr-quick-nav">
        {SIDEBAR_SECTIONS.find(section => section.id === 'quick')?.items.filter(canUseMenu).map((id) => {
          const item = MODULES[id]
          const navRow = (
            <NavLink
              to={item.route}
              className={({ isActive }) => isActive ? 'mr-nav-row is-active' : 'mr-nav-row'}
              end={item.route === '/workbench' || item.id === 'automation'}
              onClick={(event) => {
                if (guardPersonalLimit(item.id)) {
                  event.preventDefault()
                }
              }}
            >
              <item.icon size={14} strokeWidth={1.9} />
              <span>{labelForModule(item.id, item.label)}</span>
              {item.id === 'kefu' && liveChat.hasUnread() ? <b>{liveChat.unreadLabel()}</b> : null}
            </NavLink>
          )
          if (item.id === 'generationAssets') {
            return (
              <div key={item.id} className="mr-quick-nav-block">
                {navRow}
              </div>
            )
          }
          return (
            <div key={item.id} className="mr-quick-nav-block">
              {navRow}
            </div>
          )
        })}
      </nav>

      <div className="mr-sidebar-scroll">
        {SIDEBAR_SECTIONS.filter(section => section.id !== 'quick').map(section => {
          const visibleItems = section.items.filter(canUseMenu)
          if (visibleItems.length === 0) return null

          return (
            <section key={section.id} className="mr-nav-section">
              <div className="mr-nav-section-title mr-nav-section-title--static mr-nav-section-title--actions">
                <span className="mr-nav-section-label">{sectionTitle(section.id, section.title)}</span>
                {canUseMenu('search') ? (
                  <button
                    type="button"
                    className="mr-section-search-button"
                    aria-label={t('qa.search')}
                    title={t('qa.search')}
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search size={14} strokeWidth={1.9} aria-hidden />
                  </button>
                ) : null}
              </div>
              <nav className="mr-nav">
                {visibleItems.map((id) => {
                    const item = MODULES[id]
                    const heroRoute = moduleHomeRoute(id, item.route)
                    const isHeroActive = Boolean(heroRoute && location.pathname === heroRoute && !activeThreadId)
                    const entryActive = moduleRouteMatches(id, location.pathname)
                    const isExpanded = workspace.expanded[id as keyof typeof workspace.expanded]
                    const renderChildren = Boolean(isExpanded)

                    return (
                      <div key={item.id} className="mr-nav-block">
                        <div className={entryActive ? 'mr-nav-entry is-active' : 'mr-nav-entry'}>
                          <NavLink
                            to={heroRoute || item.route}
                            className={({ isActive }) => (isActive || isHeroActive) ? 'mr-nav-row is-active' : 'mr-nav-row'}
                            aria-expanded={renderChildren}
                            onClick={(event) => {
                              if (guardPersonalLimit(item.id)) {
                                event.preventDefault()
                                return
                              }
                              toggleBusinessItem(id)
                            }}
                          >
                            <item.icon size={14} strokeWidth={1.9} />
                            <span>{labelForModule(item.id, item.label)}</span>
                            {(() => {
                              const mk = MODULE_TO_MANUAL[id]
                              const n = mk ? manualCounts[mk] : 0
                              return n > 0 ? <b>{n > 99 ? '99+' : n}</b> : null
                            })()}
                          </NavLink>
                          {heroRoute ? (
                            <button
                              type="button"
                              className="mr-row-pencil"
                              aria-label={t('sidebar.newThread')}
                              title={t('sidebar.newThread')}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                openBusinessNewConversation(id)
                              }}
                            >
                              <Pencil size={12} strokeWidth={1.9} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                        {renderChildren ? renderThreadChildren(id, item.route, id === 'consultant') : null}
                      </div>
                    )
                  })}
              </nav>
            </section>
          )
        })}
      </div>

      <div className="mr-sidebar-foot">
        <button
          type="button"
          className="mr-profile-foot"
          aria-label={t('sidebar.settings')}
          title={profileTitle}
          onClick={() => {
            if (SETTINGS_ENTRY_ORDER.some(canUseMenu))
              openSettingsPage()
          }}
        >
          <DefaultAvatar
            className="mr-profile-avatar"
            src={auth.user?.avatar}
            alt={userName}
            size={28}
          />
          {!collapsed && (
            <>
              <div className="mr-profile-meta" title={profileTitle}>
                <span className="mr-profile-name">{userName}</span>
                <span className="mr-profile-plan">{planLabel}</span>
              </div>
              {SETTINGS_ENTRY_ORDER.some(canUseMenu) ? (
                <span
                  className="mr-icon-btn mr-profile-settings"
                  aria-label={t('sidebar.settings')}
                  title={t('sidebar.settings')}
                >
                  <Settings2 size={16} strokeWidth={1.5} />
                </span>
              ) : null}
            </>
          )}
        </button>
      </div>

      <div
        className="mr-sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('sidebar.resizeNav')}
        onPointerDown={beginSidebarResize}
      />

      <AgentThreadSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <PersonalUpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        feature={upgradeFeature}
      />
    </aside>
  )
}
