import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AgentThread } from '@xiaoone/chat-kit'

interface ChatPreferencesState {
  mutedAgentThreadIds: string[]
  agentThreadReadBaseline: Record<string, number>
  agentGenerationSeenAt: Record<string, string>
}

interface ChatPreferencesActions {
  ensureAgentBaseline: (threadId: string, messageCount: number) => void
  agentThreadIsMuted: (threadId: string) => boolean
  agentThreadUnreadCount: (thread: AgentThread) => number
  markAgentThreadRead: (threadId: string, messageCount: number) => void
  agentGenerationNeedsAttention: (thread: AgentThread) => boolean
  markAgentGenerationSeen: (threadId: string, seenAt?: string | null) => void
  toggleMuteAgentThread: (threadId: string) => void
  reset: () => void
}

export const useChatPreferencesStore = create<ChatPreferencesState & ChatPreferencesActions>()(
  persist(
    (set, get) => ({
      mutedAgentThreadIds: [],
      agentThreadReadBaseline: {},
      agentGenerationSeenAt: {},

      ensureAgentBaseline: (threadId, messageCount) => {
        if (get().agentThreadReadBaseline[threadId] !== undefined)
          return
        set(state => ({
          agentThreadReadBaseline: {
            ...state.agentThreadReadBaseline,
            [threadId]: messageCount,
          },
        }))
      },
      agentThreadIsMuted: threadId => get().mutedAgentThreadIds.includes(threadId),
      agentThreadUnreadCount: (thread) => {
        const state = get()
        if (state.mutedAgentThreadIds.includes(thread.id))
          return 0
        const base = state.agentThreadReadBaseline[thread.id]
        if (base === undefined)
          return 0
        return Math.max(0, thread.message_count - base)
      },
      markAgentThreadRead: (threadId, messageCount) => {
        set(state => ({
          agentThreadReadBaseline: {
            ...state.agentThreadReadBaseline,
            [threadId]: Math.max(state.agentThreadReadBaseline[threadId] ?? 0, messageCount),
          },
        }))
      },
      agentGenerationNeedsAttention: (thread) => {
        const state = get()
        if (state.mutedAgentThreadIds.includes(thread.id))
          return false
        if ((thread.active_generation_count || 0) > 0)
          return false
        if (thread.latest_generation_status !== 'succeeded')
          return false
        const updated = thread.latest_generation_updated_at ? new Date(thread.latest_generation_updated_at).getTime() : 0
        if (!updated || Number.isNaN(updated))
          return false
        const seen = state.agentGenerationSeenAt[thread.id] ? new Date(state.agentGenerationSeenAt[thread.id]).getTime() : 0
        return updated > seen
      },
      markAgentGenerationSeen: (threadId, seenAt) => {
        set(state => ({
          agentGenerationSeenAt: {
            ...state.agentGenerationSeenAt,
            [threadId]: seenAt || new Date().toISOString(),
          },
        }))
      },
      toggleMuteAgentThread: (threadId) => {
        set(state => ({
          mutedAgentThreadIds: state.mutedAgentThreadIds.includes(threadId)
            ? state.mutedAgentThreadIds.filter(id => id !== threadId)
            : [...state.mutedAgentThreadIds, threadId],
        }))
      },
      reset: () => set({
        mutedAgentThreadIds: [],
        agentThreadReadBaseline: {},
        agentGenerationSeenAt: {},
      }),
    }),
    {
      name: 'xiaoone-merchant-chat-prefs',
      partialize: state => ({
        mutedAgentThreadIds: state.mutedAgentThreadIds,
        agentThreadReadBaseline: state.agentThreadReadBaseline,
        agentGenerationSeenAt: state.agentGenerationSeenAt,
      }),
    },
  ),
)
