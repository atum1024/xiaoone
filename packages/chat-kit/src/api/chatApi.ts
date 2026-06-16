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

  interface VisitorHandshakePayload {
    merchant_id?: number
    app_id?: string
    api_key?: string
    app_secret?: string
    sdk_key?: string
    store_id?: string | number
    store_name?: string
    visitor_name?: string
    visitor_email?: string
    visitor_key?: string
    external_user_id?: string
    external_user_name?: string
    external_user_email?: string
    locale?: string
    channel?: LiveChannel
    subject?: string
  }

  interface VisitorMessagePayload {
    conversation: string
    token: string
    content?: string
    attachment_id?: string
    client_message_id?: string
  }

  interface VisitorSdkAppearance {
    theme: 'auto' | 'light' | 'dark' | 'brand' | string
    primary_color: string
    bubble_position: string
    welcome_message: string
    status_waiting_label?: string
    status_active_label?: string
    status_closed_label?: string
  }

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
    blockVisitor: async (id: string, payload: { reason?: string } = {}) => {
      const r = await api.post(`${BASE}/conversations/${id}/block-visitor/`, payload)
      return r.data?.data
    },
    unblockVisitor: async (id: string) => {
      const r = await api.post(`${BASE}/conversations/${id}/unblock-visitor/`, {})
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
      const r = await api.post(`${BASE}/conversations/${id}/ai-suggest-reply/`, {}, { timeout: 90_000 })
      return r.data?.data as {
        conversation: string
        suggestion: string
        corpus_suggestion?: string
        corpus_matches?: Array<{ score: number; matched_terms: string[]; entry: Record<string, any> }>
        model: string
        reply_language?: string
        reply_language_label?: string
        degraded?: boolean
        warning?: Record<string, any>
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
      const r = await api.post(`${BASE}/conversations/${id}/ai-summary/`, {}, { timeout: 90_000 })
      return r.data?.data as { conversation: string; summary: string; model: string }
    },
    onlineAgents: async () => {
      const r = await api.get(`${BASE}/agents/online/`)
      return r.data?.data?.items as Array<{ user_id: number; display_name: string; status: string }>
    },
    visitorHandshake: async (payload: VisitorHandshakePayload) => {
      const r = await api.post(`${BASE}/visitor/handshake/`, payload)
      return r.data?.data as {
        visitor: Record<string, any>
        visitor_token: string
        visitor_key: string
        conversation: LiveConversation
        sdk_appearance?: VisitorSdkAppearance
      }
    },
    visitorSend: async (payload: VisitorMessagePayload) => {
      const r = await api.post(`${BASE}/visitor/messages/`, payload)
      return r.data?.data as Record<string, any>
    },
  }

  return { ChatAPI }
}
