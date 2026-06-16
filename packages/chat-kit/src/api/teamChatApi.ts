import type { AxiosInstance } from 'axios'

export interface TeamChatAttachment {
  id: string
  name: string
  size: number
  content_type: string
  is_image: boolean
  source: 'user_upload' | 'ai_summary'
  url: string
}

export interface TeamChatMessage {
  id: string
  conversation_id: string
  sender_user_id: number
  sender_name: string
  kind: 'text' | 'image' | 'file' | 'system'
  content: string
  attachment: TeamChatAttachment | null
  created_at: string
}

export interface TeamChatMember {
  user_id: number
  user_name: string
  last_read_at: string | null
  is_active: boolean
}

export interface TeamConversation {
  id: string
  kind: 'dm' | 'group'
  title: string
  avatar?: string
  members: TeamChatMember[]
  created_by_user_id: number | null
  admin_user_id: number | null
  last_message_at: string | null
  last_message_preview: string
  unread: number
  created_at: string
}

export type TeamChatFileKind = 'dm' | 'group' | 'ai'

export interface TeamChatFileItem extends TeamChatAttachment {
  created_at: string
  conversation_id: string | null
  related_name: string
  related_kind: 'dm' | 'group' | ''
  sender_user_id: number
}

export function createTeamChatApi(api: AxiosInstance) {
  const TeamChatAPI = {
    async listConversations(): Promise<TeamConversation[]> {
      const r = await api.get('/api/v1/chat/team/conversations/')
      return r.data.data.items as TeamConversation[]
    },
    async createConversation(payload: {
      kind: 'dm' | 'group'
      title?: string
      members: { user_id: number; user_name?: string }[]
    }): Promise<{ conversation: TeamConversation; reused: boolean }> {
      const r = await api.post('/api/v1/chat/team/conversations/', payload)
      return r.data.data
    },
    async updateConversation(convId: string, payload: { title: string }): Promise<TeamConversation> {
      const r = await api.patch(`/api/v1/chat/team/conversations/${convId}/`, payload)
      return r.data.data.conversation as TeamConversation
    },
    async listMessages(convId: string, cursor?: string | { since?: string; after_id?: string }): Promise<TeamChatMessage[]> {
      const params = typeof cursor === 'string'
        ? { since: cursor }
        : cursor?.after_id
          ? { after_id: cursor.after_id }
          : cursor?.since
            ? { since: cursor.since }
            : undefined
      const r = await api.get(`/api/v1/chat/team/conversations/${convId}/messages/`, {
        params,
      })
      return r.data.data.items as TeamChatMessage[]
    },
    async sendMessage(convId: string, payload: {
      kind?: 'text' | 'image' | 'file'
      content?: string
      attachment_id?: string
      sender_name?: string
      /**
       * 客户端重试幂等键。同一 (conversation, sender, client_message_id) 后端只会落库
       * 一条；相同 ID 重发返回原 message + ``idempotent_replay: true``。建议每次用户点击
       * 「发送」生成一次，并在重试时保持不变。
       */
      client_message_id?: string
    }): Promise<TeamChatMessage> {
      const r = await api.post(`/api/v1/chat/team/conversations/${convId}/messages/`, payload)
      return r.data.data.message as TeamChatMessage
    },
    async summarize(convId: string, payload: { start_message_id?: string; end_message_id?: string } = {}): Promise<{ attachment: TeamChatAttachment; message: TeamChatMessage }> {
      const r = await api.post(`/api/v1/chat/team/conversations/${convId}/summarize/`, payload)
      return r.data.data as { attachment: TeamChatAttachment; message: TeamChatMessage }
    },
    async markRead(convId: string): Promise<void> {
      await api.post(`/api/v1/chat/team/conversations/${convId}/read/`, {})
    },
    async upload(file: File): Promise<TeamChatAttachment> {
      const fd = new FormData()
      fd.append('file', file)
      const r = await api.post('/api/v1/chat/team/uploads/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return r.data.data.attachment as TeamChatAttachment
    },
    async listFiles(kind: TeamChatFileKind): Promise<TeamChatFileItem[]> {
      const r = await api.get('/api/v1/chat/team/files/', { params: { kind } })
      return r.data.data.items as TeamChatFileItem[]
    },
    async readTextFile(attId: string): Promise<{ attachment: TeamChatAttachment; content: string }> {
      const r = await api.get(`/api/v1/chat/team/uploads/${attId}/text/`)
      return r.data.data as { attachment: TeamChatAttachment; content: string }
    },
    async download(attId: string): Promise<Blob> {
      const r = await api.get(`/api/v1/chat/team/uploads/${attId}/`, { responseType: 'blob' })
      return r.data as Blob
    },
  }
  return { TeamChatAPI }
}
