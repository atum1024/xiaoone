import { create } from 'zustand'
import { AgentLiveSocket, getChatKit, type LiveConversation, type LiveMessage, type LiveState } from '@xiaoone/chat-kit'
import { describeKefuError } from '../lib/apiErrors'
import { readAccessToken } from '../lib/authEvents'
import { useAgentStore } from './agent'
import { queryClient } from '../app/queryClient'
import { AGENT_QUERY_KEYS } from '../hooks/agentQueries'

export interface LiveAgentPanelHandlers {
  onReady?: () => void
  onMessage?: (env: { conversation: LiveConversation; message: LiveMessage }) => void
  onMessageUpdated?: (env: { conversation: LiveConversation; message: LiveMessage }) => void
  onState?: (env: { conversation: LiveConversation }) => void
  onMerchantEvent?: (event: string, data: any) => void
  onAck?: (env: { client_message_id: string; data?: { conversation: LiveConversation; message: LiveMessage } }) => void
  onNack?: (env: { client_message_id: string; error?: string }) => void
}

function sumVisitorUnread(items: { visitor_unread_count?: number }[]) {
  return items.reduce((s, c) => s + (c.visitor_unread_count ?? 0), 0)
}

function normalizeLiveState(value?: string | null): LiveState | null {
  return value === 'waiting' || value === 'active' || value === 'closed' ? value : null
}

let liveSocket: InstanceType<typeof AgentLiveSocket> | null = null
let realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null
let panelHandlers: LiveAgentPanelHandlers | null = null
let pendingAgentJoinIds = new Set<string>()

interface LiveChatState {
  waitingCount: number
  activeCount: number
  closedCount: number
  visitorUnreadTotal: number
  waitingVisitorUnreadSum: number
  activeVisitorUnreadSum: number
  lastSync: string | null
  pollHandle: number | null
  realtimeConnected: boolean
  agentWsStatus: 'idle' | 'no-token' | 'connecting' | 'open' | 'closed' | 'auth-failed'
  loaded: boolean
  error: string
}

interface LiveChatActions {
  hasUnread: () => boolean
  unreadLabel: () => string
  tooltipSummary: () => string
  isPollingFallback: () => boolean
  fetchCounts: () => Promise<void>
  applyStateTransition: (from?: string | null, to?: string | null) => void
  scheduleFetchCounts: (delayMs?: number) => void
  ensureAgentRealtime: () => void
  attachAgentPanel: (handlers: LiveAgentPanelHandlers | null) => void
  agentJoin: (conversationId: string) => void
  agentLeave: (conversationId: string) => void
  agentSendMessage: (conversationId: string, text: string, attachmentId?: string) => string | null
  startRealtime: () => void
  stopRealtime: () => void
  startPolling: (intervalMs?: number) => void
  stopPolling: () => void
  reset: () => void
}

