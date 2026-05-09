import { useState } from 'react'
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Pencil, Settings2 } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { MODULES, SIDEBAR_SECTIONS } from '../app/moduleRegistry'
import { AgentThreadSearchDialog } from '../pages/AgentThreadSearchDialog'
import { useAuthStore } from '../store/auth'
import { usePreferences } from '../app/preferences'
import { useWorkspaceStore } from '../store/workspace'
import { useAgentStore } from '../store/agent'
import { useLiveChatStore } from '../store/liveChat'
import { useTeamChatStore } from '../store/teamChat'

const AUTOMATION_PLUGIN_KEYS = new Set(['industry', 'competitor', 'ai', 'product', 'notify-tg', 'file-organize', 'install-doc', 'corpus', 'sop'])
const HERO_ROUTE_BY_MODULE: Record<string, string> = {
  consultant: '/workbench/consultant',
  system: '/workbench/system',
  marketing: '/workbench/marketing',
  support: '/workbench/support',
  agency: '/workbench/agency',
  feedback: '/workbench/feedback',
}

export function Sidebar() {
  const auth = useAuthStore()
  const { locale, t, tpl } = usePreferences()
  const location = useLocation()
  const navigate = useNavigate()

  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const workspace = useWorkspaceStore()
  const agentStore = useAgentStore()
  const liveChat = useLiveChatStore()
  const teamChat = useTeamChatStore()

  const collapsed = workspace.sidebarCollapsed
  const activeThreadId = new URLSearchParams(location.search).get('thread') || ''

  function labelForModule(id: string, fallback: string) {
    const keyById: Record<string, string> = {
      newChat: 'qa.new-chat',
      search: 'qa.search',
      teamChat: 'view.team-chat',
      kefu: 'qa.live-chat',
      automation: 'qa.automation',
      fileLibrary: 'qa.file-library',
      consultant: 'biz.consultant',
      system: 'biz.system',
      marketing: 'biz.marketing',
      support: 'biz.support',
      agency: 'biz.agency',
      feedback: 'biz.feedback',
      account: 'menu.account',
      teamManagement: 'menu.team',
      archives: 'menu.archives',
      generationAssets: 'menu.generation-assets',
    }
    return keyById[id] ? t(keyById[id], fallback) : fallback
  }

  function sectionTitle(id: string, fallback: string) {
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

  function openBusinessNewConversation(moduleId: string) {
    const heroRoute = HERO_ROUTE_BY_MODULE[moduleId]
    if (!heroRoute) return
    navigate(heroRoute)
  }

  function getThreadsForModule(moduleId: string) {
    if (moduleId === 'system') {
      return agentStore.byDomain['general']?.threads.filter(t => {
        const plugin = String((t as any).plugin_key || '')
        return plugin !== 'consultant' && !AUTOMATION_PLUGIN_KEYS.has(plugin)
      }).slice(0, 5) || []
    }
    if (moduleId === 'consultant') {
      return agentStore.byDomain['general']?.threads.filter(t => String((t as any).plugin_key || '') === 'consultant').slice(0, 5) || []
    }
    const domain = moduleId as keyof typeof agentStore.byDomain
    return agentStore.byDomain[domain]?.threads.slice(0, 5) || []
  }

  function renderThreadChildren(moduleId: string, route: string, solo = false) {
    const threads = getThreadsForModule(moduleId)
    if (threads.length === 0) {
      return <div className="mr-empty-hint px-10 py-1 text-xs text-[var(--xiaoone-fg-mute)]">{t('sidebar.emptyThreads')}</div>
    }
    return (
      <div className={solo ? 'mr-nav-children mr-nav-children--solo' : 'mr-nav-children'}>
        {threads.map((thread: any) => (
          <NavLink
            key={thread.id}
            to={`${route}?thread=${thread.id}`}
            className={location.pathname === route && activeThreadId === thread.id ? 'mr-nav-child is-active' : 'mr-nav-child'}
          >
            <span>{thread.title || t('sidebar.newAgentThread')}</span>
            <small>{relativeTime(thread.last_message_at || thread.updated_at || thread.created_at)}</small>
          </NavLink>
        ))}
      </div>
    )
  }

  return (
    <aside className={collapsed ? 'mr-sidebar is-collapsed' : 'mr-sidebar'}>
      <div className="mr-brand">
        <button type="button" className="mr-brand-main" onClick={() => navigate('/workbench')}>
          <span className="mr-brand-mark">XO</span>
          <div>
            <strong>{t('brand.name')}</strong>
            <small>{t('brand.sub')}</small>
          </div>
        </button>
        <button
          type="button"
          className="mr-icon-btn mr-collapse-btn"
          aria-label={collapsed ? t('sidebar.expandNav') : t('sidebar.collapseNav')}
          onClick={() => workspace.toggleSidebarCollapsed()}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      <nav className="mr-quick-nav">
        {SIDEBAR_SECTIONS.find(section => section.id === 'quick')?.items.map((id) => {
          const item = MODULES[id]
          if (item.id === 'search') {
            return (
              <button key={item.id} type="button" className="mr-nav-row" onClick={() => setSearchOpen(true)}>
                <item.icon size={14} strokeWidth={1.9} />
                <span>{labelForModule(item.id, item.label)}</span>
              </button>
            )
          }
          return (
            <NavLink
              key={item.id}
              to={item.route}
              className={({ isActive }) => isActive ? 'mr-nav-row is-active' : 'mr-nav-row'}
              end={item.route === '/workbench'}
            >
              <item.icon size={14} strokeWidth={1.9} />
              <span>{labelForModule(item.id, item.label)}</span>
              {item.id === 'kefu' && liveChat.hasUnread() ? <b>{liveChat.unreadLabel()}</b> : null}
              {item.id === 'teamChat' && teamChat.totalUnread() > 0 ? <b>{teamChat.totalUnread() > 99 ? '99+' : teamChat.totalUnread()}</b> : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="mr-sidebar-scroll">
        {SIDEBAR_SECTIONS.filter(section => section.id !== 'quick').map(section => {
          const consultantItem = MODULES.consultant

          return (
            <section key={section.id} className="mr-nav-section">
              <div className="mr-nav-section-title mr-nav-section-title--static">
                <span className="mr-nav-section-label">{sectionTitle(section.id, section.title)}</span>
              </div>
              {section.id === 'consultant' ? (
                <nav className="mr-nav mr-nav--threads-only">
                  {renderThreadChildren('consultant', consultantItem.route, true)}
                </nav>
              ) : (
                <nav className="mr-nav">
                  {section.items.map((id) => {
                    const item = MODULES[id]
                    const heroRoute = HERO_ROUTE_BY_MODULE[id]
                    const isHeroActive = Boolean(heroRoute && location.pathname === heroRoute && !activeThreadId)
                    const entryActive = Boolean(heroRoute && location.pathname.startsWith(heroRoute))

                    return (
                      <div key={item.id} className="mr-nav-block">
                        <div className={entryActive ? 'mr-nav-entry is-active' : 'mr-nav-entry'}>
                          <NavLink
                            to={heroRoute || item.route}
                            className={({ isActive }) => (isActive || isHeroActive) ? 'mr-nav-row is-active' : 'mr-nav-row'}
                          >
                            <item.icon size={14} strokeWidth={1.9} />
                            <span>{labelForModule(item.id, item.label)}</span>
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
                        {renderThreadChildren(id, item.route)}
                      </div>
                    )
                  })}
                </nav>
              )}
            </section>
          )
        })}
      </div>

      <footer className="mr-sidebar-foot">
        <button
          type="button"
          className="mr-settings-trigger"
          onClick={() => setSettingsOpen(prev => !prev)}
          title={auth.user?.email || auth.user?.name || t('sidebar.settings')}
        >
          <Settings2 size={14} />
          <span>{t('sidebar.settings')}</span>
          <small>{auth.user?.name || auth.user?.email || '-'}</small>
          <ChevronDown size={12} />
        </button>
        {settingsOpen ? (
          <div className="mr-settings-menu mr-settings-menu--sidebar">
            {['account', 'teamManagement', 'archives', 'generationAssets'].map((id) => {
              const item = MODULES[id]
              return (
                <NavLink key={item.id} to={item.route} onClick={() => setSettingsOpen(false)}>
                  <item.icon size={13} />
                  {labelForModule(item.id, item.label)}
                </NavLink>
              )
            })}
            <button type="button" onClick={() => void auth.logout()}>
              <LogOut size={13} />
              {t('sidebar.logout')}
            </button>
          </div>
        ) : null}
      </footer>

      <AgentThreadSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </aside>
  )
}
