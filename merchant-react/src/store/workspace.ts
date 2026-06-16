import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BUSINESS_CATEGORIES, type NavCategory } from '../lib/nav'
import type { BusinessKey } from '../lib/composer'
import type { AgentDomain } from '@xiaoone/chat-kit'
import { mapRouteContextToWorkspacePatch } from './workspaceRouteSync'
import {
  SIDEBAR_DEFAULT_WIDTH,
  resolveSidebarResize,
} from '../layout/sidebarLayout'

export type WorkView =
  | 'hero'
  | 'kefu'
  | 'agent'
  | 'placeholder'
  | 'news'
  | 'automation'
  | 'repository'
  | 'file-library'
  | 'account'
  | 'team-mgmt'
  | 'archives'
  | 'generation-assets'

export type AccountTab = 'platform' | 'usage' | 'settings'
export type AccountSettingsSubTab = 'account' | 'team' | 'archives' | 'partner'

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
  accountSettingsSubTab: AccountSettingsSubTab
  heroBusiness: BusinessKey | null
  heroAllowBusinessPicker: boolean
  pendingAgentDraft: PendingAgentDraft | null
  kefuLiveStoreSummary: string
  skillsBumpKey: number
  view: WorkView
  sidebarCollapsed: boolean
  sidebarWidth: number
}

interface WorkspaceActions {
  toggleCategory: (key: NavCategory | 'business') => void
  setCategoryExpanded: (key: NavCategory | 'business', value: boolean) => void
  setBusinessChildrenExpandedAll: (value: boolean) => void
  toggleBusinessChildrenExpandedAll: () => void
  showHero: (business?: BusinessKey | null) => void
  unlockHeroBusinessPicker: () => void
  showArchives: () => void
  showGenerationAssets: () => void
  showKefu: (itemKey: string) => void
  showAutomation: () => void
  showRepository: () => void
  showFileLibrary: () => void
  toggleSidebarCollapsed: () => void
  setSidebarCollapsed: (value: boolean) => void
  setSidebarWidth: (width: number) => void
  applySidebarResize: (width: number) => void
  showAgentNew: (category: NavCategory, domain: string) => void
  startAgentDraft: (draft: PendingAgentDraft) => void
  consumeAgentDraft: (category: NavCategory, domain: AgentDomain) => PendingAgentDraft | null
  showAgentThread: (category: NavCategory, domain: string, threadId: string) => void
  showPlaceholder: (category: NavCategory) => void
  showAccount: (tab?: AccountTab, settingsSubTab?: AccountSettingsSubTab) => void
  setAccountSettingsSubTab: (subTab: AccountSettingsSubTab) => void
  showNews: () => void
  showTeamMgmt: () => void
  setKefuLiveStoreSummary: (label: string) => void
  bumpSkillBindings: () => void
  syncFromUrl: (pathname: string, search?: string) => void
}

type PersistedWorkspaceSlice = {
  expanded?: Partial<WorkspaceState['expanded']>
  accountTab?: unknown
  accountSettingsSubTab?: unknown
  sidebarCollapsed?: unknown
  sidebarWidth?: unknown
}

function normalizeAccountTab(tab: unknown): AccountTab {
  return tab === 'usage' || tab === 'settings' ? tab : 'platform'
}

function normalizeAccountSettingsSubTab(tab: unknown): AccountSettingsSubTab {
  return tab === 'team' || tab === 'archives' || tab === 'partner' ? tab : 'account'
}

function accountSettingsSectionFromSearch(search: string): AccountSettingsSubTab | null {
  const section = new URLSearchParams(search).get('section')
  if (section === 'team' || section === 'archives' || section === 'account' || section === 'partner')
    return section
  return null
}

