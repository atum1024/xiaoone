/**
 * 用户端「客户咨询」与「渠道」REST API 工厂。
 */

import type { AxiosInstance } from 'axios'
import type {
  ChannelAccount,
  ChannelProvider,
  LiveAttachmentMeta,
  LiveChannel,
  LiveConversation,
  LiveConversationDetail,
  LiveConversationPatch,
  LiveMessage,
  LiveState,
  PageEnvelope,
} from '../types/live'

export type {
  ChannelAccount,
  ChannelProvider,
  LiveAttachmentMeta,
  LiveChannel,
  LiveConversation,
  LiveConversationDetail,
  LiveConversationPatch,
  LiveMessage,
  LiveState,
  LiveVisitor,
  PageEnvelope,
} from '../types/live'

export { assignDefined } from '../types/live'

export function createChatApiClient(api: AxiosInstance) {
  const BASE = '/api/v1/chat'

  const ChatAPI = {
    conversations: async (params: {
      state?: LiveState
      channel?: LiveChannel
      store_id?: string | number
      skill_id?: string | number
      search?: string
      page?: number
      page_size?: number
    } = {}) => {
      const r = await api.get<PageEnvelope<LiveConversation>>(`${BASE}/conversations/`, { params })
      return r.data
    },
    detail: async (id: string, params: { message_limit?: number } = {}) => {
      const r = await api.get<LiveConversationDetail>(`${BASE}/conversations/${id}/`, { params })
      return r.data
    },
    patch: async (id: string, payload: LiveConversationPatch) => {
      const r = await api.patch<LiveConversation>(`${BASE}/conversations/${id}/`, payload)
      return r.data
    },
    takeover: async (id: string) => {
      const r = await api.post(`${BASE}/conversations/${id}/takeover/`, {})
      return r.data?.data
    },
    close: async (id: string) => {
      const r = await api.post(`${BASE}/conversations/${id}/close/`, {})
      return r.data?.data
    },
    send: async (
      id: string,
      content: string,
      extra: { attachment_id?: string; client_message_id?: string } = {},
    ) => {
      const payload: Record<string, string> = { content }
      if (extra.attachment_id)
        payload.attachment_id = extra.attachment_id
      if (extra.client_message_id)
        payload.client_message_id = extra.client_message_id
      const r = await api.post(`${BASE}/conversations/${id}/messages/`, payload)
      return r.data?.data
    },
    uploadLiveAttachment: async (conversationId: string, file: File) => {
      const body = new FormData()
      body.append('file', file)
      const r = await api.post(`${BASE}/conversations/${conversationId}/attachments/`, body)
      return r.data?.data?.attachment as LiveAttachmentMeta
    },
    messages: async (id: string, params: { after_id?: string; before_id?: string; since?: string; limit?: number } = {}) => {
      const r = await api.get(`${BASE}/conversations/${id}/messages/`, { params })
      return r.data?.data as {
        items: LiveMessage[]
        limit?: number
        has_more?: boolean
        before_cursor?: string
        newest_cursor?: string
        next_cursor?: string
      }
    },
    aiSuggestReply: async (id: string) => {
      const r = await api.post(`${BASE}/conversations/${id}/ai-suggest-reply/`, {})
      return r.data?.data as {
        conversation: string
        suggestion: string
        corpus_suggestion?: string
        corpus_matches?: Array<{ score: number; matched_terms: string[]; entry: Record<string, any> }>
        model: string
        reply_language?: string
        reply_language_label?: string
        is_mock: boolean
      }
    },
    translateMessage: async (conversationId: string, messageId: string, payload: { target_language?: string; agent_language?: string } = {}) => {
      const r = await api.post(`${BASE}/conversations/${conversationId}/messages/${messageId}/translate/`, payload)
      return r.data?.data as {
        conversation: LiveConversation
        message: LiveMessage
        translation: {
          text: string
          source_language: string
          source_label: string
          target_language: string
          target_label: string
          meta: Record<string, any>
        }
      }
    },
    aiSummary: async (id: string) => {
      const r = await api.post(`${BASE}/conversations/${id}/ai-summary/`, {})
      return r.data?.data as { conversation: string; summary: string; model: string; is_mock: boolean }
    },
    onlineAgents: async () => {
      const r = await api.get(`${BASE}/agents/online/`)
      return r.data?.data?.items as Array<{ user_id: number; display_name: string; status: string }>
    },
  }

  const C_BASE = '/api/v1/channels'

  const ChannelsAPI = {
    list: async (params: { provider?: ChannelProvider } = {}) => {
      const r = await api.get<PageEnvelope<ChannelAccount>>(`${C_BASE}/accounts/`, { params })
      return r.data
    },
    create: async (payload: Partial<ChannelAccount>) => {
      const r = await api.post<ChannelAccount>(`${C_BASE}/accounts/`, payload)
      return r.data
    },
    update: async (id: string, payload: Partial<ChannelAccount>) => {
      const r = await api.patch<ChannelAccount>(`${C_BASE}/accounts/${id}/`, payload)
      return r.data
    },
    destroy: async (id: string) => {
      await api.delete(`${C_BASE}/accounts/${id}/`)
    },
    rotateToken: async (id: string) => {
      const r = await api.post<ChannelAccount>(`${C_BASE}/accounts/${id}/rotate_token/`, {})
      return r.data
    },
    simulateInbound: async (id: string, content: string, from = '') => {
      const r = await api.post(`${C_BASE}/accounts/${id}/simulate_inbound/`, { content, from })
      return r.data
    },
  }

  return { ChatAPI, ChannelsAPI }
}
