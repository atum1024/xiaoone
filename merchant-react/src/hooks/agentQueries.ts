import { useMemo } from 'react'
import { useQueries, useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { getChatKit, type AgentDomain, type AgentThread } from '@xiaoone/chat-kit'
import { queryClient } from '../app/queryClient'
import { getWorkspaceStatus } from '../lib/workspaceStatusApi'
import { useWsHealthStore } from '../store/wsHealth'

export const ALL_AGENT_DOMAINS: AgentDomain[] = ['general', 'marketing', 'support', 'agency', 'feedback']

export interface AssistantChannelRow {
  key: string
  label: string
  status: string
  bound: boolean
  supported?: boolean
  display_name?: string
  external_user_id_masked?: string
  updated_at?: string | null
  bind_url?: string
  deep_link?: string
  qr_code_url?: string
  manage_url?: string
}

export const AGENT_QUERY_KEYS = {
  root: () => ['agent'] as const,
  overview: () => ['agent', 'overview'] as const,
  sidebarThreads: () => ['agent', 'sidebar-threads'] as const,
  threads: (domain: AgentDomain) => ['agent', 'threads', domain] as const,
  assistantRuntimeStatus: () => ['assistant', 'runtime-status'] as const,
  assistantChannelBindings: () => ['assistant', 'channel-bindings'] as const,
}

function timeValue(input?: string | null) {
  if (!input)
    return 0
  const value = new Date(input).getTime()
  return Number.isFinite(value) ? value : 0
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

function emptySidebarThreads(): Record<AgentDomain, AgentThread[]> {
  return {
    general: [],
    marketing: [],
    support: [],
    agency: [],
    feedback: [],
  }
}

function mergeSidebarThreads(
  current: Record<AgentDomain, AgentThread[]> | undefined,
  incoming: Record<AgentDomain, AgentThread[]> | undefined,
) {
  const next = { ...emptySidebarThreads(), ...(incoming || {}) }
  if (!current)
    return next
  for (const domain of ALL_AGENT_DOMAINS) {
    const byId = new Map<string, AgentThread>()
    for (const thread of next[domain] || [])
      byId.set(thread.id, thread)
    for (const thread of current[domain] || []) {
      const fetched = byId.get(thread.id)
      if (!fetched) {
        byId.set(thread.id, thread)
        continue
      }
      const fetchedTime = timeValue(fetched.updated_at || fetched.last_message_at || fetched.created_at)
      const cachedTime = timeValue(thread.updated_at || thread.last_message_at || thread.created_at)
      if (cachedTime > fetchedTime)
        byId.set(thread.id, thread)
    }
    next[domain] = sortThreads(Array.from(byId.values()).filter(thread => !thread.archived)).slice(0, 5)
  }
  return next
}

export function upsertAgentThreadQueryCaches(thread: AgentThread) {
  if (!ALL_AGENT_DOMAINS.includes(thread.domain))
    return
  queryClient.setQueryData(AGENT_QUERY_KEYS.threads(thread.domain), (old: { items?: AgentThread[] } | undefined) => {
    const items = old?.items || []
    return { ...(old || {}), items: patchThreadInThreads(items, thread) }
  })
  queryClient.setQueryData(AGENT_QUERY_KEYS.sidebarThreads(), (old: Record<AgentDomain, AgentThread[]> | undefined) => {
    const next = { ...emptySidebarThreads(), ...(old || {}) }
    next[thread.domain] = patchThreadInThreads(next[thread.domain] || [], thread).slice(0, 5)
    return next
  })
}

export function removeAgentThreadQueryCaches(threadId: string, domain?: AgentDomain | string) {
  const targetDomains = domain && ALL_AGENT_DOMAINS.includes(domain as AgentDomain)
    ? [domain as AgentDomain]
    : ALL_AGENT_DOMAINS
  for (const d of targetDomains) {
    queryClient.setQueryData(AGENT_QUERY_KEYS.threads(d), (old: { items?: AgentThread[] } | undefined) => {
      const items = old?.items || []
      return { ...(old || {}), items: items.filter(item => item.id !== threadId) }
    })
  }
  queryClient.setQueryData(AGENT_QUERY_KEYS.sidebarThreads(), (old: Record<AgentDomain, AgentThread[]> | undefined) => {
    const next = { ...emptySidebarThreads(), ...(old || {}) }
    for (const d of targetDomains)
      next[d] = (next[d] || []).filter(item => item.id !== threadId)
    return next
  })
}

export function useAgentDomainsOverview(
  options: Pick<
    UseQueryOptions<Awaited<ReturnType<ReturnType<typeof getChatKit>['AgentDomainsOverviewAPI']['fetch']>>, Error>,
    'enabled' | 'refetchInterval'
  > = {},
) {
  const { AgentDomainsOverviewAPI } = getChatKit()
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.overview(),
    queryFn: ({ signal }) => AgentDomainsOverviewAPI.fetch({ signal }),
    ...options,
  })
}

