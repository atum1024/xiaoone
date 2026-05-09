import { createStore, useStore } from 'zustand'
import {
  TeamLiveSocket,
  type TeamChatMessage,
  type TeamConversation,
  type createTeamChatApi,
  getChatKit
} from '@xiaoone/chat-kit'
import { readAccessToken } from '../lib/authEvents'

type TeamChatApi = ReturnType<typeof createTeamChatApi>['TeamChatAPI']

export interface TeamChatStoreOptions {
  spaceKey: string
  api: TeamChatApi
  tokenReader: () => string | null
  wsBaseUrl?: string
}

interface TeamChatState {
  conversations: TeamConversation[]
  loaded: boolean
  loading: boolean
  error: string
  pollHandle: number | null
  realtimeRevision: number
  lastRealtimeConvId: string | null
  lastRealtimeType: string | null
  lastRealtimeMessage: TeamChatMessage | null
  realtimeConnected: boolean
}

interface TeamChatActions {
  totalUnread: () => number
  sorted: () => TeamConversation[]
  fetch: (silent?: boolean) => Promise<void>
  upsert: (conv: TeamConversation) => void
  bumpRead: (convId: string) => void
  startPolling: (intervalMs?: number) => void
  stopPolling: () => void
  stopTeamRealtime: () => void
  restartTeamRealtime: () => void
  startTeamRealtime: () => void
  reset: () => void
}

export type TeamChatStore = TeamChatState & TeamChatActions

interface SpaceRuntimeRef {
  options: TeamChatStoreOptions
  socket: TeamLiveSocket | null
}

const spaceRuntimes = new Map<string, SpaceRuntimeRef>()
const storeApis = new Map<string, ReturnType<typeof createTeamChatStore>>()

function buildTeamWsUrl(spaceKey: string): string {
  const ref = spaceRuntimes.get(spaceKey)
  if (!ref) return ''
  const token = ref.options.tokenReader()
  if (!token) return ''
  const loc = window.location
  const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:'
  const explicit = (ref.options.wsBaseUrl ?? (import.meta.env.VITE_TEAM_WS_URL as string | undefined))?.trim()
  if (explicit) {
    const base = explicit.replace(/\/$/, '')
    return `${base}/ws/team/?token=${encodeURIComponent(token)}`
  }
  return `${wsProto}//${loc.host}/ws/team/?token=${encodeURIComponent(token)}`
}

