import { create } from 'zustand'
import { getChatKit, type AgentDomain, type AgentGenerationTask, type AgentThread } from '@xiaoone/chat-kit'

export const MERCHANT_GENERATION_BROADCAST = 'xiaoone-merchant-generation-v1'

interface DomainState {
  threads: AgentThread[]
  loading: boolean
  loaded: boolean
  error: string | null
}

const empty = (): DomainState => ({ threads: [], loading: false, loaded: false, error: null })

const ALL_DOMAINS: AgentDomain[] = ['general', 'marketing', 'support', 'agency', 'feedback']

interface AgentState {
  byDomain: Record<AgentDomain, DomainState>
  overview: Record<string, { count: number; latest_title: string | null; latest_at: string | null }>
  overviewLoading: boolean
  backgroundGenerationPolls: Record<string, { threadId: string }>
  generationTaskSnapshots: Record<string, AgentGenerationTask>
}

interface AgentActions {
  threadsOf: (domain: AgentDomain) => AgentThread[]
  countOf: (domain: AgentDomain) => number
  recentAcrossDomains: (limit?: number) => AgentThread[]
  threadHasBackgroundPoll: (threadId: string) => boolean
  fetchDomain: (domain: AgentDomain, force?: boolean) => Promise<void>
  refreshDomain: (domain: AgentDomain | string) => Promise<void>
  bumpDomain: (domain: AgentDomain | string) => void
  refreshAllAgentDomains: () => Promise<void>
  registerBackgroundGenerationPoll: (task: AgentGenerationTask) => void
  clearBackgroundGenerationPoll: (taskId: string) => void
  putGenerationTaskSnapshot: (task: AgentGenerationTask) => void
  removeGenerationTaskSnapshot: (taskId: string) => void
  allBackgroundPollTaskIds: () => string[]
  fetchOverview: () => Promise<void>
  reset: () => void
}

export const useAgentStore = create<AgentState & AgentActions>()(
  (set, get) => ({
    byDomain: {
      general: empty(),
      marketing: empty(),
      support: empty(),
      agency: empty(),
      feedback: empty(),
    },
    overview: {},
    overviewLoading: false,
    backgroundGenerationPolls: {},
    generationTaskSnapshots: {},

    threadsOf: (domain) => get().byDomain[domain]?.threads || [],
    countOf: (domain) => get().overview?.[domain]?.count || 0,
    recentAcrossDomains: (limit = 8) => {
      const all: AgentThread[] = []
      const state = get()
      for (const d of ALL_DOMAINS) {
        const slot = state.byDomain[d]
        if (slot?.threads) all.push(...slot.threads)
      }
      const ts = (t: AgentThread) => new Date(t.last_message_at || t.created_at || 0).getTime()
      return all
        .filter(t => !t.archived)
        .sort((a, b) => ts(b) - ts(a))
        .slice(0, limit)
    },
    threadHasBackgroundPoll: (threadId) => Object.values(get().backgroundGenerationPolls).some(v => v.threadId === threadId),

    fetchDomain: async (domain, force = false) => {
      const state = get()
      const slot = state.byDomain[domain] || empty()
      if (slot.loading) return
      if (slot.loaded && !force) return
      
      set(s => ({ byDomain: { ...s.byDomain, [domain]: { ...slot, loading: true, error: null } } }))
      
      try {
        const { AgentThreadAPI } = getChatKit()
        const r = await AgentThreadAPI.list({ domain, archived: 'false', page_size: 80 })
        set(s => ({
          byDomain: { ...s.byDomain, [domain]: { ...s.byDomain[domain], threads: r.items || [], loaded: true, loading: false } }
        }))
      } catch (e: any) {
        set(s => ({
          byDomain: { ...s.byDomain, [domain]: { ...s.byDomain[domain], error: e?.response?.data?.message || e?.message || 'load failed', loading: false } }
        }))
      }
    },

    refreshDomain: async (domain) => {
      if (!ALL_DOMAINS.includes(domain as AgentDomain)) return
      await get().fetchDomain(domain as AgentDomain, true)
      get().fetchOverview().catch(() => {})
    },

    bumpDomain: (domain) => {
      if (!ALL_DOMAINS.includes(domain as AgentDomain)) return
      set(s => {
        const slot = s.byDomain[domain as AgentDomain]
        if (slot) return { byDomain: { ...s.byDomain, [domain as AgentDomain]: { ...slot, loaded: false } } }
        return s
      })
      get().refreshDomain(domain).catch(() => {})
    },

    refreshAllAgentDomains: async () => {
      await Promise.all(ALL_DOMAINS.map(d => get().fetchDomain(d, true)))
      await get().fetchOverview()
    },

    registerBackgroundGenerationPoll: (task) => set(s => {
      const polls = { ...s.backgroundGenerationPolls }
      const n = Object.keys(polls).length
      if (n >= 32) {
        const drop = Object.keys(polls)[0]
        delete polls[drop]
      }
      polls[task.id] = { threadId: task.thread }
      return { backgroundGenerationPolls: polls }
    }),

    clearBackgroundGenerationPoll: (taskId) => set(s => {
      if (!s.backgroundGenerationPolls[taskId]) return s
      const { [taskId]: _, ...rest } = s.backgroundGenerationPolls
      return { backgroundGenerationPolls: rest }
    }),

    putGenerationTaskSnapshot: (task) => set(s => {
      const prev = s.generationTaskSnapshots[task.id]
      if (!prev || (task.updated_at || '') >= (prev.updated_at || '')) {
        return { generationTaskSnapshots: { ...s.generationTaskSnapshots, [task.id]: task } }
      }
      return s
    }),

    removeGenerationTaskSnapshot: (taskId) => set(s => {
      if (!s.generationTaskSnapshots[taskId]) return s
      const { [taskId]: _, ...rest } = s.generationTaskSnapshots
      return { generationTaskSnapshots: rest }
    }),

    allBackgroundPollTaskIds: () => Object.keys(get().backgroundGenerationPolls),

    fetchOverview: async () => {
      if (get().overviewLoading) return
      set({ overviewLoading: true })
      try {
        const { AgentDomainsOverviewAPI } = getChatKit()
        const r = await AgentDomainsOverviewAPI.fetch()
        set({ overview: r || {} })
      } catch {
        // silently ignore
      } finally {
        set({ overviewLoading: false })
      }
    },

    reset: () => set({
      byDomain: {
        general: empty(),
        marketing: empty(),
        support: empty(),
        agency: empty(),
        feedback: empty(),
      },
      overview: {},
      backgroundGenerationPolls: {},
      generationTaskSnapshots: {}
    })
  })
)
