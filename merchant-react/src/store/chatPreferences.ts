import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AgentThread, TeamConversation } from '@xiaoone/chat-kit'

interface ChatPreferencesState {
  mutedAgentThreadIds: string[]
  mutedTeamConvIds: string[]
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
  toggleMuteTeamConv: (convId: string) => void
  teamConvIsMuted: (convId: string) => boolean
  teamConvUnread: (conversation: TeamConversation) => number
  teamUnreadSumExcludingMuted: (conversations: TeamConversation[]) => number
  reset: () => void
}

export const useChatPreferencesStore = create<ChatPreferencesState & ChatPreferencesActions>()(
  persist(
    (set, get) => ({
      mutedAgentThreadIds: [],
      mutedTeamConvIds: [],
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
        state.ensureAgentBaseline(thread.id, thread.message_count)
        const base = get().agentThreadReadBaseline[thread.id] ?? thread.message_count
        return Math.max(0, thread.message_count - base)
      },
      markAgentThreadRead: (threadId, messageCount) => {
        set(state => ({
          agentThreadReadBaseline: {
            ...state.agentThreadReadBaseline,
            [threadId]: messageCount,
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
      toggleMuteTeamConv: (convId) => {
        set(state => ({
          mutedTeamConvIds: state.mutedTeamConvIds.includes(convId)
            ? state.mutedTeamConvIds.filter(id => id !== convId)
            : [...state.mutedTeamConvIds, convId],
        }))
      },
      teamConvIsMuted: convId => get().mutedTeamConvIds.includes(convId),
      teamConvUnread: conversation => get().mutedTeamConvIds.includes(conversation.id) ? 0 : (conversation.unread || 0),
      teamUnreadSumExcludingMuted: conversations => conversations.reduce((sum, conversation) => sum + get().teamConvUnread(conversation), 0),
      reset: () => set({
        mutedAgentThreadIds: [],
        mutedTeamConvIds: [],
        agentThreadReadBaseline: {},
        agentGenerationSeenAt: {},
      }),
    }),
    {
      name: 'xiaoone-merchant-chat-prefs',
      partialize: state => ({
        mutedAgentThreadIds: state.mutedAgentThreadIds,
        mutedTeamConvIds: state.mutedTeamConvIds,
        agentThreadReadBaseline: state.agentThreadReadBaseline,
        agentGenerationSeenAt: state.agentGenerationSeenAt,
      }),
    },
  ),
)