const initialState: WorkspaceState = {
  expanded: {
    'business': true,
    'consultant': true,
    'system': false,
    'marketing': false,
    'marketingImage': false,
    'marketingVideo': false,
    'marketingCopy': false,
    'kefu': false,
    'support': false,
    'agency': false,
    'feedback': false,
    'automation': false,
  },
  selectedCategory: 'consultant',
  selectedKefuItem: null,
  selectedThreadId: null,
  activeDomain: 'general',
  accountTab: 'platform',
  accountSettingsSubTab: 'account',
  heroBusiness: null,
  heroAllowBusinessPicker: true,
  pendingAgentDraft: null,
  kefuLiveStoreSummary: '',
  skillsBumpKey: 0,
  view: 'agent',
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      toggleCategory: (key) => set(state => ({ expanded: { ...state.expanded, [key]: !state.expanded[key] } })),
      setCategoryExpanded: (key, value) => set(state => (
        state.expanded[key] === value
          ? {}
          : { expanded: { ...state.expanded, [key]: value } }
      )),
      
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
          corpus: 'uploads',
          'quick-replies': 'quick-replies',
          'qa-templates': 'qa-library',
          profile: 'uploads',
          'auto-reply': 'qa-library',
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

      showRepository: () => set(state => ({
        view: 'repository',
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
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      applySidebarResize: (width) => {
        const next = resolveSidebarResize(width)
        set({ sidebarCollapsed: next.collapsed, sidebarWidth: next.width })
      },

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

      showAccount: (tab = 'platform', settingsSubTab) => {
        const nextTab = normalizeAccountTab(tab)
        set({
          view: 'account',
          selectedCategory: null,
          selectedKefuItem: null,
          selectedThreadId: null,
          activeDomain: 'account',
          accountTab: nextTab,
          accountSettingsSubTab: nextTab === 'settings'
            ? normalizeAccountSettingsSubTab(settingsSubTab ?? get().accountSettingsSubTab)
            : get().accountSettingsSubTab,
        })
      },

      setAccountSettingsSubTab: (subTab) => set({
        view: 'account',
        selectedCategory: null,
        selectedKefuItem: null,
        selectedThreadId: null,
        activeDomain: 'account',
        accountTab: 'settings',
        accountSettingsSubTab: normalizeAccountSettingsSubTab(subTab),
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

      setKefuLiveStoreSummary: (label) => set({ kefuLiveStoreSummary: label }),
      bumpSkillBindings: () => set(state => ({ skillsBumpKey: state.skillsBumpKey + 1 })),

      syncFromUrl: (pathname, search = '') => {
        const patch = mapRouteContextToWorkspacePatch(pathname, search)
        if (!patch) return

        if (patch.view === 'hero') {
          get().showHero(patch.heroBusiness ?? null)
          return
        }

        if (patch.view === 'agent') {
          if (patch.selectedThreadId) {
            get().showAgentThread(patch.selectedCategory!, patch.activeDomain, patch.selectedThreadId)
            return
          }
          get().showAgentNew(patch.selectedCategory!, patch.activeDomain)
          return
        }

        if (patch.view === 'automation') {
          get().showAutomation()
          return
        }

        if (patch.view === 'kefu') {
          get().showKefu(patch.selectedKefuItem || 'waiting')
          return
        }

        if (patch.view === 'repository') {
          get().showRepository()
          return
        }

        if (patch.view === 'file-library') {
          get().showFileLibrary()
          return
        }

        if (patch.view === 'generation-assets') {
          get().showGenerationAssets()
          return
        }

        if (patch.view === 'news') {
          get().showNews()
          return
        }

        if (patch.view === 'account') {
          get().showAccount(patch.accountTab, patch.accountSettingsSubTab)
          return
        }

        if (patch.selectedCategory) {
          get().showPlaceholder(patch.selectedCategory)
        }
      },
    }),
    {
      name: 'xiaoone-merchant-workspace',
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as PersistedWorkspaceSlice
        const expanded: WorkspaceState['expanded'] = {
          ...initialState.expanded,
          ...(state.expanded || {}),
        }
        if (version < 2) {
          Object.assign(expanded, {
            business: true,
            system: false,
            marketing: false,
            marketingImage: false,
            marketingVideo: false,
            marketingCopy: false,
            support: false,
            agency: false,
            feedback: false,
          })
        }
        const sidebarWidth = typeof state.sidebarWidth === 'number' && Number.isFinite(state.sidebarWidth)
          ? state.sidebarWidth
          : SIDEBAR_DEFAULT_WIDTH
        return {
          expanded,
          accountTab: normalizeAccountTab(state.accountTab),
          accountSettingsSubTab: normalizeAccountSettingsSubTab(state.accountSettingsSubTab),
          sidebarCollapsed: state.sidebarCollapsed === true,
          sidebarWidth: version < 3 ? SIDEBAR_DEFAULT_WIDTH : sidebarWidth,
        }
      },
      partialize: (state) => ({
        expanded: state.expanded,
        accountTab: state.accountTab,
        accountSettingsSubTab: state.accountSettingsSubTab,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
      })
    }
  )
)