export const useLiveChatStore = create<LiveChatState & LiveChatActions>()((set, get) => ({
  waitingCount: 0,
  activeCount: 0,
  closedCount: 0,
  visitorUnreadTotal: 0,
  waitingVisitorUnreadSum: 0,
  activeVisitorUnreadSum: 0,
  lastSync: null,
  pollHandle: null,
  realtimeConnected: false,
  agentWsStatus: 'idle',
  loaded: false,
  error: '',

  hasUnread: () => get().waitingCount > 0 || get().visitorUnreadTotal > 0,
  
  unreadLabel: () => {
    const state = get()
    const n = state.waitingCount > 0 ? state.waitingCount : state.visitorUnreadTotal
    if (n <= 0) return ''
    return n > 99 ? '99+' : String(n)
  },
  
  tooltipSummary: () => {
    const state = get()
    const parts: string[] = []
    if (state.waitingCount) parts.push(`排队 ${state.waitingCount}`)
    if (state.activeCount) parts.push(`进行中 ${state.activeCount}`)
    if (state.visitorUnreadTotal) parts.push(`访客新消息 ${state.visitorUnreadTotal}`)
    return parts.join(' · ') || '暂无待处理'
  },

  isPollingFallback: () => get().pollHandle != null,

  applyStateTransition: (from, to) => {
    const source = normalizeLiveState(from)
    const target = normalizeLiveState(to)
    if (!source || !target || source === target) return
    set((state) => {
      const next = {
        waitingCount: state.waitingCount,
        activeCount: state.activeCount,
        closedCount: state.closedCount,
      }
      if (source === 'waiting')
        next.waitingCount = Math.max(0, next.waitingCount - 1)
      if (source === 'active')
        next.activeCount = Math.max(0, next.activeCount - 1)
      if (source === 'closed')
        next.closedCount = Math.max(0, next.closedCount - 1)
      if (target === 'waiting')
        next.waitingCount += 1
      if (target === 'active')
        next.activeCount += 1
      if (target === 'closed')
        next.closedCount += 1
      return {
        ...next,
        lastSync: new Date().toISOString(),
        loaded: true,
      }
    })
  },

  fetchCounts: async () => {
    try {
      const { ChatAPI } = getChatKit()
      const countPageSize = 200
      const [waiting, active, closed] = await Promise.all([
        ChatAPI.conversations({ state: 'waiting', page_size: countPageSize }),
        ChatAPI.conversations({ state: 'active', page_size: countPageSize }),
        ChatAPI.conversations({ state: 'closed', page_size: 1 }),
      ])
      const waitingVisitorUnreadSum = sumVisitorUnread(waiting.items)
      const activeVisitorUnreadSum = sumVisitorUnread(active.items)
      const waitingTotal = typeof waiting.total === 'number' ? waiting.total : waiting.items.length
      const activeTotal = typeof active.total === 'number' ? active.total : active.items.length
      const closedTotal = typeof closed.total === 'number' ? closed.total : closed.items.length

      set({
        waitingCount: waitingTotal,
        activeCount: activeTotal,
        closedCount: closedTotal,
        waitingVisitorUnreadSum,
        activeVisitorUnreadSum,
        visitorUnreadTotal: waitingVisitorUnreadSum + activeVisitorUnreadSum,
        lastSync: new Date().toISOString(),
        loaded: true,
        error: ''
      })
    } catch (e: unknown) {
      set({ error: describeKefuError(e, '同步客户咨询失败') })
    }
  },

  scheduleFetchCounts: (delayMs = 800) => {
    if (realtimeRefreshTimer != null) clearTimeout(realtimeRefreshTimer)
    realtimeRefreshTimer = setTimeout(() => {
      realtimeRefreshTimer = null
      if (!document.hidden) get().fetchCounts().catch(() => {})
    }, delayMs)
  },

  ensureAgentRealtime: () => {
    const token = readAccessToken()
    if (!token) {
      set({ agentWsStatus: 'no-token' })
      return
    }
    if (liveSocket) return
    get().startRealtime()
  },

  attachAgentPanel: (handlers) => {
    panelHandlers = handlers
    if (handlers && liveSocket && get().agentWsStatus === 'open') {
      queueMicrotask(() => handlers.onReady?.())
    }
  },

  agentJoin: (conversationId) => {
    if (!conversationId) return
    pendingAgentJoinIds.add(conversationId)
    if (liveSocket && get().agentWsStatus === 'open') {
      liveSocket.joinConversation(conversationId)
      pendingAgentJoinIds.delete(conversationId)
    }
  },

  agentLeave: (conversationId) => {
    if (conversationId) pendingAgentJoinIds.delete(conversationId)
    liveSocket?.leaveConversation(conversationId)
  },

  agentSendMessage: (conversationId, text, attachmentId) => {
    if (!liveSocket || get().agentWsStatus !== 'open') return null
    return liveSocket.sendMessage(conversationId, text, attachmentId)
  },

  startRealtime: () => {
    const state = get()
    state.stopRealtime()
    state.stopPolling()
    state.fetchCounts().catch(() => {})
    
    const token = readAccessToken()
    if (!token) {
      set({ agentWsStatus: 'no-token' })
      return
    }
    set({ agentWsStatus: 'connecting' })
    
    const { createAgentLiveSocket } = getChatKit()
    liveSocket = createAgentLiveSocket({
      onTransportStatus: (status) => {
        if (status === 'auth-failed') {
          get().stopPolling()
          set({
            realtimeConnected: false,
            agentWsStatus: 'auth-failed',
            error: '登录已失效，请刷新页面重新登录',
          })
          return
        }
        if (status === 'connecting') {
          set({ agentWsStatus: 'connecting', error: '' })
          return
        }
        if (status === 'open' && get().agentWsStatus !== 'open') {
          set({ agentWsStatus: 'connecting' })
        }
      },
      onReady: () => {
        set({ realtimeConnected: true, agentWsStatus: 'open' })
        get().stopPolling()
        get().fetchCounts().catch(() => {})
        if (liveSocket && pendingAgentJoinIds.size) {
          for (const id of Array.from(pendingAgentJoinIds)) {
            liveSocket.joinConversation(id)
          }
          pendingAgentJoinIds.clear()
        }
        panelHandlers?.onReady?.()
      },
      onClose: () => {
        if (get().agentWsStatus === 'auth-failed')
          return
        set({ realtimeConnected: false, agentWsStatus: 'closed' })
        queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.overview() }).catch(() => {})
        get().startPolling(15000)
      },
      onMessage: (env) => {
        get().scheduleFetchCounts()
        panelHandlers?.onMessage?.(env)
      },
      onMessageUpdated: (env) => panelHandlers?.onMessageUpdated?.(env),
      onState: (env) => {
        get().scheduleFetchCounts()
        panelHandlers?.onState?.(env)
      },
      onMerchantEvent: (event, data) => {
        if (event === 'message' || event === 'state') get().scheduleFetchCounts()
        if (event.startsWith('agent.'))
          useAgentStore.getState().handleRealtimeEvent(event, data)
        panelHandlers?.onMerchantEvent?.(event, data)
      },
      onAck: (env) => panelHandlers?.onAck?.(env),
      onNack: (env) => panelHandlers?.onNack?.(env),
    })
    liveSocket.connect()
  },

  stopRealtime: () => {
    if (realtimeRefreshTimer != null) {
      clearTimeout(realtimeRefreshTimer)
      realtimeRefreshTimer = null
    }
    pendingAgentJoinIds.clear()
    liveSocket?.close()
    liveSocket = null
    set(s => ({
      realtimeConnected: false,
      agentWsStatus: s.agentWsStatus !== 'no-token' ? 'idle' : 'no-token'
    }))
  },

  startPolling: (intervalMs = 12000) => {
    get().stopPolling()
    get().fetchCounts().catch(() => {})
    const handle = window.setInterval(() => {
      if (document.hidden) return
      get().fetchCounts().catch(() => {})
    }, intervalMs)
    set({ pollHandle: handle as unknown as number })
  },

  stopPolling: () => {
    const handle = get().pollHandle
    if (handle) {
      window.clearInterval(handle)
      set({ pollHandle: null })
    }
  },

  reset: () => {
    panelHandlers = null
    pendingAgentJoinIds.clear()
    get().stopPolling()
    get().stopRealtime()
    set({
      waitingCount: 0,
      activeCount: 0,
      closedCount: 0,
      visitorUnreadTotal: 0,
      waitingVisitorUnreadSum: 0,
      activeVisitorUnreadSum: 0,
      lastSync: null,
      loaded: false,
      error: '',
      agentWsStatus: 'idle'
    })
  }
}))
