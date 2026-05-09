import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BUSINESS_CATEGORIES, type NavCategory } from '../lib/nav'
import type { BusinessKey } from '../lib/composer'
import type { AgentDomain } from '@xiaoone/chat-kit'

export type WorkView =
  | 'hero'
  | 'kefu'
  | 'agent'
  | 'placeholder'
  | 'news'
  | 'automation'
  | 'file-library'
  | 'account'
  | 'team-mgmt'
  | 'team-chat'
  | 'platform-team'
  | 'archives'
  | 'generation-assets'

export type AccountTab = 'wallet' | 'billing' | 'usage'
export type TeamChatMode = 'new' | 'thread'
export type TeamCommunicationsTab = 'all' | 'dm' | 'group' | 'files'
export type TeamChatFileKind = 'dm' | 'group' | 'ai'

export interface PendingAgentDraft {
  category: NavCategory
  domain: AgentDomain
  content: string
  plugin: string | null
  mode: string | null
  model: string | null
}

interface WorkspaceState {
  expanded: Record<NavCategory | 'business', boolean>
  selectedCategory: NavCategory | null
  selectedKefuItem: string | null
  selectedThreadId: string | null
  activeDomain: string
  accountTab: AccountTab
  heroBusiness: BusinessKey | null
  heroAllowBusinessPicker: boolean
  selectedTeamChatId: string | null
  teamChatMode: TeamChatMode
  teamCommTab: TeamCommunicationsTab
  teamChatFileKind: TeamChatFileKind
  pendingAgentDraft: PendingAgentDraft | null
  pendingTeamChatDraft: { content: string; plugin: 'dm' | 'group' | null } | null
  kefuLiveStoreSummary: string
  skillsBumpKey: number
  view: WorkView
  sidebarCollapsed: boolean
}

interface WorkspaceActions {
  toggleCategory: (key: NavCategory | 'business') => void
  setBusinessChildrenExpandedAll: (value: boolean) => void
  toggleBusinessChildrenExpandedAll: () => void
  showHero: (business?: BusinessKey | null) => void
  unlockHeroBusinessPicker: () => void
  showArchives: () => void
  showGenerationAssets: () => void
  showKefu: (itemKey: string) => void
  showAutomation: () => void
  showFileLibrary: () => void
  toggleSidebarCollapsed: () => void
  setSidebarCollapsed: (value: boolean) => void
  showAgentNew: (category: NavCategory, domain: string) => void
  startAgentDraft: (draft: PendingAgentDraft) => void
  consumeAgentDraft: (category: NavCategory, domain: AgentDomain) => PendingAgentDraft | null
  showAgentThread: (category: NavCategory, domain: string, threadId: string) => void
  showPlaceholder: (category: NavCategory) => void
  showAccount: (tab?: AccountTab) => void
  showNews: () => void
  showTeamMgmt: () => void
  enterTeamCommunications: (tab?: TeamCommunicationsTab) => void
  showTeamChatNew: () => void
  startTeamChatDraft: (content: string, plugin?: 'dm' | 'group' | null) => void
  consumeTeamChatDraft: () => { content: string; plugin: 'dm' | 'group' | null } | null
  showTeamChatThread: (convId: string, convKind?: 'dm' | 'group') => void
  showTeamChatFiles: (kind?: TeamChatFileKind) => void
  enterPlatformTeamCommunications: (tab?: TeamCommunicationsTab) => void
  showPlatformTeamChatNew: () => void
  showPlatformTeamChatThread: (convId: string, convKind?: 'dm' | 'group') => void
  setTeamCommTab: (tab: TeamCommunicationsTab) => void
  setTeamChatFileKind: (kind: TeamChatFileKind) => void
  selectTeamChat: (id: string | null) => void
  setKefuLiveStoreSummary: (label: string) => void
  bumpSkillBindings: () => void
  syncFromUrl: (pathname: string) => void
}

