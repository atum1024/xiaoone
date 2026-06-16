import { create } from 'zustand'
import { type AgentDomain, type AgentGenerationTask, type AgentThread } from '@xiaoone/chat-kit'
import { AGENT_QUERY_KEYS, removeAgentThreadQueryCaches, upsertAgentThreadQueryCaches } from '../hooks/agentQueries'
import { queryClient } from '../app/queryClient'

export const MERCHANT_GENERATION_BROADCAST = 'xiaoone-merchant-generation-v1'

interface DomainState {
  threads: AgentThread[]
  loading: boolean
  loaded: boolean
  error: string | null
  lastFetchedAt: number
  lastSeenUpdatedAt: string | null
}

const empty = (): DomainState => ({
  threads: [],
  loading: false,
  loaded: false,
  error: null,
  lastFetchedAt: 0,
  lastSeenUpdatedAt: null,
})

const ALL_DOMAINS: AgentDomain[] = ['general', 'marketing', 'support', 'agency', 'feedback']
const ACTIVE_GENERATION_STATUSES = new Set(['submitted', 'queued', 'running'])

function timeValue(input?: string | null) {
  if (!input)
    return 0
  const value = new Date(input).getTime()
  return Number.isFinite(value) ? value : 0
}

function newestThreadUpdatedAt(threads: AgentThread[]) {
  let newest = ''
  let newestValue = 0
  for (const thread of threads) {
    const candidate = thread.updated_at || thread.last_message_at || thread.created_at
    const value = timeValue(candidate)
    if (value > newestValue) {
      newestValue = value
      newest = candidate || ''
    }
  }
  return newest || null
}

function isIncomingFresh(incoming?: string | null, current?: string | null) {
  const incomingValue = timeValue(incoming)
  const currentValue = timeValue(current)
  if (!currentValue)
    return true
  if (!incomingValue)
    return false
  return incomingValue >= currentValue
}

function sortThreads(threads: AgentThread[]) {
  return threads.slice().sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned))
      return a.pinned ? -1 : 1
    const ts = (item: AgentThread) => timeValue(item.last_message_at || item.updated_at || item.created_at)
    return ts(b) - ts(a)
  })
}

function patchThreadInThreads(threads: AgentThread[], thread: AgentThread) {
  if (thread.archived)
    return threads.filter(item => item.id !== thread.id)
  return sortThreads([thread, ...threads.filter(item => item.id !== thread.id)])
}

function patchGenerationIntoThreads(threads: AgentThread[], task: AgentGenerationTask) {
  let changed = false
  const next = threads.map((thread) => {
    if (thread.id !== task.thread)
      return thread
    changed = true
    return {
      ...thread,
      active_generation_count: ACTIVE_GENERATION_STATUSES.has(task.status) ? Math.max(1, thread.active_generation_count || 0) : 0,
      latest_generation_status: task.status,
      latest_generation_updated_at: task.updated_at || thread.latest_generation_updated_at,
      updated_at: task.updated_at || thread.updated_at,
    }
  })
  return changed ? sortThreads(next) : null
}

function cachedThreadsOf(domain: AgentDomain) {
  return queryClient.getQueryData<{ items?: AgentThread[] }>(AGENT_QUERY_KEYS.threads(domain))?.items
}

interface AgentState {
  byDomain: Record<AgentDomain, DomainState>
  backgroundGenerationPolls: Record<string, { threadId: string }>
  generationTaskSnapshots: Record<string, AgentGenerationTask>
}

interface AgentActions {
  threadsOf: (domain: AgentDomain) => AgentThread[]
  countOf: (domain: AgentDomain) => number
  recentAcrossDomains: (limit?: number) => AgentThread[]
  threadHasBackgroundPoll: (threadId: string) => boolean
  upsertThread: (thread: AgentThread) => void
  removeThread: (threadId: string, domain?: AgentDomain | string) => void
  registerBackgroundGenerationPoll: (task: AgentGenerationTask) => void
  clearBackgroundGenerationPoll: (taskId: string) => void
  putGenerationTaskSnapshot: (task: AgentGenerationTask) => void
  removeGenerationTaskSnapshot: (taskId: string) => void
  allBackgroundPollTaskIds: () => string[]
  handleRealtimeEvent: (event: string, data: any) => void
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
    backgroundGenerationPolls: {},
    generationTaskSnapshots: {},

    threadsOf: (domain) => cachedThreadsOf(domain) || get().byDomain[domain]?.threads || [],
    countOf: (domain) => (cachedThreadsOf(domain) || get().byDomain[domain]?.threads || []).filter(t => !t.archived).length,
    recentAcrossDomains: (limit = 8) => {
      const all: AgentThread[] = []
      const state = get()
      for (const d of ALL_DOMAINS) {
        const threads = cachedThreadsOf(d) || state.byDomain[d]?.threads
        if (threads)
          all.push(...threads)
      }
      return all
        .filter(t => !t.archived)
        .sort((a, b) => timeValue(b.last_message_at || b.created_at) - timeValue(a.last_message_at || a.created_at))
        .slice(0, limit)
    },
    threadHasBackgroundPoll: (threadId) => Object.values(get().backgroundGenerationPolls).some(v => v.threadId === threadId),