function createTeamChatStore(spaceKey: string) {
  return createStore<TeamChatStore>((set, get) => ({
    conversations: [],
    loaded: false,
    loading: false,
    error: '',
    pollHandle: null,
    realtimeRevision: 0,
    lastRealtimeConvId: null,
    lastRealtimeType: null,
    lastRealtimeMessage: null,
    realtimeConnected: false,

    totalUnread: () => get().conversations.reduce((s, c) => s + (c.unread || 0), 0),
    sorted: () => [...get().conversations].sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return tb - ta
    }),

    fetch: async (silent = false) => {
      const ref = spaceRuntimes.get(spaceKey)
      if (!ref) return
      if (!silent) set({ loading: true })
      try {
        const convs = await ref.options.api.listConversations()
        set({ conversations: convs, loaded: true, error: '' })
      } catch (e: any) {
        if (e?.response?.status === 401) {
          get().stopPolling()
          get().stopTeamRealtime()
          if (!silent) set({ error: '团队会话未授权，已停止同步' })
        } else if (!silent) {
          set({ error: e?.response?.data?.message || '加载团队会话失败' })
        }
      } finally {
        if (!silent) set({ loading: false })
      }
    },

    upsert: (conv) => set(state => {
      const convs = [...state.conversations]
      const i = convs.findIndex(c => c.id === conv.id)
      if (i >= 0) convs[i] = conv
      else convs.unshift(conv)
      return { conversations: convs }
    }),

    bumpRead: (convId) => set(state => {
      const convs = state.conversations.map(c => c.id === convId ? { ...c, unread: 0 } : c)
      return { conversations: convs }
    }),

    startPolling: (intervalMs = 8000) => {
      get().stopPolling()
      const handle = window.setInterval(() => get().fetch(true), intervalMs)
      set({ pollHandle: handle as unknown as number })
    },

    stopPolling: () => {
      const handle = get().pollHandle
      if (handle) {
        window.clearInterval(handle)
        set({ pollHandle: null })
      }
    },

    stopTeamRealtime: () => {
      const ref = spaceRuntimes.get(spaceKey)
      if (ref?.socket) {
        ref.socket.close()
        ref.socket = null
      }
      set({ realtimeConnected: false })
    },

    restartTeamRealtime: () => {
      get().stopTeamRealtime()
      get().startTeamRealtime()
    },

    startTeamRealtime: () => {
      const ref = spaceRuntimes.get(spaceKey)
      if (!ref) return
      get().stopTeamRealtime()
      const initialUrl = buildTeamWsUrl(spaceKey)
      if (!initialUrl) return
      ref.socket = new TeamLiveSocket({
        url: () => buildTeamWsUrl(spaceKey),
        reconnectDelayMs: 4000,
        handlers: {
          onOpen: () => {
            set({ realtimeConnected: true })
            get().stopPolling()
          },
          onClose: () => {
            set({ realtimeConnected: false })
          },
          onJson: (data) => {
            if (data.type === 'ready') return
            if (data.type === 'team_message' || data.type === 'team_conversation_changed') {
              set(s => ({
                lastRealtimeConvId: typeof data.conversation_id === 'string' ? data.conversation_id : null,
                lastRealtimeType: data.type as string,
                lastRealtimeMessage: data.type === 'team_message' && data.message ? data.message as TeamChatMessage : null,
                realtimeRevision: s.realtimeRevision + 1
              }))
              void get().fetch(true)
            }
          },
        },
      })
      ref.socket.connect()
    },

    reset: () => {
      get().stopPolling()
      get().stopTeamRealtime()
      set({
        conversations: [],
        loaded: false,
        loading: false,
        error: '',
        realtimeRevision: 0,
        lastRealtimeConvId: null,
        lastRealtimeType: null,
        lastRealtimeMessage: null
      })
    }
  }))
}

export function ensureTeamChatStore(options: TeamChatStoreOptions) {
  const existing = spaceRuntimes.get(options.spaceKey)
  if (existing) {
    existing.options = options
  } else {
    spaceRuntimes.set(options.spaceKey, { options, socket: null })
  }

  let api = storeApis.get(options.spaceKey)
  if (!api) {
    api = createTeamChatStore(options.spaceKey)
    storeApis.set(options.spaceKey, api)
  }
  return api
}

export function disposeTeamChatStore(spaceKey: string) {
  const api = storeApis.get(spaceKey)
  if (api) {
    try {
      api.getState().reset()
    } catch {}
  }
  spaceRuntimes.delete(spaceKey)
  storeApis.delete(spaceKey)
}

export function restartTeamRealtimeForSpace(spaceKey: string): boolean {
  const api = storeApis.get(spaceKey)
  if (!api) return false
  try {
    const inst = api.getState()
    inst.stopTeamRealtime()
    inst.startTeamRealtime()
    return true
  } catch {
    return false
  }
}

let currentMerchantKeyResolver: () => string = () => 'merchant:default'

export function configureCurrentMerchantKeyResolver(fn: () => string) {
  currentMerchantKeyResolver = fn
}

export function currentMerchantSpaceKey(): string {
  try {
    const k = currentMerchantKeyResolver()
    return k && k.startsWith('merchant:') ? k : 'merchant:default'
  } catch {
    return 'merchant:default'
  }
}

function ensureMerchantSpace(spaceKey: string) {
  if (storeApis.has(spaceKey)) return
  const { TeamChatAPI } = getChatKit()
  ensureTeamChatStore({
    spaceKey,
    api: TeamChatAPI,
    tokenReader: readAccessToken,
  })
}

/**
 * React hook for useTeamChatStore that uses the default merchant space.
 */
export function useTeamChatStore() {
  const key = currentMerchantSpaceKey()
  ensureMerchantSpace(key)
  const api = storeApis.get(key)!
  return useStore(api)
}

// Attach a static getState helper if someone needs non-reactive access
useTeamChatStore.getState = () => {
  const key = currentMerchantSpaceKey()
  ensureMerchantSpace(key)
  return storeApis.get(key)!.getState()
}

export function listTeamChatSpaceKeys(): string[] {
  return Array.from(spaceRuntimes.keys())
}