export function useAgentSidebarThreads(enabled = true) {
  const { AgentSidebarThreadsAPI } = getChatKit()
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.sidebarThreads(),
    queryFn: async ({ signal }) => {
      const fetched = await AgentSidebarThreadsAPI.fetch({ signal })
      const current = queryClient.getQueryData<Record<AgentDomain, AgentThread[]>>(AGENT_QUERY_KEYS.sidebarThreads())
      return mergeSidebarThreads(current, fetched)
    },
    enabled,
    staleTime: 10_000,
  })
}

export function useAgentDomainThreads(domain: AgentDomain, enabled = true) {
  const { AgentThreadAPI } = getChatKit()
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.threads(domain),
    queryFn: ({ signal }) => AgentThreadAPI.list({ domain, archived: 'false', page_size: 80 }, { signal }),
    enabled,
  })
}

export function useAssistantRuntimeStatusQuery(enabled = true) {
  const wsConnected = useWsHealthStore(s => s.agentRealtimeConnected)
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.assistantRuntimeStatus(),
    queryFn: getWorkspaceStatus,
    enabled,
    refetchInterval: wsConnected ? false : 15_000,
    staleTime: 5_000,
  })
}

export function useAssistantChannelBindingsQuery() {
  const wsConnected = useWsHealthStore(s => s.agentRealtimeConnected)
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.assistantChannelBindings(),
    queryFn: async () => {
      const workspace = await getWorkspaceStatus()
      const supported = workspace?.assistant_channel?.supported_channels || []
      const byKey = new Map<string, AssistantChannelRow>()
      for (const channel of supported) {
        if (!channel.key || !channel.label)
          continue
        byKey.set(channel.key, {
          key: channel.key,
          label: channel.label,
          status: 'supported',
          bound: false,
          supported: true,
        })
      }
      return {
        channels: Array.from(byKey.values()),
        manageUrl: '',
      }
    },
    refetchInterval: wsConnected ? false : 20_000,
    refetchOnWindowFocus: true,
  })
}

export function useAgentRecentThreads(limit = 8) {
  const { AgentThreadAPI } = getChatKit()
  const queries = useQueries({
    queries: ALL_AGENT_DOMAINS.map(domain => ({
      queryKey: AGENT_QUERY_KEYS.threads(domain),
      queryFn: ({ signal }) => AgentThreadAPI.list({ domain, archived: 'false', page_size: 80 }, { signal }),
    })),
  })
  const data = useMemo(() => {
    const all: AgentThread[] = []
    for (const query of queries) {
      const rows = query.data?.items || []
      all.push(...rows)
    }
    const uniq = new Map<string, AgentThread>()
    for (const row of all) {
      const prev = uniq.get(row.id)
      if (!prev) {
        uniq.set(row.id, row)
        continue
      }
      const prevTs = new Date(prev.updated_at || prev.last_message_at || prev.created_at || 0).getTime()
      const nextTs = new Date(row.updated_at || row.last_message_at || row.created_at || 0).getTime()
      if (nextTs >= prevTs)
        uniq.set(row.id, row)
    }
    return Array.from(uniq.values())
      .filter(t => !t.archived)
      .sort((a, b) => {
        const ta = new Date(a.last_message_at || a.updated_at || a.created_at || 0).getTime()
        const tb = new Date(b.last_message_at || b.updated_at || b.created_at || 0).getTime()
        return tb - ta
      })
      .slice(0, limit)
  }, [limit, queries])
  return {
    data,
    isLoading: queries.some(q => q.isLoading),
    isFetching: queries.some(q => q.isFetching),
    error: queries.find(q => q.error)?.error ?? null,
    refetch: () => Promise.all(queries.map(q => q.refetch())),
  }
}