    upsertThread: (thread) => {
      if (!ALL_DOMAINS.includes(thread.domain))
        return
      set((s) => {
        const slot = s.byDomain[thread.domain] || empty()
        const current = slot.threads.find(item => item.id === thread.id)
        if (current && !isIncomingFresh(thread.updated_at, current.updated_at))
          return s
        const nextThreads = patchThreadInThreads(slot.threads, thread)
        return {
          byDomain: {
            ...s.byDomain,
            [thread.domain]: {
              ...slot,
              threads: nextThreads,
              loaded: true,
              loading: false,
              error: null,
              lastFetchedAt: Date.now(),
              lastSeenUpdatedAt: newestThreadUpdatedAt(nextThreads) || thread.updated_at || slot.lastSeenUpdatedAt,
            },
          },
        }
      })
    },

    removeThread: (threadId, domain) => {
      set((s) => {
        const domains = domain && ALL_DOMAINS.includes(domain as AgentDomain)
          ? [domain as AgentDomain]
          : ALL_DOMAINS
        let byDomain = s.byDomain
        for (const d of domains) {
          const slot = byDomain[d] || empty()
          const nextThreads = slot.threads.filter(item => item.id !== threadId)
          if (nextThreads.length === slot.threads.length)
            continue
          byDomain = {
            ...byDomain,
            [d]: {
              ...slot,
              threads: nextThreads,
              loaded: true,
              loading: false,
              error: null,
              lastFetchedAt: Date.now(),
              lastSeenUpdatedAt: newestThreadUpdatedAt(nextThreads),
            },
          }
        }
        return { byDomain }
      })
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

    clearBackgroundGenerationPoll: (taskId) => set((s) => {
      if (!s.backgroundGenerationPolls[taskId])
        return s
      const { [taskId]: _, ...rest } = s.backgroundGenerationPolls
      return { backgroundGenerationPolls: rest }
    }),

    putGenerationTaskSnapshot: (task) => set((s) => {
      const prev = s.generationTaskSnapshots[task.id]
      if (!prev || isIncomingFresh(task.updated_at, prev.updated_at))
        return { generationTaskSnapshots: { ...s.generationTaskSnapshots, [task.id]: task } }
      return s
    }),

    removeGenerationTaskSnapshot: (taskId) => set((s) => {
      if (!s.generationTaskSnapshots[taskId])
        return s
      const { [taskId]: _, ...rest } = s.generationTaskSnapshots
      return { generationTaskSnapshots: rest }
    }),

    allBackgroundPollTaskIds: () => Object.keys(get().backgroundGenerationPolls),

    handleRealtimeEvent: (event, data) => {
      if (event === 'agent.thread.updated' && data?.thread) {
        const thread = data.thread as AgentThread
        upsertAgentThreadQueryCaches(thread)
        get().upsertThread(thread)
        return
      }

      if (event === 'agent.thread.deleted' && data?.thread_id) {
        const threadId = data.thread_id as string
        const eventDomain = data.domain as AgentDomain | undefined
        removeAgentThreadQueryCaches(threadId, eventDomain)
        get().removeThread(threadId, eventDomain)
        queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.overview() }).catch(() => {})
        return
      }

      if (event !== 'agent.generation.updated')
        return

      if (data?.task) {
        const task = data.task as AgentGenerationTask
        get().putGenerationTaskSnapshot(task)
        if (!data?.thread && task.thread) {
          for (const d of ALL_DOMAINS) {
            queryClient.setQueryData(
              AGENT_QUERY_KEYS.threads(d),
              (old: { items?: AgentThread[] } | undefined) => {
                const items = old?.items || []
                const patched = patchGenerationIntoThreads(items, task)
                return patched ? { ...(old || {}), items: patched } : old
              },
            )
          }
          queryClient.setQueryData(
            AGENT_QUERY_KEYS.sidebarThreads(),
            (old: Record<AgentDomain, AgentThread[]> | undefined) => {
              if (!old)
                return old
              let changed = false
              const next = { ...old }
              for (const d of ALL_DOMAINS) {
                const patched = patchGenerationIntoThreads(old[d] || [], task)
                if (!patched)
                  continue
                changed = true
                next[d] = patched.slice(0, 5)
              }
              return changed ? next : old
            },
          )
          set((s) => {
            const byDomain = { ...s.byDomain }
            let changed = false
            for (const d of ALL_DOMAINS) {
              const slot = byDomain[d]
              const patched = patchGenerationIntoThreads(slot.threads, task)
              if (!patched)
                continue
              changed = true
              byDomain[d] = {
                ...slot,
                threads: patched,
                loaded: true,
                loading: false,
                error: null,
                lastFetchedAt: Date.now(),
                lastSeenUpdatedAt: newestThreadUpdatedAt(patched),
              }
            }
            return changed ? { byDomain } : s
          })
        }
      }

      if (data?.thread) {
        const thread = data.thread as AgentThread
        upsertAgentThreadQueryCaches(thread)
        get().upsertThread(thread)
      }
    },

    reset: () => {
      queryClient.removeQueries({ queryKey: AGENT_QUERY_KEYS.root() })
      set({
        byDomain: {
          general: empty(),
          marketing: empty(),
          support: empty(),
          agency: empty(),
          feedback: empty(),
        },
        backgroundGenerationPolls: {},
        generationTaskSnapshots: {},
      })
    },
  }),
)