const initialState: WorkspaceState = {
  expanded: {
    'business': true,
    'consultant': true,
    'system': false,
    'marketing': true,
    'kefu': false,
    'support': false,
    'agency': false,
    'feedback': false,
    'automation': false,
    'team-chat': false,
  },
  selectedCategory: 'consultant',
  selectedKefuItem: null,
  selectedThreadId: null,
  activeDomain: 'general',
  accountTab: 'wallet',
  heroBusiness: null,
  heroAllowBusinessPicker: true,
  selectedTeamChatId: null,
  teamChatMode: 'new',
  teamCommTab: 'all',
  teamChatFileKind: 'dm',
  pendingAgentDraft: null,
  pendingTeamChatDraft: null,
  kefuLiveStoreSummary: '',
  skillsBumpKey: 0,
  view: 'agent',
  sidebarCollapsed: false,
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      toggleCategory: (key) => set(state => ({ expanded: { ...state.expanded, [key]: !state.expanded[key] } })),
      
      setBusinessChildrenExpandedAll: (value) => set(state => {
        const next = { ...state.expanded }
        for (const c of BUSINESS_CATEGORIES) next[c.key] = value
        return { expanded: next }
      }),
      
      toggleBusinessChildrenExpandedAll: () => {
        const state = get()
        const anyOpen = BUSINESS_CATEGORIES.some(c => state.expanded[c.key])
        get().setBusinessChildrenExpandedAll(!anyOpen)
      },

      showHero: (business = null) => set({
        view: 'hero',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'general',
        heroBusiness: business,
        heroAllowBusinessPicker: business === null
      }),

      unlockHeroBusinessPicker: () => set({ heroAllowBusinessPicker: true }),

      showArchives: () => set({
        view: 'archives',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'archives'
      }),

      showGenerationAssets: () => set({
        view: 'generation-assets',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'general'
      }),

      showKefu: (itemKey) => {
        if (itemKey === 'agents' || itemKey === 'merchant-team') {
          get().showTeamMgmt()
          return
        }
        const legacy: Record<string, string> = {
          corpus: 'qa-templates',
          'quick-replies': 'qa-templates',
          'sdk-config': 'tech-config',
          channels: 'tech-config',
          products: 'stores',
          skills: 'tech-config',
        }
        const key = legacy[itemKey] || itemKey
        set(state => ({
          view: 'kefu',
          selectedCategory: 'kefu',
          selectedKefuItem: key,
          activeDomain: 'kefu',
          selectedThreadId: null,
          expanded: { ...state.expanded, kefu: true },
        }))
      },

      showAutomation: () => set(state => ({
        view: 'automation',
        selectedCategory: 'automation',
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'general',
        expanded: { ...state.expanded, automation: true }
      })),

      showFileLibrary: () => set(state => ({
        view: 'file-library',
        selectedCategory: 'automation',
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'general',
        expanded: { ...state.expanded, automation: true }
      })),

      toggleSidebarCollapsed: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

      showAgentNew: (category, domain) => set({
        view: 'agent',
        selectedCategory: category,
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: domain,
      }),

      startAgentDraft: (draft) => {
        set({ pendingAgentDraft: draft })
        get().showAgentNew(draft.category, draft.domain)
      },

      consumeAgentDraft: (category, domain) => {
        const draft = get().pendingAgentDraft
        if (!draft || draft.category !== category || draft.domain !== domain) return null
        set({ pendingAgentDraft: null })
        return draft
      },

      showAgentThread: (category, domain, threadId) => set(state => ({
        view: 'agent',
        selectedCategory: category,
        selectedKefuItem: null,
        selectedThreadId: threadId,
        activeDomain: domain,
        // Auto-expand nav category if collapsed when opening a thread from outside the sidebar (e.g. search/archives).
        expanded: state.expanded[category] === false ? { ...state.expanded, [category]: true } : state.expanded,
      })),

      showPlaceholder: (category) => set(state => ({
        view: 'placeholder',
        selectedCategory: category,
        selectedKefuItem: null,
        selectedThreadId: null,
        expanded: { ...state.expanded, [category]: true }
      })),

      showAccount: (tab = 'wallet') => set({
        view: 'account',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'account',
        accountTab: tab
      }),

      showNews: () => set({
        view: 'news',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'news'
      }),

      showTeamMgmt: () => set({
        view: 'team-mgmt',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'team-mgmt'
      }),

      enterTeamCommunications: (tab = 'all') => set({
        view: 'team-chat',
        selectedCategory: 'team-chat',
        selectedKefuItem: null,
        selectedThreadId: null,
        teamCommTab: tab,
        selectedTeamChatId: null,
        teamChatMode: 'new',
        activeDomain: 'team-chat'
      }),

      showTeamChatNew: () => set({
        view: 'team-chat',
        selectedCategory: 'team-chat',
        selectedKefuItem: null,
        selectedThreadId: null,
        selectedTeamChatId: null,
        activeDomain: 'team-chat',
        teamChatMode: 'new'
      }),

      startTeamChatDraft: (content, plugin = null) => {
        set({ pendingTeamChatDraft: { content, plugin } })
        const tab = plugin === 'dm' ? 'dm' : plugin === 'group' ? 'group' : 'all'
        get().enterTeamCommunications(tab)
      },

      consumeTeamChatDraft: () => {
        const draft = get().pendingTeamChatDraft
        set({ pendingTeamChatDraft: null })
        return draft
      },

      showTeamChatThread: (convId, convKind) => set(state => ({
        view: 'team-chat',
        selectedCategory: 'team-chat',
        selectedKefuItem: null,
        selectedThreadId: null,
        selectedTeamChatId: convId,
        activeDomain: 'team-chat',
        teamChatMode: 'thread',
        teamCommTab: (convKind && (state.teamCommTab === 'dm' || state.teamCommTab === 'group')) ? convKind : state.teamCommTab
      })),

      showTeamChatFiles: (kind = 'dm') => set({
        view: 'team-chat',
        selectedCategory: 'team-chat',
        selectedKefuItem: null,
        selectedThreadId: null,
        selectedTeamChatId: null,
        teamChatMode: 'new',
        teamCommTab: 'files',
        teamChatFileKind: kind,
        activeDomain: 'team-chat'
      }),

      enterPlatformTeamCommunications: (tab = 'all') => set({
        view: 'platform-team',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        teamCommTab: tab,
        selectedTeamChatId: null,
        teamChatMode: 'new',
        activeDomain: 'platform-team'
      }),

      showPlatformTeamChatNew: () => set({
        view: 'platform-team',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        selectedTeamChatId: null,
        activeDomain: 'platform-team',
        teamChatMode: 'new'
      }),

      showPlatformTeamChatThread: (convId, convKind) => set(state => ({
        view: 'platform-team',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        selectedTeamChatId: convId,
        activeDomain: 'platform-team',
        teamChatMode: 'thread',
        teamCommTab: (convKind && (state.teamCommTab === 'dm' || state.teamCommTab === 'group')) ? convKind : state.teamCommTab
      })),

      setTeamCommTab: (tab) => set(state => {
        if (tab === 'files') {
          return { teamCommTab: tab, selectedTeamChatId: null, teamChatMode: 'new' }
        }
        return { teamCommTab: tab }
      }),

      setTeamChatFileKind: (kind) => set(state => {
        if (state.view === 'team-chat') {
          return { teamChatFileKind: kind, teamCommTab: 'files', selectedTeamChatId: null, teamChatMode: 'new' }
        }
        return { teamChatFileKind: kind }
      }),

      selectTeamChat: (id) => set({ selectedTeamChatId: id }),
      setKefuLiveStoreSummary: (label) => set({ kefuLiveStoreSummary: label }),
      bumpSkillBindings: () => set(state => ({ skillsBumpKey: state.skillsBumpKey + 1 })),

      syncFromUrl: (pathname) => {
        const searchParams = new URLSearchParams(window.location.search)
        const threadId = searchParams.get('thread') || null
        
        if (pathname === '/workbench') get().showHero(null)
        else if (pathname === '/workbench/consultant') threadId ? get().showAgentThread('consultant', 'general', threadId) : get().showAgentNew('consultant', 'general')
        else if (pathname === '/workbench/system') threadId ? get().showAgentThread('system', 'general', threadId) : get().showAgentNew('system', 'general')
        else if (pathname === '/workbench/marketing') threadId ? get().showAgentThread('marketing', 'marketing', threadId) : get().showAgentNew('marketing', 'marketing')
        else if (pathname === '/workbench/support') threadId ? get().showAgentThread('support', 'support', threadId) : get().showAgentNew('support', 'support')
        else if (pathname === '/workbench/agency') threadId ? get().showAgentThread('agency', 'agency', threadId) : get().showAgentNew('agency', 'agency')
        else if (pathname === '/workbench/feedback') threadId ? get().showAgentThread('feedback', 'feedback', threadId) : get().showAgentNew('feedback', 'feedback')
        else if (pathname.startsWith('/workbench/kefu')) {
          if (pathname.includes('/stores')) get().showKefu('stores')
          else if (pathname.includes('/qa-templates')) get().showKefu('qa-templates')
          else if (pathname.includes('/tech-config')) get().showKefu('tech-config')
          else get().showKefu('live-chat')
        }
        else if (pathname === '/workbench/automation') get().showAutomation()
        else if (pathname === '/workbench/file-library') get().showFileLibrary()
        else if (pathname === '/workbench/skills') get().showNews() // Maps to news/skills view
        else if (pathname === '/workbench/account') get().showAccount(get().accountTab)
        else if (pathname === '/workbench/team-management') get().showTeamMgmt()
        else if (pathname === '/workbench/archives') get().showArchives()
        else if (pathname === '/workbench/generation-assets') get().showGenerationAssets()
        else if (pathname === '/workbench/team-chat') {
          // It's handled internally by teamChatMode but default to enter
          get().enterTeamCommunications(get().teamCommTab)
        }
        else if (pathname === '/workbench/platform-team') {
          get().enterPlatformTeamCommunications(get().teamCommTab)
        }
      }
    }),
    {
      name: 'xiaoone-merchant-workspace',
      partialize: (state) => ({
        expanded: state.expanded,
        accountTab: state.accountTab,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
)
